export const dynamic = "force-dynamic"

import { NextResponse, type NextRequest } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getClient } from "@/lib/pg"

export async function GET(request: NextRequest) {
  const client = await getClient()

  try {
    const user = await getUserFromRequest(request)
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const result = await client.query(`
      SELECT 
        p.*,
        u.nombre as user_name,
        u.apellido as user_lastname,
        u.email as user_email,
        la.empresa,
        la.monto as loan_amount
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN loan_applications la ON p.loan_id = la.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
    `)

    // 👇 Devolvemos directamente el array que espera el frontend
    return NextResponse.json(result.rows)

  } catch (error: any) {
    console.error("Error al obtener pagos pendientes:", error)
    return NextResponse.json(
      { error: "Error al obtener pagos pendientes" },
      { status: 500 },
    )
  } finally {
    if (typeof client.release === "function") {
      client.release()
    }
  }
}
