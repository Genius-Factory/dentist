ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_name_snapshot TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_price_snapshot NUMERIC(10,2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dentist_name_snapshot TEXT;

UPDATE appointments a SET
  service_name_snapshot = COALESCE(a.service_name_snapshot, c.service_name),
  service_price_snapshot = COALESCE(a.service_price_snapshot, c.amount)
FROM appointment_charges c WHERE a.id = c.appointment_id;

UPDATE appointments a SET
  service_name_snapshot = COALESCE(a.service_name_snapshot, s.name),
  service_price_snapshot = COALESCE(a.service_price_snapshot, s.price)
FROM services s
WHERE a.service_id = s.id AND (a.service_name_snapshot IS NULL OR a.service_price_snapshot IS NULL);

UPDATE appointments a SET dentist_name_snapshot = COALESCE(u.username, u.email)
FROM users u WHERE a.dentist_id = u.id AND a.dentist_name_snapshot IS NULL;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
ALTER TABLE appointments ADD CONSTRAINT appointments_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION preserve_appointment_service() RETURNS trigger AS $$
DECLARE booked_service services%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.service_id IS DISTINCT FROM OLD.service_id THEN
    SELECT * INTO booked_service FROM services WHERE id = NEW.service_id FOR SHARE;
    IF NOT FOUND OR booked_service.status <> 'active' THEN
      RAISE EXCEPTION 'This service is unavailable for new bookings. Please choose another service.' USING ERRCODE = '23514';
    END IF;
    NEW.service_name_snapshot := booked_service.name;
    IF TG_OP = 'UPDATE' AND current_setting('app.service_transfer', true) = 'true' THEN
      NEW.service_price_snapshot := COALESCE(OLD.service_price_snapshot, booked_service.price);
    ELSE
      NEW.service_price_snapshot := booked_service.price;
    END IF;
    NEW.duration := booked_service.duration;
  ELSE
    NEW.service_name_snapshot := OLD.service_name_snapshot;
    NEW.service_price_snapshot := OLD.service_price_snapshot;
    NEW.duration := OLD.duration;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.dentist_id IS DISTINCT FROM OLD.dentist_id THEN
    SELECT COALESCE(username, email) INTO NEW.dentist_name_snapshot FROM users WHERE id = NEW.dentist_id;
  ELSE
    NEW.dentist_name_snapshot := OLD.dentist_name_snapshot;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER appointment_service_history
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION preserve_appointment_service();

CREATE TABLE IF NOT EXISTS service_transfers (
  id BIGSERIAL PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  from_service_id VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  to_service_id VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  from_service_name TEXT NOT NULL,
  to_service_name TEXT NOT NULL,
  transferred_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION protect_service_deactivation() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'inactive' AND EXISTS (
    SELECT 1 FROM appointments WHERE service_id = NEW.id AND status IN ('pending', 'approved')
    AND appointment_date + appointment_time >= LOCALTIMESTAMP
  ) THEN
    RAISE EXCEPTION 'Transfer upcoming appointments before deactivating this service.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER service_deactivation_guard
BEFORE UPDATE OF status ON services
FOR EACH ROW EXECUTE FUNCTION protect_service_deactivation();
