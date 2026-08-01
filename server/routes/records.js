const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole, syncUser } = require('../middleware/auth');

const profileColumns = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email', 'address', 'guardianName', 'guardianRelationship', 'guardianPhone', 'emergencyContactName', 'emergencyContactRelationship', 'emergencyContactPhone', 'allergies', 'notes', 'preferredContactMethod', 'communicationPreference', 'language'];
const profileDbColumns = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email', 'address', 'guardian_name', 'guardian_relationship', 'guardian_phone', 'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone', 'allergies', 'notes', 'preferred_contact_method', 'communication_preference', 'language'];
const appointmentColumns = ['profileId', 'name', 'dateOfBirth', 'guardianContact', 'medicalIssue', 'emergencyLevel', 'duration', 'date', 'time', 'status', 'requestedByRole', 'editableUntil', 'approvedAt', 'approvedBy', 'declinedAt', 'declinedBy'];
const appointmentDbColumns = ['profile_id', 'name', 'date_of_birth', 'guardian_contact', 'medical_issue', 'emergency_level', 'duration', 'appointment_date', 'appointment_time', 'status', 'requested_by_role', 'editable_until', 'approved_at', 'approved_by', 'declined_at', 'declined_by'];

const dateOnly = (value) => value ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10) : '';
const camelProfile = (row) => ({ ...row, userId: row.user_id, firstName: row.first_name, lastName: row.last_name, dateOfBirth: dateOnly(row.date_of_birth), guardianName: row.guardian_name, guardianRelationship: row.guardian_relationship, guardianPhone: row.guardian_phone, emergencyContactName: row.emergency_contact_name, emergencyContactRelationship: row.emergency_contact_relationship, emergencyContactPhone: row.emergency_contact_phone, preferredContactMethod: row.preferred_contact_method, communicationPreference: row.communication_preference, createdAt: row.created_at, updatedAt: row.updated_at });
const camelAppointment = (row) => ({ ...row, userId: row.user_id, profileId: row.profile_id, dateOfBirth: dateOnly(row.date_of_birth), guardianContact: row.guardian_contact, medicalIssue: row.medical_issue, emergencyLevel: row.emergency_level, date: dateOnly(row.appointment_date), time: String(row.appointment_time).slice(0, 5), requestedByRole: row.requested_by_role, editableUntil: row.editable_until, approvedAt: row.approved_at, approvedBy: row.approved_by, declinedAt: row.declined_at, declinedBy: row.declined_by, createdAt: row.created_at, updatedAt: row.updated_at });
const canManageAll = (req) => ['admin', 'secretary'].includes(req.userRole);
const ownOrStaff = (req, userId) => canManageAll(req) || userId === req.auth.userId;

router.use(authenticate, syncUser);
router.get('/profiles', async (req, res) => {
  const result = await db.query(canManageAll(req) ? 'SELECT * FROM patient_profiles ORDER BY created_at DESC' : 'SELECT * FROM patient_profiles WHERE user_id = $1 ORDER BY created_at DESC', canManageAll(req) ? [] : [req.auth.userId]);
  res.json(result.rows.map(camelProfile));
});
router.post('/profiles', async (req, res) => {
  const id = req.body.id;
  if (!id) return res.status(400).json({ error: 'Profile ID is required' });
  const values = profileColumns.map((column) => req.body[column] || null);
  const result = await db.query(`INSERT INTO patient_profiles (id, user_id, ${profileDbColumns.join(', ')}) VALUES ($1, $2, ${profileColumns.map((_, i) => `$${i + 3}`).join(', ')}) RETURNING *`, [id, req.auth.userId, ...values]);
  res.status(201).json(camelProfile(result.rows[0]));
});
router.put('/profiles/:id', async (req, res) => {
  const existing = await db.query('SELECT user_id FROM patient_profiles WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Profile not found' });
  if (!ownOrStaff(req, existing.rows[0].user_id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const values = profileColumns.map((column) => req.body[column] ?? null);
  const assignments = profileDbColumns.map((column, i) => `${column} = $${i + 1}`).join(', ');
  const result = await db.query(`UPDATE patient_profiles SET ${assignments}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`, [...values, req.params.id]);
  res.json(camelProfile(result.rows[0]));
});
router.get('/appointments', async (req, res) => {
  const result = await db.query(canManageAll(req) ? 'SELECT * FROM appointments ORDER BY appointment_date, appointment_time' : 'SELECT * FROM appointments WHERE user_id = $1 ORDER BY appointment_date, appointment_time', canManageAll(req) ? [] : [req.auth.userId]);
  res.json(result.rows.map(camelAppointment));
});
router.post('/appointments', async (req, res) => {
  const id = req.body.id;
  if (!id) return res.status(400).json({ error: 'Appointment ID is required' });
  const values = appointmentColumns.map((column) => req.body[column] ?? null);
  const result = await db.query(`INSERT INTO appointments (id, user_id, ${appointmentDbColumns.join(', ')}) VALUES ($1, $2, ${appointmentColumns.map((_, i) => `$${i + 3}`).join(', ')}) RETURNING *`, [id, req.auth.userId, ...values]);
  res.status(201).json(camelAppointment(result.rows[0]));
});
router.put('/appointments/:id', async (req, res) => {
  const existing = await db.query('SELECT user_id FROM appointments WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Appointment not found' });
  if (!ownOrStaff(req, existing.rows[0].user_id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const values = appointmentColumns.map((column) => req.body[column] ?? null);
  const assignments = appointmentDbColumns.map((column, i) => `${column} = $${i + 1}`).join(', ');
  const result = await db.query(`UPDATE appointments SET ${assignments}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`, [...values, req.params.id]);
  res.json(camelAppointment(result.rows[0]));
});
router.delete('/appointments/:id', async (req, res) => {
  const result = await db.query('DELETE FROM appointments WHERE id = $1 AND (user_id = $2 OR $3 = true) RETURNING id', [req.params.id, req.auth.userId, canManageAll(req)]);
  if (!result.rowCount) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ success: true });
});

router.get('/admin/database', requireRole('admin'), async (req, res) => {
  const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const data = await Promise.all(tables.rows.map(async ({ tablename }) => ({ name: tablename, records: (await db.query(`SELECT * FROM ${tablename === 'users' ? 'users' : tablename} ORDER BY 1 DESC`)).rows })));
  res.json(data);
});

module.exports = router;
