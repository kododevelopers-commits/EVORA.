// ============================================================================
// customer-auth.js — shopper accounts (Supabase Auth), separate from staff.
// ----------------------------------------------------------------------------
// Customers sign in on account.html with Google or email + password using
// supabase-js in the browser. The browser holds a short-lived access token;
// the server never sees a password. To list a customer's past orders we ask
// Supabase who that token belongs to (/auth/v1/user), require a CONFIRMED
// email, then read orders with the service key and filter by that email.
//
// The anon key is public-safe: RLS is locked on every table (anon/authenticated
// have no grants), so it only lets the browser talk to Supabase Auth — it can
// never read orders, contacts, staff or products directly.
// ============================================================================

'use strict';

function supabaseUrl() {
  return (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
}

function anonKey() {
  return (process.env.SUPABASE_ANON_KEY || '').trim();
}

// What account.html needs to initialise supabase-js. `enabled` is false until
// the owner sets SUPABASE_ANON_KEY, so the page can show a friendly notice
// instead of a broken sign-in form.
function publicConfig() {
  const url = supabaseUrl();
  const key = anonKey();
  return { supabaseUrl: url, supabaseAnonKey: key, enabled: Boolean(url && key) };
}

// Resolve a customer access token to its Supabase user. Throws with a .status
// so the route can answer 401 (bad/expired token) or 503 (not configured /
// Supabase unreachable). The apikey may be the anon key or, server-side only,
// the service key — neither is exposed to the browser by this call.
async function getUser(accessToken) {
  const url = supabaseUrl();
  const key = anonKey() || (process.env.SUPABASE_SERVICE_KEY || '').trim();
  if (!url || !key) throw Object.assign(new Error('Accounts are not configured.'), { status: 503 });
  if (!accessToken) throw Object.assign(new Error('Sign in to continue.'), { status: 401 });

  let response;
  try {
    response = await fetch(url + '/auth/v1/user', {
      headers: { apikey: key, Authorization: 'Bearer ' + accessToken },
      signal: AbortSignal.timeout(15000)
    });
  } catch (err) {
    throw Object.assign(new Error('Could not reach the sign-in service.'), { status: 503 });
  }
  if (!response.ok) {
    throw Object.assign(new Error('Your session has expired. Please sign in again.'), {
      status: [400, 401, 403].includes(response.status) ? 401 : 503
    });
  }
  const user = await response.json();
  if (!user || !user.email) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { status: 401 });
  return user;
}

// A confirmed email is the gate that stops someone registering another
// person's address and reading their orders. Google sign-ins are confirmed
// automatically; email + password accounts must click the confirmation link.
function confirmedEmail(user) {
  if (!user || !user.email) return '';
  if (!(user.email_confirmed_at || user.confirmed_at)) return '';
  return String(user.email).trim().toLowerCase();
}

module.exports = { publicConfig, getUser, confirmedEmail, supabaseUrl, anonKey };