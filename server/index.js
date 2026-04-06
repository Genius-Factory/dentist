require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('express-async-errors');

const app = express();

app.use(helmet());

// Flexible CORS: support comma-separated CLIENT_URL and http/https hostname match
const clientUrls = (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (clientUrls.length === 0) return callback(null, true);
    if (clientUrls.includes(origin)) return callback(null, true);
    try {
      const reqHost = new URL(origin).host;
      if (clientUrls.some(u => { try { return new URL(u).host === reqHost; } catch { return false; } })) {
        return callback(null, true);
      }
    } catch {}
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Basic request logging with user and origin context
morgan.token('user', (req) => (req.auth?.userId ? `user:${req.auth.userId}` : 'user:-'));
morgan.token('origin', (req) => (req.headers.origin || '-'));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :origin :user'));

// Routes
const healthHandler = async (req, res, next) => {
  try {
    const db = require('./db');
    const result = await db.query('SELECT 1 as ok');
    res.json({ status: 'ok', db: result.rows[0].ok === 1 });
  } catch (err) {
    next(err);
  }
};
app.get('/healthz', healthHandler);
app.get('/healthz/healthz', healthHandler);

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
