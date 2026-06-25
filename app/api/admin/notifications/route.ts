import { NextResponse, type NextRequest } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const notificationsResult = await query(`
      SELECT 
        n.*,
        u.nombre as user_name,
        u.apellido as user_lastname,
        la.monto as loan_amount
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      LEFT JOIN loan_applications la ON n.loan_id = la.id
      ORDER BY n.created_at DESC 
      LIMIT 50
    `)

    const unreadCountResult = await query(`
      SELECT COUNT(*) as count FROM notifications WHERE is_read = FALSE
    `)

    return NextResponse.json({
      notifications: notificationsResult.rows,
      unreadCount: Number.parseInt(unreadCountResult.rows[0].count, 10),
    })
  } catch (error: any) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { user_id, loan_id, type, message } = body

    if (!user_id || !type || !message) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const result = await query(
      `
      INSERT INTO notifications (user_id, loan_id, type, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [user_id, loan_id || null, type, message],
    )

    return NextResponse.json({
      success: true,
      notification: result.rows[0],
    })
  } catch (error: any) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
