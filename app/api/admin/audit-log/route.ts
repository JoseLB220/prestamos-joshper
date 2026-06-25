import { NextResponse, type NextRequest } from "next/server"
import { getClient } from "@/lib/pg"
import { getUserFromRequest } from "@/lib/auth"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const client = await getClient()
  try { 
    const actor = await getUserFromRequest(request)
    if (!actor || !actor.is_admin) return NextResponse.json({ error: 'Autenticación de administrador requerida' }, { status: 403 })

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '10', 10)))
    const offset = (page - 1) * pageSize

    // Check if audit_log table exists. If not, return an empty array (backwards compatible)
    const tbl = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' LIMIT 1"
    )
    if (tbl.rows.length === 0) {
      console.warn('audit_log table not found; returning empty audit list')
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Get total count
    const countRes = await client.query('SELECT COUNT(*) as count FROM audit_log')
    const total = parseInt(countRes.rows[0]?.count || '0', 10)
    const totalPages = Math.ceil(total / pageSize)

    // Get paginated data
    const res = await client.query(
      `SELECT a.*,
              u.id as user_id_from_users,
              u.nombre as admin_name,
              u.apellido as admin_lastname,
              COALESCE(a.user_id, (a.new_values->>'user_id')::int, (a.old_values->>'user_id')::int) as actor_id,
              COALESCE(u.nombre || ' ' || u.apellido,
                       a.new_values->>'user_name',
                       a.new_values->>'user_email',
                       a.old_values->>'user_name',
                       a.old_values->>'user_email',
                       'Sistema') as actor_display
       FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    )

    return NextResponse.json({
      data: res.rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    })
  } catch (e: any) {
    console.error('Error fetching audit log', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
