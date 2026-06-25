-- Adding enhanced database schema for new features

-- Create audit_log table for tracking all changes
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_settings table for user preferences
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    loan_requests BOOLEAN DEFAULT true,
    payment_confirmations BOOLEAN DEFAULT true,
    payment_reminders BOOLEAN DEFAULT true,
    system_updates BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Add trigger function for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
        VALUES (
            COALESCE(NEW.user_id, (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))),
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (
            COALESCE(NEW.user_id, OLD.user_id, (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))),
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
        VALUES (
            COALESCE(OLD.user_id, (SELECT id FROM users WHERE email = current_setting('app.current_user_email', true))),
            TG_OP,
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging on important tables
DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_loan_applications ON loan_applications;
CREATE TRIGGER audit_loan_applications AFTER INSERT OR UPDATE OR DELETE ON loan_applications
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_invoices ON invoices;
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Function to automatically generate invoice when payment is confirmed
CREATE OR REPLACE FUNCTION generate_invoice_on_payment_confirmation()
RETURNS TRIGGER AS $$
DECLARE
    user_data RECORD;
    invoice_number VARCHAR(20);
BEGIN
    -- Only generate invoice when payment status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- Get user data
        SELECT * INTO user_data FROM users WHERE id = NEW.user_id;
        
        -- Generate invoice number
        invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
        
        -- Insert invoice
        INSERT INTO invoices (
            invoice_number,
            user_id,
            user_name,
            user_email,
            payment_amount,
            payment_date,
            description,
            created_at
        ) VALUES (
            invoice_number,
            NEW.user_id,
            user_data.full_name,
            user_data.email,
            NEW.amount,
            NEW.payment_date,
            'Pago de cuota - ' || COALESCE(NEW.description, 'Préstamo'),
            NOW()
        );
        
        -- Create notification for user
        INSERT INTO notifications (
            user_id,
            type,
            message,
            created_at
        ) VALUES (
            NEW.user_id,
            'invoice_generated',
            'Se ha generado una nueva factura por tu pago confirmado',
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic invoice generation
DROP TRIGGER IF EXISTS auto_generate_invoice ON payments;
CREATE TRIGGER auto_generate_invoice 
    AFTER UPDATE ON payments
    FOR EACH ROW 
    EXECUTE FUNCTION generate_invoice_on_payment_confirmation();

-- Insert default notification settings for existing users
INSERT INTO notification_settings (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM notification_settings WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;
