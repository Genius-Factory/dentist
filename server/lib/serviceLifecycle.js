const futureBookings = "status IN ('pending', 'approved') AND appointment_date + appointment_time >= LOCALTIMESTAMP";
const fail = (message) => Object.assign(new Error(message), { status: 409 });

async function serviceUsage(db, id) {
  const result = await db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE ${futureBookings})::int AS upcoming,
    COALESCE(array_agg(DISTINCT dentist_id) FILTER (WHERE ${futureBookings}), '{}') AS dentists,
    COALESCE(array_agg(DISTINCT duration) FILTER (WHERE ${futureBookings}), '{}') AS durations
    FROM appointments WHERE service_id=$1`, [id]);
  return result.rows[0];
}

// Call inside a transaction, after locking the source and destination services.
async function transferBookings(client, source, target, actor) {
  if (!target || target.id === source.id || target.status !== 'active') throw fail('Choose a different active destination service.');
  const result = await client.query(`SELECT * FROM appointments WHERE service_id=$1 AND ${futureBookings} ORDER BY id FOR UPDATE`, [source.id]);
  const appointments = result.rows;
  const dentists = await client.query('SELECT dentist_id FROM service_dentists WHERE service_id=$1', [target.id]);
  const assigned = new Set(dentists.rows.map((row) => row.dentist_id));
  if (appointments.some((booking) => Number(booking.duration) !== Number(target.duration) || !assigned.has(booking.dentist_id))) {
    throw fail('The destination must have the same duration and support every booked dentist. Choose another service or reschedule the affected appointments first.');
  }
  await client.query("SELECT set_config('app.service_transfer', 'true', true)");
  for (const booking of appointments) {
    await client.query(`INSERT INTO service_transfers (appointment_id, from_service_id, to_service_id, from_service_name, to_service_name, transferred_by) VALUES ($1,$2,$3,$4,$5,$6)`, [booking.id, source.id, target.id, booking.service_name_snapshot || source.name, target.name, actor]);
    await client.query('UPDATE appointments SET service_id=$1, updated_at=NOW() WHERE id=$2', [target.id, booking.id]);
  }
  await client.query("SELECT set_config('app.service_transfer', 'false', true)");
  return appointments.length;
}

async function lockServices(client, ids) {
  const result = await client.query('SELECT * FROM services WHERE id = ANY($1::varchar[]) ORDER BY id FOR UPDATE', [ids.filter(Boolean)]);
  return result.rows;
}

module.exports = { futureBookings, serviceUsage, transferBookings, lockServices };
