// ============================================================================
// brand.js — the Evora logo, ready for an email
// ----------------------------------------------------------------------------
// The website shows assets/evora-logo.svg (crisp at any size). Email is
// different: Gmail and most other webmail clients strip <svg> images out of
// HTML mail, so an SVG logo arrives as a broken image. That is exactly what
// "the email has no logo" looked like.
//
// So the email uses assets/evora-logo.png - a raster render of the very same
// artwork - embedded as a base64 data URL. A data URL means the image needs
// no public host: it travels inside the message and shows up wherever the
// customer opens it.
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
  // Serverless bundles (Netlify) copy included files next to the handler and
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

// The logo block that goes at the top of an email. Uses the real artwork when
// we have it, and falls back to a text wordmark when we do not.
function logoHtml(options) {
  const opts = options || {};
  const height = opts.height || 40;
  const accent = opts.accent || '#e4002b';
  if (!dataUrl) {
    return '<div style="font-size:22px; font-weight:700; color:#1f2937; line-height:1;">' +
      'Evora<span style="color:' + accent + ';">.</span></div>';
  }
  const width = Math.round(height * aspect);
  return '<img src="' + dataUrl + '" alt="Evora" width="' + width + '" height="' + height +
    '" style="display:block; border:0; width:' + width + 'px; height:' + height + 'px; max-width:' +
    (opts.maxWidth || 240) + 'px;">';
}

module.exports = {
  logoHtml: logoHtml,
  hasLogo: function () { return !!dataUrl; },
  info: loaded,
  aspect: function () { return aspect; }
};
