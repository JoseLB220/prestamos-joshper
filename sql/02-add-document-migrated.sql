-- Agregar columna document_migrated a la tabla users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS document_migrated BOOLEAN DEFAULT FALSE;