require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, 'doctors.sql'), 'utf8'));
    console.log('Doctors migration applied.');
  } finally { await pool.end(); }
}
main().catch((error) => { console.error('Doctors migration failed:', error.message); process.exitCode = 1; });
