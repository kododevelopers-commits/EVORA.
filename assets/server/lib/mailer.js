// ============================================================================
// mailer.js — all outgoing email lives here
// ----------------------------------------------------------------------------
// One place that knows how to talk to the mail provider, which address the
// shop is reached at, and how to send a message without ever breaking the
// request that triggered it.
//
// The server and the standalone test-email script both use this module, so
// "npm run test:email" tests exactly the same code path as a live order.
// ============================================================================

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// ---------------------------------------------------------------------------
// Live .env reload
// ---------------------------------------------------------------------------
// The email settings usually change while the server is already running —
// you paste your app password into .env and want it to work straight away.
// So before every send we re-read .env and apply its values.
//
// If there is no .env file at all (a hosting platform that injects real
// environment variables instead), the process environment is used as-is.
// ---------------------------------------------------------------------------
const ENV_PATH = path.join(__dirname, '..', '.env');

const LIVE_ENV_KEYS = [
  'EMAIL_PROVIDER',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'SENDGRID_API_KEY',
  'SENDGRID_FROM_EMAIL',
  'BREVO_SMTP_HOST',
  'BREVO_SMTP_PORT',
  'BREVO_SMTP_USER',
  'BREVO_SMTP_KEY',
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'NOTIFY_EMAIL'
];

function reloadEmailEnv() {
  let parsed;
  try {
    if (!fs.existsSync(ENV_PATH)) return;
    parsed = dotenv.parse(fs.readFileSync(ENV_PATH));
  } catch (e) {
    return;
  }
  LIVE_ENV_KEYS.forEach(function (key) {
    const fileValue = parsed[key];
    // An empty value in the file means "not configured" — leave whatever is
    // already in the environment alone.
    if (fileValue === undefined || fileValue === '') return;
    process.env[key] = fileValue;
  });
}

// The address the shop is reached at. It receives every order notification
// and every complaint, and it is the reply-to address on the emails we send
// out to customers, so a customer's "Reply" lands in the right inbox.
function storeEmail() {
  reloadEmailEnv();
  return (process.env.NOTIFY_EMAIL || 'evora.reply@gmail.com').trim();
}

// The address emails are sent FROM. With Gmail this is the same account as
// the shop; with other providers it is whatever the provider asks for.
function fromAddress() {
  reloadEmailEnv();
  const provider = process.env.EMAIL_PROVIDER;
  let address;
  if (provider === 'sendgrid') {
    address = process.env.SENDGRID_FROM_EMAIL;
  } else if (provider === 'brevo') {
    address = process.env.BREVO_SENDER_EMAIL;
  } else if (provider === 'smtp') {
    address = process.env.SMTP_FROM || process.env.SMTP_USER;
  } else {
    address = process.env.GMAIL_USER;
  }
  address = (address || storeEmail()).trim();
  return { name: 'Evora', address: address };
}

// Build the transport for the configured provider.
// Returns null when no provider is configured — the caller then prints the
// email to the terminal instead of sending it.
function createTransport() {
  reloadEmailEnv();
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  if (provider === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  if (provider === 'brevo') {
    // Brevo's SMTP relay. The SMTP login and the "SMTP key" are both found
    // in the Brevo dashboard under SMTP & API > SMTP. The login is NOT
    // usually your account email, and the key is NOT your Brevo password.
    return nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: String(process.env.BREVO_SMTP_PORT || '587') === '465',
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY
      }
    });
  }

  if (provider === 'smtp') {
    // Any other SMTP provider (Hostinger, Zoho, your own relay, ...).
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Brevo over HTTPS (the API, not SMTP)
// ---------------------------------------------------------------------------
// Many hosts — Render's free tier among them — block outbound SMTP ports
// (25, 465, 587). Brevo's HTTP API uses port 443 like any web request, so it
// works everywhere. It sends the same 300 emails/day on the free plan.
//
// Set BREVO_API_KEY (Brevo dashboard > SMTP & API > API Keys) to use it.
// If only BREVO_SMTP_USER/BREVO_SMTP_KEY are set, the SMTP relay is used.
// ---------------------------------------------------------------------------
function brevoApiConfigured() {
  reloadEmailEnv();
  return process.env.EMAIL_PROVIDER === 'brevo' && !!process.env.BREVO_API_KEY;
}

async function sendViaBrevoApi(to, subject, text, html, opts) {
  reloadEmailEnv();
  const from = fromAddress();
  const payload = {
    sender: { name: from.name, email: from.address },
    to: [{ email: to }],
    subject: subject,
    textContent: text
  };
  if (html) payload.htmlContent = html;
  if (opts.replyTo) payload.replyTo = { email: opts.replyTo };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  });

  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (e) {
    data = { message: raw };
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || 'HTTP ' + res.status;
    throw new Error('Brevo API: ' + message);
  }
  return { messageId: data && data.messageId, provider: 'brevo-api' };
}

