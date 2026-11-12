// ============================================================================
// supabase-store.js — Postgres backend for storage.js (orders + contacts)
// ----------------------------------------------------------------------------
// Talks to Supabase's REST (PostgREST) API with the service_role key, which
// lives only in the server environment and is never shipped to the browser.
//
// Tables are defined in ../supabase-schema.sql:
//   orders   — id text PK, status, received_at, customer_*, items jsonb,
//              payment_*, subtotal/gst/delivery/total, status_updated_at
//   contacts — id bigint identity PK, contact_id unique, received_at, name,
//              email, phone, subject, message
//   staff    — email text PK, name, role (owner|admin|viewer), created_at
//
// The Express app keeps seeing the same order/contact objects as the JSON and
// Redis backends; toRow()/fromRow() translate between those shapes and the
// SQL columns.
// ============================================================================

const COLLECTIONS = {
  orders: {
    table: 'orders',
    conflict: 'id',
    key: function (o) { return o && o.orderId ? String(o.orderId) : null; },
    toRow: orderToRow,
    fromRow: orderFromRow
  },
  contacts: {
    table: 'contacts',
    conflict: 'contact_id',
    key: function (c) { return c && c.contactId ? String(c.contactId) : null; },
    toRow: contactToRow,
    fromRow: contactFromRow
  },
  staff: {
    table: 'staff',
    conflict: 'email',
    order: 'created_at.asc',
    key: function (s) { return s && s.email ? String(s.email).toLowerCase() : null; },
    toRow: staffToRow,
    fromRow: staffFromRow
  }
};

function collection(name) {
  const c = COLLECTIONS[name];
  if (!c) throw new Error('Unknown collection: ' + name);
  return c;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// Read at call time (not require time) so dotenv has already run.
function config() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_KEY || '').trim();
  if (!url || !key) return null;
  return { url: url + '/rest/v1', key: key };
}

function isConfigured() {
  return !!config();
}

async function request(path, options) {
  const cfg = config();
  if (!cfg) throw new Error('Supabase is not configured');

  const opts = options || {};
  const headers = {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key,
    Accept: 'application/json'
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.prefer) headers.Prefer = opts.prefer;

  const res = await fetch(cfg.url + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: AbortSignal.timeout(15000)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error('Supabase HTTP ' + res.status + ': ' + text.slice(0, 300));
  }
  return { text: text, headers: res.headers };
}

// ---------------------------------------------------------------------------
// Shape translation
// ---------------------------------------------------------------------------
function orderToRow(o) {
  const customer = o.customer || {};
  const payment = o.payment || {};
  const totals = o.totals || {};
  return {
    id: o.orderId,
    status: o.status || 'received',
    received_at: o.receivedAt || new Date().toISOString(),
    status_updated_at: o.statusUpdatedAt || null,
    customer_name: customer.name || '',
    customer_email: customer.email || '',
    customer_phone: customer.phone || '',
    customer_address: customer.address || '',
    customer_area: customer.area || 'Karachi',
    items: o.items || [],
    payment_method: payment.method || 'cod',
    payment_label: payment.methodLabel || 'Cash on Delivery',
    subtotal: Math.round(Number(totals.subtotal) || 0),
    gst: Math.round(Number(totals.gst) || 0),
    delivery: Math.round(Number(totals.deliveryCharge) || 0),
    total: Math.round(Number(totals.total) || 0)
  };
}

function orderFromRow(r) {
  const order = {
    orderId: r.id,
    status: r.status,
    receivedAt: r.received_at,
    customer: {
      name: r.customer_name,
      email: r.customer_email,
      phone: r.customer_phone,
      address: r.customer_address,
      area: r.customer_area
    },
    items: r.items || [],
    payment: {
      method: r.payment_method,
      methodLabel: r.payment_label
    },
    totals: {
      subtotal: r.subtotal,
      gst: r.gst,
      deliveryCharge: r.delivery,
      total: r.total
    }
  };
  if (r.status_updated_at) order.statusUpdatedAt = r.status_updated_at;
  return order;
}

