import { NextResponse, type NextRequest } from "next/server"
import { getClient } from "@/lib/pg"
import { getUserFromRequest } from "@/lib/auth"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const client = await getClient()
  try {
    const actor = await getUserFromRequest(request)
    if (!actor || !actor.is_admin) return NextResponse.json({ error: 'Autenticación de administrador requerida' }, { status: 403 })

    // Detect whether the invoices table has the collected_by column.
    const colInfo = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'collected_by' LIMIT 1"
    )
    const hasCollectedBy = colInfo.rows.length > 0

    if (hasCollectedBy) {
      const res = await client.query(
        `SELECT i.*, u.nombre as collected_by_name, u.apellido as collected_by_lastname
         FROM invoices i
         LEFT JOIN users u ON i.collected_by = u.id
         WHERE i.collected_by IS NOT NULL
         ORDER BY i.created_at DESC
         LIMIT 500`
      )
      return NextResponse.json(res.rows)
    }

    // Fallback for DBs without collected_by: return recent invoices that have admin_notes (likely manual receipts).
    const fallback = await client.query(
      `SELECT i.*
       FROM invoices i
       WHERE i.admin_notes IS NOT NULL
       ORDER BY i.created_at DESC
       LIMIT 500`
    )
    return NextResponse.json(fallback.rows)
  } catch (e: any) {
    console.error('Error fetching admin receipts', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
