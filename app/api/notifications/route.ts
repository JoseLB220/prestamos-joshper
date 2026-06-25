import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { getUserFromRequest, requireAuth } from "@/lib/auth"
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })

    const res = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [user.id]
    )

    return NextResponse.json({ notifications: res.rows })
  } catch (error) {
    console.error("Error fetching user notifications", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
