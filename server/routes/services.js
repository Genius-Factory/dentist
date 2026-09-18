const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { authenticate, requireRole, syncUser } = require('../middleware/auth');

const router = express.Router();
const adminRoles = ['admin', 'superadmin'];

const selectServices = `
  SELECT s.*, COALESCE(json_agg(json_build_object('id', u.id, 'name', COALESCE(u.username, u.email))
    ORDER BY COALESCE(u.username, u.email)) FILTER (WHERE u.id IS NOT NULL), '[]'::json) AS dentists
  FROM services s
  LEFT JOIN service_dentists sd ON sd.service_id = s.id
  LEFT JOIN users u ON u.id = sd.dentist_id
`;
const serviceGroup = ' GROUP BY s.id ORDER BY s.name';
const camelService = (row) => ({
  id: row.id, name: row.name, category: row.category, description: row.description,
  duration: Number(row.duration), price: Number(row.price), status: row.status,
  dentists: row.dentists || [], createdAt: row.created_at, updatedAt: row.updated_at,
});

function servicePayload(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();
  const duration = Number(body.duration);
  const price = Number(body.price);
  const dentistIds = [...new Set(Array.isArray(body.dentistIds) ? body.dentistIds.filter(Boolean) : [])];
  if (!name || !category || !description || !Number.isInteger(duration) || duration < 5 || !Number.isFinite(price) || price < 0) {
    const error = new Error('Provide a name, category, description, duration of at least 5 minutes, and a non-negative price'); error.status = 400; throw error;
  }
  if (!['active', 'inactive'].includes(body.status)) { const error = new Error('Invalid service status'); error.status = 400; throw error; }
  return { name, category, description, duration, price, status: body.status, dentistIds };
}

async function replaceDentists(client, serviceId, dentistIds) {
  if (dentistIds.length) {
    const users = await client.query("SELECT id FROM users WHERE id = ANY($1::varchar[]) AND role IN ('admin', 'superadmin', 'secretary')", [dentistIds]);
    if (users.rowCount !== dentistIds.length) { const error = new Error('Each assigned dentist must be an active staff user'); error.status = 400; throw error; }
  }
  await client.query('DELETE FROM service_dentists WHERE service_id = $1', [serviceId]);
  for (const dentistId of dentistIds) await client.query('INSERT INTO service_dentists (service_id, dentist_id) VALUES ($1, $2)', [serviceId, dentistId]);
}

router.use(authenticate, syncUser);
router.get('/', async (req, res) => {
  const isAdmin = adminRoles.includes(req.userRole);
  const result = await db.query(`${selectServices}${isAdmin ? '' : " WHERE s.status = 'active'"}${serviceGroup}`);
  res.json(result.rows.map(camelService));
});
router.get('/dentists', requireRole('admin', 'superadmin'), async (req, res) => {
  const result = await db.query("SELECT id, COALESCE(username, email) AS name FROM users WHERE role IN ('admin', 'superadmin', 'secretary') ORDER BY name");
  res.json(result.rows);
});
router.post('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const payload = servicePayload(req.body);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const id = randomUUID();
    await client.query('INSERT INTO services (id, name, category, description, duration, price, status) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, payload.name, payload.category, payload.description, payload.duration, payload.price, payload.status]);
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
    const updated = await client.query('UPDATE services SET name=$1, category=$2, description=$3, duration=$4, price=$5, status=$6, updated_at=NOW() WHERE id=$7 RETURNING id', [payload.name, payload.category, payload.description, payload.duration, payload.price, payload.status, req.params.id]);
    if (!updated.rowCount) { const error = new Error('Service not found'); error.status = 404; throw error; }
    await replaceDentists(client, req.params.id, payload.dentistIds);
    await client.query('COMMIT');
    const result = await db.query(`${selectServices} WHERE s.id = $1${serviceGroup}`, [req.params.id]);
    res.json(camelService(result.rows[0]));
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
});

module.exports = router;
