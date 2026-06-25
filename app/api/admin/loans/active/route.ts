import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const result = await query(`
      SELECT 
        l.id,
        l.user_id,
        u.nombre as user_name,
        u.apellido as user_lastname,
        u.email as user_email,
        la.monto as original_amount,
        l.remaining_amount,
        l.installment_amount,
        l.total_installments,
        l.remaining_installments,
        l.next_payment_date,
        l.status
      FROM loans l
      JOIN users u ON l.user_id = u.id
      JOIN loan_applications la ON l.loan_application_id = la.id
      WHERE l.status IN ('active', 'overdue')
      ORDER BY l.next_payment_date ASC
    `)

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error("Error fetching active loans:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
