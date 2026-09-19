# Revenue and payments

Before starting a server with this feature, run `npm run migrate:billing` from `server/` using that environment's `DATABASE_URL`. The migration is additive, transactional, and safe to repeat. New installations also receive the billing tables through `npm run init-db`. Existing appointments are not automatically billed.

Admins, superadmins, and secretaries can open **Manage Payment** from active or archived appointment listings. Confirm the USD charge and issue date first. The catalog price is a suggestion; confirmation freezes the amount and service name. A missing catalog service requires manual entry. Confirmed charges cannot be edited. Record partial payments with their actual received dates; payments cannot precede the charge date or exceed its remaining balance. Void incorrect payments with a reason and record a replacement. Voids retain staff, timestamp, and reason. Appointments with billing history cannot be deleted.

Dashboard analytics are restricted to admins and superadmins. The line and service charts use received dates. The payment-status ring uses charges issued within the selected range, with payments counted through its end date. Voided payments are excluded from all reports, including historical reports. This is operational reporting, not an immutable historical accounting statement.

Presets use the browser's local calendar: today, Monday through today, month-to-date, and year-to-date. Custom ranges include both endpoints and support up to 3,660 days. Timelines show daily buckets up to 90 days and monthly buckets thereafter. The comparison covers the immediately preceding equal number of days. Averages include empty buckets; partial months count as displayed intervals.

## API

All endpoints require Clerk authentication. Financial writes accept a browser `timezoneOffset` in minutes for calendar-date validation. Amounts are USD decimal strings with at most two decimal places. Reporting amounts use integer cents.

- `GET /api/billing/appointments/:id`: suggested service price, confirmed charge, payments (including voids), collected and remaining cents. Staff only.
- `POST /api/billing/appointments/:id/charge`: `{ amount, issuedDate, timezoneOffset }`. Repeating the same confirmation is safe; a different existing charge returns 409.
- `POST /api/billing/appointments/:id/payments`: `{ id, amount, receivedDate, timezoneOffset }`. `id` is a client-generated UUID v4 reused when retrying the same submission. A transaction locks the charge before checking its balance.
- `POST /api/billing/appointments/:id/payments/:paymentId/void`: `{ reason }`. Repeated void requests preserve the original audit record.
- `GET /api/billing/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`: timeline, service distribution, totals, previous-period comparison, and charge status. Admins only.

## Verification

`npm run test:billing` in `server/` runs currency, date, and aggregation unit tests. For API and concurrency integration tests, set `BILLING_TEST_DB=1` and optionally `BILLING_TEST_DATABASE_URL`, then run the same command. It otherwise uses `DATABASE_URL` from `server/.env`. The test account must be able to create a schema. Tests create and remove a uniquely named `billing_test_*` schema without modifying public application data. Authentication is stubbed only inside the test app; database operations and HTTP requests are real.

Run `npm run build` and `npm run lint` from `client/`. Browser acceptance checks: desktop and mobile layout; keyboard focus through date inputs, chart points, and the payment dialog; empty and error states; recording and voiding a partial payment; changing date ranges; and switching between active and archived appointment lists.
