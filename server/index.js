require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { randomUUID } = require('crypto');
require('express-async-errors');
const { createHttpError, errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./lib/logger');

const app = express();

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'];
  req.id = typeof requestId === 'string' && requestId.trim() ? requestId : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
app.use(helmet());

// Support comma-separated frontend URL values and the localhost aliases used by Vite.
const configuredClientUrls = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URLS,
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URLS,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
];
const normalizeOrigin = (url) => url.replace(/\/+$/, '');
const clientUrls = [...new Set(configuredClientUrls
  .flatMap((value) => (value || '').split(','))
  .map((value) => normalizeOrigin(value.trim()))
  .filter(Boolean))];
if (clientUrls.length === 0) {
  logger.warn('No frontend origin configured. Set CLIENT_URLS or FRONTEND_URLS before deploying.');
}
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const localDevelopmentAllowed = clientUrls.some((url) => {
  try {
    return localHosts.has(new URL(url).hostname);
  } catch {
    return false;
  }
});
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (clientUrls.length === 0) return callback(null, true);
    if (clientUrls.includes(normalizeOrigin(origin))) return callback(null, true);
    try {
      const requestUrl = new URL(origin);
      if (localDevelopmentAllowed && requestUrl.protocol === 'http:' && localHosts.has(requestUrl.hostname)) {
        return callback(null, true);
      }
    } catch {}
    callback(createHttpError(403, 'Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '4mb' }));

// Basic request logging with user and origin context
morgan.token('user', (req) => (req.auth?.userId ? `user:${req.auth.userId}` : 'user:-'));
morgan.token('origin', (req) => (req.headers.origin || '-'));
morgan.token('request-id', (req) => req.id || '-');
morgan.token('auth-user-id', (req) => req.auth?.userId || '');
app.use(morgan((tokens, req, res) => {
  const status = Number(tokens.status(req, res) || 0);
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  logger[level]('http request', {
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status,
    contentLength: tokens.res(req, res, 'content-length') || '',
    responseTimeMs: Number(tokens['response-time'](req, res) || 0),
    origin: tokens.origin(req, res),
    user: tokens['auth-user-id'](req, res),
    requestId: tokens['request-id'](req, res),
  });
  return null;
}));

// Routes
const healthHandler = async (req, res, next) => {
  const db = require('./db');
  const result = await db.query('SELECT 1 as ok');
  res.json({ status: 'ok', db: result.rows[0].ok === 1 });
};
app.get('/healthz', healthHandler);
app.get('/healthz/healthz', healthHandler);

// Users/admin routes (protected via Clerk in the router)
app.use('/api/logs', require('./routes/logs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/records', require('./routes/records'));

// Expose a simple authenticated endpoint that also syncs the Clerk user to our DB
const { authenticate, syncUser } = require('./middleware/auth');
app.get('/api/me', authenticate, syncUser, (req, res) => {
  const email = req.clerkUser?.emailAddresses?.[0]?.emailAddress;
  res.json({ id: req.auth.userId, email, role: req.userRole });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`Server running on ${PORT}`));
