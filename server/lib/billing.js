const fail = (status, message) => Object.assign(new Error(message), { status });
const dayMs = 86400000;
function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') throw fail(400, 'Provide a valid calendar date');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw fail(400, 'Provide a valid calendar date');
  return value;
}
function cents(value, allowZero = false) {
  const text = String(value ?? '');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(text)) throw fail(400, 'Enter a USD amount with at most two decimal places');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (result < (allowZero ? 0 : 1)) throw fail(400, 'Payment amount must be greater than zero');
  return result;
}
const decimal = (value) => `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
const shiftDate = (date, days) => new Date(new Date(`${date}T00:00:00Z`).getTime() + days * dayMs).toISOString().slice(0, 10);
function range(start, end) {
  dateOnly(start); dateOnly(end);
  if (start > end) throw fail(400, 'Start date must be on or before end date');
  const days = Math.round((new Date(end) - new Date(start)) / dayMs) + 1;
  if (days > 3660) throw fail(400, 'Choose a range of at most ten years');
  return { start, end, days, previousStart: shiftDate(start, -days), previousEnd: shiftDate(start, -1), interval: days <= 90 ? 'day' : 'month' };
}
function summarizeRevenue(period, payments, charges) {
  const key = (date) => period.interval === 'day' ? date : date.slice(0, 7);
  const buckets = new Map();
  for (let date = period.start; date <= period.end; date = shiftDate(date, 1)) buckets.set(key(date), 0);
  const services = new Map();
  let totalCents = 0;
  let previousCents = 0;
  for (const payment of payments) {
    const amount = cents(payment.amount);
    if (payment.received_date >= period.start && payment.received_date <= period.end) {
      totalCents += amount;
      buckets.set(key(payment.received_date), buckets.get(key(payment.received_date)) + amount);
      services.set(payment.service_name, (services.get(payment.service_name) || 0) + amount);
    } else if (payment.received_date >= period.previousStart && payment.received_date <= period.previousEnd) previousCents += amount;
  }
  const chargedCents = charges.reduce((sum, charge) => sum + cents(charge.amount, true), 0);
  const collectedCents = charges.reduce((sum, charge) => sum + cents(charge.collected, true), 0);
  return {
    ...period, currency: 'USD', totalCents, previousCents,
    averageCents: Math.round(totalCents / buckets.size),
    changePercent: previousCents ? (totalCents - previousCents) / previousCents * 100 : null,
    timeline: [...buckets].map(([date, amountCents]) => ({ date, amountCents })),
    services: [...services].sort((a, b) => b[1] - a[1]).map(([name, amountCents]) => ({ name, amountCents, percent: totalCents ? amountCents / totalCents * 100 : 0 })),
    status: { chargedCents, collectedCents, outstandingCents: chargedCents - collectedCents },
  };
}
module.exports = { fail, dateOnly, cents, decimal, range, summarizeRevenue };
