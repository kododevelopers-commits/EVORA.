// ============================================================================
// Evora — Backend
// ----------------------------------------------------------------------------
// A small Express server that:
//   1. Serves your existing site (index.html, menu.html, checkout.html, ...)
//   2. Handles orders  (POST /api/orders, GET /api/orders, GET /api/orders/:id,
//                       PATCH /api/orders/:id/status)
//   3. Handles contact (POST /api/contact)
//   4. Exposes the menu (GET /api/menu, GET /api/menu/:id)
//   5. Exposes basic stats for the admin dashboard (GET /api/stats)
//   6. Serves an admin dashboard at /admin.html
//   7. Sends you an email notification for every new order
//   8. Has a /health endpoint for uptime checks
//
// By default orders + contacts are saved to JSON files in data/ and "emails"
// are printed to this terminal. Set EMAIL_PROVIDER + credentials in .env to
// turn on real email sending.
// ============================================================================

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const storage = require('./lib/storage');
const validation = require('./lib/validation');
const { requireAdmin } = require('./lib/auth');
const mailer = require('./lib/mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// The frontend files (index.html, menu.html, checkout.html, admin.html,
// style.css, script.js, admin.js, assets/) live TWO folders up from this
// server/ folder — at the top of the project, with assets/ as a sibling.
const SITE_ROOT = path.join(__dirname, '..', '..');
// The product catalogue lives at the project root (catalog.js) so the browser
// and the server read the SAME copy. Prices used to verify orders therefore
// can never drift from the prices shown on the site.
const CATALOG = require('../../catalog.js');
const ORDERS_KEY = 'orders';
const CONTACTS_KEY = 'contacts';

// Brand logo for the emails. lib/brand.js loads it once at startup and
// embeds it as a base64 data URL, so the logo shows up in any email client
// without needing a public host. It uses the PNG on purpose - Gmail strips
// <svg> images out of HTML mail, so an SVG logo arrives broken.
const brand = require('./lib/brand');
if (brand.info) {
  console.log('📧  Brand logo loaded: ' + brand.info.file + ' (' + brand.info.bytes +
    ' bytes, aspect ' + brand.info.aspect.toFixed(3) + ')');
} else {
  console.log('📧  No brand logo found in assets/ — email will use text wordmark only.');
}
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
// helmet sets a bunch of sensible security headers on every response. The
// crossOriginEmbed config lets the page keep loading images and scripts the
// way it already does.
app.use(
  helmet({
    contentSecurityPolicy: false, // the static site sets its own meta rules
    crossOriginEmbedderPolicy: false
  })
);

// CORS is restricted on purpose. The frontend is served from THIS server, so
// same-origin requests (what your own pages make) never need CORS headers —
// the middleware below only kicks in for cross-origin calls. If you host the
// frontend somewhere else, list those origins in CORS_ORIGINS (comma
// separated) in .env, e.g.:
//   CORS_ORIGINS=https://www.evora.example,https://evora.example
// Without that setting, other websites get no CORS headers and therefore
// can't read API responses from a visitor's browser.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(function (s) { return s.trim().replace(/\/+$/, ''); })
  .filter(Boolean);

// Local development is also allowed by default. The pages may be opened from
// VS Code Live Server (http://localhost:5500), from any other local port, or
// by double-clicking an .html file (which sends the origin "null"). Those can
// only be reached from this machine, so allowing them cannot be used by a
// website on the internet. api-client.js relies on this: it finds the backend
// on http://localhost:3000 and calls it from wherever the page was opened.
//
// Set CORS_ALLOW_LOCAL=false in .env to turn this off and allow only the
// origins listed in CORS_ORIGINS.
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
const allowLocal = String(process.env.CORS_ALLOW_LOCAL || 'true').toLowerCase() !== 'false';

function originAllowed(origin) {
  if (!origin) return false;
  var o = origin.replace(/\/+$/, '');
  if (allowedOrigins.indexOf(o) !== -1) return true;
  if (!allowLocal) return false;
  if (o === 'null') return true;                 // a page opened from file://
  return LOOPBACK_ORIGIN.test(o);
}

app.use(function (req, res, next) {
  const origin = req.get('origin');
  if (origin && originAllowed(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
  }
  // Pre-flight requests never carry a body — answer them here.
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());  // parses incoming JSON bodies (req.body)

// Never serve the server's own folder. Without this guard, express.static
// would happily hand out assets/server/data/orders.json and contacts.json —
// every customer's name, phone and delivery address — plus the server source.
app.use('/assets/server', function (req, res) {
  res.status(404).type('text/plain').send('Not found');
});

app.use(express.static(SITE_ROOT, { dotfiles: 'ignore' })); // serves your existing HTML/CSS/JS/assets

// A simple request logger so you can see traffic as it happens. Skips the
// static asset noise so the log stays readable.
app.use(function (req, res, next) {
  if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/admin.html') {
    res.on('finish', function () {
      console.log(
        new Date().toISOString(),
        req.method,
        req.path,
        '->',
        res.statusCode
      );
    });
  }
  next();
});

// Rate limits — protect the write endpoints (orders, contact, status updates)
// from being flooded. Read endpoints aren't rate-limited because the dashboard
// polls them.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // 30 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a few minutes and try again.' }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                   // 5 contact messages per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages — please try again later.' }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Quick unique-enough order id like "EVR-20260830-9F3A1C". Uses the current
// date + a short random suffix so it's easy to read and very unlikely to
// collide, even with multiple orders in the same second.
function makeOrderId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return 'EVR-' + yyyy + mm + dd + '-' + rand;
}

// Allowed order statuses an admin can set.
const ORDER_STATUSES = ['received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

// ---------------------------------------------------------------------------
// Email (Nodemailer)
// ---------------------------------------------------------------------------
function buildOrderEmailText(order) {
  const lines = [];
  lines.push('New order: ' + order.orderId);
  lines.push('Status:    ' + (order.status || 'received'));
  lines.push('');
  lines.push('Customer: ' + order.customer.name);
  lines.push('Email:    ' + order.customer.email);
  lines.push('Phone:    ' + order.customer.phone);
  lines.push('Address:  ' + order.customer.address + ' (' + order.customer.area + ')');
  lines.push('');
  lines.push('Items:');
  order.items.forEach(function (item) {
    lines.push('  - ' + item.qty + ' x ' + item.name + ' (Rs. ' + item.price + ' each)');
  });
  lines.push('');
  lines.push('Subtotal: Rs. ' + order.totals.subtotal);
  lines.push('Tax:      Rs. ' + order.totals.gst);
  lines.push('Delivery: Rs. ' + order.totals.deliveryCharge);
  lines.push('Total:    Rs. ' + order.totals.total);
  lines.push('');
  lines.push('Payment method: ' + order.payment.methodLabel);
  return lines.join('\n');
}

function buildContactEmailText(contact) {
  return [
    'New contact submission: ' + contact.contactId,
    '',
    'From:    ' + contact.name + ' <' + contact.email + '>',
    'Phone:   ' + (contact.phone || '—'),
    'Subject: ' + contactSubjectLabel(contact.subject),
    '',
    'Message:',
    contact.message,
    '',
    '---',
    'Reply directly to this email to answer ' + contact.name + '.'
  ].join('\n');
}

// Friendly labels for the contact form's subject dropdown.
const CONTACT_SUBJECT_LABELS = {
  general: 'General Inquiry',
  order: 'Order Question',
  complaint: 'Complaint',
  feedback: 'Feedback',
  partnership: 'Partnership / Wholesale'
};

function contactSubjectLabel(subject) {
  return CONTACT_SUBJECT_LABELS[subject] || 'Message';
}

// Store-facing email for a complaint or enquiry. The customer is set as the
// reply-to address, and their details are repeated in the body, so the shop
// can answer straight from their inbox without opening the dashboard.
function buildContactEmailHtml(contact) {
  const name = escHtml(contact.name);
  const email = escHtml(contact.email);
  const phone = escHtml(contact.phone || 'Not provided');
  const label = escHtml(contactSubjectLabel(contact.subject));
  const ref = escHtml(contact.contactId);
  const message = escHtml(contact.message).replace(/\n/g, '<br>');
  const replyHref = 'mailto:' + email +
    '?subject=' + encodeURIComponent('Re: Your Evora ' + contactSubjectLabel(contact.subject) + ' (' + contact.contactId + ')');

  const isComplaint = contact.subject === 'complaint';
  const accent = isComplaint ? '#dc2626' : '#e4002b';

  return [
'<!DOCTYPE html>',
'<html lang="en">',
'<head>',
'<meta charset="UTF-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>' + label + ' from ' + name + '</title>',
'</head>',
'<body style="margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Arial, sans-serif; color:#1f2937;">',
'  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5; padding:32px 16px;">',
'    <tr><td align="center">',
'      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06);">',
'        <tr><td style="padding:28px 28px 0 28px;">',
'          ' + brand.logoHtml({ height: 40, accent: accent }),
'          <div style="font-size:11px; color:#9ca3af; letter-spacing:0.5px; margin-top:6px; text-transform:uppercase;">' + (isComplaint ? 'Customer complaint' : 'Customer message') + '</div>',
'        </td></tr>',
'        <tr><td style="padding:24px 28px 0 28px;">',
'          <h1 style="margin:0; font-size:22px; font-weight:700; color:#111827;">' + label + ' from ' + name + '</h1>',
'          <p style="margin:8px 0 0 0; color:#6b7280; font-size:13px; line-height:1.5;">Reference: ' + ref + '</p>',
'        </td></tr>',
'        <tr><td style="padding:20px 28px 0 28px;">',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb; border-radius:8px; padding:16px;">',
'            <tr><td style="padding:3px 0; font-size:12px; color:#6b7280;">Email</td><td align="right" style="padding:3px 0; font-size:13px; color:#1f2937; font-weight:600;">' + email + '</td></tr>',
'            <tr><td style="padding:3px 0; font-size:12px; color:#6b7280;">Phone</td><td align="right" style="padding:3px 0; font-size:13px; color:#1f2937; font-weight:600;">' + phone + '</td></tr>',
'            <tr><td style="padding:3px 0; font-size:12px; color:#6b7280;">Type</td><td align="right" style="padding:3px 0; font-size:13px; color:#1f2937; font-weight:600;">' + label + '</td></tr>',
'          </table>',
'        </td></tr>',
'        <tr><td style="padding:20px 28px 0 28px;">',
'          <div style="font-size:11px; color:#9ca3af; letter-spacing:1.2px; font-weight:600; padding-bottom:8px;">THEIR MESSAGE</div>',
'          <div style="font-size:14px; color:#1f2937; line-height:1.6; white-space:normal;">' + message + '</div>',
'        </td></tr>',
'        <tr><td style="padding:24px 28px 28px 28px;" align="center">',
'          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>',
'            <td align="center" bgcolor="#1f2937" style="border-radius:8px;">',
'              <a href="' + replyHref + '" style="display:inline-block; padding:14px 32px; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; border-radius:8px;">Reply to ' + name + '</a>',
'            </td>',
'          </tr></table>',
'          <p style="margin:14px 0 0 0; color:#9ca3af; font-size:12px;">Just hit Reply on this email — it goes straight to ' + email + '.</p>',
'        </td></tr>',
'      </table>',
'    </td></tr>',
'  </table>',
'</body>',
'</html>'
  ].join('\n');
}

// Store-facing order notification. Like the complaint email it is addressed
// to the shop with the customer as reply-to, and it repeats the customer's
// contact details so a reply can be written without opening the dashboard.
function buildOrderEmailHtml(order) {
  const c = order.customer;
  const orderId = escHtml(order.orderId);
  const name = escHtml(c.name);
  const email = escHtml(c.email);
  const phone = escHtml(c.phone);
  const address = escHtml(c.address + ', ' + c.area);
  const placed = escHtml(fmtDateTime(order.receivedAt));
  const method = escHtml(order.payment.methodLabel || order.payment.method);
  const replyHref = 'mailto:' + email +
    '?subject=' + encodeURIComponent('Re: Your Evora order ' + order.orderId);

  const rows = order.items.map(function (it) {
    return '            <tr>' +
      '              <td style="padding:8px 0; font-size:13px; color:#1f2937; border-bottom:1px solid #e5e7eb;">' + escHtml(it.qty) + ' &times; ' + escHtml(it.name) + '</td>' +
      '              <td align="right" style="padding:8px 0; font-size:13px; color:#1f2937; font-weight:600; border-bottom:1px solid #e5e7eb;">Rs. ' + (it.qty * it.price).toLocaleString('en-US') + '</td>' +
      '            </tr>';
  }).join('\n');

  return [
'<!DOCTYPE html>',
'<html lang="en">',
'<head>',
'<meta charset="UTF-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>New order ' + orderId + '</title>',
'</head>',
'<body style="margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Arial, sans-serif; color:#1f2937;">',
'  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5; padding:32px 16px;">',
'    <tr><td align="center">',
'      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06);">',
'        <tr><td style="padding:28px 28px 0 28px;">',
'          ' + brand.logoHtml({ height: 40 }),
'          <div style="font-size:11px; color:#9ca3af; letter-spacing:0.5px; margin-top:6px; text-transform:uppercase;">New order</div>',
'        </td></tr>',
'        <tr><td style="padding:24px 28px 0 28px;">',
'          <h1 style="margin:0; font-size:22px; font-weight:700; color:#111827;">Order ' + orderId + '</h1>',
'          <p style="margin:8px 0 0 0; color:#6b7280; font-size:13px;">Placed ' + placed + ' &middot; ' + method + '</p>',
'        </td></tr>',
'        <tr><td style="padding:20px 28px 0 28px;">',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb; border-radius:8px; padding:16px;">',
'            <tr><td style="padding:3px 0; font-size:12px; color:#6b7280;">Customer</td><td align="right" style="padding:3px 0; font-size:13px; color:#1f2937; font-weight:600;">' + name + '</td></tr>',
'            <tr><td style="padding:3px 0; font-size:12px; color:#6b7280;">Email</td><td align="right" style="padding:3px 0; font-size:13px; color:#1f2937; font-weight:600;">' + email + '</td></tr>',
'            <tr><td style="padding:3px 0; font-size:12px; color:#6b7280;">Phone</td><td align="right" style="padding:3px 0; font-size:13px; color:#1f2937; font-weight:600;">' + phone + '</td></tr>',
'            <tr><td style="padding:3px 0; font-size:12px; color:#6b7280;">Address</td><td align="right" style="padding:3px 0; font-size:13px; color:#1f2937; font-weight:600;">' + address + '</td></tr>',
'          </table>',
'        </td></tr>',
'        <tr><td style="padding:20px 28px 0 28px;">',
'          <div style="font-size:11px; color:#9ca3af; letter-spacing:1.2px; font-weight:600; padding-bottom:8px;">ITEMS</div>',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">',
rows,
'          </table>',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:12px;">',
'            <tr><td style="padding:4px 0; font-size:13px; color:#6b7280;">Subtotal</td><td align="right" style="padding:4px 0; font-size:13px; color:#1f2937;">Rs. ' + order.totals.subtotal.toLocaleString('en-US') + '</td></tr>',
'            <tr><td style="padding:4px 0; font-size:13px; color:#6b7280;">GST (18%)</td><td align="right" style="padding:4px 0; font-size:13px; color:#1f2937;">Rs. ' + order.totals.gst.toLocaleString('en-US') + '</td></tr>',
'            <tr><td style="padding:4px 0; font-size:13px; color:#6b7280;">Delivery</td><td align="right" style="padding:4px 0; font-size:13px; color:#1f2937;">Rs. ' + order.totals.deliveryCharge.toLocaleString('en-US') + '</td></tr>',
'            <tr><td style="padding:8px 0 0 0; font-size:16px; font-weight:700; color:#111827; border-top:2px solid #e5e7eb;">Total</td><td align="right" style="padding:8px 0 0 0; font-size:16px; font-weight:700; color:#e4002b; border-top:2px solid #e5e7eb;">Rs. ' + order.totals.total.toLocaleString('en-US') + '</td></tr>',
'          </table>',
'        </td></tr>',
'        <tr><td style="padding:24px 28px 28px 28px;" align="center">',
'          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>',
'            <td align="center" bgcolor="#1f2937" style="border-radius:8px;">',
'              <a href="' + replyHref + '" style="display:inline-block; padding:14px 32px; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; border-radius:8px;">Reply to ' + name + '</a>',
'            </td>',
'          </tr></table>',
'          <p style="margin:14px 0 0 0; color:#9ca3af; font-size:12px;">Just hit Reply on this email — it goes straight to ' + email + '.</p>',
'        </td></tr>',
'      </table>',
'    </td></tr>',
'  </table>',
'</body>',
'</html>'
  ].join('\n');
}

// Customer-facing order confirmation. Different tone from the store's
// internal notification: friendly, organized with a clear summary, and tells
// the customer what happens next.
function buildCustomerOrderEmailText(order) {
  const c = order.customer;
  const placed = new Date(order.receivedAt);
  const placedStr = isNaN(placed.getTime())
    ? order.receivedAt
    : placed.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  // Pad the item lines so the prices line up nicely:
  //   2x Classic Crew Neck Tee ............ Rs. 1,899
  const lines = [];
  const labelWidth = 36;
  order.items.forEach(function (it) {
    const label = it.qty + ' x ' + it.name;
    const padded = (label + ' ' + '.'.repeat(labelWidth)).slice(0, labelWidth);
    const lineTotal = it.qty * it.price;
    lines.push(padded + ' Rs. ' + lineTotal.toLocaleString('en-US'));
  });
  const itemsBlock = lines.join('\n');

  const isCOD = (order.payment && order.payment.method === 'cod');
  const payLine = isCOD
    ? 'You\'ll pay Rs. ' + Number(order.totals.total).toLocaleString('en-US') +
      ' in cash when your order arrives.'
    : 'Your payment of Rs. ' + Number(order.totals.total).toLocaleString('en-US') +
      ' via ' + (order.payment.methodLabel || 'your selected method') + ' is being confirmed.';

  return [
    'Hi ' + c.name + ',',
    '',
    'Thanks for ordering from Evora! We\'ve received your order and it\'s being prepared for dispatch.',
    '',
    'ORDER #' + order.orderId,
    'Placed on ' + placedStr,
    '',
    'YOUR ITEMS',
    '----------------------------------------',
    itemsBlock,
    '----------------------------------------',
    '',
    'Subtotal .............. Rs. ' + Number(order.totals.subtotal).toLocaleString('en-US'),
    'GST (18%) .............. Rs. ' + Number(order.totals.gst).toLocaleString('en-US'),
    'Delivery .............. Rs. ' + Number(order.totals.deliveryCharge).toLocaleString('en-US'),
    '----------------------------------------',
    'TOTAL ................. Rs. ' + Number(order.totals.total).toLocaleString('en-US'),
    '',
    'PAYMENT',
    'Method: ' + (order.payment.methodLabel || 'Cash on Delivery'),
    payLine,
    '',
    'DELIVERING TO',
    c.name,
    c.address,
    c.area,
    'Phone: ' + c.phone,
    '',
    'WHAT HAPPENS NEXT',
    '1. We confirm your order and start packing it.',
    '2. The courier picks up your parcel and heads to you.',
    '3. ' + (isCOD ? 'You hand over the cash on arrival.' : 'You\'ll get a payment prompt on your phone.'),
    '',
    'Need to change something? Call us at 0334-3745379 or reply to this email with your order number.',
    '',
    '— Evora',
    '  Modern clothing, made for everyday life.',
    '  (Build By KODO - kododevelopers@gmail.com)'
  ].join('\n');
}

// Small helpers so the HTML template stays readable.
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = function (x) { return String(x).padStart(2, '0'); };
  const hour12 = ((d.getHours() + 11) % 12) + 1;
  const ampm = d.getHours() < 12 ? 'AM' : 'PM';
  return d.getDate() + ' ' + months[d.getMonth()] + ', ' + d.getFullYear() +
         ' - ' + hour12 + ':' + pad(d.getMinutes()) + ' ' + ampm;
}

// HTML version of the customer confirmation email. Built with table-based
// layout + inline CSS because most email clients (Gmail, Outlook, etc.)
// don't support modern layout tools. This mirrors a clean branded
// template: header → greeting → green "Order Received" pill → icon rows
// for order details → items table → dark "Total Paid" bar → CTA button →
// branded footer.
function buildCustomerOrderEmailHtml(order) {
  const c = order.customer;
  const baseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const orderId = escHtml(order.orderId);

  // Build the brand header — the real logo artwork, or a text wordmark if the
  // artwork could not be loaded.
  const brandHeader = brand.logoHtml({ height: 46, maxWidth: 260 });
  const name = escHtml(c.name);
  const placed = escHtml(fmtDateTime(order.receivedAt));
  const address = escHtml(c.address + ', ' + c.area);
  const phone = escHtml(c.phone);
  const isCOD = (order.payment && order.payment.method === 'cod');

  // Items table rows
  const itemsRows = order.items.map(function (it) {
    return '<tr>' +
      '<td style="padding:10px 0; font-size:14px; color:#1f2937; border-bottom:1px solid #f1f2f4;">' +
        '<div style="font-weight:600;">' + escHtml(it.name) + '</div>' +
        '<div style="font-size:12px; color:#9ca3af;">Qty ' + escHtml(it.qty) + '</div>' +
      '</td>' +
      '<td align="right" style="padding:10px 0; font-size:14px; color:#1f2937; font-weight:600; border-bottom:1px solid #f1f2f4;">' +
        'Rs. ' + fmtMoney(it.qty * it.price) +
      '</td>' +
    '</tr>';
  }).join('');

  return [
'<!DOCTYPE html>',
'<html lang="en">',
'<head>',
'<meta charset="UTF-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>Order Confirmation</title>',
'</head>',
'<body style="margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Arial, sans-serif; color:#1f2937;">',
'  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5; padding:32px 16px;">',
'    <tr><td align="center">',
'      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06);">',

'        <!-- Header -->',
'        <tr><td style="padding:28px 28px 0 28px;">',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>',
'            <td style="vertical-align:middle;">',
              brandHeader,
'              <div style="font-size:11px; color:#9ca3af; letter-spacing:0.5px; margin-top:6px; text-transform:uppercase;">Order Confirmation</div>',
'            </td>',
'            <td align="right" style="vertical-align:middle; font-size:28px; line-height:1;">👕</td>',
'          </tr></table>',
'        </td></tr>',

'        <!-- Greeting -->',
'        <tr><td style="padding:28px 28px 8px 28px;">',
'          <h1 style="margin:0; font-size:26px; font-weight:700; color:#111827;">Hey ' + name + ',</h1>',
'          <p style="margin:8px 0 0 0; color:#6b7280; font-size:14px; line-height:1.5;">Thanks for your order! We\'ve received it at Evora and it\'s being prepared for dispatch.</p>',
'        </td></tr>',

'        <!-- Green status pill -->',
'        <tr><td style="padding:16px 28px;">',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ecfdf5; border-radius:8px;"><tr>',
'            <td style="padding:14px 18px;">',
'              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>',
'                <td style="width:28px; height:28px; background:#10b981; border-radius:50%; text-align:center; vertical-align:middle; color:#ffffff; font-weight:700; font-size:14px; line-height:28px;">&#10003;</td>',
'                <td style="padding-left:12px; color:#065f46; font-weight:600; font-size:15px;">Order Received</td>',
'              </tr></table>',
'            </td>',
'          </tr></table>',
'        </td></tr>',

'        <!-- Order details with icons -->',
'        <tr><td style="padding:8px 28px 4px 28px;">',
'          <div style="font-size:11px; color:#9ca3af; letter-spacing:1.2px; font-weight:600; padding:12px 0 8px 0;">ORDER DETAILS</div>',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">',
'            <tr>',
'              <td style="padding:8px 0; font-size:16px; color:#6b7280; width:24px; vertical-align:top; line-height:1.4;">📋</td>',
'              <td style="padding:8px 0; font-size:13px; color:#1f2937; vertical-align:top;">',
'                <div style="color:#9ca3af; font-size:10px; letter-spacing:0.8px; font-weight:600; text-transform:uppercase;">Order ID</div>',
'                <div style="font-weight:600; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:14px;">' + orderId + '</div>',
'              </td>',
'            </tr>',
'            <tr>',
'              <td style="padding:8px 0; font-size:16px; color:#6b7280; width:24px; vertical-align:top; line-height:1.4;">🕐</td>',
'              <td style="padding:8px 0; font-size:13px; color:#1f2937; vertical-align:top;">',
'                <div style="color:#9ca3af; font-size:10px; letter-spacing:0.8px; font-weight:600; text-transform:uppercase;">Order Placed</div>',
'                <div style="font-weight:600;">' + placed + '</div>',
'              </td>',
'            </tr>',
'            <tr>',
'              <td style="padding:8px 0; font-size:16px; color:#6b7280; width:24px; vertical-align:top; line-height:1.4;">📍</td>',
'              <td style="padding:8px 0; font-size:13px; color:#1f2937; vertical-align:top;">',
'                <div style="color:#9ca3af; font-size:10px; letter-spacing:0.8px; font-weight:600; text-transform:uppercase;">Delivery Address</div>',
'                <div style="font-weight:600;">' + address + '</div>',
'              </td>',
'            </tr>',
'          </table>',
'        </td></tr>',

'        <!-- Items table -->',
'        <tr><td style="padding:16px 28px 8px 28px;">',
'          <div style="font-size:11px; color:#9ca3af; letter-spacing:1.2px; font-weight:600; padding:8px 0 4px 0;">YOUR ORDER</div>',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">',
'            <thead>',
'              <tr>',
'                <th align="left" style="padding:6px 0; font-size:11px; color:#9ca3af; letter-spacing:0.5px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Item</th>',
'                <th align="right" style="padding:6px 0; font-size:11px; color:#9ca3af; letter-spacing:0.5px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Price</th>',
'              </tr>',
'            </thead>',
'            <tbody>',
              itemsRows,
'            </tbody>',
'          </table>',
'        </td></tr>',

'        <!-- Totals -->',
'        <tr><td style="padding:8px 28px 24px 28px;">',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">',
'            <tr>',
'              <td style="padding:5px 0; color:#6b7280; font-size:13px;">Subtotal</td>',
'              <td align="right" style="padding:5px 0; color:#1f2937; font-size:13px;">Rs. ' + fmtMoney(order.totals.subtotal) + '</td>',
'            </tr>',
'            <tr>',
'              <td style="padding:5px 0; color:#6b7280; font-size:13px;">GST (18%)</td>',
'              <td align="right" style="padding:5px 0; color:#1f2937; font-size:13px;">Rs. ' + fmtMoney(order.totals.gst) + '</td>',
'            </tr>',
'            <tr>',
'              <td style="padding:5px 0; color:#6b7280; font-size:13px;">Delivery Fee</td>',
'              <td align="right" style="padding:5px 0; color:#1f2937; font-size:13px;">Rs. ' + fmtMoney(order.totals.deliveryCharge) + '</td>',
'            </tr>',
'          </table>',
'          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px; background:#1f2937; border-radius:8px;">',
'            <tr>',
'              <td style="padding:14px 18px; color:#ffffff; font-weight:600; font-size:14px;">Total Paid</td>',
'              <td align="right" style="padding:14px 18px; color:#ffffff; font-weight:700; font-size:18px;">Rs. ' + fmtMoney(order.totals.total) + '</td>',
'            </tr>',
'          </table>',
'          <p style="margin:10px 0 0 0; font-size:12px; color:#9ca3af;">' +
            (isCOD
              ? 'You\'ll pay Rs. ' + fmtMoney(order.totals.total) + ' in cash when your order arrives.'
              : 'Your ' + escHtml(order.payment.methodLabel || 'payment') + ' payment of Rs. ' + fmtMoney(order.totals.total) + ' is being confirmed.') +
'          </p>',
'        </td></tr>',

'        <!-- CTA button -->',
'        <tr><td style="padding:0 28px 20px 28px;" align="center">',
'          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>',
'            <td align="center" bgcolor="#1f2937" style="border-radius:8px;">',
'              <a href="' + baseUrl + '/?order=' + orderId + '" target="_blank" style="display:inline-block; padding:14px 36px; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; border-radius:8px;">Track Your Order</a>',
'            </td>',
'          </tr></table>',
'          <p style="margin:14px 0 0 0; color:#9ca3af; font-size:12px;">Questions? Call us at <a href="tel:0334-3745379" style="color:#e4002b; text-decoration:none; font-weight:600;">0334-3745379</a></p>',
'        </td></tr>',

'        <!-- Footer -->',
'        <tr><td style="padding:0 28px 28px 28px; text-align:center;">',
'          <p style="margin:0; color:#9ca3af; font-size:12px;">Until next time,</p>',
'          <p style="margin:4px 0 0 0; color:#e4002b; font-size:16px; font-weight:700;">Evora Team</p>',
'          <p style="margin:14px 0 0 0; color:#cbd5e1; font-size:11px;">This is a portfolio demo &mdash; no real orders are dispatched.</p>',
'        </td></tr>',

'      </table>',
'    </td></tr>',
'  </table>',
'</body>',
'</html>'
  ].join('\n');
}

// The address the shop is reached at. It receives every order notification
// and every complaint, and it is the reply-to address on the emails we send
// out to customers, so a customer's "Reply" lands in the right inbox.
function STORE_EMAIL() {
  return mailer.storeEmail();
}

// The address emails are sent FROM. With Gmail this is the same account as
// the shop; with other providers it is whatever the provider asks for.
function fromAddress() {
  return mailer.fromAddress();
}

// Send an email to an arbitrary recipient. If no transport is configured,
// the email is just printed to the terminal so you can still see the flow.
// Either way, a failure here never throws back to the caller — a failed
// email must never break the order/contact that triggered it.
//
// `html` is optional. If provided, the email is sent as text/html with the
// `text` part as a fallback for clients that don't render HTML.
//
// `options.replyTo` is the address a "Reply" in the recipient's mail client
// goes to. For complaints and orders that is the customer, so the shop can
// answer them straight from their inbox.
async function sendEmailTo(to, subject, text, html, options) {
  return mailer.sendEmailTo(to, subject, text, html, options);
}

// Thin wrapper kept for the existing "store notification" callers —
// sends to NOTIFY_EMAIL from .env.
async function sendNotificationEmail(subject, text, html, options) {
  return mailer.sendNotificationEmail(subject, text, html, options);
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/health', function (req, res) {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
app.get('/api/menu', function (req, res) {
  // ?category=men filter
  const filter = (req.query.category || '').toLowerCase();
  const items = CATALOG.items.filter(function (it) {
    return !filter || filter === 'all' || it.category === filter;
  });
  res.json({ categories: CATALOG.categories, items: items });
});

app.get('/api/menu/:id', function (req, res) {
  const item = CATALOG.items.find(function (it) { return it.id === req.params.id; });
  if (!item) return res.status(404).json({ error: 'Menu item not found.' });
  res.json(item);
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

// Place a new order (called by checkout.html)
app.post('/api/orders', writeLimiter, async function (req, res) {
  const body = req.body || {};
  const customer = body.customer || {};
  const items = body.items || [];
  const payment = body.payment || {};
  // Note: body.totals is deliberately ignored — totals are recomputed below.

  // ----- Validation -----
  const fieldErrors = validation.validateFields(customer, validation.customerRules);
  fieldErrors.push(...validation.validateFields({ items: items }, validation.itemsRules()));

  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const itemError = validation.validateItem(items[i]);
      if (itemError) fieldErrors.push('items[' + i + ']: ' + itemError);
    }
  }

  if (fieldErrors.length > 0) {
    return res.status(400).json({ error: 'Invalid order', details: fieldErrors });
  }

  // ----- Server-side pricing -----
  // NEVER trust prices or totals sent by the browser — anyone can edit them
  // with devtools. We recompute everything from our own catalog.js. The client
  // still sends name/qty (and its own price, which we ignore).
  const GST_RATE = 0.18;
  const DELIVERY_CHARGE = 200;

  // Prices come from the shared catalogue required at startup.
  const menuItems = CATALOG.items;

  const priceLookup = {};
  menuItems.forEach(function (m) { priceLookup[m.name.toLowerCase()] = m.price; });

  const cleanItems = [];
  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    const name = validation.trim(items[i].name);
    const qty = Number(items[i].qty);
    const menuPrice = priceLookup[name.toLowerCase()];
    if (menuPrice === undefined) {
      return res.status(400).json({
        error: 'Invalid order',
        details: ['items[' + i + ']: unknown item "' + name + '"']
      });
    }
    subtotal += menuPrice * qty;
    cleanItems.push({ name: name, qty: qty, price: menuPrice });
  }

  const gst = Math.round(subtotal * GST_RATE);
  const grandTotal = subtotal + gst + DELIVERY_CHARGE;

  // Normalize the customer fields so what's stored is consistent.
  const cleanCustomer = {
    name: validation.trim(customer.name),
    email: validation.trim(customer.email).toLowerCase(),
    phone: validation.trim(customer.phone),
    address: validation.trim(customer.address),
    area: validation.trim(customer.area) || 'Karachi'
  };

  const order = {
    orderId: makeOrderId(),
    status: 'received',
    receivedAt: new Date().toISOString(),
    customer: cleanCustomer,
    items: cleanItems,
    payment: {
      method: payment.method || 'cod',
      methodLabel: payment.methodLabel || 'Cash on Delivery'
    },
    totals: {
      subtotal: subtotal,
      gst: gst,
      deliveryCharge: DELIVERY_CHARGE,
      total: grandTotal
    }
  };

  try {
    await storage.append(ORDERS_KEY, order);
    // Both emails must finish before the response goes out. On a serverless
    // host (Netlify) the function is frozen as soon as it responds, so a
    // fire-and-forget send would never reach the mail provider. A failure
    // here still never affects the order itself.
    // The store (NOTIFY_EMAIL) and the customer both get a copy, and the
    // customer is the reply-to address on the store's copy so a reply can be
    // written straight from the inbox.
    await Promise.allSettled([
      sendNotificationEmail(
        'New Evora order — ' + order.orderId,
        buildOrderEmailText(order),
        buildOrderEmailHtml(order),
        { replyTo: order.customer.email }
      ),
      sendEmailTo(
        order.customer.email,
        'Your Evora order #' + order.orderId + ' is confirmed',
        buildCustomerOrderEmailText(order),
        buildCustomerOrderEmailHtml(order),
        { replyTo: STORE_EMAIL() }
      )
    ]);

    res.status(201).json({
      success: true,
      orderId: order.orderId,
      status: order.status
    });
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ error: 'Something went wrong saving your order. Please try again.' });
  }
});

