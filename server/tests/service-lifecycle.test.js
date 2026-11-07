const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { serviceUsage, transferBookings, lockServices } = require('../lib/serviceLifecycle');

test('service lifecycle preserves history and transfers atomically in PostgreSQL', { skip: process.env.SERVICE_TEST_DB !== '1' }, async () => {
  require('dotenv').config();
  const { Pool } = require('pg');
  const schema = `service_test_${randomUUID().replaceAll('-', '')}`;
  const options = { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 };
  const admin = new Pool(options);
  let db;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new Pool({ ...options, options: `-c search_path=${schema}` });
    for (const file of ['schema.sql', 'billing.sql']) await db.query(fs.readFileSync(path.join(__dirname, '../db', file), 'utf8'));
    await db.query(`INSERT INTO users (id,email,username) VALUES ('patient','patient@test.local','Patient'),('dentist','dentist@test.local','Dentist');
      INSERT INTO services (id,name,duration,price) VALUES ('source','Original',30,100),('target','Replacement',30,200),('wrong','Wrong duration',60,300);
      INSERT INTO service_dentists VALUES ('source','dentist'),('target','dentist'),('wrong','dentist');
      INSERT INTO appointments (id,user_id,service_id,dentist_id,name,medical_issue,emergency_level,duration,appointment_date,appointment_time,status)
      VALUES ('future','patient','source','dentist','Patient','Reason','low',30,CURRENT_DATE + 2,'10:00','approved'),
        ('past','patient','source','dentist','Patient','Reason','low',30,CURRENT_DATE - 2,'10:00','approved');
      INSERT INTO appointment_charges (appointment_id,amount,service_name,issued_date,created_by) VALUES ('future',100,'Original',CURRENT_DATE,'admin');`);
    const migration = fs.readFileSync(path.join(__dirname, '../db/service-history.sql'), 'utf8');
    await db.query(migration); await db.query(migration);
    assert.equal((await serviceUsage(db, 'source')).upcoming, 1);
    await assert.rejects(db.query("UPDATE services SET status='inactive' WHERE id='source'"), { code: '23514' });
    await assert.rejects(db.query("DELETE FROM services WHERE id='source'"), (error) => ['23503', '23001'].includes(error.code));
    // A booking submitted while deactivation holds the service lock must fail
    // after the deactivation commits, rather than attaching to an inactive service.
    await db.query("INSERT INTO services (id,name,duration,price) VALUES ('race','Race test',30,100)");
    const deactivating = await db.connect();
    try {
      await deactivating.query('BEGIN');
      await deactivating.query("UPDATE services SET status='inactive' WHERE id='race'");
      const lateBooking = db.query(`INSERT INTO appointments (id,user_id,service_id,dentist_id,name,medical_issue,emergency_level,duration,appointment_date,appointment_time)
        VALUES ('racing','patient','race','dentist','Patient','Reason','low',30,CURRENT_DATE + 3,'10:00')`);
      const rejected = assert.rejects(lateBooking, { code: '23514' });
      await deactivating.query('COMMIT');
      await rejected;
    } finally { deactivating.release(); }
    await db.query("UPDATE services SET name='Renamed', price=500 WHERE id='source'");
    const original = (await db.query("SELECT * FROM appointments WHERE id='future'")).rows[0];
    assert.equal(original.service_name_snapshot, 'Original');
    assert.equal(original.service_price_snapshot, '100.00');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      let services = await lockServices(client, ['source', 'wrong']);
      await assert.rejects(transferBookings(client, services.find((s) => s.id === 'source'), services.find((s) => s.id === 'wrong'), 'admin'), { status: 409 });
      await client.query('ROLLBACK');
      assert.equal((await db.query('SELECT * FROM service_transfers')).rowCount, 0);
      await client.query('BEGIN');
      services = await lockServices(client, ['source', 'target']);
      assert.equal(await transferBookings(client, services.find((s) => s.id === 'source'), services.find((s) => s.id === 'target'), 'admin'), 1);
      await client.query("UPDATE services SET status='inactive' WHERE id='source'");
      await client.query('COMMIT');
    } finally { client.release(); }
    const transferred = (await db.query("SELECT * FROM appointments WHERE id='future'")).rows[0];
    assert.equal(transferred.service_id, 'target');
    assert.equal(transferred.service_name_snapshot, 'Replacement');
    for (const key of ['duration', 'dentist_id', 'status', 'appointment_time', 'service_price_snapshot', 'user_id', 'profile_id']) assert.deepEqual(transferred[key], original[key]);
    assert.equal((await db.query("SELECT service_id FROM appointments WHERE id='past'")).rows[0].service_id, 'source');
    assert.equal((await db.query("SELECT service_name FROM appointment_charges WHERE appointment_id='future'")).rows[0].service_name, 'Original');
    assert.equal((await db.query('SELECT * FROM service_transfers')).rowCount, 1);
    await assert.rejects(db.query(`INSERT INTO appointments (id,user_id,service_id,dentist_id,name,medical_issue,emergency_level,duration,appointment_date,appointment_time)
      VALUES ('late','patient','source','dentist','Patient','Reason','low',30,CURRENT_DATE + 3,'10:00')`), { code: '23514' });
    await assert.rejects(db.query("DELETE FROM services WHERE id='source'"), (error) => ['23503', '23001'].includes(error.code));
  } finally {
    if (db) await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
