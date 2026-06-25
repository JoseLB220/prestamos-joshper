
import { NextResponse } from "next/server"
import { query } from "@/lib/pg"

export async function GET() {
  try {
    const result = await query(`
      SELECT
        la.id,
        la.user_id,
        u.nombre as user_name,
        u.apellido as user_lastname,
        u.email as user_email,
        la.monto as original_amount,
        (la.monto - COALESCE(SUM(p.amount), 0)) as remaining_amount,
        (la.monto / la.plazo) as installment_amount,
        la.plazo as total_installments,
        (la.plazo - COUNT(p.id)) as remaining_installments,
        la.next_payment_date,
        CASE
          WHEN (la.monto - COALESCE(SUM(p.amount), 0)) <= 0 THEN 'completed'
          WHEN la.next_payment_date IS NOT NULL AND CURRENT_DATE > la.next_payment_date THEN 'overdue'
          WHEN la.next_payment_date IS NULL AND (CURRENT_DATE > (la.created_at + INTERVAL '1 month' * la.plazo)) THEN 'overdue'
          ELSE 'active'
        END as status
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      LEFT JOIN payments p ON la.id = p.loan_id AND p.status = 'paid'
      WHERE la.estado = 'aprobado'
      GROUP BY la.id, u.id
      HAVING (la.monto - COALESCE(SUM(p.amount), 0)) > 0
      ORDER BY la.next_payment_date ASC
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching active loans:", error)
    return NextResponse.json(
      { error: "Error al obtener préstamos activos" },
      { status: 500 }
    )
  }
}