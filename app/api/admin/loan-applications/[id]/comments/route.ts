import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin, getUserFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    const commentsResult = await query(
      `
      SELECT
        lc.*,
        u.nombre,
        u.apellido
      FROM loan_comments lc
      JOIN users u ON lc.admin_id = u.id
      WHERE lc.loan_id = $1
      ORDER BY lc.created_at DESC
      `,
      [params.id]
    )

    return NextResponse.json(commentsResult.rows)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdmin(request)

    const { comment, adminId } = await request.json()

    if (!comment || !adminId) {
      return NextResponse.json(
        { error: "Comentario y ID de administrador son requeridos" },
        { status: 400 }
      )
    }

    const insertResult = await query(
      `
      INSERT INTO loan_comments (loan_id, admin_id, comment)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [params.id, adminId, comment]
    )

    const newCommentId = insertResult.rows[0]?.id

    const commentResult = await query(
      `
      SELECT
        lc.*,
        u.nombre,
        u.apellido
      FROM loan_comments lc
      JOIN users u ON lc.admin_id = u.id
      WHERE lc.id = $1
      `,
      [newCommentId]
    )

    // create a notification for the loan owner about the new comment
    try {
      const loanRes = await query(`SELECT user_id FROM loan_applications WHERE id = $1 LIMIT 1`, [params.id])
      const loan = loanRes.rows[0]
      if (loan) {
        const userId = loan.user_id
        const msg = `El administrador dejó un comentario en tu solicitud #${params.id}`
        await query(`INSERT INTO notifications (user_id, loan_id, type, message) VALUES ($1, $2, $3, $4)`, [userId, params.id, 'admin_comment', msg])
      }
    } catch (e) {
      console.error('Error creating notification for new comment', e)
    }

    return NextResponse.json(commentResult.rows[0])
  } catch (error) {
    console.error("Error adding comment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
