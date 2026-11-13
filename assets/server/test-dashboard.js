const assert = require('node:assert/strict');
const { once } = require('node:events');
const sourceCatalog = require('../../catalog');

process.env.SUPABASE_URL = 'https://evora-test.invalid';
process.env.SUPABASE_SERVICE_KEY = 'fixture-service-key';
process.env.SUPABASE_ANON_KEY = 'fixture-anon-key';
process.env.ADMIN_API_KEY = 'fixture-admin-key';
process.env.EMAIL_PROVIDER = 'fixture';
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';
process.env.WRITE_RATE_MAX = '1000';
const members = [
  { email: 'evora.reply@gmail.com', name: 'EVORA', role: 'owner', created_at: new Date().toISOString() },
  { email: 'kododevelopers@gmail.com', name: 'KODO', role: 'admin', created_at: new Date().toISOString() },
  { email: 'muhammadammarsheikh11@gmail.com', name: 'Ammar Sheikh', role: 'admin', created_at: new Date().toISOString() },
  { email: 'viewer@example.test', name: 'Viewer Test', role: 'viewer', created_at: new Date().toISOString() }
];
const tables = {
  staff: structuredClone(members),
  products: sourceCatalog.items.map((data, position) => ({ id: data.id, data: structuredClone(data), position, version: 1 })),
  orders: [{ id: 'TEST-ORDER', status: 'received', received_at: new Date().toISOString(), customer_name: 'Test Customer', customer_email: 'customer@example.test', customer_phone: '03001234567', customer_address: 'Test street', items: [{ id: sourceCatalog.items[0].id, name: sourceCatalog.items[0].name, qty: 1, price: sourceCatalog.items[0].price }], total: 5000 }],
  contacts: [{ contact_id: 'TEST-CONTACT', received_at: new Date().toISOString(), name: 'Test Contact', email: 'customer@example.test', subject: 'complaint', message: 'A local test message.' }]
};
const codes = new Set();
const revoked = new Set();
let sentEmails = 0;
let uploadedImages = 0;
let brokenCatalog = false;
let brokenAuth = false;
const realFetch = global.fetch;
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
function fixtureToken(email) { return 'fixture-' + Buffer.from(email).toString('base64url'); }
function fixtureUnconfirmedToken(email) { return 'unconfirmed-' + Buffer.from(email).toString('base64url'); }
function credentialEmail(token) {
  if (token.startsWith('fixture-')) return Buffer.from(token.slice('fixture-'.length), 'base64url').toString();
  if (token.startsWith('unconfirmed-')) return Buffer.from(token.slice('unconfirmed-'.length), 'base64url').toString();
  return '';
}

