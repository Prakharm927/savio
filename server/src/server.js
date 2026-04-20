import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import { Client as PgClient } from 'pg';
import { geoToH3 } from 'h3-js';

const app = express();
app.use(cors());
app.use(express.json());

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const pgUrl = process.env.PG_CONN || 'postgres://user:pass@localhost:5432/savio';

const redis = new Redis(redisUrl, { lazyConnect: true });
const pg = new PgClient({ connectionString: pgUrl });

const CACHE_PREFIX = 'coverage:v1:';
const CACHE_TTL_SECONDS = Number(process.env.COVERAGE_CACHE_TTL ?? 120); // default 2 minutes

async function initClients() {
  if (!redis.status || redis.status === 'end') {
    await redis.connect();
  }
  if (pg._ending) {
    await pg.connect();
  } else if (!pg._connected) {
    await pg.connect();
  }
}

async function fetchCoverageFromDb(cell) {
  const query = 'SELECT platform_data FROM platform_coverages WHERE h3_cell = $1 LIMIT 1';
  const result = await pg.query(query, [cell]);
  if (!result.rows.length) {
    return null;
  }
  return result.rows[0].platform_data;
}

app.get('/api/coverage', async (req, res) => {
  try {
    await initClients();

    let { lat, lng, cell, resolution } = req.query;
    let derivedCell = cell;

    if (!derivedCell) {
      if (!lat || !lng) {
        return res.status(400).json({ error: 'lat & lng or cell required' });
      }
      const reso = Number(resolution ?? process.env.H3_RESOLUTION ?? 8);
      derivedCell = geoToH3(Number(lat), Number(lng), reso);
    }

    const cacheKey = `${CACHE_PREFIX}${derivedCell}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ source: 'cache', cell: derivedCell, data: JSON.parse(cached) });
    }

    const platformData = await fetchCoverageFromDb(derivedCell);

    if (!platformData) {
      const fallback = {
        zepto: { available: false },
        blinkit: { available: false },
        instamart: { available: false },
        bigbasket: { available: false },
        flipkart: { available: false },
      };
      await redis.set(cacheKey, JSON.stringify(fallback), 'EX', Number(process.env.COVERAGE_MISS_TTL ?? 30));
      return res.json({ source: 'db-miss', cell: derivedCell, data: fallback });
    }

    await redis.set(cacheKey, JSON.stringify(platformData), 'EX', CACHE_TTL_SECONDS);
    return res.json({ source: 'db', cell: derivedCell, data: platformData });
  } catch (error) {
    console.error('[coverage] error', error);
    return res.status(500).json({ error: 'internal' });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Coverage API listening on port ${port}`);
});
