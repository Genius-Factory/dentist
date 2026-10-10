// Included in the staff appointment list, avoiding one billing read per card.
const billingColumns = `json_build_object(
  'status', CASE WHEN c.appointment_id IS NULL THEN 'not_billed'
    WHEN COALESCE(p.collected, 0) >= c.amount THEN 'paid'
    WHEN COALESCE(p.collected, 0) > 0 THEN 'partial' ELSE 'unpaid' END,
  'chargedCents', (c.amount * 100)::bigint,
  'collectedCents', (COALESCE(p.collected, 0) * 100)::bigint,
  'remainingCents', ((c.amount - COALESCE(p.collected, 0)) * 100)::bigint
) AS billing`;
const billingJoins = `LEFT JOIN appointment_charges c ON c.appointment_id = a.id
  LEFT JOIN (SELECT appointment_id, SUM(amount) AS collected FROM appointment_payments
    WHERE voided_at IS NULL GROUP BY appointment_id) p ON p.appointment_id = a.id`;
module.exports = { billingColumns, billingJoins };