global.fetch = async function (input, opts = {}) {
  const url = new URL(input);
  if (['127.0.0.1', 'localhost'].includes(url.hostname)) return realFetch(input, opts);
  assert.equal(url.origin, process.env.SUPABASE_URL, 'No external service may be called by tests');
  const method = opts.method || 'GET';
  const body = opts.body && typeof opts.body === 'string' ? JSON.parse(opts.body) : null;
  const token = String(opts.headers.Authorization || '').replace(/^Bearer /, '');
  if (brokenAuth && url.pathname.startsWith('/auth/v1/')) return json({}, 429);
  if (url.pathname === '/auth/v1/admin/generate_link') { codes.add(body.email); return json({ email_otp: '123456' }); }
  if (url.pathname === '/auth/v1/verify') {
    if (body.type !== 'email' || body.token !== '123456' || !codes.delete(body.email)) return json({ error: 'Invalid code' }, 401);
    revoked.delete(body.email);
    return json({ user: { email: body.email }, access_token: fixtureToken(body.email), refresh_token: fixtureToken(body.email) });
  }
  if (url.pathname === '/auth/v1/user') {
    const email = credentialEmail(token);
    if (!email || revoked.has(email)) return json({ error: 'Invalid token' }, 401);
    // Customer accounts require a confirmed email; 'unconfirmed-' tokens model
    // a shopper who has not clicked their confirmation link yet.
    if (token.startsWith('unconfirmed-')) return json({ email });
    return json({ email, email_confirmed_at: new Date().toISOString() });
  }
  if (url.pathname === '/auth/v1/token') {
    const email = credentialEmail(body.refresh_token);
    if (!email || revoked.has(email)) return json({}, 401);
    return json({ user: { email }, access_token: fixtureToken(email), refresh_token: fixtureToken(email) });
  }
  if (url.pathname === '/auth/v1/logout') {
    const email = credentialEmail(token);
    if (!email || revoked.has(email)) return json({}, 401);
    revoked.add(email);
    return json({});
  }
  if (url.pathname.startsWith('/storage/v1/object/')) { uploadedImages++; return json({}); }
  if (url.pathname.startsWith('/rest/v1/')) {
    const name = url.pathname.split('/').pop();
    if (brokenCatalog && name === 'products') return json({}, 503);
    assert.ok(tables[name], 'Known fixture table required');
    let rows = tables[name];
    for (const [field, filter] of url.searchParams) {
      if (!filter.startsWith('eq.')) continue;
      const raw = filter.slice(3);
      const value = raw.startsWith('"') ? JSON.parse(raw) : raw;
      rows = rows.filter(row => String(row[field]) === value);
    }
    if (method === 'HEAD') return new Response(null, { headers: { 'content-range': '*/' + rows.length } });
    if (method === 'PATCH') rows.forEach(row => Object.assign(row, body));
    if (method === 'DELETE') tables[name] = tables[name].filter(row => !rows.includes(row));
    if (method === 'POST') {
      const key = name === 'staff' ? 'email' : name === 'contacts' ? 'contact_id' : 'id';
      const prefer = String(opts.headers.Prefer || '');
      const inserted = [];
      for (const row of Array.isArray(body) ? body : [body]) {
        const found = tables[name].find(existing => existing[key] === row[key]);
        if (found && !prefer.includes('merge-duplicates')) {
          if (prefer.includes('ignore-duplicates')) continue;
          return json({}, 409);
        }
        if (found) Object.assign(found, row); else { tables[name].push(row); inserted.push(row); }
      }
      if (prefer.includes('return=representation')) return json(inserted);
    }
    return json(rows);
  }
  throw new Error('Unexpected fixture request: ' + url.pathname);
};
const mailer = require('./lib/mailer');
mailer.stats = () => ({ configured: true, failed: 0 });
mailer.sendEmailTo = async () => { sentEmails++; return { sent: true }; };
mailer.sendNotificationEmail = async () => ({ sent: true });
const { app } = require('./server');

