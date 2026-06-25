-- Add revoked metadata columns to invoices and payments
-- Run this against the live database (inside the DB container) to add columns that track revocations

ALTER TABLE IF EXISTS invoices
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS revoked_by_id integer NULL,
  ADD COLUMN IF NOT EXISTS revocation_note text NULL;

ALTER TABLE IF EXISTS payments
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS revoked_by_id integer NULL,
  ADD COLUMN IF NOT EXISTS revocation_note text NULL;

-- Optional: add indexes to speed up queries by revoked_by_id
CREATE INDEX IF NOT EXISTS idx_invoices_revoked_by ON invoices (revoked_by_id);
CREATE INDEX IF NOT EXISTS idx_payments_revoked_by ON payments (revoked_by_id);

-- Note: if you prefer a separate boolean column 'revoked boolean', add it here.
