// ============================================================================
// build-netlify.js — assemble the static site for Netlify
// ----------------------------------------------------------------------------
// Netlify publishes dist/. It gets the storefront files only: the backend
// source, tools and docs stay out of the public site. The API runs separately
// from netlify/functions/api.js.
// ============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  'index.html',
  'menu.html',
  'product.html',
  'checkout.html',
  'contact.html',
  'about.html',
  'admin.html',
  'style.css',
  'script.js',
  'admin.js',
  'catalog.js',
  'api-client.js'
];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const file of FILES) {
  const src = path.join(ROOT, file);
  if (!fs.existsSync(src)) {
    console.error('Missing site file: ' + file);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(DIST, file));
}

const assetsSrc = path.join(ROOT, 'assets');
const serverDir = path.resolve(assetsSrc, 'server');
fs.cpSync(assetsSrc, path.join(DIST, 'assets'), {
  recursive: true,
  filter: function (src) {
    return path.resolve(src) !== serverDir;
  }
});

console.log('Site built into dist/ (' + FILES.length + ' files + assets, without assets/server).');
