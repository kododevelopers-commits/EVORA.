// ============================================================================
// auth.js — email + API-key gate for admin-only endpoints
// ----------------------------------------------------------------------------
// The admin dashboard and the order-management endpoints aren't things the
// public should hit. Two things must match before a request gets through:
//
//   1. x-admin-email — must be one of the shop's allowed accounts (the owner
//      and the admins). Override the list with ADMIN_EMAILS (comma-separated)
//      in .env if it ever changes.
//   2. x-admin-key   — the shared secret from ADMIN_API_KEY, compared in
//      constant time so a timing attack can't leak it character by character.
//
// How to use it:
//   1. Set ADMIN_API_KEY in your .env (any random long string).
//   2. Routes that need protection do:
//        app.get('/api/admin/...', requireAdmin, handler)
//   3. The browser sends both values as headers.
//      (A query-string option used to exist too, but it leaked the key into
//      server logs and browser history, so it was removed.)
//
// If ADMIN_API_KEY is empty in .env, admin endpoints refuse all requests
// (fail-closed). That way an empty config never accidentally opens them up.
// ============================================================================

const crypto = require('crypto');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ||
  'evora.reply@gmail.com,kododevelopers@gmail.com,muhammadammarsheikh11@gmail.com'
).split(',').map(function (e) { return e.trim().toLowerCase(); }).filter(Boolean);

function safeEqual(a, b) {
  // crypto.timingSafeEqual requires equal-length buffers; pad to the longer
  // one and always compare that length so a wrong-length key still takes
  // roughly the same time.
  const aBuf = Buffer.from(String(a), 'utf8');
  const bBuf = Buffer.from(String(b), 'utf8');
  const len = Math.max(aBuf.length, bBuf.length);
  const aPad = Buffer.alloc(len);
  const bPad = Buffer.alloc(len);
  aBuf.copy(aPad);
  bBuf.copy(bPad);
  return crypto.timingSafeEqual(aPad, bPad) && aBuf.length === bBuf.length;
}

function getProvidedKey(req) {
  // Only the header is accepted. Reading the key from the query string was
  // removed: URLs end up in server logs, proxies, and browser history.
  const header = req.get('x-admin-key');
  if (header) return header;
  return '';
}

function getProvidedEmail(req) {
  return String(req.get('x-admin-email') || '').trim().toLowerCase();
}

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    return res.status(503).json({
      error: 'Admin endpoints are disabled — set ADMIN_API_KEY in .env to enable them.'
    });
  }

  const email = getProvidedEmail(req);
  if (!email || ADMIN_EMAILS.indexOf(email) === -1) {
    return res.status(403).json({
      error: 'This email is not allowed to access the admin panel.'
    });
  }

  const provided = getProvidedKey(req);
  if (!provided || !safeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized — admin API key required.' });
  }

  next();
}

module.exports = { requireAdmin: requireAdmin, ADMIN_EMAILS: ADMIN_EMAILS };
