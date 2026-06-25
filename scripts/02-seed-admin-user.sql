-- Insert default admin user
INSERT OR IGNORE INTO users (
    nombre, 
    apellido, 
    email, 
    cedula_pasaporte, 
    numero_celular, 
    password, 
    is_admin,
    can_request_loans,
    can_associate_companies
) VALUES (
    'Admin',
    'Principal',
    'admin@joshper.com',
    '000-0000000-0',
    '809-000-0000',
    '$2b$10$rQZ8kqVZ8qVZ8qVZ8qVZ8O', -- password: admin123
    TRUE,
    TRUE,
    TRUE
);
