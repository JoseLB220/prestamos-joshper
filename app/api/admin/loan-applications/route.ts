
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { query } from "@/lib/pg"

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request)

    const sql = `
      SELECT
        la.*,
        u.nombre,
        u.apellido,
        u.email,
        u.cedula_pasaporte AS user_document
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      ORDER BY la.created_at DESC
    `

    const result = await query(sql)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Get loan applications error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
