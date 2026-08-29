-- ==============================================================================
-- JOSHPER SOLUTIONS - ESQUEMA COMPLETO PARA SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Copia y pega este script en el SQL Editor de tu proyecto en Supabase y ejecuta "Run".

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    cedula_pasaporte TEXT UNIQUE NOT NULL,
    documento_foto TEXT,
    numero_celular TEXT NOT NULL,
    password TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    can_request_loans BOOLEAN DEFAULT TRUE,
    can_associate_companies BOOLEAN DEFAULT TRUE,
    profile_edits_count INTEGER DEFAULT 0,
    last_profile_edit TIMESTAMP,
    document_migrated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE EMPRESAS
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    nombre_empresa TEXT,
    razon_social TEXT,
    nombre_comercial TEXT,
    rnc TEXT UNIQUE NOT NULL,
    representante TEXT,
    empleados INTEGER DEFAULT 0,
    sector TEXT,
    correo TEXT,
    email_corporativo TEXT,
    telefono TEXT,
    telefono_contacto TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE SOLICITUDES DE PRÉSTAMOS
CREATE TABLE IF NOT EXISTS loan_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    documento TEXT NOT NULL,
    telefono TEXT NOT NULL,
    empresa TEXT NOT NULL,
    tiempo_empresa INTEGER NOT NULL,
    sueldo NUMERIC(10,2) NOT NULL,
    prestaciones NUMERIC(10,2) NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    frecuencia TEXT NOT NULL CHECK (frecuencia IN ('mensual', 'quincenal')),
    plazo INTEGER NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    documento_foto TEXT,
    cuenta_banco TEXT,
    nombre_banco TEXT,
    tipo_cuenta TEXT CHECK (tipo_cuenta IN ('ahorros', 'corriente')),
    next_payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE PAGOS
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    capital_amount NUMERIC(10,2) DEFAULT 0,
    interest_amount NUMERIC(10,2) DEFAULT 0,
    late_fee NUMERIC(10,2) DEFAULT 0,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('installment', 'partial', 'full')),
    payment_method TEXT DEFAULT 'transferencia',
    reference_number TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE SIMULACIONES
CREATE TABLE IF NOT EXISTS loan_simulations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sueldo NUMERIC(10,2) NOT NULL,
    prestaciones NUMERIC(10,2) NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    frecuencia TEXT NOT NULL,
    plazo INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE COMENTARIOS DE PRÉSTAMOS
CREATE TABLE IF NOT EXISTS loan_comments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_id INTEGER REFERENCES loan_applications(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA DE FACTURAS / RECIBOS
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_invoice_number TEXT;
    next_val INT;
BEGIN
    next_val := nextval('invoice_number_seq');
    new_invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_val::TEXT, 5, '0');
    RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    user_name TEXT NOT NULL,
    user_lastname TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_phone TEXT,
    user_address TEXT,
    payment_amount NUMERIC(10,2) NOT NULL,
    payment_type TEXT NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    loan_id INTEGER NOT NULL REFERENCES loan_applications(id),
    company_name TEXT,
    admin_notes TEXT,
    user_id INT REFERENCES users(id),
    collected_by INT REFERENCES users(id),
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_by_id INT REFERENCES users(id),
    revocation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA DE AUDITORÍA
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. SISTEMA DE REVOCACIONES
CREATE TABLE IF NOT EXISTS revocation_actions (
    id SERIAL PRIMARY KEY,
    action_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS revocations (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL REFERENCES revocation_actions(action_code),
    target_type VARCHAR(50) NOT NULL,
    target_id INTEGER NOT NULL,
    actor_id INTEGER NOT NULL REFERENCES users(id),
    original_data JSONB,
    reason TEXT,
    revocation_reason TEXT,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_by_id INTEGER NOT NULL REFERENCES users(id),
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP,
    restored_at TIMESTAMP,
    effective_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by_id INTEGER REFERENCES users(id),
    cancelled_reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. VISTA DE PRÉSTAMOS ACTIVOS
CREATE OR REPLACE VIEW active_loans AS
SELECT 
    la.id,
    la.user_id,
    u.nombre as user_name,
    u.apellido as user_lastname,
    u.email as user_email,
    la.monto as original_amount,
    (la.monto - COALESCE(SUM(p.amount), 0)) as remaining_amount,
    (la.monto / la.plazo) as installment_amount,
    la.plazo as total_installments,
    (la.plazo - COUNT(p.id)) as remaining_installments,
    CURRENT_DATE + INTERVAL '1 month' as next_payment_date,
    CASE 
        WHEN (la.monto - COALESCE(SUM(p.amount), 0)) <= 0 THEN 'completed'
        WHEN (CURRENT_DATE > (la.created_at + INTERVAL '1 month' * la.plazo)) THEN 'overdue'
        ELSE 'active'
    END as status
FROM loan_applications la
JOIN users u ON la.user_id = u.id
LEFT JOIN payments p ON la.id = p.loan_id AND p.status = 'paid'
WHERE la.estado = 'aprobado'
GROUP BY la.id, u.id
HAVING (la.monto - COALESCE(SUM(p.amount), 0)) > 0;

-- 13. ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_estado ON loan_applications(estado);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_revocations_actor_id ON revocations(actor_id);
CREATE INDEX IF NOT EXISTS idx_revocations_revoked_by_id ON revocations(revoked_by_id);

-- 14. USUARIO ADMINISTRADOR INICIAL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@joshper.com') THEN
        INSERT INTO users (
            nombre, apellido, email, cedula_pasaporte, numero_celular, password, is_admin,
            can_request_loans, can_associate_companies
        ) VALUES (
            'Admin',
            'Principal',
            'admin@joshper.com',
            '000-0000000-0',
            '809-000-0000',
            '$2b$10$s3UquVREldGmbZ2LuKcvEuKtwkMfe3oRWxEIKM0lFhy9l2mCRB9OS',
            TRUE,
            TRUE,
            TRUE
        );
    END IF;
END
$$;
