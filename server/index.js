require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes
app.get('/healthz', async (req, res, next) => {
  try {
    const db = require('./db');
    const result = await db.query('SELECT 1 as ok');
    res.json({ status: 'ok', db: result.rows[0].ok === 1 });
  } catch (err) {
    next(err);
  }
});

// Users/admin routes (protected via Clerk in the router)
app.use('/api/users', require('./routes/users'));

// Expose a simple authenticated endpoint that also syncs the Clerk user to our DB
const { authenticate, syncUser } = require('./middleware/auth');
app.get('/api/me', authenticate, syncUser, (req, res) => {
  const email = req.clerkUser?.emailAddresses?.[0]?.emailAddress;
  res.json({ id: req.auth.userId, email, role: req.userRole });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
