import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { query } from "@/lib/pg"

// Authenticated, Node runtime endpoint for quick loan search used by payments UI
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").trim()
    const limit = Math.min(100, Number.parseInt(searchParams.get("limit") || "20")) || 20

    // Basic search: by loan id, empresa, nombre_completo
    let sql = `SELECT id, empresa, nombre_completo, monto, estado, created_at, user_id FROM loan_applications`
    const params: any[] = []

    if (q.length > 0) {
      // If query looks like a number, search by id or by numeric fields
      if (/^\d+$/.test(q)) {
        params.push(Number(q))
        sql += ` WHERE id = $${params.length} OR empresa ILIKE $${params.length + 1} OR nombre_completo ILIKE $${params.length + 2}`
        params.push(`%${q}%`, `%${q}%`)
      } else {
        params.push(`%${q}%`, `%${q}%`)
        sql += ` WHERE empresa ILIKE $${params.length - 1} OR nombre_completo ILIKE $${params.length}`
      }
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

    const res = await query(sql, params)

    // If the user is not admin, filter to only their loans
    let rows = res.rows || []
    if (!user.is_admin) {
      rows = rows.filter((r: any) => r.user_id === user.id)
    }

    return NextResponse.json({ loans: rows.slice(0, limit) })
  } catch (error) {
    console.error("Loan search error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
