#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { polyfill } from 'h3-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '../dist/coverage_map.json');

function estimateEta(platform, cell) {
  switch (platform) {
    case 'zepto':
      return 8;
    case 'blinkit':
      return 10;
    case 'instamart':
      return 15;
    case 'bigbasket':
      return 20;
    case 'flipkart':
      return 12;
    default:
      return 30;
  }
}

async function main() {
  console.log('Generating mock coverage map…');

  const mockPlatforms = {
    zepto: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [77.6241, 12.9351],
              [77.6341, 12.9351],
              [77.6341, 12.9451],
              [77.6241, 12.9451],
              [77.6241, 12.9351],
            ],
          ],
        },
      },
    ],
    blinkit: [],
    instamart: [],
    bigbasket: [],
    flipkart: [],
  };

  const RESO = Number(process.env.H3_RESOLUTION ?? 8);
  const result = {};

  for (const [platform, features] of Object.entries(mockPlatforms)) {
    for (const feature of features) {
      const cells = polyfill(feature.geometry.coordinates, RESO, true);
      for (const cell of cells) {
        if (!result[cell]) {
          result[cell] = {};
        }
        result[cell][platform] = {
          available: true,
          eta: estimateEta(platform, cell),
        };
      }
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Coverage map written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
