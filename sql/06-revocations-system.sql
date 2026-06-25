-- =====================================================
-- Revocations System
-- =====================================================
-- This system allows admins to revoke/undo almost any action
-- in the system, including payments, invoices, loan approvals,
-- company associations, user modifications, etc.

-- Table to store revocation action types
CREATE TABLE IF NOT EXISTS revocation_actions (
  id SERIAL PRIMARY KEY,
  action_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined action types
INSERT INTO revocation_actions (action_code, description) VALUES
  ('INVOICE_CREATED', 'Factura/Recibo creada'),
  ('PAYMENT_APPROVED', 'Pago aprobado'),
  ('PAYMENT_REJECTED', 'Pago rechazado'),
  ('LOAN_APPROVED', 'Préstamo aprobado'),
  ('LOAN_REJECTED', 'Préstamo rechazado'),
  ('COMPANY_ASSOCIATED', 'Empresa asociada'),
  ('COMPANY_REJECTED', 'Asociación de empresa rechazada'),
  ('USER_CREATED', 'Usuario creado'),
  ('USER_DELETED', 'Usuario eliminado'),
  ('USER_MODIFIED', 'Usuario modificado'),
  ('PASSWORD_CHANGED', 'Contraseña cambiada'),
  ('ADMIN_PRIVILEGE_GRANTED', 'Privilegio de administrador otorgado'),
  ('ADMIN_PRIVILEGE_REVOKED', 'Privilegio de administrador revocado')
ON CONFLICT (action_code) DO NOTHING;

-- Main revocations table
CREATE TABLE IF NOT EXISTS revocations (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL REFERENCES revocation_actions(action_code),
  target_type VARCHAR(50) NOT NULL,  -- 'payment', 'invoice', 'loan', 'company', 'user', etc.
  target_id INTEGER NOT NULL,        -- ID of the affected record
  actor_id INTEGER NOT NULL REFERENCES users(id),  -- Who performed the original action
  original_data JSONB,               -- Full data of the original action (for restoration)
  reason TEXT,                       -- Why the action was taken
  revocation_reason TEXT,            -- Why the action is being revoked
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_by_id INTEGER NOT NULL REFERENCES users(id),  -- Admin who is revoking
  is_confirmed BOOLEAN DEFAULT FALSE,  -- Whether the revocation is confirmed
  confirmed_at TIMESTAMP,            -- When the revocation was confirmed
  restored_at TIMESTAMP,             -- When the revocation was restored/undone
  -- When the revocation becomes effective (after delay). If NULL, applies immediately
  effective_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancelled_by_id INTEGER REFERENCES users(id),
  cancelled_reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'confirmed', 'restored', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_revocations_actor_id ON revocations(actor_id);
CREATE INDEX IF NOT EXISTS idx_revocations_revoked_by_id ON revocations(revoked_by_id);
CREATE INDEX IF NOT EXISTS idx_revocations_target_id_type ON revocations(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_revocations_status ON revocations(status);
CREATE INDEX IF NOT EXISTS idx_revocations_action_type ON revocations(action_type);
CREATE INDEX IF NOT EXISTS idx_revocations_created_at ON revocations(created_at DESC);

-- Audit trigger for revocations table
CREATE OR REPLACE FUNCTION audit_revocations_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    action,
    record_id,
    old_values,
    new_values,
    user_id,
    created_at
  ) VALUES (
    'revocations',
    TG_OP,
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true) LIMIT 1),
    CURRENT_TIMESTAMP
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_revocations ON revocations;
CREATE TRIGGER audit_revocations
AFTER INSERT OR UPDATE OR DELETE ON revocations
FOR EACH ROW
EXECUTE FUNCTION audit_revocations_trigger();
