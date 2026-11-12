const storage = require('./storage');
const supabase = require('./supabase-store');

const ROOT_OWNER = 'evora.reply@gmail.com';
const ROLE_ORDER = { owner: 0, admin: 1, viewer: 2 };

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validate(input, adding) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail(400, 'Invalid staff details.');
  const value = {};
  if (adding) {
    value.email = normalizeEmail(input.email);
    if (value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw fail(400, 'Enter a valid email address.');
  }
  if (adding || input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100) throw fail(400, 'Name must contain 1–100 characters.');
    value.name = input.name.trim();
  }
  if (adding || input.role !== undefined) {
    value.role = input.role || (adding ? 'viewer' : '');
    if (!['admin', 'viewer'].includes(value.role)) throw fail(400, 'Choose Admin or Viewer.');
  }
  if (!Object.keys(value).length) throw fail(400, 'No changes supplied.');
  return value;
}

async function list() {
  const members = await storage.read('staff');
  return members.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));
}

async function find(email) {
  const target = normalizeEmail(email);
  return (await list()).find(member => member.email === target) || null;
}

async function add(input) {
  const value = validate(input, true);
  if (await find(value.email)) throw fail(409, 'That email is already on the staff list.');
  const member = { ...value, createdAt: new Date().toISOString() };
  try {
    await storage.append('staff', member);
  } catch (err) {
    if (err.message.startsWith('Supabase HTTP 409')) throw fail(409, 'That email is already on the staff list.');
    throw err;
  }
  return member;
}

async function update(email, input) {
  const target = normalizeEmail(email);
  const changes = validate(input, false);
  if (target === ROOT_OWNER && changes.role) throw fail(400, 'The owner role cannot be changed.');
  if (!await find(target)) throw fail(404, 'Staff member not found.');
  if (storage.usingSupabase()) {
    await supabase.request('/staff?email=eq.' + encodeURIComponent(target), { method: 'PATCH', body: changes });
  } else {
    await storage.update('staff', members => members.map(member => member.email === target ? { ...member, ...changes } : member));
  }
  return find(target);
}

async function remove(email) {
  const target = normalizeEmail(email);
  if (target === ROOT_OWNER) throw fail(400, 'The owner account cannot be removed.');
  if (!await find(target)) throw fail(404, 'Staff member not found.');
  if (storage.usingSupabase()) {
    await supabase.request('/staff?email=eq.' + encodeURIComponent(target), { method: 'DELETE' });
  } else {
    await storage.update('staff', members => members.filter(member => member.email !== target));
  }
}

module.exports = { ROOT_OWNER, normalizeEmail, list, find, add, update, remove };
