import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { query } from "@/lib/pg"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdmin(request)
    const { id } = params

    const sql = `
      SELECT
        la.*,
        u.nombre, u.apellido, u.email, u.cedula_pasaporte AS user_document,
        u.numero_celular AS user_phone, u.documento_foto AS user_photo
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.id = $1
    `

    const result = await query(sql, [id])
    const loanDetails = result.rows[0]

    if (!loanDetails) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    const formattedDetails = {
      ...loanDetails,
      sueldo: Number(loanDetails.sueldo),
      prestaciones: Number(loanDetails.prestaciones),
      monto: Number(loanDetails.monto),
    }

    return NextResponse.json(formattedDetails)
  } catch (error) {
    console.error("Get loan details error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

