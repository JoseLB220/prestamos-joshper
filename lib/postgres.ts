import { Pool } from 'pg'

// Lazy pool initialization to avoid attempts to connect at import/build time.
let pool: Pool | null = null

function ensurePool(): Pool {
  if (pool) return pool
  const conn = process.env.DATABASE_URL
  if (!conn) {
    throw new Error(
      "DATABASE_URL is not set. Database access is disabled in this environment."
    )
  }
  pool = new Pool({ connectionString: conn })
  return pool
}

// Convenience helper used across the codebase. Some modules import `{ query }`.
export async function query(text: string, params?: any[]) {
  const p = ensurePool()
  return p.query(text, params)
}

// Default export kept for modules that import `pool` and call `pool.query(...)`.
export default { query }
