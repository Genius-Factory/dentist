const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole, syncUser } = require('../middleware/auth');

const profileColumns = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email', 'address', 'profilePicture', 'profilePictureType', 'guardianName', 'guardianRelationship', 'guardianPhone', 'emergencyContactName', 'emergencyContactRelationship', 'emergencyContactPhone', 'allergies', 'notes', 'preferredContactMethod', 'communicationPreference', 'language'];
const profileDbColumns = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email', 'address', 'profile_picture', 'profile_picture_type', 'guardian_name', 'guardian_relationship', 'guardian_phone', 'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone', 'allergies', 'notes', 'preferred_contact_method', 'communication_preference', 'language'];
const appointmentColumns = ['profileId', 'name', 'dateOfBirth', 'guardianContact', 'medicalIssue', 'emergencyLevel', 'duration', 'date', 'time', 'status', 'requestedByRole', 'editableUntil', 'approvedAt', 'approvedBy', 'declinedAt', 'declinedBy'];
const appointmentDbColumns = ['profile_id', 'name', 'date_of_birth', 'guardian_contact', 'medical_issue', 'emergency_level', 'duration', 'appointment_date', 'appointment_time', 'status', 'requested_by_role', 'editable_until', 'approved_at', 'approved_by', 'declined_at', 'declined_by'];
const appointmentStatuses = new Set(['pending', 'approved', 'declined', 'archived']);
const appointmentEditWindowMs = 24 * 60 * 60 * 1000;