async function run() {
  const preview = process.argv.includes('--preview');
  const server = app.listen(preview ? 3100 : 0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  if (preview) {
    console.log('Isolated dashboard preview: ' + base + '/admin.html');
    console.log('Fixture login: listed staff email, key fixture-admin-key, code 123456. No real email or database access.');
    return;
  }
  const owner = members[0].email;
  const admin = members[1].email;
  const viewer = members[3].email;
  const id = sourceCatalog.items[0].id;
  let checks = 0;
  async function call(path, method = 'GET', body, email, extra = {}) {
    const response = await realFetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(email ? { Cookie: 'evora_access=' + fixtureToken(email) } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  async function expect(path, method, body, email, status) {
    if (method === 'PATCH' && path.startsWith('/api/admin/products/') && body && body.version === undefined) body = { ...body, version: tables.products.find(row => row.id === path.split('/').pop()).version };
    const result = await call(path, method, body, email);
    assert.equal(result.status, status, method + ' ' + path + ': ' + JSON.stringify(result.body));
    checks++;
    return result;
  }
  try {
    for (const path of ['/api/orders', '/api/stats', '/api/admin/me', '/api/admin/staff', '/api/admin/products']) await expect(path, 'GET', undefined, undefined, 401);
    assert.equal((await call('/api/admin/me', 'GET', undefined, undefined, { 'x-admin-key': 'fixture-admin-key', 'x-admin-email': owner })).status, 401);
    await expect('/api/admin/login', 'POST', { email: owner, key: 'wrong' }, undefined, 401);
    await expect('/api/admin/login', 'POST', { email: 'stranger@example.test', key: 'fixture-admin-key' }, undefined, 401);
    assert.equal(sentEmails, 0);
    await expect('/api/admin/login', 'POST', { email: owner, key: 'fixture-admin-key' }, undefined, 200);
    await expect('/api/admin/verify', 'POST', { email: owner, code: '999999' }, undefined, 401);
    const session = await expect('/api/admin/verify', 'POST', { email: owner, code: '123456', remember: true }, undefined, 200);
    assert.match(session.headers.get('set-cookie'), /HttpOnly/);
    assert.match(session.headers.get('set-cookie'), /SameSite=Strict/);
    assert.match(session.headers.get('set-cookie'), /Max-Age=/);
    assert.equal(session.body.role, 'owner');
    const cookies = session.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    assert.equal((await call('/api/admin/me', 'GET', undefined, undefined, { Cookie: cookies })).body.role, 'owner');
    const refreshed = await call('/api/admin/me', 'GET', undefined, undefined, { Cookie: 'evora_access=expired; evora_refresh=' + fixtureToken(owner) + '; evora_remember=1' });
    assert.equal(refreshed.status, 200);
    assert.match(refreshed.headers.get('set-cookie'), /Max-Age=/);
    await expect('/api/admin/verify', 'POST', { email: owner, code: '123456' }, undefined, 401);
    for (const email of [owner, admin, viewer]) {
      await expect('/api/admin/staff', 'GET', undefined, email, 200);
      await expect('/api/orders', 'GET', undefined, email, 200);
    }
    const viewerStats = await expect('/api/stats', 'GET', undefined, viewer, 200);
    assert.equal(Object.hasOwn(viewerStats.body.orders, 'total'), false);
    assert.equal(Object.hasOwn(viewerStats.body.orders, 'revenue'), false);
    assert.equal(viewerStats.body.email, null);
    const viewerOrders = await call('/api/orders', 'GET', undefined, viewer);
    assert.equal(Object.hasOwn(viewerOrders.body[0], 'totals'), false);
    for (const email of [admin, viewer]) {
      await expect('/api/admin/staff', 'POST', { name: 'New', email: 'new@example.test', role: 'admin' }, email, 403);
      await expect('/api/admin/staff/' + encodeURIComponent(viewer), 'PATCH', { role: 'admin' }, email, 403);
      await expect('/api/admin/staff/' + encodeURIComponent(viewer), 'DELETE', undefined, email, 403);
    }
    await expect('/api/orders/TEST-ORDER/status', 'PATCH', { status: 'preparing' }, viewer, 403);
    await expect('/api/orders/TEST-ORDER/status', 'PATCH', { status: 'preparing' }, admin, 200);
    await expect('/api/orders/TEST-ORDER/status', 'PATCH', { status: 'delivered' }, owner, 200);
    await expect('/api/admin/staff/' + encodeURIComponent(owner), 'PATCH', { role: 'viewer' }, owner, 400);
    await expect('/api/admin/staff/' + encodeURIComponent(owner), 'DELETE', undefined, owner, 400);
    await expect('/api/admin/staff', 'POST', { name: 'New Member', email: 'new@example.test', role: 'viewer' }, owner, 201);
    await expect('/api/admin/staff/new%40example.test', 'PATCH', { role: 'admin' }, owner, 200);
    await expect('/api/admin/staff/new%40example.test', 'DELETE', undefined, owner, 200);
    assert.equal((await call('/api/admin/staff', 'GET', undefined, owner)).body.some(member => member.email === 'new@example.test'), false);
    await expect('/api/admin/products', 'GET', undefined, viewer, 403);
    await expect('/api/admin/products/' + id, 'PATCH', { price: 3000 }, viewer, 403);
    await expect('/api/admin/product-images', 'POST', { data: '', contentType: 'image/png' }, viewer, 403);
    const changed = await expect('/api/admin/products/' + id, 'PATCH', { name: 'Edited Test Product', price: 3100, description: '<script>not executable</script>', category: 'unisex', image: sourceCatalog.items[1].image, hoverImage: sourceCatalog.items[2].image }, admin, 200);
    assert.equal(changed.body.categoryLabel, 'Unisex');
    const version = changed.body.version;
    const competing = await Promise.all([
      call('/api/admin/products/' + id, 'PATCH', { version, description: 'First edit' }, admin),
      call('/api/admin/products/' + id, 'PATCH', { version, description: 'Second edit' }, admin)
    ]);
    assert.deepEqual(competing.map(result => result.status).sort(), [200, 409]);
    checks += 2;
    const menu = await expect('/api/menu', 'GET', undefined, undefined, 200);
    assert.equal(menu.body.items.find(item => item.id === id).name, 'Edited Test Product');
    await expect('/api/admin/products/' + id, 'PATCH', { price: -1 }, admin, 400);
    await expect('/api/admin/products/' + id, 'PATCH', { image: 'javascript:alert(1)' }, admin, 400);
    await expect('/api/admin/products/' + id, 'PATCH', { id: 'different-id' }, admin, 400);
    await expect('/api/admin/products/' + id, 'PATCH', { available: false }, owner, 200);
    await expect('/api/menu/' + id, 'GET', undefined, undefined, 404);
    await expect('/api/admin/products/' + id, 'PATCH', { available: true }, owner, 200);
    await expect('/api/admin/products/' + id, 'PATCH', { originalPrice: 2000 }, admin, 400);
    await expect('/api/admin/products/' + id, 'PATCH', { originalPrice: 5000 }, admin, 200);
    await expect('/api/admin/products/' + id, 'PATCH', { price: 6000 }, admin, 400);
    await expect('/api/admin/products/' + id, 'PATCH', { originalPrice: null }, admin, 200);
    const newProduct = { name: 'Test Created Kurta', price: 1500, originalPrice: 2500, description: 'Created in test', category: 'men', image: sourceCatalog.items[3].image, available: true };
    await expect('/api/admin/products', 'POST', newProduct, viewer, 403);
    await expect('/api/admin/products', 'POST', { ...newProduct, price: 0 }, admin, 400);
    await expect('/api/admin/products', 'POST', { ...newProduct, originalPrice: 1000 }, admin, 400);
    await expect('/api/admin/products', 'POST', { ...newProduct, category: 'nope' }, admin, 400);
    await expect('/api/admin/products', 'POST', { ...newProduct, image: 'javascript:alert(1)' }, admin, 400);
    const { price, ...missingPrice } = newProduct;
    await expect('/api/admin/products', 'POST', missingPrice, admin, 400);
    const created = await expect('/api/admin/products', 'POST', newProduct, admin, 201);
    assert.equal(created.body.id, 'test-created-kurta');
    assert.equal(created.body.version, 1);
    assert.equal(created.body.originalPrice, 2500);
    assert.equal(created.body.categoryLabel, 'Men');
    const createdMenu = await expect('/api/menu/' + created.body.id, 'GET', undefined, undefined, 200);
    assert.equal(createdMenu.body.originalPrice, 2500);
    const dup = await expect('/api/admin/products', 'POST', newProduct, owner, 201);
    assert.equal(dup.body.id, 'test-created-kurta-2');
    const createdOrder = { customer: { name: 'Tester', email: 'customer@example.test', phone: '03001234567', address: 'Test address' }, items: [{ id: created.body.id, name: 'Test Created Kurta', qty: 1, price: 1500 }], totals: { total: 1 } };
    const placedCreated = await expect('/api/orders', 'POST', createdOrder, undefined, 201);
    assert.equal(placedCreated.body.totals.total, 1500 + Math.round(1500 * .18) + 200);
    const order = { customer: { name: 'Tester', email: 'customer@example.test', phone: '03001234567', address: 'Test address' }, items: [{ id, name: 'Old product name', qty: 2, price: 1 }], totals: { total: 1 } };
    await expect('/api/orders', 'POST', order, undefined, 409);
    order.items[0].price = 3100;
    const placed = await expect('/api/orders', 'POST', order, undefined, 201);
    assert.equal(placed.body.totals.total, 6200 + Math.round(6200 * .18) + 200);
    assert.equal(tables.orders.at(-1).items[0].name, 'Edited Test Product');
    // --- Customer self-service cancellation ---
    const cancelId = placed.body.orderId;
    const publicView = await expect('/api/orders/' + cancelId, 'GET', undefined, undefined, 200);
    assert.equal(publicView.body.customer.name, 'Tester');
    assert.equal(Object.hasOwn(publicView.body.customer, 'email'), false);
    assert.equal(Object.hasOwn(publicView.body.customer, 'phone'), false);
    assert.equal(Object.hasOwn(publicView.body.customer, 'address'), false);
    await expect('/api/orders/' + cancelId + '/cancel', 'POST', {}, undefined, 400);
    await expect('/api/orders/' + cancelId + '/cancel', 'POST', { email: 'wrong@example.test' }, undefined, 403);
    await expect('/api/orders/' + cancelId + '/cancel', 'POST', { phone: '03009999999' }, undefined, 403);
    await expect('/api/orders/NOPE-404/cancel', 'POST', { email: 'customer@example.test' }, undefined, 404);
    // 'received' is cancellable; a +92-format phone still matches the stored 0-prefixed number.
    const cancelled = await expect('/api/orders/' + cancelId + '/cancel', 'POST', { phone: '+92 300 1234567' }, undefined, 200);
    assert.equal(cancelled.body.status, 'cancelled');
    assert.equal(tables.orders.find(row => row.id === cancelId).status, 'cancelled');
    await expect('/api/orders/' + cancelId + '/cancel', 'POST', { email: 'customer@example.test' }, undefined, 409);
    const freshOrder = () => ({ customer: { name: 'Tester', email: 'customer@example.test', phone: '03001234567', address: 'Test address' }, items: [{ id: created.body.id, name: 'Test Created Kurta', qty: 1, price: 1500 }], totals: { total: 1 } });
    // 'preparing' is still cancellable.
    const prep = await expect('/api/orders', 'POST', freshOrder(), undefined, 201);
    await expect('/api/orders/' + prep.body.orderId + '/status', 'PATCH', { status: 'preparing' }, admin, 200);
    await expect('/api/orders/' + prep.body.orderId + '/cancel', 'POST', { email: 'customer@example.test' }, undefined, 200);
    // 'out_for_delivery' locks cancellation even with the correct identity.
    const shipped = await expect('/api/orders', 'POST', freshOrder(), undefined, 201);
    await expect('/api/orders/' + shipped.body.orderId + '/status', 'PATCH', { status: 'out_for_delivery' }, admin, 200);
    const lockedShip = await expect('/api/orders/' + shipped.body.orderId + '/cancel', 'POST', { email: 'customer@example.test' }, undefined, 409);
    assert.equal(lockedShip.body.status, 'out_for_delivery');
    // 'delivered' locks cancellation too.
    const delivered = await expect('/api/orders', 'POST', freshOrder(), undefined, 201);
    await expect('/api/orders/' + delivered.body.orderId + '/status', 'PATCH', { status: 'delivered' }, admin, 200);
    await expect('/api/orders/' + delivered.body.orderId + '/cancel', 'POST', { email: 'customer@example.test' }, undefined, 409);
    // --- Customer accounts (config + own-orders lookup) ---
    const cfg = await expect('/api/account/config', 'GET', undefined, undefined, 200);
    assert.equal(cfg.body.enabled, true);
    assert.equal(cfg.body.supabaseAnonKey, 'fixture-anon-key');
    assert.equal(cfg.body.supabaseUrl, process.env.SUPABASE_URL);
    await expect('/api/account/orders', 'GET', undefined, undefined, 401); // no token
    const badTok = await call('/api/account/orders', 'GET', undefined, undefined, { Authorization: 'Bearer garbage' });
    assert.equal(badTok.status, 401); checks++;
    const unconf = await call('/api/account/orders', 'GET', undefined, undefined, { Authorization: 'Bearer ' + fixtureUnconfirmedToken('customer@example.test') });
    assert.equal(unconf.status, 403); checks++;
    const acct = await call('/api/account/orders', 'GET', undefined, undefined, { Authorization: 'Bearer ' + fixtureToken('customer@example.test') });
    assert.equal(acct.status, 200); checks++;
    assert.equal(acct.body.email, 'customer@example.test');
    assert.ok(acct.body.orders.length > 0, 'customer should see their past orders');
    acct.body.orders.forEach(o => {
      assert.ok(o.orderId && o.status && Array.isArray(o.items), 'order view shape');
      assert.equal(Object.hasOwn(o, 'customer'), false, 'no contact details leaked in account view');
    });
    const dates = acct.body.orders.map(o => String(o.receivedAt || ''));
    assert.deepEqual(dates, dates.slice().sort((a, b) => b.localeCompare(a)), 'newest first');
    const stranger = await call('/api/account/orders', 'GET', undefined, undefined, { Authorization: 'Bearer ' + fixtureToken('nobody@example.test') });
    assert.equal(stranger.status, 200); checks++;
    assert.deepEqual(stranger.body.orders, [], 'a different email sees no one else’s orders');
    await expect('/api/admin/product-images', 'POST', { contentType: 'image/png', data: Buffer.from('not an image').toString('base64') }, admin, 400);
    await expect('/api/admin/product-images', 'POST', { contentType: 'image/png', data: Buffer.from('89504e470d0a1a0a', 'hex').toString('base64') }, admin, 201);
    assert.equal(uploadedImages, 1);
    assert.equal((await call('/api/admin/products/' + id, 'PATCH', { price: 1 }, admin, { Origin: 'https://other.invalid' })).status, 403);
    await expect('/api/admin/staff/' + encodeURIComponent(admin), 'DELETE', undefined, owner, 200);
    await expect('/api/admin/me', 'GET', undefined, admin, 401);
    assert.equal((await call('/api/admin/staff', 'GET', undefined, owner)).body.some(member => member.email === admin), false);
    brokenCatalog = true;
    await expect('/api/menu', 'GET', undefined, undefined, 503);
    brokenCatalog = false;
    brokenAuth = true;
    const unavailableLogout = await expect('/api/admin/logout', 'POST', undefined, owner, 503);
    assert.equal(unavailableLogout.headers.get('set-cookie'), null);
    const unavailableSession = await expect('/api/admin/me', 'GET', undefined, owner, 503);
    assert.equal(unavailableSession.headers.get('set-cookie'), null);
    brokenAuth = false;
    await expect('/api/admin/logout', 'POST', undefined, owner, 200);
    await expect('/api/admin/me', 'GET', undefined, owner, 401);
    const refreshedLogout = await call('/api/admin/logout', 'POST', undefined, undefined, { Cookie: 'evora_access=expired; evora_refresh=' + fixtureToken(viewer) });
    assert.equal(refreshedLogout.status, 200);
    assert.ok(revoked.has(viewer));
    assert.equal((await call('/api/admin/me', 'GET', undefined, undefined, { Cookie: 'evora_refresh=' + fixtureToken(viewer) })).status, 401);
    console.log('Passed ' + checks + ' API scenarios plus cookie, data, no-reseed, upload and pricing assertions. No real email or database calls.');
  } finally { server.close(); server.closeAllConnections(); global.fetch = realFetch; }
}
run().catch(err => { console.error(err); process.exitCode = 1; });
