const { clerkClient, requireAuth } = require('@clerk/express');

// Verify Clerk session and attach user to req
const authenticate = requireAuth();

// Check role from Clerk publicMetadata
const requireRole = (...roles) => async (req, res, next) => {
  const user = await clerkClient.users.getUser(req.auth.userId);
  const userRole = user.publicMetadata?.role || 'member';
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
  const role = clerkUser.publicMetadata?.role || 'member';
  const username = clerkUser.username || clerkUser.publicMetadata?.username || clerkUser.firstName || (email ? email.split('@')[0] : null);

  await db.query(
    `INSERT INTO users (id, username, email, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET username = $2, email = $3, role = $4`,
    [userId, username, email, role]
  );
  req.clerkUser = clerkUser;
  req.userRole = role;
  next();
};

module.exports = { authenticate, requireRole, syncUser };
