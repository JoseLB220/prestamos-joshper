export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const result = await query(`
      SELECT 
        id, nombre, apellido, email, cedula_pasaporte, numero_celular,
        is_admin, can_request_loans, can_associate_companies, created_at,
        documento_foto
      FROM users
      ORDER BY created_at DESC
    `)

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
