// ============================================================================
// render-logo.js — rebuild assets/evora-logo.png from assets/evora-logo.svg
// ----------------------------------------------------------------------------
// Why does a PNG exist at all? The website uses the SVG (crisp at any size),
// but Gmail and most other webmail clients strip <svg> images out of HTML
// mail - an SVG logo arrives as a broken image. So the email uses a raster
// render of the very same artwork.
//
// The PNG is committed to the project, so you only need this if you change
// the logo artwork.
//
// Run it with:   node tools/render-logo.js
//
// It needs "sharp", which is NOT a runtime dependency of the backend:
//   npm install --no-save sharp
// ============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SVG = path.join(ROOT, 'assets', 'evora-logo.svg');
const PNG = path.join(ROOT, 'assets', 'evora-logo.png');

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.error('This script needs the "sharp" package. Install it with:');
  console.error('  npm install --no-save sharp');
  console.error('');
  console.error('(It is not a dependency of the backend - the PNG is committed,');
  console.error(' so you only need this if you change the logo artwork.)');
  process.exit(1);
}

// How wide the PNG should be. The website shows the logo at 236px wide and
// email at 187px, so 1200px is comfortably sharp for both, and it doubles as
// the og:image for social previews.
const WIDTH = 1200;

(async function () {
  if (!fs.existsSync(SVG)) {
    console.error('Cannot find ' + SVG);
    process.exit(1);
  }

  const svg = fs.readFileSync(SVG);
  const before = await sharp(svg).metadata();
  console.log('source svg : ' + before.width + 'x' + before.height);

  await sharp(svg, { density: 300 })
    .resize({ width: WIDTH })
    .png({ compressionLevel: 9 })
    .toFile(PNG);

  const after = await sharp(PNG).metadata();
  const bytes = fs.statSync(PNG).size;
  console.log('wrote      : ' + PNG);
  console.log('result     : ' + after.width + 'x' + after.height +
              ', ' + bytes + ' bytes, alpha=' + after.hasAlpha);
  console.log('');
  console.log('Restart the backend so it picks the new logo up.');
})().catch(function (err) {
  console.error('Failed:', err.message);
  process.exit(1);
});
