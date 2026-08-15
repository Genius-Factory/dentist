const express = require('express');
const logger = require('../lib/logger');

const router = express.Router();
const allowedLevels = new Set(['debug', 'info', 'warn', 'error']);
const maxLogsPerRequest = 25;

function asString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, 1000);
}

function asPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 50));
}

function normalizeLogEntry(entry) {
  const item = asPlainObject(entry);
  const level = allowedLevels.has(item.level) ? item.level : 'info';
  return {
    level,
    message: asString(item.message, 'Client log'),
    source: asString(item.source, 'client'),
    timestamp: asString(item.timestamp),
    url: asString(item.url),
    userAgent: asString(item.userAgent),
    context: asPlainObject(item.context),
  };
}

router.post('/', (req, res) => {
  const rawLogs = Array.isArray(req.body?.logs) ? req.body.logs : [req.body];
  const logs = rawLogs.slice(0, maxLogsPerRequest).map(normalizeLogEntry);

  logs.forEach((entry) => {
    logger[entry.level](`client:${entry.message}`, {
      source: entry.source,
      clientTimestamp: entry.timestamp,
      url: entry.url,
      userAgent: entry.userAgent,
      requestId: req.id,
      origin: req.headers.origin,
      ip: req.ip,
      context: entry.context,
    });
  });

  res.status(202).json({ accepted: logs.length, requestId: req.id });
});

module.exports = router;
