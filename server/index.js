// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const { Client } = require('pg');
const h3 = require('h3-js');
const pino = require('pino');

const log = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const pg = new Client({ connectionString: process.env.PG_CONN || 'postgres://postgres:postgres@localhost:5432/savio' });

(async () => {
  await pg.connect();
  log.info('Connected to Postgres');
})();

const CACHE_PREFIX = 'coverage:v1:';
const CACHE_TTL = Number(process.env.CACHE_TTL_SEC || 120); // seconds

async function fetchCoverageFromDb(cell) {
  const q = 'SELECT platform_data FROM platform_coverages WHERE h3_cell = $1';
  const r = await pg.query(q, [cell]);
  if (!r.rows.length) return null;
  return r.rows[0].platform_data;
}

app.get('/api/coverage', async (req, res) => {
  try {
    let { lat, lng, cell } = req.query;
    if (!cell) {
      if (!lat || !lng) return res.status(400).json({ error: 'lat & lng or cell required' });
      const reso = Number(process.env.H3_RESOLUTION || 8);
      cell = h3.geoToH3(Number(lat), Number(lng), reso);
    }

    const cacheKey = CACHE_PREFIX + cell;
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return res.json({ source: 'cache', cell, data: parsed });
    }

    const platformData = await fetchCoverageFromDb(cell);
    if (!platformData) {
      const fallback = {
        zepto: { available: false },
        blinkit: { available: false },
        instamart: { available: false },
        bigbasket: { available: false },
        flipkart: { available: false }
      };
      // short cache to avoid spam for unknown cells
      await redis.setex(cacheKey, 30, JSON.stringify(fallback));
      return res.json({ source: 'db', cell, data: fallback });
    }

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(platformData));
    return res.json({ source: 'db', cell, data: platformData });
  } catch (err) {
    log.error(err);
    res.status(500).json({ error: 'internal' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => log.info(`coverage API listening on ${port}`));
