import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth" // Cambiado a requireAdmin
import pool from "@/lib/postgres"

// Admin recent invoices uses DB and auth; ensure Node runtime and dynamic behavior
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verificar que el usuario sea admin
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 })
    }

    // Consulta para obtener las facturas recientes de TODO EL SISTEMA
    const result = await pool.query(
      `
      SELECT 
        i.id,
        i.invoice_number,
        i.user_name,
        i.user_lastname,
        i.payment_amount,
        i.payment_type,
        i.payment_date,
        i.loan_id,
        i.company_name,
        i.created_at
      FROM 
        invoices i
      ORDER BY 
        i.created_at DESC
      LIMIT 20 -- Puedes ajustar el número según necesites
      `,
      // No se pasan parámetros porque no hay filtro por user_id
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching recent invoices:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}