// Look up one order by its id (e.g. "EVR-20260830-9F3A1C"). Public so a
// customer can check their order status from a confirmation page later.
app.get('/api/orders/:id', function (req, res) {
  storage.read(ORDERS_KEY).then(function (orders) {
    const order = orders.find(function (o) { return o.orderId === req.params.id; });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(order);
  }).catch(function (err) {
    console.error('Error reading orders:', err);
    res.status(500).json({ error: 'Could not read orders.' });
  });
});

// List all orders. Admin-only: the response includes every customer's name,
// email, phone and address, so it must never be public. (The customer-facing
// single-order lookup stays public below — it needs the exact order id.)
app.get('/api/orders', requireAdmin, function (req, res) {
  storage.read(ORDERS_KEY).then(function (orders) {
    // Newest first
    const sorted = orders.slice().sort(function (a, b) {
      return (b.receivedAt || '').localeCompare(a.receivedAt || '');
    });
    // ?status= filter (e.g. status=preparing)
    const filter = req.query.status;
    const filtered = filter ? sorted.filter(function (o) { return o.status === filter; }) : sorted;
    res.json(filtered);
  }).catch(function (err) {
    console.error('Error reading orders:', err);
    res.status(500).json({ error: 'Could not read orders.' });
  });
});

// Update an order's status (admin). Admin-only.
app.patch('/api/orders/:id/status', requireAdmin, writeLimiter, function (req, res) {
  const newStatus = (req.body && req.body.status) || '';
  if (!ORDER_STATUSES.includes(newStatus)) {
    return res.status(400).json({
      error: 'Invalid status. Allowed: ' + ORDER_STATUSES.join(', ')
    });
  }

  storage.update(ORDERS_KEY, function (orders) {
    const idx = orders.findIndex(function (o) { return o.orderId === req.params.id; });
    if (idx === -1) return orders; // unchanged
    orders[idx].status = newStatus;
    orders[idx].statusUpdatedAt = new Date().toISOString();
    return orders;
  }).then(function (orders) {
    const updated = orders.find(function (o) { return o.orderId === req.params.id; });
    if (!updated) return res.status(404).json({ error: 'Order not found.' });
    res.json({ success: true, order: updated });
  }).catch(function (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Could not update order status.' });
  });
});

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------
app.post('/api/contact', contactLimiter, async function (req, res) {
  const body = req.body || {};

  // Required fields
  const fieldErrors = validation.validateFields(body, [
    { key: 'name',    label: 'name',    check: v => validation.nonEmpty(validation.trim(v)) && validation.trim(v).length <= validation.MAX_NAME },
    { key: 'email',   label: 'email',   check: v => validation.isEmail(v) },
    { key: 'message', label: 'message', check: v => validation.nonEmpty(validation.trim(v)) && validation.trim(v).length <= validation.MAX_MESSAGE }
  ]);
  // Phone is optional for the contact form
  if (body.phone && !validation.isPhone(body.phone)) {
    fieldErrors.push('phone — use 10–15 digits, dashes/spaces ok');
  }
  // Subject is optional (default: "general")
  const subject = validation.trim(body.subject) || 'general';

  if (fieldErrors.length > 0) {
    return res.status(400).json({ error: 'Invalid submission', details: fieldErrors });
  }

  const contact = {
    contactId: 'CT-' + Date.now().toString(36).toUpperCase() + '-' +
               Math.random().toString(16).slice(2, 6).toUpperCase(),
    receivedAt: new Date().toISOString(),
    name: validation.trim(body.name),
    email: validation.trim(body.email).toLowerCase(),
    phone: body.phone ? validation.trim(body.phone) : '',
    subject: subject,
    message: validation.trim(body.message)
  };

  try {
    await storage.append(CONTACTS_KEY, contact);
    // Awaited on purpose: serverless hosts freeze the function once the
    // response is sent, so the mail request must complete first. The
    // complaint / enquiry lands in the shop's inbox with the customer as the
    // reply-to address, so pressing Reply answers them directly.
    await sendNotificationEmail(
      contactSubjectLabel(contact.subject) + ' — ' + contact.name + ' (' + contact.contactId + ')',
      buildContactEmailText(contact),
      buildContactEmailHtml(contact),
      { replyTo: contact.email }
    );
    res.status(201).json({ success: true, contactId: contact.contactId });
  } catch (err) {
    console.error('Error saving contact:', err);
    res.status(500).json({ error: 'Could not save your message. Please try again.' });
  }
});

