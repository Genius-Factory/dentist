const { clerkClient, requireAuth } = require('@clerk/express');

// Verify Clerk session and attach user to req
const authenticate = requireAuth();

// Check role from Clerk publicMetadata
const requireRole = (...roles) => async (req, res, next) => {
  const user = await clerkClient.users.getUser(req.auth.userId);
  const userRole = String(user.publicMetadata?.role || 'member').toLowerCase();
  if (!roles.includes(userRole)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  req.userRole = userRole;
  next();
};

// Sync Clerk user to our DB on first request
const syncUser = async (req, res, next) => {
  const db = require('../db');
  const { userId } = req.auth;
  const clerkUser = await clerkClient.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const role = String(clerkUser.publicMetadata?.role || 'member').toLowerCase();
  const username = clerkUser.username || clerkUser.publicMetadata?.username || clerkUser.firstName || (email ? email.split('@')[0] : null);

  // Older installations may have a seeded row with the same email but not the
  // Clerk ID. Reconcile that row rather than failing on the unique email index.
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const byId = await client.query(
      'UPDATE users SET username = $2, email = $3, role = $4 WHERE id = $1 RETURNING id',
      [userId, username, email, role]
    );

    if (byId.rowCount === 0) {
      const byEmail = await client.query(
        'UPDATE users SET id = $1, username = $2, role = $4 WHERE email = $3 RETURNING id',
        [userId, username, email, role]
      );

      if (byEmail.rowCount === 0) {
        await client.query(
          'INSERT INTO users (id, username, email, role) VALUES ($1, $2, $3, $4)',
          [userId, username, email, role]
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  req.clerkUser = clerkUser;
  req.userRole = role;
  next();
};

module.exports = { authenticate, requireRole, syncUser };
