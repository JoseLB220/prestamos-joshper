import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request)

    const result = await query(
      `
      SELECT 
        lp.*,
        u.nombre as admin_name,
        u.apellido as admin_lastname
      FROM loan_payments lp
      LEFT JOIN users u ON lp.confirmed_by = u.id
      WHERE lp.active_loan_id = $1
      ORDER BY lp.payment_date DESC
    `,
      [params.id],
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error("Error fetching loan payments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
