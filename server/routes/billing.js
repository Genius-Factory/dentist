const express = require('express');
const { fail, dateOnly, cents, decimal, range, summarizeRevenue } = require('../lib/billing');

// Dependency injection keeps the transaction and authorization paths testable.
function createBillingRouter(db, { authenticate, syncUser, requireRole }) {
  const router = express.Router();
  router.use(authenticate, syncUser);
  const staff = requireRole('admin', 'superadmin', 'secretary');
  const admins = requireRole('admin', 'superadmin');
  const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
  async function transaction(work) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  function pastDate(body, field) {
    const date = dateOnly(body[field]);
    const offset = body.timezoneOffset;
    if (!Number.isInteger(offset) || Math.abs(offset) > 840) throw fail(400, 'A valid timezone offset is required');
    const today = new Date(Date.now() - offset * 60000).toISOString().slice(0, 10);
    if (date > today) throw fail(400, 'Dates cannot be in the future');
    return date;
  }
  async function lockCharge(client, id) {
    const result = await client.query('SELECT *, issued_date::text FROM appointment_charges WHERE appointment_id=$1 FOR UPDATE', [id]);
    if (!result.rowCount) throw fail(404, 'Confirm the appointment charge first');
    return result.rows[0];
  }
  router.get('/revenue', admins, wrap(async (req, res) => {
    const period = range(req.query.startDate, req.query.endDate);
    const result = await transaction(async (client) => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const payments = await client.query(`SELECT p.amount, p.received_date::text, c.service_name
        FROM appointment_payments p JOIN appointment_charges c USING (appointment_id)
        WHERE p.voided_at IS NULL AND p.received_date BETWEEN $1 AND $2`, [period.previousStart, period.end]);
      const charges = await client.query(`SELECT c.amount, COALESCE(SUM(p.amount),0)::text AS collected
        FROM appointment_charges c LEFT JOIN appointment_payments p
        ON p.appointment_id=c.appointment_id AND p.voided_at IS NULL AND p.received_date <= $2
        WHERE c.issued_date BETWEEN $1 AND $2 GROUP BY c.appointment_id`, [period.start, period.end]);
      return summarizeRevenue(period, payments.rows, charges.rows);
    });
    res.json(result);
  }));
  router.get('/appointments/:id', staff, wrap(async (req, res) => {
    const data = await transaction(async (client) => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const appointment = await client.query(`SELECT a.id, COALESCE(s.name,a.medical_issue,'Consultation') AS service_name, s.price
        FROM appointments a LEFT JOIN services s ON s.id=a.service_id WHERE a.id=$1`, [req.params.id]);
      if (!appointment.rowCount) throw fail(404, 'Appointment not found');
      const charge = await client.query('SELECT *, issued_date::text FROM appointment_charges WHERE appointment_id=$1', [req.params.id]);
      const payments = await client.query('SELECT p.*, p.received_date::text FROM appointment_payments p WHERE appointment_id=$1 ORDER BY p.received_date DESC, p.created_at DESC', [req.params.id]);
      const collectedCents = payments.rows.filter((p) => !p.voided_at).reduce((sum, p) => sum + cents(p.amount), 0);
      return { appointment: appointment.rows[0], charge: charge.rows[0] || null, payments: payments.rows, collectedCents,
        remainingCents: charge.rowCount ? cents(charge.rows[0].amount, true) - collectedCents : null };
    });
    res.json(data);
  }));
  router.post('/appointments/:id/charge', staff, wrap(async (req, res) => {
    const amount = decimal(cents(req.body.amount, true));
    const issuedDate = pastDate(req.body, 'issuedDate');
    await transaction(async (client) => {
      const appointment = await client.query('SELECT * FROM appointments WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!appointment.rowCount) throw fail(404, 'Appointment not found');
      const existing = await client.query('SELECT *, issued_date::text FROM appointment_charges WHERE appointment_id=$1', [req.params.id]);
      if (existing.rowCount) {
        if (existing.rows[0].amount === amount && existing.rows[0].issued_date === issuedDate) return;
        throw fail(409, 'This appointment already has a confirmed charge');
      }
      const service = await client.query('SELECT name FROM services WHERE id=$1', [appointment.rows[0].service_id]);
      await client.query(`INSERT INTO appointment_charges (appointment_id,amount,service_name,issued_date,created_by)
        VALUES ($1,$2,$3,$4,$5)`, [req.params.id, amount, service.rows[0]?.name || appointment.rows[0].medical_issue || 'Consultation', issuedDate, req.auth.userId]);
    });
    res.status(201).json({ success: true });
  }));
  router.post('/appointments/:id/payments', staff, wrap(async (req, res) => {
    const amountCents = cents(req.body.amount);
    const receivedDate = pastDate(req.body, 'receivedDate');
    if (typeof req.body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.body.id)) throw fail(400, 'A payment request ID is required');
    await transaction(async (client) => {
      const charge = await lockCharge(client, req.params.id);
      const existing = await client.query('SELECT *, received_date::text FROM appointment_payments WHERE id=$1', [req.body.id]);
      if (existing.rowCount) {
        const payment = existing.rows[0];
        if (payment.appointment_id === req.params.id && cents(payment.amount) === amountCents && payment.received_date === receivedDate) return;
        throw fail(409, 'Payment request ID was already used');
      }
      const issuedDate = charge.issued_date instanceof Date ? charge.issued_date.toISOString().slice(0, 10) : String(charge.issued_date).slice(0, 10);
      if (receivedDate < issuedDate) throw fail(400, 'Payment date cannot precede the charge issue date');
      const total = await client.query('SELECT COALESCE(SUM(amount),0)::text AS total FROM appointment_payments WHERE appointment_id=$1 AND voided_at IS NULL', [req.params.id]);
      if (cents(total.rows[0].total, true) + amountCents > cents(charge.amount, true)) throw fail(409, 'Payment exceeds the remaining balance');
      await client.query('INSERT INTO appointment_payments (id,appointment_id,amount,received_date,created_by) VALUES ($1,$2,$3,$4,$5)', [req.body.id, req.params.id, decimal(amountCents), receivedDate, req.auth.userId]);
    });
    res.status(201).json({ success: true });
  }));
  router.post('/appointments/:id/payments/:paymentId/void', staff, wrap(async (req, res) => {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason || reason.length > 1000) throw fail(400, 'Provide a void reason of 1–1000 characters');
    await transaction(async (client) => {
      await lockCharge(client, req.params.id);
      const payment = await client.query('SELECT id FROM appointment_payments WHERE id::text=$1 AND appointment_id=$2', [req.params.paymentId, req.params.id]);
      if (!payment.rowCount) throw fail(404, 'Payment not found');
      await client.query(`UPDATE appointment_payments SET voided_at=NOW(),voided_by=$3,void_reason=$4
        WHERE id::text=$1 AND appointment_id=$2 AND voided_at IS NULL`, [req.params.paymentId, req.params.id, req.auth.userId, reason]);
    });
    res.json({ success: true });
  }));
  return router;
}
module.exports = { createBillingRouter };
