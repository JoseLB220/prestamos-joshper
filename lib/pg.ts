import { Pool, type PoolClient, type QueryResult } from "pg"

// Declaración global para evitar múltiples pools en entornos con Hot-Reload (Next.js)
const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined
}

function ensurePool(): Pool {
  if (globalForPg.pgPool) {
    return globalForPg.pgPool
  }

  const conn = process.env.DATABASE_URL
  if (!conn) {
    throw new Error(
      "DATABASE_URL is not set. Database access is disabled in this environment."
    )
  }

  const isRemote = conn.includes("supabase.co") || conn.includes("supabase.com") || conn.includes("sslmode=require") || process.env.NODE_ENV === "production"

  const pool = new Pool({
    connectionString: conn,
    max: parseInt(process.env.DB_POOL_MAX || "20", 10), // Conexiones concurrentes máximas
    idleTimeoutMillis: 30000, // Cerrar conexiones inactivas tras 30s
    connectionTimeoutMillis: 10000, // Timeout para obtener conexión de 10s
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  })

  // Manejo de errores imprevistos en clientes inactivos del pool
  pool.on("error", (err: any) => {
    console.error("Unexpected error on idle PostgreSQL client", err)
  })

  globalForPg.pgPool = pool
  return pool
}

// Obtener un cliente del pool (necesario para transacciones manuales: BEGIN / COMMIT / ROLLBACK)
export async function getClient(): Promise<PoolClient> {
  const p = ensurePool()
  return await p.connect()
}

// Ejecución directa de consultas optimizada (el pool maneja adquisición y liberación interna)
export async function query(sql: string, params?: any[]): Promise<QueryResult<any>> {
  const p = ensurePool()
  return await p.query(sql, params)
}

// Default export para compatibilidad con código que importa `pool`
export default { query, getClient }