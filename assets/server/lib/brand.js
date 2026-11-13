// ============================================================================
// brand.js — the Evora logo, ready for an email
// ----------------------------------------------------------------------------
// The website shows assets/evora-logo.svg (crisp at any size). Email is
// different: Gmail and most other webmail clients strip <svg> images out of
// HTML mail, so an SVG logo arrives as a broken image. That is exactly what
// "the email has no logo" looked like.
//
// So the email uses assets/evora-logo.png - a raster render of the very same
// artwork.
//
// Where that PNG comes from depends on where the backend runs:
//   * PUBLIC_BASE_URL set (Vercel)   -> <base>/assets/evora-logo.png
//   * no PUBLIC_BASE_URL (localhost) -> a base64 data: URL, no host needed
//
// The hosted URL is the one that works in Gmail: Gmail already blocks most
// data: images, which showed up as a broken image with an error. A normal
// https:// image renders the moment the reader allows images.
//
// The PNG is generated from the SVG by tools/render-logo.js.
// ============================================================================

const fs = require('fs');
const path = require('path');

// assets/ lives two folders up from assets/server/lib/ -> project root.
const SITE_ROOT = path.join(__dirname, '..', '..', '..');

let dataUrl = null;
let mime = 'image/png';
let aspect = 4; // width / height of the artwork

// PNG: IHDR is the first chunk - 8 byte signature, 4 byte length, 4 byte
// type, then width and height as 32-bit big-endian integers.
function readPngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// SVG: prefer the viewBox, it describes the artwork itself.
function readSvgSize(buf) {
  const head = buf.toString('utf8').slice(0, 2000);
  const vb = head.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/);
  if (vb) return { width: parseFloat(vb[1]), height: parseFloat(vb[2]) };
  const w = head.match(/\bwidth\s*=\s*["']([\d.]+)/);
  const h = head.match(/\bheight\s*=\s*["']([\d.]+)/);
  if (w && h) return { width: parseFloat(w[1]), height: parseFloat(h[1]) };
  return null;
}

function load() {
  // PNG first ON PURPOSE (see the note at the top of this file). The SVG is
  // still accepted as a fallback for clients that do render it.
  const candidates = [
    { name: 'evora-logo.png', mime: 'image/png' },
    { name: 'evora-logo.svg', mime: 'image/svg+xml' },
    { name: 'logo.png',        mime: 'image/png' },
    { name: 'logo.jpg',        mime: 'image/jpeg' }
  ];
  // Serverless bundles (Vercel) copy included files next to the handler and
  // run with that folder as the working directory, so the repo-relative path
  // does not exist there. Try both.
  const roots = [
    path.join(SITE_ROOT, 'assets'),
    path.join(process.cwd(), 'assets')
  ];
  for (const root of roots) {
    for (const c of candidates) {
      const p = path.join(root, c.name);
      if (!fs.existsSync(p)) continue;
      try {
        const buf = fs.readFileSync(p);
        const size = c.mime === 'image/png' ? readPngSize(buf) : readSvgSize(buf);
        if (size && size.width > 0 && size.height > 0) {
          aspect = size.width / size.height;
        }
        dataUrl = 'data:' + c.mime + ';base64,' + buf.toString('base64');
        mime = c.mime;
        return { file: c.name, bytes: buf.length, aspect: aspect, mime: mime };
      } catch (err) {
        console.error('Could not read brand logo ' + c.name + ':', err.message);
      }
    }
  }
  return null;
}

const loaded = load();

// The deployed site's address, when we know it. PUBLIC_BASE_URL wins; Vercel
// injects VERCEL_URL into every function, so production gets a host even if
// that variable was never added (URL / DEPLOY_PRIME_URL are kept as legacy
// fallbacks). Read at render time so a host-injected value is picked up after
// this module loaded.
function publicBase() {
  const raw = (process.env.PUBLIC_BASE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : '') ||
    '').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(raw) ? raw : '';
}

// The artwork's default proportions (1122 x 276, from the SVG viewBox), used
// when the file is not present in the runtime bundle (Vercel serverless
// functions only carry statically-referenced files).
const DEFAULT_ASPECT = 1122 / 276;

// The logo block that goes at the top of an email. A hosted URL is preferred
// because it works whether or not the artwork made it into the function
// bundle; the inline data: URL is the offline fallback and the text wordmark
// the last resort.
function logoHtml(options) {
  const opts = options || {};
  const height = opts.height || 40;
  const accent = opts.accent || '#1a1a1a';
  // opts.base lets the caller override the host (e.g. the request's public
  // alias) instead of falling back to VERCEL_URL, which can be a protected
  // deployment address that asks the reader to log in.
  const base = (opts.base !== undefined ? opts.base : publicBase());
  const file = (loaded && loaded.file) || 'evora-logo.png';
  if (base || dataUrl) {
    const width = Math.round(height * (loaded ? aspect : DEFAULT_ASPECT));
    const src = base ? base + '/assets/' + file : dataUrl;
    return '<img src="' + src + '" alt="Evora" width="' + width + '" height="' + height +
      '" style="display:block; border:0; width:' + width + 'px; height:' + height + 'px; max-width:' +
      (opts.maxWidth || 240) + 'px;">';
  }
  return '<div style="font-size:22px; font-weight:700; color:#1a1a1a; line-height:1;">' +
    'Evora<span style="color:' + accent + ';">.</span></div>';
}

module.exports = {
  logoHtml: logoHtml,
  hasLogo: function () { return !!dataUrl; },
  info: loaded,
  aspect: function () { return aspect; }
};
