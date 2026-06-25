-- =========================
-- Tabla de usuarios
-- =========================
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Tabla de solicitudes de préstamos
-- =========================
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

-- =========================
-- Tabla de empresas
-- =========================
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    nombre_empresa TEXT NOT NULL,
    rnc TEXT UNIQUE NOT NULL,
    representante TEXT NOT NULL,
    empleados INTEGER NOT NULL,
    sector TEXT NOT NULL,
    correo TEXT NOT NULL,
    telefono TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Tabla de simulaciones de préstamos
-- =========================
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

-- =========================
-- Tabla de pagos
-- =========================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('installment', 'partial', 'full')),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Tabla de comentarios de préstamos
-- =========================
CREATE TABLE IF NOT EXISTS loan_comments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Tabla de notificaciones
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_id INTEGER REFERENCES loan_applications(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('admin_comment', 'payment_due', 'payment_pending')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Actualizar valores nulos antiguos
-- =========================
UPDATE loan_applications 
SET cuenta_banco = COALESCE(cuenta_banco, ''), 
    nombre_banco = COALESCE(nombre_banco, ''), 
    tipo_cuenta = COALESCE(tipo_cuenta, 'ahorros') 
WHERE cuenta_banco IS NULL OR nombre_banco IS NULL OR tipo_cuenta IS NULL;

-- =========================
-- Usuario admin por defecto
-- =========================
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

-- =========================
-- Tabla de facturas
-- =========================
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id)
);

-- =========================
-- Vista de préstamos activos
-- =========================
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

-- =========================
-- Función para generar números de factura
-- =========================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_invoice_number TEXT;
    next_val INT;
BEGIN
    CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;
    next_val := nextval('invoice_number_seq');
    new_invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_val::TEXT, 5, '0');
    RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- Índices para mejor rendimiento
-- =========================
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_comments_loan_id ON loan_comments(loan_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
