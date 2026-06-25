-- Migration: add rejection flags to payments/invoices and user-company associations
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS rejected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rejection_note TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by_id INTEGER;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS revoked_by_id INTEGER,
  ADD COLUMN IF NOT EXISTS revocation_note TEXT;

-- Table to link users with companies (association requests)
CREATE TABLE IF NOT EXISTS user_companies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, company_id)
);

-- Small index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