function contactToRow(c) {
  return {
    contact_id: c.contactId,
    received_at: c.receivedAt || new Date().toISOString(),
    name: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    subject: c.subject || 'general',
    message: c.message || ''
  };
}

function contactFromRow(r) {
  return {
    contactId: r.contact_id,
    receivedAt: r.received_at,
    name: r.name,
    email: r.email,
    phone: r.phone || '',
    subject: r.subject,
    message: r.message
  };
}

function staffToRow(s) {
  return {
    email: String(s.email).toLowerCase(),
    name: s.name || '',
    role: s.role || 'viewer',
    created_at: s.createdAt || new Date().toISOString()
  };
}

function staffFromRow(r) {
  return {
    email: r.email,
    name: r.name || '',
    role: r.role || 'viewer',
    createdAt: r.created_at
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
async function read(name) {
  const c = collection(name);
  const order = c.order || 'received_at.asc';
  const res = await request('/' + c.table + '?select=*&order=' + order);
  const rows = res.text ? JSON.parse(res.text) : [];
  return rows.map(c.fromRow);
}

async function count(name) {
  const c = collection(name);
  const res = await request('/' + c.table + '?select=*', {
    method: 'HEAD',
    prefer: 'count=exact'
  });
  const range = res.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------
async function append(name, item) {
  const c = collection(name);
  await request('/' + c.table, {
    method: 'POST',
    body: c.toRow(item),
    prefer: 'return=minimal'
  });
  return count(name);
}

async function upsertMany(name, items) {
  const c = collection(name);
  const rows = items.map(c.toRow).filter(Boolean);
  if (!rows.length) return;
  await request('/' + c.table + '?on_conflict=' + c.conflict, {
    method: 'POST',
    body: rows,
    prefer: 'resolution=merge-duplicates,return=minimal'
  });
}

async function deleteAll(name) {
  const c = collection(name);
  await request('/' + c.table + '?' + c.conflict + '=not.is.null', {
    method: 'DELETE',
    prefer: 'return=minimal'
  });
}

async function deleteMany(name, ids) {
  const c = collection(name);
  const list = '(' + ids.map(function (id) {
    return '"' + String(id).replace(/"/g, '\\"') + '"';
  }).join(',') + ')';
  await request('/' + c.table + '?' + c.conflict + '=in.' + encodeURIComponent(list), {
    method: 'DELETE',
    prefer: 'return=minimal'
  });
}

// Overwrite a collection: upsert what's given, drop rows that disappeared.
async function save(name, items) {
  const c = collection(name);
  const current = await read(name);
  const keep = new Set(items.map(c.key).filter(Boolean));
  const stale = current.map(c.key).filter(function (id) { return id && !keep.has(id); });

  await upsertMany(name, items);

  if (keep.size === 0) await deleteAll(name);
  else if (stale.length) await deleteMany(name, stale);
}

// Read all, run the mutator (same contract as the other backends), write back.
// Volumes are small (a shop's order history), so re-upserting every row is
// fine and keeps this identical to the JSON/Redis behaviour.
async function update(name, mutator) {
  const c = collection(name);
  const current = await read(name);
  const before = current.map(c.key).filter(Boolean);

  const result = mutator(current);
  const next = result === undefined ? current : result;
  if (!Array.isArray(next)) {
    throw new Error("storage.update('" + name + "') mutator must return an array");
  }

  const keep = new Set(next.map(c.key).filter(Boolean));
  const stale = before.filter(function (id) { return !keep.has(id); });

  await upsertMany(name, next);

  if (keep.size === 0) await deleteAll(name);
  else if (stale.length) await deleteMany(name, stale);

  return next;
}

module.exports = {
  isConfigured: isConfigured,
  request: request,
  read: read,
  append: append,
  save: save,
  update: update,
  upsertMany: upsertMany,
  count: count
};
