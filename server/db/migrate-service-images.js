require('dotenv').config();
const db = require('./index');

async function migrate() {
  try {
    await db.query("ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''");
    console.log('Service image column is ready.');
  } catch (error) {
    console.error('Service image migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}
migrate();
