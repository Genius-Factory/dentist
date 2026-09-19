-- Additive billing migration; existing appointments remain unbilled.
CREATE TABLE IF NOT EXISTS appointment_charges (
  appointment_id VARCHAR(255) PRIMARY KEY REFERENCES appointments(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  service_name TEXT NOT NULL,
  issued_date DATE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS appointment_payments (
  id UUID PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL REFERENCES appointment_charges(appointment_id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  received_date DATE NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at TIMESTAMPTZ,
  voided_by VARCHAR(255),
  void_reason TEXT,
  CHECK ((voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
    OR (voided_at IS NOT NULL AND voided_by IS NOT NULL AND length(trim(void_reason)) > 0))
);
CREATE INDEX IF NOT EXISTS appointment_charges_date_idx ON appointment_charges(issued_date);
CREATE INDEX IF NOT EXISTS appointment_payments_appointment_idx ON appointment_payments(appointment_id);
CREATE INDEX IF NOT EXISTS appointment_payments_date_idx ON appointment_payments(received_date) WHERE voided_at IS NULL;
