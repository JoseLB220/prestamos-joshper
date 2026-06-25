import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { query } from "@/lib/pg"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 })

    const res = await query(
      `SELECT uc.id as assoc_id, c.*, uc.status, uc.created_at, uc.updated_at
       FROM user_companies uc
       JOIN companies c ON uc.company_id = c.id
       WHERE uc.user_id = $1
       ORDER BY uc.created_at DESC`,
      [user.id]
    )

    return NextResponse.json({ companies: res.rows })
  } catch (e) {
    console.error('Error fetching user companies', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
