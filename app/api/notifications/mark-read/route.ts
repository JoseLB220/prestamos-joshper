import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { getUserFromRequest, requireAuth } from "@/lib/auth"
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })

    const { notificationId } = await request.json()
    if (!notificationId) return NextResponse.json({ error: "notificationId requerido" }, { status: 400 })

    const res = await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`, [notificationId, user.id])
    if (res.rowCount === 0) return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 })

    return NextResponse.json({ success: true, notification: res.rows[0] })
  } catch (error) {
    console.error("Error marking notification read", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })

    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [user.id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking all notifications read", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
