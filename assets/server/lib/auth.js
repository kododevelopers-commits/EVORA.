const crypto = require('crypto');
const staff = require('./staff');
const mailer = require('./mailer');

function safeEqual(a, b) {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());
}

async function authRequest(path, body, token) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) throw Object.assign(new Error('Sign-in is not configured.'), { status: 503 });
  const response = await fetch(base + '/auth/v1' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + (token || key), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw Object.assign(new Error('Sign-in request failed.'), { status: [400, 401, 403].includes(response.status) ? 401 : 503 });
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function cookie(req, name) {
  const part = (req.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return part ? part.slice(name.length + 1) : '';
}

function setSession(req, res, session, remember) {
  const options = { httpOnly: true, secure: req.secure, sameSite: 'strict', path: '/api' };
  if (remember) options.maxAge = 30 * 24 * 60 * 60 * 1000;
  res.cookie('evora_access', session.access_token, options);
  res.cookie('evora_refresh', session.refresh_token, options);
  res.cookie('evora_remember', remember ? '1' : '0', options);
}

function clearSession(res) {
  ['evora_access', 'evora_refresh', 'evora_remember'].forEach(name => res.clearCookie(name, { path: '/api', httpOnly: true, sameSite: 'strict' }));
}

function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && origin !== req.protocol + '://' + req.get('host')) return res.status(403).json({ error: 'Open the dashboard on the same site as the API.' });
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site request refused.' });
  next();
}

async function startLogin(req, res) {
  const email = staff.normalizeEmail(req.body && req.body.email);
  const key = req.body && req.body.key;
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return res.status(503).json({ error: 'Admin sign-in is not configured.' });
  if (typeof key !== 'string' || key.length > 512 || !safeEqual(key, expected)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  try {
    if (!await staff.find(email)) return res.status(401).json({ error: 'Email or password is incorrect.' });
    if (!mailer.stats().configured) return res.status(503).json({ error: 'Sign-in email is not configured.' });
    const result = await authRequest('/admin/generate_link', { type: 'magiclink', email });
    const code = result.email_otp;
    if (!code) throw new Error('Missing verification code');
    const sent = await mailer.sendEmailTo(email, 'Your Evora sign-in code', 'Your Evora sign-in code is ' + code + '. Do not share this code. If you did not request it, ignore this email.');
    if (!sent.sent) return res.status(503).json({ error: 'Could not send your sign-in code. Please try again.' });
    res.json({ success: true });
  } catch (err) {
    res.status(503).json({ error: 'Could not start sign-in. Please try again.' });
  }
}

async function verifyLogin(req, res) {
  const body = req.body || {};
  const email = staff.normalizeEmail(body.email);
  if (typeof body.code !== 'string' || !/^\d{6,10}$/.test(body.code)) return res.status(400).json({ error: 'Enter the code from your email.' });
  try {
    const member = await staff.find(email);
    if (!member) return res.status(401).json({ error: 'Sign-in is not allowed.' });
    const session = await authRequest('/verify', { type: 'email', email, token: body.code });
    if (!session.user || staff.normalizeEmail(session.user.email) !== member.email || !session.access_token || !session.refresh_token) throw new Error('Invalid session');
    setSession(req, res, session, body.remember === true);
    res.json(member);
  } catch (err) {
    res.status(err.status === 503 ? 503 : 401).json({ error: 'The code is invalid or expired. Request a new code and try again.' });
  }
}

async function requireAdmin(req, res, next) {
  res.set('Cache-Control', 'private, no-store');
  const access = cookie(req, 'evora_access');
  const refresh = cookie(req, 'evora_refresh');
  if (!access && !refresh) return res.status(401).json({ error: 'Please sign in.' });
  try {
    let user;
    try {
      user = await authRequest('/user', undefined, access);
    } catch (err) {
      if (err.status !== 401 || !refresh) throw err;
      const session = await authRequest('/token?grant_type=refresh_token', { refresh_token: refresh });
      user = session.user;
      setSession(req, res, session, cookie(req, 'evora_remember') === '1');
    }
    const member = user && await staff.find(user.email);
    if (!member) {
      clearSession(res);
      return res.status(401).json({ error: 'Your account no longer has dashboard access.' });
    }
    req.admin = member;
    req.authToken = access;
    next();
  } catch (err) {
    if (err.status === 401) {
      clearSession(res);
      return res.status(401).json({ error: 'Session expired — please sign in again.' });
    }
    res.status(503).json({ error: 'Could not check your session. Please try again.' });
  }
}

async function logout(req, res) {
  const access = cookie(req, 'evora_access');
  const refresh = cookie(req, 'evora_refresh');
  try {
    try {
      if (access) await authRequest('/logout?scope=local', {}, access);
      else if (refresh) throw Object.assign(new Error('Refresh required'), { status: 401 });
    } catch (err) {
      if (err.status !== 401) throw err;
      if (refresh) {
        const session = await authRequest('/token?grant_type=refresh_token', { refresh_token: refresh });
        await authRequest('/logout?scope=local', {}, session.access_token);
      }
    }
  } catch (err) {
    if (err.status !== 401) return res.status(503).json({ error: 'Could not sign out. Please try again.' });
  }
  clearSession(res);
  res.json({ success: true });
}

function requireRole(roles) {
  return function (req, res, next) {
    if (!req.admin || !roles.includes(req.admin.role)) return res.status(403).json({ error: 'Your role does not allow this action.' });
    next();
  };
}

module.exports = { requireAdmin, requireManager: requireRole(['owner', 'admin']), requireOwner: requireRole(['owner']), sameOrigin, startLogin, verifyLogin, logout };
