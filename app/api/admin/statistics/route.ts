
import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request)

    // Totales
    const totalUsers = await query("SELECT COUNT(*) FROM users")
    const totalLoans = await query("SELECT COUNT(*) FROM loan_applications")
    const totalCompanies = await query("SELECT COUNT(*) FROM companies")
    const totalAmount = await query(`
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM loan_applications
      WHERE estado = 'aprobado'
    `)

    // Distribución por estado
    const loansByStatus = await query(`
      SELECT estado, COUNT(*) AS count
      FROM loan_applications
      GROUP BY estado
    `)

    const companiesByStatus = await query(`
      SELECT estado, COUNT(*) AS count
      FROM companies
      GROUP BY estado
    `)

    // Historial mensual
    const monthlyLoans = await query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*) AS count,
        SUM(monto) AS total_amount
      FROM loan_applications
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `)

    // Historial semanal
    const weeklyLoans = await query(`
      SELECT
        TO_CHAR(created_at, 'IYYY-"W"IW') AS week,
        COUNT(*) AS count,
        SUM(monto) AS total_amount
      FROM loan_applications
      WHERE created_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY week
      ORDER BY week
    `)

    // Estadísticas de pagos
    const paymentsOnTime = await query(`
      SELECT COUNT(*) AS count
      FROM payments p
      JOIN loan_applications la ON p.loan_id = la.id
      WHERE p.status = 'paid'
      AND (
        la.next_payment_date IS NULL
        OR p.payment_date <= la.next_payment_date
        OR (la.next_payment_date IS NOT NULL AND CURRENT_DATE <= la.next_payment_date)
      )
    `)

    const pendingPayments = await query(`
      SELECT COUNT(*) AS count
      FROM payments
      WHERE status = 'pending'
    `)

    const overduePayments = await query(`
      SELECT COUNT(*) AS count
      FROM payments p
      JOIN loan_applications la ON p.loan_id = la.id
      WHERE (
        p.status = 'paid' AND la.next_payment_date IS NOT NULL AND p.payment_date > la.next_payment_date
      ) OR p.status = 'overdue'
    `)

    return NextResponse.json({
      totals: {
        users: Number(totalUsers.rows[0].count),
        loans: Number(totalLoans.rows[0].count),
        companies: Number(totalCompanies.rows[0].count),
        totalAmount: Number(totalAmount.rows[0].total),
      },
      distribution: {
        loans: loansByStatus.rows,
        companies: companiesByStatus.rows,
      },
      payments: {
        onTime: Number(paymentsOnTime.rows[0].count),
        pending: Number(pendingPayments.rows[0].count),
        overdue: Number(overduePayments.rows[0].count),
      },
      history: {
        monthly: monthlyLoans.rows,
        weekly: weeklyLoans.rows,
      },
    })
  } catch (error) {
    console.error("Statistics error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
