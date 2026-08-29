import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/pg"

// Admin invoices route uses DB and token verification; force Node runtime and dynamic
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 })
    }

    // Verify admin permissions
    const userResult = await query("SELECT is_admin FROM users WHERE id = $1", [decoded.id])

    if (userResult.rows.length === 0 || !userResult.rows[0].is_admin) {
      return NextResponse.json({ message: "Acceso denegado. Se requieren permisos de administrador." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const user_id = searchParams.get("user_id")

    const offset = (page - 1) * limit

    let whereClause = ""
    const queryParams: any[] = []
    let paramCount = 1

    if (user_id) {
      whereClause = `WHERE user_id = $${paramCount}`
      queryParams.push(Number.parseInt(user_id))
      paramCount++
    }

    const result = await query(
      `
      SELECT * FROM invoices
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `,
      [...queryParams, limit, offset],
    )

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM invoices ${whereClause}`
    const countResult = await query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0].total)

    return NextResponse.json({
      invoices: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