// Admin-only: list contact submissions
app.get('/api/contacts', requireAdmin, function (req, res) {
  storage.read(CONTACTS_KEY).then(function (contacts) {
    const sorted = contacts.slice().sort(function (a, b) {
      return (b.receivedAt || '').localeCompare(a.receivedAt || '');
    });
    res.json(sorted);
  }).catch(function (err) {
    console.error('Error reading contacts:', err);
    res.status(500).json({ error: 'Could not read contacts.' });
  });
});

// ---------------------------------------------------------------------------
// Stats (admin) — basic numbers for the dashboard
// ---------------------------------------------------------------------------
app.get('/api/stats', requireAdmin, function (req, res) {
  Promise.all([storage.read(ORDERS_KEY), storage.read(CONTACTS_KEY)]).then(function (results) {
    const orders = results[0];
    const contacts = results[1];

    const counts = ORDER_STATUSES.reduce(function (acc, s) {
      acc[s] = 0;
      return acc;
    }, {});
    let revenue = 0;
    const itemCounts = {};

    orders.forEach(function (o) {
      counts[o.status] = (counts[o.status] || 0) + 1;
      if (o.status !== 'cancelled') {
        revenue += Number(o.totals && o.totals.total) || 0;
      }
      (o.items || []).forEach(function (it) {
        itemCounts[it.name] = (itemCounts[it.name] || 0) + Number(it.qty || 0);
      });
    });

    const topItems = Object.keys(itemCounts)
      .map(function (k) { return { name: k, qty: itemCounts[k] }; })
      .sort(function (a, b) { return b.qty - a.qty; })
      .slice(0, 10);

    res.json({
      orders: {
        total: orders.length,
        byStatus: counts,
        revenue: Math.round(revenue)
      },
      contacts: {
        total: contacts.length
      },
      topItems: topItems,
      // Whether outgoing email is working, and whether anything failed to
      // send. The dashboard turns this into a red banner so a broken mail
      // setup can never silently swallow a complaint.
      email: mailer.stats()
    });
  }).catch(function (err) {
    console.error('Error computing stats:', err);
    res.status(500).json({ error: 'Could not compute stats.' });
  });
});

