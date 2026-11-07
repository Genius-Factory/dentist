require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const db = require('./index');

async function migrate() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(__dirname, 'service-history.sql'), 'utf8'));
    await client.query('COMMIT');
    console.log('Service history safeguards are ready.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Service history migration failed:', error.message);
    process.exitCode = 1;
  } finally { client.release(); await db.end(); }
}
migrate().catch((error) => { console.error(error.message); process.exitCode = 1; });
