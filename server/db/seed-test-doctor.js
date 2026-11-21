require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const service = await client.query("SELECT id FROM services WHERE status='active' ORDER BY name LIMIT 1");
    const result = await client.query(`INSERT INTO doctors (first_name,last_name,email,phone,license_number,license_jurisdiction,years_of_experience,bio,status,service_ids)
      VALUES ('Taylor','Demo','taylor.demo@example.test','+1 555 0100','DEMO-DDS-2026','demo-seed',8,'Sample directory profile for testing.','active',$1::jsonb)
      ON CONFLICT (license_jurisdiction,license_number) DO UPDATE SET updated_at=NOW()
      RETURNING id,first_name,last_name`, [JSON.stringify(service.rows.map(row => row.id))]);
    await client.query("INSERT INTO doctor_clinics (doctor_id,clinic_id) VALUES ($1,'00000000-0000-4000-8000-000000000001') ON CONFLICT DO NOTHING", [result.rows[0].id]);
    await client.query('COMMIT');
    console.log(`Test doctor ready: ${result.rows[0].first_name} ${result.rows[0].last_name} (${result.rows[0].id})`);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error('Test doctor seed failed:', error.message); process.exitCode=1; });
