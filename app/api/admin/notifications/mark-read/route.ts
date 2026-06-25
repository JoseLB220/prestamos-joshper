import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { notificationId } = body

    if (!notificationId) {
      return NextResponse.json({ success: false, error: "ID de notificación requerido" }, { status: 400 })
    }

    const result = await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *`, [notificationId])

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Notificación no encontrada" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Notificación marcada como leída",
      notification: result.rows[0],
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request)

    await query(`UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE`)

    return NextResponse.json({
      success: true,
      message: "Todas las notificaciones marcadas como leídas",
    })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