// ---------------------------------------------------------------------------
// Delivery tracking
// ---------------------------------------------------------------------------
// A failed email must never be invisible. These counters are exposed through
// /api/stats so the admin dashboard can show a red banner when a complaint
// or an order confirmation could not be sent.
// ---------------------------------------------------------------------------
const delivery = {
  sent: 0,
  failed: 0,
  lastError: null,
  lastFailureAt: null,
  lastSentAt: null
};

function markSent() {
  delivery.sent += 1;
  delivery.lastSentAt = new Date().toISOString();
}

function markFailed(reason) {
  delivery.failed += 1;
  delivery.lastError = reason;
  delivery.lastFailureAt = new Date().toISOString();
}

// A snapshot for the admin dashboard.
function stats() {
  reloadEmailEnv();
  return {
    configured: !!process.env.EMAIL_PROVIDER,
    provider: process.env.EMAIL_PROVIDER || null,
    mode: process.env.EMAIL_PROVIDER === 'brevo'
      ? (process.env.BREVO_API_KEY ? 'brevo-api' : 'brevo-smtp')
      : null,
    from: fromAddress().address,
    store: storeEmail(),
    sent: delivery.sent,
    failed: delivery.failed,
    lastError: delivery.lastError,
    lastFailureAt: delivery.lastFailureAt,
    lastSentAt: delivery.lastSentAt
  };
}

// Send an email to an arbitrary recipient.
//
// `html` is optional. If provided, the email is sent as text/html with the
// `text` part as a fallback for clients that don't render HTML.
//
// `options.replyTo` is the address a "Reply" in the recipient's mail client
// goes to. For complaints and orders that is the customer, so the shop can
// answer them straight from their inbox.
//
// A failure here never throws back to the caller — a failed email must never
// break the order or contact that triggered it.
async function sendEmailTo(to, subject, text, html, options) {
  const opts = options || {};
  if (!to) {
    console.log('📧  No recipient given, skipping email: ' + subject);
    markFailed('no recipient for: ' + subject);
    return { sent: false, reason: 'no-recipient' };
  }

  // Brevo with an API key goes over HTTPS, which works on hosts that block
  // SMTP ports (Render free tier, for instance).
  if (brevoApiConfigured()) {
    try {
      const info = await sendViaBrevoApi(to, subject, text, html, opts);
      console.log('📧  Email sent to ' + to + (opts.replyTo ? ' (reply-to: ' + opts.replyTo + ')' : '') + ' via Brevo API: ' + subject);
      markSent();
      return { sent: true, info: info };
    } catch (err) {
      console.error('Failed to send email to ' + to + ' via Brevo API:', err.message);
      markFailed(err.message);
      return { sent: false, reason: err.message };
    }
  }

  const transporter = createTransport();
  if (!transporter) {
    console.log('\n📧  EMAIL_PROVIDER not set — printing the email instead of sending it:');
    console.log('To: ' + to);
    if (opts.replyTo) console.log('Reply-To: ' + opts.replyTo);
    console.log('----------------------------------------------------------------');
    console.log(subject);
    console.log('--- text ---');
    console.log(text);
    if (html) {
      // Save the HTML to a file in the server folder so the user can open
      // it in a browser and see what the customer would actually receive.
      const previewPath = path.join(__dirname, '..', 'data', 'last-customer-email.html');
      try {
        fs.writeFileSync(previewPath, html, 'utf8');
        console.log('--- html (also saved to ' + previewPath + ') ---');
      } catch (e) {
        console.log('--- html ---');
      }
    }
    console.log('----------------------------------------------------------------\n');
    markFailed('EMAIL_PROVIDER is not set - the email was printed to the console instead of sent');
    return { sent: false, reason: 'no-provider' };
  }

  try {
    const mail = {
      from: fromAddress(),
      to: to,
      subject: subject,
      text: text
    };
    if (html) mail.html = html;
    if (opts.replyTo) mail.replyTo = opts.replyTo;
    const info = await transporter.sendMail(mail);
    console.log('📧  Email sent to ' + to + (opts.replyTo ? ' (reply-to: ' + opts.replyTo + ')' : '') + ': ' + subject);
    markSent();
    return { sent: true, info: info };
  } catch (err) {
    console.error('Failed to send email to ' + to + ':', err.message);
    markFailed(err.message);
    return { sent: false, reason: err.message };
  }
}

