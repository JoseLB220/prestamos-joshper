import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { query } from "@/lib/pg"
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    if (!user.can_associate_companies) {
      return NextResponse.json({ error: "No tienes permisos para asociar empresas" }, { status: 403 })
    }

    const data = await request.json()

    // Prevent duplicate companies by RNC
    const existing = await query('SELECT id FROM companies WHERE rnc = $1 LIMIT 1', [data.rnc])
    let companyId: number
    if (existing.rows.length > 0) {
      companyId = existing.rows[0].id
    } else {
      const result = await query(
        `INSERT INTO companies (
          nombre_empresa, rnc, representante, empleados, sector, correo, telefono
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          data.nombre_empresa,
          data.rnc,
          data.representante,
          data.empleados,
          data.sector,
          data.correo,
          data.telefono,
        ]
      )
      companyId = result.rows[0].id
    }

    // Create a user-company association as a pending request, avoid duplicates
    const assoc = await query('SELECT id, status FROM user_companies WHERE user_id = $1 AND company_id = $2 LIMIT 1', [user.id, companyId])
    if (assoc.rows.length > 0) {
      // If there's an existing pending request, return success without duplication
      return NextResponse.json({ message: 'Solicitud ya existente', companyId, status: assoc.rows[0].status })
    }

    await query('INSERT INTO user_companies (user_id, company_id, status) VALUES ($1, $2, $3)', [user.id, companyId, 'pending'])

    return NextResponse.json({ message: "Solicitud enviada correctamente", companyId })
  } catch (error) {
    console.error("Company registration error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const result = await query("SELECT * FROM companies ORDER BY created_at DESC")

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Get companies error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
