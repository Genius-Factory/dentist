const router = require('express').Router();
const { clerkClient } = require('@clerk/express');
const db = require('../db');
const { authenticate, requireRole, syncUser } = require('../middleware/auth');

const allowedRoles = ['admin', 'librarian', 'member', 'secretary'];

// Temporary authenticated user manager. Restrict this middleware to requireRole('admin') later.
router.get('/', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

// Update username and role in both Clerk and PostgreSQL so syncUser will preserve the change.
router.put('/:userId', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const { role } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const existing = await db.query('SELECT id FROM users WHERE id = $1', [req.params.userId]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'User record not found' });
  }

  await clerkClient.users.updateUser(req.params.userId, { username });
  await clerkClient.users.updateUserMetadata(req.params.userId, {
    publicMetadata: { role }
  });

  const result = await db.query(
    'UPDATE users SET username = $1, role = $2 WHERE id = $3 RETURNING *',
    [username, role, req.params.userId]
  );
  res.json(result.rows[0]);
});

// This removes only the app database record. The Clerk account remains active.
router.delete('/:userId', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.userId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'User record not found' });
  }

  res.json({ success: true, id: result.rows[0].id });
});

module.exports = router;