// ---------------------------------------------------------------------------
// 404 for unknown /api routes
// ---------------------------------------------------------------------------
app.use('/api', function (req, res) {
  res.status(404).json({ error: 'Not found: ' + req.method + ' ' + req.path });
});

// ---------------------------------------------------------------------------
// Start server + graceful shutdown
// ---------------------------------------------------------------------------
// `require.main === module` means: only listen when this file is the program
// being run (`node server.js`). When something else requires it - a test, a
// script that just wants to render an email - the file loads, the routes are
// registered, but no port is taken.
function startServer() {
  return app.listen(PORT, function () {
    const base = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '') ||
      ('http://localhost:' + PORT);
    console.log('Evora server running at ' + base);
    console.log('  Home:        ' + base + '/');
    console.log('  Menu:        ' + base + '/menu.html');
    console.log('  Checkout:    ' + base + '/checkout.html');
    console.log('  Admin:       ' + base + '/admin.html');
    console.log('  Health:      ' + base + '/health');
    console.log('  Orders JSON: ' + base + '/api/orders');
    console.log('  Menu JSON:   ' + base + '/api/menu');
    console.log('  Storage:     ' + storage.describe());
    printEmailStatus();
  });
}

const server = (require.main === module) ? startServer() : null;

// Show at startup exactly where email is going, so a misconfigured .env is
// obvious before the first order comes in.
function printEmailStatus() {
  console.log('');
  mailer.describeStatus().forEach(function (line) {
    console.log(line);
  });
}

function shutdown(signal) {
  console.log('\n' + signal + ' received — closing server...');
  const done = function () {
    console.log('Server closed. Bye 👋');
    process.exit(0);
  };
  // `server` is null when this file was required instead of run directly.
  if (server) server.close(done);
  else done();
  // If it takes more than 5 seconds, just exit.
  setTimeout(function () { process.exit(1); }, 5000).unref();
}

process.on('SIGINT',  function () { shutdown('SIGINT'); });
process.on('SIGTERM', function () { shutdown('SIGTERM'); });

// Exposed so a test (or a script) can render the exact emails that go out
// without starting a server or sending anything.
module.exports = {
  app: app,
  buildOrderEmailHtml: buildOrderEmailHtml,
  buildCustomerOrderEmailHtml: buildCustomerOrderEmailHtml,
  buildContactEmailHtml: buildContactEmailHtml,
  brand: brand
};
