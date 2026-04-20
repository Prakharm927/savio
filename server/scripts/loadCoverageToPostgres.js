// server/scripts/loadCoverageToPostgres.js
const fs = require('fs');
const { Client } = require('pg');

if (process.argv.length < 4) {
  console.error('Usage: node loadCoverageToPostgres.js <coverage.json> <PG_CONN>');
  process.exit(1);
}

const [,, jsonPath, pgConn] = process.argv;
const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const client = new Client({ connectionString: pgConn });

(async () => {
  await client.connect();
  console.log('Connected PG');

  await client.query(`
    CREATE TABLE IF NOT EXISTS platform_coverages (
      h3_cell TEXT PRIMARY KEY,
      platform_data JSONB NOT NULL
    );
  `);

  const insertText = `
    INSERT INTO platform_coverages (h3_cell, platform_data)
    VALUES ($1, $2)
    ON CONFLICT (h3_cell) DO UPDATE SET platform_data = EXCLUDED.platform_data
  `;

  const keys = Object.keys(raw);
  console.log('Ingesting', keys.length, 'cells');

  for (const cell of keys) {
    const data = raw[cell];
    await client.query(insertText, [cell, data]);
  }

  console.log('Done import');
  await client.end();
})();
