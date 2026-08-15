const assert = require('assert');
const { createHttpError, errorHandler, notFound } = require('../middleware/errorHandler');

function runHandler(error, overrides = {}) {
  const req = {
    id: overrides.requestId || 'test-request-id',
    method: overrides.method || 'GET',
    originalUrl: overrides.originalUrl || '/test',
  };

  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  let forwardedError = null;
  errorHandler(error, req, res, (nextError) => {
    forwardedError = nextError;
  });

  return { res, forwardedError };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const originalWarn = console.warn;
const originalError = console.error;
console.warn = () => {};
console.error = () => {};

test('returns 404 for unmatched routes', () => {
  const req = { method: 'GET', originalUrl: '/missing' };
  let capturedError = null;
  notFound(req, {}, (error) => {
    capturedError = error;
  });

  assert.strictEqual(capturedError.status, 404);
  assert.strictEqual(capturedError.message, 'Route not found: GET /missing');
});

test('returns custom client errors with request id', () => {
  const { res, forwardedError } = runHandler(createHttpError(403, 'Insufficient permissions'));

  assert.strictEqual(forwardedError, null);
  assert.strictEqual(res.statusCode, 403);
  assert.deepStrictEqual(res.body, {
    error: 'Insufficient permissions',
    requestId: 'test-request-id',
  });
});

test('maps invalid JSON body errors to 400', () => {
  const error = new Error('Unexpected token');
  error.type = 'entity.parse.failed';

  const { res } = runHandler(error);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Request body must be valid JSON');
});

test('maps large payload errors to 413', () => {
  const error = new Error('request entity too large');
  error.type = 'entity.too.large';

  const { res } = runHandler(error);

  assert.strictEqual(res.statusCode, 413);
  assert.strictEqual(res.body.error, 'Request payload is too large');
});

test('maps postgres unique violations to 409', () => {
  const error = new Error('duplicate key value violates unique constraint');
  error.code = '23505';

  const { res } = runHandler(error);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.error, 'A record with this value already exists');
});

test('hides server error details from the error field', () => {
  const { res } = runHandler(new Error('database password leaked in stack'));

  assert.strictEqual(res.statusCode, 500);
  assert.strictEqual(res.body.error, 'Server error');
  assert.strictEqual(res.body.requestId, 'test-request-id');
});

test('forwards errors after headers are sent', () => {
  const req = { id: 'test-request-id', method: 'GET', originalUrl: '/test' };
  const res = { headersSent: true };
  const error = new Error('late failure');
  let forwardedError = null;

  errorHandler(error, req, res, (nextError) => {
    forwardedError = nextError;
  });

  assert.strictEqual(forwardedError, error);
});

console.warn = originalWarn;
console.error = originalError;

