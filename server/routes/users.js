const router = require('express').Router();
const { clerkClient } = require('@clerk/express');
const db = require('../db');
const { authenticate, requireRole, syncUser } = require('../middleware/auth');
const { VALID_ROLES, canAssignRole, canManageUser, normalizeRole } = require('../lib/roles');

router.get('/', authenticate, syncUser, requireRole('admin', 'superadmin'), async (req, res) => {
  const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

// Update username and role in both Clerk and PostgreSQL so syncUser will preserve the change.
router.put('/:userId', authenticate, syncUser, requireRole('admin', 'superadmin'), async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const requestedRole = normalizeRole(req.body.role);

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (!VALID_ROLES.includes(req.body.role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const existing = await db.query('SELECT id, role FROM users WHERE id = $1', [req.params.userId]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'User record not found' });
  }

  const target = existing.rows[0];
  const isSelf = target.id === req.auth.userId;
  if (isSelf && req.userRole !== 'superadmin' && requestedRole !== req.userRole) {
    return res.status(403).json({ error: 'You cannot change your own role' });
  }
  if (isSelf && req.userRole === 'superadmin' && requestedRole !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmins cannot demote themselves' });
  }
  if (!isSelf && !canManageUser(req.userRole, target.role)) {
    return res.status(403).json({ error: 'You cannot edit this user role' });
  }
  if (!isSelf && !canAssignRole(req.userRole, requestedRole)) {
    return res.status(403).json({ error: 'You cannot assign this role' });
  }

  await clerkClient.users.updateUser(req.params.userId, { username });
  await clerkClient.users.updateUserMetadata(req.params.userId, {
    publicMetadata: { role: requestedRole }
  });

  const result = await db.query(
    'UPDATE users SET username = $1, role = $2 WHERE id = $3 RETURNING *',
    [username, requestedRole, req.params.userId]
  );
  res.json(result.rows[0]);
});

// This removes only the app database record. The Clerk account remains active.
router.delete('/:userId', authenticate, syncUser, requireRole('admin', 'superadmin'), async (req, res) => {
  if (req.params.userId === req.auth.userId) {
    return res.status(403).json({ error: 'You cannot delete your own user record' });
  }
  const existing = await db.query('SELECT role FROM users WHERE id = $1', [req.params.userId]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'User record not found' });
  }
  if (!canManageUser(req.userRole, existing.rows[0].role)) {
    return res.status(403).json({ error: 'You cannot delete this user role' });
  }
  const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.userId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'User record not found' });
  }

  res.json({ success: true, id: result.rows[0].id });
});

module.exports = router;
