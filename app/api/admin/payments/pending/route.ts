// Filepath: app/api/admin/payments/pending/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import pool from "@/lib/pg"

// Admin pending payments uses DB and requires admin auth; run in Node runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Asegura que solo un administrador pueda acceder
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 })
    }

    const result = await pool.query(
      `
      SELECT
        p.*,
        u.nombre as user_name,
        u.apellido as user_lastname,
        u.email as user_email,
        la.empresa as company_name,
        la.monto as loan_amount,
        CASE
          WHEN p.receipt_url IS NOT NULL AND p.receipt_url != ''
          THEN p.receipt_url
          ELSE NULL
        END as receipt_full_url
      FROM
        payments p
      JOIN
        users u ON p.user_id = u.id
      JOIN
        loan_applications la ON p.loan_id = la.id
      WHERE
        p.status = 'pending' AND COALESCE(p.rejected, FALSE) = FALSE
      ORDER BY
        p.created_at DESC
      `
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching pending payments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
