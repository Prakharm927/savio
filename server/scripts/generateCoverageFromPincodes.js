// server/scripts/generateCoverageFromPincodes.js
// Input CSV: platform,pincode,eta
// Example lines:
// zepto,560095,10
// blinkit,560095,15
// bigbasket,560095,20

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const h3 = require('h3-js');
const axios = require('axios');

if (process.argv.length < 4) {
  console.error('Usage: node generateCoverageFromPincodes.js <input.csv> <out.json>');
  process.exit(1);
}

const [,, csvFile, outFile] = process.argv;

const raw = fs.readFileSync(csvFile, 'utf8');
const rows = csv.parse(raw, { columns: true, skip_empty_lines: true });

/**
 * This script relies on a pincodes -> lat/lng mapping.
 * If you have a local mapping, plug it in. Here we try a simple offline map JSON if exists,
 * otherwise fallback to a free geocode (not for production).
 */

// try load cached pincode->latlng JSON
let pincodeCache = {};
const cachePath = path.join(__dirname, 'pincode_cache.json');
if (fs.existsSync(cachePath)) {
  pincodeCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

// simple helper to resolve pincode to lat/lng (do not use heavy rate limited APIs)
async function resolvePincode(pincode) {
  if (pincodeCache[pincode]) return pincodeCache[pincode];
  // poor-man fallback: use public API only for development
  // replace with your own dataset for production
  try {
    const r = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, { timeout: 5000 });
    const data = r.data && r.data[0] && r.data[0].PostOffice && r.data[0].PostOffice[0];
    if (data && data.Latitude && data.Longitude) {
      const lat = Number(data.Latitude);
      const lng = Number(data.Longitude);
      pincodeCache[pincode] = { lat, lng };
      fs.writeFileSync(cachePath, JSON.stringify(pincodeCache, null, 2));
      return pincodeCache[pincode];
    }
  } catch (e) {
    // ignore
  }
  // you MUST replace above with your accurate pincode DB for production
  throw new Error('pincode resolution failed for ' + pincode);
}

(async () => {
  const RESO = Number(process.env.H3_RESOLUTION || 8);
  const map = {}; // cell -> { platform: { available, eta } }

  for (const r of rows) {
    const platform = r.platform.toLowerCase().trim();
    const pincode = r.pincode.toString().trim();
    const eta = Number(r.eta || 15);

    let latlng;
    try {
      latlng = await resolvePincode(pincode);
    } catch (e) {
      console.warn('Could not resolve pincode', pincode, e.message);
      continue;
    }

    const cell = h3.geoToH3(latlng.lat, latlng.lng, RESO);
    map[cell] = map[cell] || {};
    // if cell has multiple entries per platform keep smallest ETA
    const existing = map[cell][platform];
    if (!existing || (existing.eta && eta < existing.eta)) {
      map[cell][platform] = { available: true, eta };
    }
  }

  // ensure all platforms present for each cell
  for (const c of Object.keys(map)) {
    ['zepto','blinkit','instamart','bigbasket','flipkart'].forEach(p => {
      if (!map[c][p]) map[c][p] = { available: false };
    });
  }

  fs.writeFileSync(outFile, JSON.stringify(map, null, 2));
  console.log('Generated', outFile);
})();
