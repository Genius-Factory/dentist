require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const sqlPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('schema.sql not found in db/');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Connecting to database...');
    // Split SQL into statements and run them individually so one failing statement
    // doesn't block creation of other objects (useful for partial schemas).
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(Boolean);

    console.log(`Found ${statements.length} statements; executing individually...`);
    for (const [i, stmt] of statements.entries()) {
      try {
        await pool.query(stmt);
      } catch (err) {
        console.warn(`Statement ${i + 1} failed (continuing):`, err.message || err.toString());
      }
    }

    console.log('Finished applying statements.');

    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Public tables:');
    res.rows.forEach(r => console.log('- ' + r.table_name));
  } catch (err) {
    console.error('Unexpected error during init:', err.message || err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