// Thin wrapper for the "store notification" callers — sends to NOTIFY_EMAIL.
async function sendNotificationEmail(subject, text, html, options) {
  return sendEmailTo(storeEmail(), subject, text, html, options);
}

// A short status report used at startup and by the test script, so a
// misconfigured .env is obvious before the first order comes in.
function describeStatus() {
  reloadEmailEnv();
  const provider = process.env.EMAIL_PROVIDER;
  if (!provider) {
    return [
      '📧  Email: NOT CONFIGURED — emails are printed to this terminal only.',
      '    Set EMAIL_PROVIDER + credentials in .env to send them for real.'
    ];
  }
  if (provider === 'gmail' && !process.env.GMAIL_APP_PASSWORD) {
    return [
      '📧  Email: provider=gmail but GMAIL_APP_PASSWORD is empty — emails will fail to send.',
      '    Create an App Password: https://myaccount.google.com/apppasswords'
    ];
  }
  if (provider === 'brevo') {
    const missing = [];
    const viaApi = !!process.env.BREVO_API_KEY;
    if (!viaApi) {
      if (!process.env.BREVO_SMTP_USER) missing.push('BREVO_SMTP_USER');
      if (!process.env.BREVO_SMTP_KEY) missing.push('BREVO_SMTP_KEY');
    }
    if (!process.env.BREVO_SENDER_EMAIL) missing.push('BREVO_SENDER_EMAIL');
    if (missing.length) {
      return [
        '📧  Email: provider=brevo but ' + missing.join(', ') + ' is empty — emails will fail to send.',
        '    Brevo dashboard > SMTP & API: create an API key (recommended) or an SMTP key.',
        '    Then add the address under Senders & IPs and put it in BREVO_SENDER_EMAIL.'
      ];
    }
    return [
      '📧  Email: provider=brevo via ' + (viaApi ? 'HTTPS API' : 'SMTP relay') + ', sending as ' + fromAddress().address,
      '    Store inbox (orders + complaints): ' + storeEmail(),
      '    Customers get a copy of their order confirmation.'
    ];
  }
  return [
    '📧  Email: provider=' + provider + ', sending as ' + fromAddress().address,
    '    Store inbox (orders + complaints): ' + storeEmail(),
    '    Customers get a copy of their order confirmation.'
  ];
}

module.exports = {
  createTransport,
  fromAddress,
  storeEmail,
  sendEmailTo,
  sendNotificationEmail,
  describeStatus,
  stats
};