const dateOnly = (value) => value ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10) : '';
const camelProfile = (row) => ({
  id: row.id,
  userId: row.user_id,
  firstName: row.first_name || '',
  lastName: row.last_name || '',
  dateOfBirth: dateOnly(row.date_of_birth),
  gender: row.gender || '',
  phone: row.phone || '',
  email: row.email || '',
  address: row.address || '',
  profilePicture: row.profile_picture ? row.profile_picture.toString('base64') : '',
  profilePictureType: row.profile_picture_type || '',
  guardianName: row.guardian_name || '',
  guardianRelationship: row.guardian_relationship || '',
  guardianPhone: row.guardian_phone || '',
  emergencyContactName: row.emergency_contact_name || '',
  emergencyContactRelationship: row.emergency_contact_relationship || '',
  emergencyContactPhone: row.emergency_contact_phone || '',
  allergies: row.allergies || '',
  notes: row.notes || '',
  preferredContactMethod: row.preferred_contact_method || '',
  communicationPreference: row.communication_preference || '',
  language: row.language || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
const camelAppointment = (row) => ({ ...row, userId: row.user_id, profileId: row.profile_id, dateOfBirth: dateOnly(row.date_of_birth), guardianContact: row.guardian_contact, medicalIssue: row.medical_issue, emergencyLevel: row.emergency_level, date: dateOnly(row.appointment_date), time: String(row.appointment_time).slice(0, 5), requestedByRole: row.requested_by_role, editableUntil: row.editable_until, approvedAt: row.approved_at, approvedBy: row.approved_by, declinedAt: row.declined_at, declinedBy: row.declined_by, createdAt: row.created_at, updatedAt: row.updated_at });
const canManageAll = (req) => ['superadmin', 'admin', 'secretary'].includes(req.userRole);
const ownOrStaff = (req, userId) => canManageAll(req) || userId === req.auth.userId;
const allowedProfilePictureTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maxProfilePictureBytes = 2 * 1024 * 1024;
const profilePictureBody = express.raw({
  limit: maxProfilePictureBytes,
  type: (req) => allowedProfilePictureTypes.has(String(req.headers['content-type'] || '').split(';')[0]),
});

function validateFutureAppointment(date, time) {
  const appointmentAt = new Date(`${date || ''}T${time || ''}`);
  if (!date || !time || Number.isNaN(appointmentAt.getTime())) {
    const error = new Error('A valid appointment date and time are required');
    error.status = 400;
    throw error;
  }
  if (appointmentAt.getTime() <= Date.now()) {
    const error = new Error('Appointments must be scheduled for a future time');
    error.status = 400;
    throw error;
  }
}

function appointmentLocked(appointment) {
  if (appointment.status === 'approved') return true;
  const editableUntil = new Date(appointment.editable_until).getTime();
  return !Number.isFinite(editableUntil) || editableUntil <= Date.now();
}

function appointmentError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function requireUsableProfile(req, profileId) {
  if (!profileId) return;
  const profile = await db.query('SELECT user_id FROM patient_profiles WHERE id = $1', [profileId]);
  if (!profile.rowCount) throw appointmentError(404, 'Profile not found');
  if (!ownOrStaff(req, profile.rows[0].user_id)) {
    throw appointmentError(403, 'You cannot use another patient\'s profile');
  }
}

function appointmentValues(body, existing, req) {
  const isStaff = canManageAll(req);
  const bodyStatus = body.status || (existing ? existing.status : 'pending');
  if (!appointmentStatuses.has(bodyStatus)) throw appointmentError(400, 'Invalid appointment status');

  if (!isStaff && body.status && body.status !== (existing ? existing.status : 'pending')) {
    throw appointmentError(403, 'Only staff can change appointment status');
  }

  const values = appointmentColumns.map((column) => body[column] ?? (existing ? existing[appointmentDbColumns[appointmentColumns.indexOf(column)]] : null));
  const index = (column) => appointmentColumns.indexOf(column);

  // Workflow metadata is authoritative server state. A member may create and
  // edit a pending request, but can never turn it into an approved request.
  if (!isStaff) {
    values[index('status')] = existing ? existing.status : 'pending';
    values[index('requestedByRole')] = existing ? existing.requested_by_role : req.userRole;
    values[index('editableUntil')] = existing ? existing.editable_until : new Date(Date.now() + appointmentEditWindowMs).toISOString();
    values[index('approvedAt')] = existing ? existing.approved_at : null;
    values[index('approvedBy')] = existing ? existing.approved_by : null;
    values[index('declinedAt')] = existing ? existing.declined_at : null;
    values[index('declinedBy')] = existing ? existing.declined_by : null;
  } else if (bodyStatus === 'approved' && (!existing || existing.status !== 'approved')) {
    values[index('approvedAt')] = new Date().toISOString();
    values[index('approvedBy')] = req.auth.userId;
  } else if (bodyStatus === 'declined' && (!existing || existing.status !== 'declined')) {
    values[index('declinedAt')] = new Date().toISOString();
    values[index('declinedBy')] = req.auth.userId;
  }

  return values;
}

function profileValue(body, column) {
  if (column === 'profilePicture') {
    const value = body.profilePicture;
    if (!value) return null;
    const match = String(value).match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
    const pictureType = match ? match[1] : body.profilePictureType;
    const base64 = match ? match[2] : String(value);

    if (!allowedProfilePictureTypes.has(pictureType)) {
      const error = new Error('Profile picture must be a JPEG, PNG, WebP, or GIF image');
      error.status = 400;
      throw error;
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > maxProfilePictureBytes) {
      const error = new Error('Profile picture must be smaller than 2 MB');
      error.status = 400;
      throw error;
    }

    return buffer;
  }

  if (column === 'profilePictureType') {
    if (!body.profilePicture) return null;
    const match = String(body.profilePicture).match(/^data:(image\/(?:jpeg|png|webp|gif));base64,/);
    return match ? match[1] : body.profilePictureType;
  }

  if (column === 'dateOfBirth') return body[column] || null;

  return body[column] ?? null;
}

function profileValues(body, existingProfile = null) {
  return profileColumns.map((column) => {
    if (existingProfile && column === 'profilePicture' && !Object.prototype.hasOwnProperty.call(body, 'profilePicture')) {
      return existingProfile.profile_picture || null;
    }

    if (existingProfile && column === 'profilePictureType' && !Object.prototype.hasOwnProperty.call(body, 'profilePicture')) {
      return existingProfile.profile_picture_type || null;
    }

    return profileValue(body, column);
  });
}

router.use(authenticate, syncUser);
router.get('/profiles', async (req, res) => {
  const result = await db.query(canManageAll(req) ? 'SELECT * FROM patient_profiles ORDER BY created_at DESC' : 'SELECT * FROM patient_profiles WHERE user_id = $1 ORDER BY created_at DESC', canManageAll(req) ? [] : [req.auth.userId]);
  res.json(result.rows.map(camelProfile));
});
router.post('/profiles', async (req, res) => {
  const id = req.body.id;
  if (!id) return res.status(400).json({ error: 'Profile ID is required' });
  const values = profileValues(req.body);
  const result = await db.query(`INSERT INTO patient_profiles (id, user_id, ${profileDbColumns.join(', ')}) VALUES ($1, $2, ${profileColumns.map((_, i) => `$${i + 3}`).join(', ')}) RETURNING *`, [id, req.auth.userId, ...values]);
  res.status(201).json(camelProfile(result.rows[0]));
});
router.put('/profiles/:id/profile-picture', profilePictureBody, async (req, res) => {
  const contentType = String(req.headers['content-type'] || '').split(';')[0];
  console.log('[profile-picture] upload request', {
    profileId: req.params.id,
    userId: req.auth?.userId,
    contentType,
    isBuffer: Buffer.isBuffer(req.body),
    bytes: Buffer.isBuffer(req.body) ? req.body.length : 0,
  });
  if (!allowedProfilePictureTypes.has(contentType)) return res.status(400).json({ error: 'Profile picture must be a JPEG, PNG, WebP, or GIF image' });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Profile picture file is required' });
  if (req.body.length > maxProfilePictureBytes) return res.status(400).json({ error: 'Profile picture must be smaller than 2 MB' });

  const existing = await db.query('SELECT user_id FROM patient_profiles WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Profile not found' });
  if (!ownOrStaff(req, existing.rows[0].user_id)) return res.status(403).json({ error: 'Insufficient permissions' });

  const result = await db.query('UPDATE patient_profiles SET profile_picture = $1, profile_picture_type = $2, updated_at = NOW() WHERE id = $3 RETURNING *', [req.body, contentType, req.params.id]);
  console.log('[profile-picture] upload saved', {
    profileId: req.params.id,
    rowCount: result.rowCount,
    storedType: result.rows[0]?.profile_picture_type || '',
    storedBytes: result.rows[0]?.profile_picture?.length || 0,
  });
  res.json(camelProfile(result.rows[0]));
});
router.delete('/profiles/:id/profile-picture', async (req, res) => {
  console.log('[profile-picture] delete request', {
    profileId: req.params.id,
    userId: req.auth?.userId,
  });
  const existing = await db.query('SELECT user_id FROM patient_profiles WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Profile not found' });
  if (!ownOrStaff(req, existing.rows[0].user_id)) return res.status(403).json({ error: 'Insufficient permissions' });

  const result = await db.query('UPDATE patient_profiles SET profile_picture = NULL, profile_picture_type = NULL, updated_at = NOW() WHERE id = $1 RETURNING *', [req.params.id]);
  console.log('[profile-picture] deleted', {
    profileId: req.params.id,
    rowCount: result.rowCount,
  });
  res.json(camelProfile(result.rows[0]));
});
router.put('/profiles/:id', async (req, res) => {
  const existing = await db.query('SELECT user_id, profile_picture, profile_picture_type FROM patient_profiles WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Profile not found' });
  if (!ownOrStaff(req, existing.rows[0].user_id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const values = profileValues(req.body, existing.rows[0]);
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
  validateFutureAppointment(req.body.date, req.body.time);
  await requireUsableProfile(req, req.body.profileId);
  const values = appointmentValues(req.body, null, req);
  const result = await db.query(`INSERT INTO appointments (id, user_id, ${appointmentDbColumns.join(', ')}) VALUES ($1, $2, ${appointmentColumns.map((_, i) => `$${i + 3}`).join(', ')}) RETURNING *`, [id, req.auth.userId, ...values]);
  res.status(201).json(camelAppointment(result.rows[0]));
});
router.put('/appointments/:id', async (req, res) => {
  const existing = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Appointment not found' });
  if (!ownOrStaff(req, existing.rows[0].user_id)) return res.status(403).json({ error: 'Insufficient permissions' });
  if (appointmentLocked(existing.rows[0])) return res.status(403).json({ error: 'Approved or expired appointments cannot be edited' });
  const date = req.body.date ?? dateOnly(existing.rows[0].appointment_date);
  const time = req.body.time ?? String(existing.rows[0].appointment_time).slice(0, 5);
  validateFutureAppointment(date, time);
  await requireUsableProfile(req, req.body.profileId ?? existing.rows[0].profile_id);
  const values = appointmentValues(req.body, existing.rows[0], req);
  const assignments = appointmentDbColumns.map((column, i) => `${column} = $${i + 1}`).join(', ');
  const result = await db.query(`UPDATE appointments SET ${assignments}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`, [...values, req.params.id]);
  res.json(camelAppointment(result.rows[0]));
});
router.delete('/appointments/:id', async (req, res) => {
  const existing = await db.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Appointment not found' });
  if (!ownOrStaff(req, existing.rows[0].user_id)) return res.status(403).json({ error: 'Insufficient permissions' });
  if (appointmentLocked(existing.rows[0])) return res.status(403).json({ error: 'Approved or expired appointments cannot be deleted' });
  const result = await db.query('DELETE FROM appointments WHERE id = $1 RETURNING id', [req.params.id]);
  res.json({ success: true });
});

router.get('/admin/database', requireRole('admin', 'superadmin'), async (req, res) => {
  const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const data = await Promise.all(tables.rows.map(async ({ tablename }) => ({ name: tablename, records: (await db.query(`SELECT * FROM ${tablename === 'users' ? 'users' : tablename} ORDER BY 1 DESC`)).rows })));
  res.json(data);
});

module.exports = router;
