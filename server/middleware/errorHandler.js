const logger = require('../lib/logger');

function createHttpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function notFound(req, res, next) {
  next(createHttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function publicStatus(error) {
  if (error.type === 'entity.parse.failed') return 400;
  if (error.type === 'entity.too.large') return 413;
  if (error.code === '23505') return 409;
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) return error.status;
  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600) return error.statusCode;
  return 500;
}

function publicMessage(error, status) {
  if (error.type === 'entity.parse.failed') return 'Request body must be valid JSON';
  if (error.type === 'entity.too.large') return 'Request payload is too large';
  if (error.code === '23505') return 'A record with this value already exists';
  if (status < 500) return error.message || 'Request failed';
  return 'Server error';
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = publicStatus(error);
  const level = status >= 500 ? 'error' : 'warn';
  logger[level](error.message || 'Request failed', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    status,
    error,
  });

  res.status(status).json({
    error: publicMessage(error, status),
    requestId: req.id,
  });
}

module.exports = { createHttpError, errorHandler, notFound };
