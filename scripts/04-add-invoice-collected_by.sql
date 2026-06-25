-- Migration: add collected_by to invoices to track which admin collected a manual payment
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS collected_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_invoices_collected_by ON invoices(collected_by);
