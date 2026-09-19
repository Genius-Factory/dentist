require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./index');

async function main() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(__dirname, 'billing.sql'), 'utf8'));
    await client.query('COMMIT');
    console.log('Billing migration applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
