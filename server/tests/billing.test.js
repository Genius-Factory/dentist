const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { cents, decimal, dateOnly, range, summarizeRevenue } = require('../lib/billing');

test('currency validation and arithmetic preserve cents', () => {
  assert.equal(cents('0.10') + cents('0.20'), 30);
  assert.equal(decimal(30), '0.30');
  assert.equal(cents('99999999.99'), 9999999999);
  assert.equal(cents('0', true), 0);
  for (const value of ['0', '-1', '1.001', '', null, 'NaN', '1e3', '100000000']) assert.throws(() => cents(value), { status: 400 });
});
test('date ranges validate real dates and cross month/year boundaries', () => {
  assert.equal(dateOnly('2024-02-29'), '2024-02-29');
  for (const value of ['2025-02-29', '2026-04-31', '2026-9-1', '', undefined]) assert.throws(() => dateOnly(value), { status: 400 });
  assert.throws(() => range('2026-02-01', '2026-01-01'), { status: 400 });
  assert.throws(() => range('2000-01-01', '2026-01-01'), { status: 400 });
  assert.deepEqual(range('2026-01-01', '2026-01-02'), { start: '2026-01-01', end: '2026-01-02', days: 2, previousStart: '2025-12-30', previousEnd: '2025-12-31', interval: 'day' });
  assert.equal(range('2026-01-01', '2026-03-31').interval, 'day');
  assert.equal(range('2026-01-01', '2026-04-01').interval, 'month');
});
test('revenue includes both endpoints, zero buckets, and the preceding equal period', () => {
  const result = summarizeRevenue(range('2026-01-01', '2026-01-03'), [
    { amount: '10.00', received_date: '2026-01-01', service_name: 'Cleaning' },
    { amount: '20.00', received_date: '2026-01-03', service_name: 'Filling' },
    { amount: '15.00', received_date: '2025-12-31', service_name: 'Cleaning' },
  ], [{ amount: '50.00', collected: '25.00' }]);
  assert.deepEqual(result.timeline.map((p) => p.amountCents), [1000, 0, 2000]);
  assert.equal(result.totalCents, 3000);
  assert.equal(result.averageCents, 1000);
  assert.equal(result.previousCents, 1500);
  assert.equal(result.changePercent, 100);
  assert.equal(Math.round(result.services.reduce((sum, item) => sum + item.percent, 0)), 100);
  assert.deepEqual(result.status, { chargedCents: 5000, collectedCents: 2500, outstandingCents: 2500 });
  const empty = summarizeRevenue(range('2026-01-01', '2026-04-01'), [], []);
  assert.equal(empty.timeline.length, 4);
  assert.equal(empty.changePercent, null);
  assert.equal(empty.averageCents, 0);
});

