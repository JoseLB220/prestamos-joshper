// ==============================================================================
// RUNNER DE MIGRACIONES AUTOMÁTICAS PARA JOSHPER (PostgreSQL)
// ==============================================================================
// Lee los archivos .sql en la carpeta /sql y aplica los que no se hayan ejecutado.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Cargar variables de entorno si existe .env y no están seteadas
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        const val = rest.join('=').trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnv();

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'joshperdb'}`;

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

async function runMigrations() {
  console.log('🔄 Conectando a PostgreSQL para ejecutar migraciones...');
  console.log(`📍 Host / DB: ${process.env.DB_HOST || 'localhost'} / ${process.env.DB_NAME || 'joshperdb'}`);

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('❌ Error al conectar con PostgreSQL:', err.message);
    process.exit(1);
  }

  try {
    // 1. Crear tabla de control de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Obtener migraciones ya aplicadas
    const { rows: appliedRows } = await client.query(
      'SELECT name FROM schema_migrations ORDER BY id ASC;'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 3. Leer archivos .sql de la carpeta /sql
    const sqlDir = path.join(__dirname, '..', 'sql');
    if (!fs.existsSync(sqlDir)) {
      console.log('⚠️ Directorio /sql no encontrado.');
      return;
    }

    const files = fs
      .readdirSync(sqlDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📋 Se encontraron ${files.length} archivos de migración en /sql.`);

    let appliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ⏩ [Ya aplicada] ${file}`);
        continue;
      }

      const filePath = path.join(sqlDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      console.log(`  🚀 [Aplicando] ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1);',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✅ [Éxito] ${file} aplicada.`);
        appliedCount++;
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        console.error(`  ❌ [Error en ${file}]:`, migrationErr.message);
        throw migrationErr;
      }
    }

    console.log(
      `\n✨ Migraciones finalizadas con éxito (${appliedCount} nueva(s) aplicada(s)).`
    );
  } catch (err) {
    console.error('\n❌ Proceso de migración falló:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
