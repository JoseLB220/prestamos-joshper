-- Reset database script
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS loan_simulations;
DROP TABLE IF EXISTS loan_applications;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;

-- Recreate tables
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    last_profile_edit DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nombre_completo TEXT NOT NULL,
    documento TEXT NOT NULL,
    telefono TEXT NOT NULL,
    empresa TEXT NOT NULL,
    tiempo_empresa INTEGER NOT NULL,
    sueldo DECIMAL(10,2) NOT NULL,
    prestaciones DECIMAL(10,2) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    frecuencia TEXT NOT NULL CHECK (frecuencia IN ('mensual', 'quincenal')),
    plazo INTEGER NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    documento_foto TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_empresa TEXT NOT NULL,
    rnc TEXT UNIQUE NOT NULL,
    representante TEXT NOT NULL,
    empleados INTEGER NOT NULL,
    sector TEXT NOT NULL,
    correo TEXT NOT NULL,
    telefono TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_simulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    sueldo DECIMAL(10,2) NOT NULL,
    prestaciones DECIMAL(10,2) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    frecuencia TEXT NOT NULL,
    plazo INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    interest DECIMAL(10,2) NOT NULL,
    capital DECIMAL(10,2) NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    FOREIGN KEY (loan_id) REFERENCES loan_applications (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