test('billing API with real PostgreSQL transactions', { skip: process.env.BILLING_TEST_DB !== '1' }, async (t) => {
  require('dotenv').config();
  const { Pool } = require('pg');
  const express = require('express');
  const { createBillingRouter } = require('../routes/billing');
  const schema = `billing_test_${randomUUID().replaceAll('-', '')}`;
  const connectionString = process.env.BILLING_TEST_DATABASE_URL || process.env.DATABASE_URL;
  const options = { connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 };
  const admin = new Pool(options);
  let db, server;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new Pool({ ...options, options: `-c search_path=${schema}` });
    await db.query(`CREATE TABLE services(id varchar(255) PRIMARY KEY, name text, price numeric(10,2));
      CREATE TABLE appointments(id varchar(255) PRIMARY KEY,service_id varchar(255),medical_issue text);
      INSERT INTO services VALUES ('clean','Cleaning',100);
      INSERT INTO appointments VALUES ('a','clean','Cleaning'),('b','clean','Cleaning'),('c','clean','Cleaning'),('d',NULL,'Legacy service');`);
    const migration = fs.readFileSync(path.join(__dirname, '../db/billing.sql'), 'utf8');
    await db.query(migration);
    await db.query(migration);
    const auth = {
      authenticate: (req, res, next) => { if (!req.headers['x-role']) return res.sendStatus(401); req.auth = { userId: 'test-staff' }; next(); },
      syncUser: (req, res, next) => next(),
      requireRole: (...roles) => (req, res, next) => roles.includes(req.headers['x-role']) ? next() : res.sendStatus(403),
    };
    const app = express();
    app.use(express.json());
    app.use('/api/billing', createBillingRouter(db, auth));
    app.use((error, req, res, next) => { if (!error.status) console.error('Unexpected billing error:', error.message); res.status(error.status || 500).json({ error: error.message }); });
    server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}/api/billing`;
    async function call(url, body, role = 'admin') {
      const response = await fetch(base + url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(role ? { 'x-role': role } : {}) }, ...(body ? { body: JSON.stringify({ ...body, timezoneOffset: 0 }) } : {}) });
      return { status: response.status, data: await response.json().catch(() => null) };
    }
    const charge = (id, amount = '100.00', issuedDate = '2024-01-01') => call(`/appointments/${id}/charge`, { amount, issuedDate });
    const pay = (id, amount, receivedDate = '2024-01-02', requestId = randomUUID()) => call(`/appointments/${id}/payments`, { amount, receivedDate, id: requestId });
    await t.test('unconfirmed appointments are unbilled; role gates protect reads and writes', async () => {
      const result = await call('/appointments/a');
      assert.equal(result.data.charge, null);
      assert.equal(result.data.appointment.price, '100.00');
      assert.equal((await call('/appointments/a', null, null)).status, 401);
      assert.equal((await call('/appointments/a', null, 'member')).status, 403);
      assert.equal((await call('/appointments/a/charge', { amount: '100', issuedDate: '2024-01-01' }, 'member')).status, 403);
      assert.equal((await call('/appointments/a', null, 'secretary')).status, 200);
      assert.equal((await call('/revenue?startDate=2024-01-01&endDate=2024-01-31', null, 'secretary')).status, 403);
    });
    await t.test('charges snapshot catalog data and are immutable and retry-safe', async () => {
      assert.equal((await charge('a')).status, 201);
      assert.equal((await charge('a')).status, 201);
      assert.equal((await charge('a', '90')).status, 409);
      await db.query("UPDATE services SET name='New cleaning', price=150 WHERE id='clean'");
      const { data } = await call('/appointments/a');
      assert.equal(data.charge.service_name, 'Cleaning');
      assert.equal(data.charge.amount, '100.00');
      await assert.rejects(db.query("DELETE FROM appointments WHERE id='a'"), (error) => ['23503', '23001'].includes(error.code));
    });
    await t.test('partial payments, duplicates, concurrent overpayment, and exact settlement', async () => {
      const requestId = randomUUID();
      assert.equal((await pay('a', '30.00', '2024-01-02', requestId)).status, 201);
      assert.equal((await pay('a', '30.00', '2024-01-02', requestId)).status, 201);
      assert.equal((await pay('a', '31.00', '2024-01-02', requestId)).status, 409);
      assert.equal((await call('/appointments/a')).data.remainingCents, 7000);
      const attempts = await Promise.all([pay('a', '50'), pay('a', '50')]);
      assert.deepEqual(attempts.map((result) => result.status).sort(), [201, 409]);
      assert.equal((await pay('a', '20')).status, 201);
      assert.equal((await call('/appointments/a')).data.remainingCents, 0);
      assert.equal((await pay('a', '0.01')).status, 409);
    });
    await t.test('simultaneous retries insert only one payment', async () => {
      assert.equal((await charge('d', '10')).status, 201);
      const requestId = randomUUID();
      const results = await Promise.all([pay('d', '2', '2023-12-31', requestId), pay('d', '2', '2023-12-31', requestId)]);
      assert.deepEqual(results.map((result) => result.status), [400, 400]);
      const retries = await Promise.all([pay('d', '2', '2024-03-01', requestId), pay('d', '2', '2024-03-01', requestId)]);
      assert.deepEqual(retries.map((result) => result.status), [201, 201]);
      const { data } = await call('/appointments/d');
      assert.equal(data.payments.length, 1);
      assert.equal(data.remainingCents, 800);
    });
    await t.test('voids retain audit information and reopen the remaining balance', async () => {
      const payment = (await call('/appointments/a')).data.payments.find((p) => p.amount === '30.00');
      const url = `/appointments/a/payments/${payment.id}/void`;
      assert.equal((await call(url, { reason: '' })).status, 400);
      assert.equal((await call(url, { reason: 'Entry mistake' }, 'secretary')).status, 200);
      assert.equal((await call(url, { reason: 'Second reason' })).status, 200);
      const { data } = await call('/appointments/a');
      assert.equal(data.remainingCents, 3000);
      const voided = data.payments.find((p) => p.id === payment.id);
      assert.equal(voided.void_reason, 'Entry mistake');
      assert.equal(voided.voided_by, 'test-staff');
      assert.ok(voided.voided_at);
      assert.equal((await pay('a', '30', '2024-01-03')).status, 201);
    });
    await t.test('invalid amounts and dates rejected, charges required, unknown records handled', async () => {
      assert.equal((await pay('b', '10')).status, 404);
      assert.equal((await charge('missing')).status, 404);
      assert.equal((await charge('b')).status, 201);
      assert.equal((await pay('b', '0')).status, 400);
      assert.equal((await pay('b', '1.001')).status, 400);
      assert.equal((await pay('b', '1', '2999-01-01')).status, 400);
      assert.equal((await pay('b', '1', '2023-12-31')).status, 400);
      assert.equal((await pay('b', '1', '2024-02-30')).status, 400);
      assert.equal((await call('/revenue?startDate=2024-02-01&endDate=2024-01-01')).status, 400);
      assert.equal((await call('/appointments/d')).data.appointment.price, null);
    });
    await t.test('revenue uses payment dates; status uses issue dates and end-date cutoff without double counting', async () => {
      assert.equal((await pay('b', '20', '2024-01-15')).status, 201);
      assert.equal((await pay('b', '40', '2024-02-01')).status, 201);
      assert.equal((await charge('c', '200', '2023-12-01')).status, 201);
      assert.equal((await pay('c', '50', '2024-01-31')).status, 201);
      const { data, status } = await call('/revenue?startDate=2024-01-01&endDate=2024-01-31');
      assert.equal(status, 200);
      assert.equal(data.totalCents, 17000);
      assert.equal(data.status.chargedCents, 21000);
      assert.equal(data.status.collectedCents, 12000);
      assert.equal(data.status.outstandingCents, 9000);
      assert.equal(data.timeline.length, 31);
      assert.equal(data.timeline.at(-1).amountCents, 5000);
      assert.equal(data.services.find((s) => s.name === 'Cleaning').amountCents, 10000);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.end();
    // Only the randomly generated test schema is removed; public data is never modified.
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
