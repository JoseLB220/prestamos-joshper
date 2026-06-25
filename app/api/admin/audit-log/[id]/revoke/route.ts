import { NextResponse, type NextRequest } from "next/server"
import { getClient } from "@/lib/pg"
import { getUserFromRequest } from "@/lib/auth"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function withinWindow(ts: string | Date, minutes = 15) {
  const created = new Date(ts)
  const diff = (Date.now() - created.getTime()) / 1000 / 60
  return diff <= minutes
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const client = await getClient()
  try {
    const actor = await getUserFromRequest(request)
    if (!actor || !actor.is_admin) return NextResponse.json({ error: 'Autenticación de administrador requerida' }, { status: 403 })

    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    // require a revocation note for traceability
    let body: any = {}
    try { body = await request.json() } catch (_) { body = {} }
    const revocationNote = (body && body.note) ? String(body.note).trim() : null
    if (!revocationNote) return NextResponse.json({ error: 'Se requiere una nota explicando la razón de la revocación' }, { status: 400 })

    const row = await client.query('SELECT * FROM audit_log WHERE id = $1 LIMIT 1', [id])
    if (row.rows.length === 0) return NextResponse.json({ error: 'Registro de auditoría no encontrado' }, { status: 404 })
    const entry = row.rows[0]

    // Determine original actor id from common fields
    let originalActorId: number | null = entry.user_id ?? null
    if (!originalActorId) {
      try {
        const nv = entry.new_values
        const ov = entry.old_values
        if (nv && nv.user_id) originalActorId = Number(nv.user_id)
        else if (ov && ov.user_id) originalActorId = Number(ov.user_id)
        else if ((nv && (nv.user_email || nv.user_name)) || (ov && (ov.user_email || ov.user_name))) {
          const email = (nv && (nv.user_email || nv.user_name)) || (ov && (ov.user_email || ov.user_name))
          if (email) {
            const look = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
            if (look.rows.length) originalActorId = look.rows[0].id
          }
        }
      } catch (e) {
        console.warn('Could not infer original actor id from audit entry', e)
      }
    }

    if (originalActorId !== actor.id) return NextResponse.json({ error: 'Solo el administrador que realizó la acción puede revocarla' }, { status: 403 })
    if (!await withinWindow(entry.created_at, 15)) return NextResponse.json({ error: 'Tiempo para revocar expirado' }, { status: 403 })

    await client.query('BEGIN')
    try {
      // Best-effort handling for common cases
      if (entry.action === 'INSERT' && entry.table_name === 'payments') {
        const paymentId = entry.record_id
        const timestamp = new Date().toISOString()
        const note = (entry.new_values?.notes || '') + ` [REVOCADO por ${actor.email} a ${timestamp}] ${revocationNote}`
        await client.query(
          `UPDATE payments SET user_id = $1, notes = $2, receipt_url = NULL, revoked_at = NOW(), revoked_by_id = $3, revocation_note = $4, updated_at = NOW() WHERE id = $5`,
          [actor.id, note, actor.id, revocationNote, paymentId]
        )
      } else if (entry.action === 'UPDATE' && entry.table_name === 'loan_applications') {
        const oldValues = entry.old_values
        if (!oldValues) throw new Error('No hay valores antiguos disponibles para restaurar')
        const fields = Object.keys(oldValues)
        const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
        const vals = fields.map((f) => (oldValues as any)[f])
        vals.push(entry.record_id)
        const sql = `UPDATE loan_applications SET ${sets}, updated_at = NOW() WHERE id = $${vals.length}`
        await client.query(sql, vals)
      } else if (entry.action === 'INSERT' && entry.table_name === 'invoices') {
        const invoiceId = entry.record_id
        const timestamp = new Date().toISOString()
        const note = (entry.new_values?.admin_notes || '') + ` [FACTURA REVOCADA por ${actor.email} a ${timestamp}] ${revocationNote}`
        await client.query(
          `UPDATE invoices SET user_id = $1, user_name = $2, user_email = $3, admin_notes = $4, revoked_at = NOW(), revoked_by_id = $5, revocation_note = $6, updated_at = NOW() WHERE id = $7`,
          [actor.id, actor.nombre || actor.email, actor.email, note, actor.id, revocationNote, invoiceId]
        )
      } else if (entry.action === 'DELETE' && entry.table_name === 'payments') {
        const oldValues = entry.old_values as any
        if (!oldValues) throw new Error('No hay valores antiguos disponibles para restaurar')
        const timestamp = new Date().toISOString()
        oldValues.user_id = actor.id
        oldValues.revoked_at = timestamp
        oldValues.revoked_by_id = actor.id
        oldValues.revocation_note = revocationNote
        oldValues.notes = (oldValues.notes || '') + ` [REVOCADO por ${actor.email} a ${timestamp}] ${revocationNote}`
        const fields = Object.keys(oldValues)
        const cols = fields.join(', ')
        const params = fields.map((_, i) => `$${i + 1}`).join(', ')
        const vals = fields.map((f) => oldValues[f])
        const insertSql = `INSERT INTO payments (${cols}) VALUES (${params}) ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, notes = EXCLUDED.notes, receipt_url = COALESCE(EXCLUDED.receipt_url, payments.receipt_url), revoked_at = COALESCE(EXCLUDED.revoked_at, payments.revoked_at), revoked_by_id = COALESCE(EXCLUDED.revoked_by_id, payments.revoked_by_id), revocation_note = COALESCE(EXCLUDED.revocation_note, payments.revocation_note)`
        await client.query(insertSql, vals)
      } else if (entry.action === 'DELETE' && entry.table_name === 'invoices') {
        const oldValues = entry.old_values as any
        if (!oldValues) throw new Error('No hay valores antiguos disponibles para restaurar')
        const timestamp = new Date().toISOString()
        oldValues.user_id = actor.id
        oldValues.user_name = actor.nombre || actor.email
        oldValues.user_email = actor.email
        oldValues.revoked_at = timestamp
        oldValues.revoked_by_id = actor.id
        oldValues.revocation_note = revocationNote
        oldValues.admin_notes = (oldValues.admin_notes || '') + ` [FACTURA REVOCADA por ${actor.email} a ${timestamp}] ${revocationNote}`
        const fields = Object.keys(oldValues)
        const cols = fields.join(', ')
        const params = fields.map((_, i) => `$${i + 1}`).join(', ')
        const vals = fields.map((f) => oldValues[f])
        const insertSql = `INSERT INTO invoices (${cols}) VALUES (${params}) ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, user_name = EXCLUDED.user_name, user_email = EXCLUDED.user_email, admin_notes = EXCLUDED.admin_notes, revoked_at = COALESCE(EXCLUDED.revoked_at, invoices.revoked_at), revoked_by_id = COALESCE(EXCLUDED.revoked_by_id, invoices.revoked_by_id), revocation_note = COALESCE(EXCLUDED.revocation_note, invoices.revocation_note)`
        await client.query(insertSql, vals)
      } else if (entry.action === 'UPDATE' && entry.table_name === 'users') {
        const oldValues = entry.old_values as any
        if (!oldValues) throw new Error('No hay valores antiguos disponibles para restaurar')
        if (oldValues.password) {
          await client.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [oldValues.password, entry.record_id])
        } else {
          const fields = Object.keys(oldValues)
          if (fields.length > 0) {
            const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
            const vals = fields.map((f) => oldValues[f])
            vals.push(entry.record_id)
            const sql = `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $${vals.length}`
            await client.query(sql, vals)
          }
        }
      } else {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Revocación no implementada para este tipo de acción' }, { status: 501 })
      }

      await client.query('COMMIT')

      // record audit log for the revoke
      try {
        await client.query(
          `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, created_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, CURRENT_TIMESTAMP)`,
          [
            actor.id,
            'REVOKE',
            entry.table_name,
            entry.record_id,
            JSON.stringify(entry.old_values ?? null),
            JSON.stringify({ revoked_by: actor.id, revoked_at: new Date().toISOString(), revocation_note: revocationNote, original_entry: entry })
          ]
        )
      } catch (logErr) {
        console.error('Error logging revoke action', logErr)
      }

      return NextResponse.json({ success: true })
    } catch (e: any) {
      await client.query('ROLLBACK')
      console.error('Error revoking action', e)
      const resp: any = { error: 'Error al revocar la acción' }
      if (process.env.NODE_ENV !== 'production') {
        resp.details = e?.message
        resp.stack = e?.stack
      }
      return NextResponse.json(resp, { status: 500 })
    }
  } catch (e: any) {
    console.error('Error in revoke route', e)
    const resp: any = { error: 'Error interno' }
    if (process.env.NODE_ENV !== 'production') {
      resp.details = e?.message
      resp.stack = e?.stack
    }
    return NextResponse.json(resp, { status: 500 })
  } finally {
    try { client.release() } catch (_) { }
  }
}
