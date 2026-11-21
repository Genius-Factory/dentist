const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { serviceImage } = require('../lib/serviceImage');
const { serviceUsage, transferBookings, lockServices } = require('../lib/serviceLifecycle');
const { authenticate, requireRole, syncUser } = require('../middleware/auth');

const router = express.Router();
const adminRoles = ['admin', 'superadmin'];

const { directory, patientFields } = require('../lib/dentistDirectory');
const selectServices = `
  SELECT s.*, (SELECT COALESCE(json_agg(roster ORDER BY roster.name), '[]')
    FROM (SELECT ${patientFields} FROM (${directory}) p WHERE p.service_ids ? s.id) roster) AS dentists,
    ARRAY(SELECT id FROM doctors WHERE service_ids ? s.id) AS doctor_ids
  FROM services s
`;
const serviceGroup = ' ORDER BY s.name';
const camelService = (row) => ({
  id: row.id, name: row.name, category: row.category, description: row.description,
  duration: Number(row.duration), price: Number(row.price), status: row.status, imageUrl: row.image_url || '',
  assignedDoctorIds: row.doctor_ids, dentists: row.dentists || [], createdAt: row.created_at, updatedAt: row.updated_at,
});

function servicePayload(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();
  const duration = Number(body.duration);
  const price = Number(body.price);
  const dentistIds = body.dentistIds === undefined ? undefined : [...new Set(Array.isArray(body.dentistIds) ? body.dentistIds.filter(Boolean) : [])];
  if (!name || !category || !description || !Number.isInteger(duration) || duration < 5 || !Number.isFinite(price) || price < 0) {
    const error = new Error('Provide a name, category, description, duration of at least 5 minutes, and a non-negative price'); error.status = 400; throw error;
  }
  if (!['active', 'inactive'].includes(body.status)) { const error = new Error('Invalid service status'); error.status = 400; throw error; }
  return { name, category, description, duration, price, status: body.status, dentistIds, imageUrl: serviceImage(body.imageUrl) };
}

async function replaceDentists(client, serviceId, dentistIds) {
  if (dentistIds === undefined) return;
  // Serialize assignment changes with profile edits and other service saves.
  await client.query('SELECT id FROM doctors ORDER BY id FOR UPDATE');
  if (dentistIds.length) {
    const doctors = await client.query('SELECT id FROM doctors WHERE id::text = ANY($1::text[])', [dentistIds]);
    if (doctors.rowCount !== dentistIds.length) {
      const error = new Error('Choose doctors from the doctor directory');
      error.status = 400;
      throw error;
    }
  }
  await client.query(`UPDATE doctors SET service_ids =
    CASE WHEN id::text = ANY($2::text[]) THEN (service_ids - $1::text) || jsonb_build_array($1::text)
      ELSE service_ids - $1::text END, updated_at=NOW()
    WHERE service_ids ? $1 OR id::text = ANY($2::text[])`, [serviceId, dentistIds]);
}

router.use(authenticate, syncUser);
router.get('/', async (req, res) => {
  const isAdmin = adminRoles.includes(req.userRole);
  const result = await db.query(`${selectServices}${isAdmin ? '' : " WHERE s.status = 'active'"}${serviceGroup}`);
  res.json(result.rows.map(camelService));
});
router.get('/team', async (req, res) => {
  const result = await db.query(`SELECT ${patientFields}, p.doctor_id AS "doctorId", ARRAY(SELECT DISTINCT s.name FROM services s
    WHERE s.status='active' AND p.service_ids ? s.id ORDER BY s.name) AS services
    FROM (${directory}) p
    ORDER BY p.name, p.id`);
  res.json(result.rows);
});
router.get('/dentists', requireRole('admin', 'superadmin'), async (req, res) => {
  const result = await db.query("SELECT id, concat_ws(' ',first_name,last_name) AS name, status FROM doctors ORDER BY name");
  res.json(result.rows);
});
router.get('/:id/usage', requireRole('admin', 'superadmin'), async (req, res) => {
  res.json(await serviceUsage(db, req.params.id));
});
router.post('/:id/transfer', requireRole('admin', 'superadmin'), async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const services = await lockServices(client, [req.params.id, req.body.targetServiceId]);
    const source = services.find((item) => item.id === req.params.id);
    if (!source) { const error = new Error('Source service not found'); error.status = 404; throw error; }
    const target = services.find((item) => item.id === req.body.targetServiceId);
    const transferred = await transferBookings(client, source, target, req.auth.userId);
    await client.query('COMMIT');
    res.json({ transferred });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
});
router.post('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const payload = servicePayload(req.body);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const id = randomUUID();
    await client.query('INSERT INTO services (id, name, category, description, duration, price, status, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, payload.name, payload.category, payload.description, payload.duration, payload.price, payload.status, payload.imageUrl || '']);
    await replaceDentists(client, id, payload.dentistIds);
    await client.query('COMMIT');
    const result = await db.query(`${selectServices} WHERE s.id = $1${serviceGroup}`, [id]);
    res.status(201).json(camelService(result.rows[0]));
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
});
router.put('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  const payload = servicePayload(req.body);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const services = await lockServices(client, [req.params.id, req.body.transferToServiceId]);
    const source = services.find((item) => item.id === req.params.id);
    if (!source) { const error = new Error('Service not found'); error.status = 404; throw error; }
    if (payload.status === 'inactive') {
      if (req.body.transferToServiceId) await transferBookings(client, source, services.find((item) => item.id === req.body.transferToServiceId), req.auth.userId);
      const usage = await serviceUsage(client, source.id);
      if (usage.upcoming > 0) { const error = new Error(`Transfer the ${usage.upcoming} upcoming appointment(s) to another service before deactivating this service.`); error.status = 409; throw error; }
    }
    const updated = await client.query('UPDATE services SET name=$1, category=$2, description=$3, duration=$4, price=$5, status=$6, image_url=COALESCE($8, image_url), updated_at=NOW() WHERE id=$7 RETURNING id', [payload.name, payload.category, payload.description, payload.duration, payload.price, payload.status, req.params.id, payload.imageUrl ?? null]);
    if (!updated.rowCount) { const error = new Error('Service not found'); error.status = 404; throw error; }
    await replaceDentists(client, req.params.id, payload.dentistIds);
    await client.query('COMMIT');
    const result = await db.query(`${selectServices} WHERE s.id = $1${serviceGroup}`, [req.params.id]);
    res.json(camelService(result.rows[0]));
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
});

module.exports = router;
