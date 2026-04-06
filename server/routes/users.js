const router = require('express').Router();
const { clerkClient } = require('@clerk/express');
const db = require('../db');
const { authenticate, syncUser, requireRole } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

// Update user role (admin only)
router.put('/:userId/role', authenticate, syncUser, requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'librarian', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  // Update in Clerk metadata
  await clerkClient.users.updateUserMetadata(req.params.userId, {
    publicMetadata: { role }
  });
  // Update in our DB
  await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.userId]);
  res.json({ success: true });
});

module.exports = router;
