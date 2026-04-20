// server/scripts/generateCoverageFromPolygons.js
// Converts polygon GeoJSONs into H3 delivery zones.

const fs = require('fs');
const path = require('path');
const h3 = require('h3-js');

const platforms = ['zepto', 'blinkit', 'instamart', 'bigbasket', 'flipkart'];

if (process.argv.length < 3) {
  console.error('Usage: node generateCoverageFromPolygons.js <out.json>');
  process.exit(1);
}

const [, , OUT] = process.argv;

const RESOLUTION = Number(process.env.H3_RESOLUTION || 8);
const coverage = {};

function loadPolygon(platform) {
  const filePath = path.join(__dirname, '../..', 'data', 'polygons', `${platform}.geojson`);
  if (!fs.existsSync(filePath)) throw new Error(`Polygon not found: ${filePath}`);

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!raw || !Array.isArray(raw.polygon)) throw new Error('Invalid GeoJSON format, expected polygon array');

  return { polygon: raw.polygon, eta: raw.eta ?? 15 };
}

for (const platform of platforms) {
  try {
    const { polygon, eta } = loadPolygon(platform);

    const loops = Array.isArray(polygon[0][0]) ? polygon : [polygon];
    const cells = h3.polyfill(loops, RESOLUTION, true);

    for (const cell of cells) {
      if (!coverage[cell]) coverage[cell] = {};
      coverage[cell][platform] = { available: true, eta };
    }

    console.log(`Processed ${platform}: ${cells.length} cells`);
  } catch (e) {
    console.error(`Error processing ${platform}:`, e.message);
  }
}

for (const cell of Object.keys(coverage)) {
  for (const platform of platforms) {
    if (!coverage[cell][platform]) coverage[cell][platform] = { available: false };
  }
}

fs.writeFileSync(OUT, JSON.stringify(coverage, null, 2));
console.log('Saved:', OUT);
