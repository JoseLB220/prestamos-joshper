import { Pool } from "pg"

// Lazy pool initialization to avoid attempts to connect at import/build time.
let pool: Pool | null = null

function ensurePool(): Pool {
  if (pool) return pool
  const conn = process.env.DATABASE_URL
  if (!conn) {
    // Throw a clear, high-level error so callers can handle it and build-time
    // exports don't attempt low-level SASL auth with an invalid client.
    throw new Error(
      "DATABASE_URL is not set. Database access is disabled in this environment."
    )
  }
  pool = new Pool({ connectionString: conn })
  return pool
}

// Nueva función getClient para transacciones
export async function getClient() {
  const p = ensurePool()
  return await p.connect()
}

// Función query existente para consultas simples
export async function query(sql: string, params?: any[]) {
  const p = ensurePool()
  const client = await p.connect()
  try {
    const res = await client.query(sql, params)
    return res
  } finally {
    client.release()
  }
}