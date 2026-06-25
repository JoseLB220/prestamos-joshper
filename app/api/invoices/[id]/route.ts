export const dynamic = 'force-dynamic'

// Filepath: app/api/invoices/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import pool from "@/lib/postgres"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Asegura que solo un administrador pueda acceder
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 })
    }

    const invoiceId = params.id
    if (!invoiceId) {
      return NextResponse.json({ error: "ID de factura es requerido" }, { status: 400 })
    }

    const result = await pool.query(
      `
      SELECT 
        i.id,
        i.invoice_number,
        u.nombre as user_name,
        u.apellido as user_lastname,
        u.email as user_email,
        u.numero_celular as user_phone,
        i.payment_amount,
        i.payment_type,
        i.payment_date,
        i.loan_id,
        la.empresa as company_name,
        i.admin_notes,
        i.created_at
      FROM 
        invoices i
      JOIN 
        users u ON i.user_id = u.id
      LEFT JOIN
        loan_applications la ON i.loan_id = la.id
      WHERE 
        i.id = $1
      `,
      [invoiceId],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("Error fetching invoice details:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}