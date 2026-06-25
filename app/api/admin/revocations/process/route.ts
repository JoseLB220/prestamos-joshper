import { NextResponse } from "next/server"
import { getClient } from "@/lib/pg"
import { parse } from "url"

export async function POST() {
  const client = await getClient()
  try {
    // Find pending revocations whose effective_at <= now
    const q = `SELECT * FROM revocations WHERE status = 'pending' AND effective_at IS NOT NULL AND effective_at <= NOW() FOR UPDATE`
    const res = await client.query(q)
    const rows = res.rows || []

    const processed: any[] = []

    for (const rev of rows) {
      try {
        let applySuccess = false
        if (rev.target_type === 'payment') {
          const r = await client.query('UPDATE payments SET revoked_at = NOW(), revoked_by_id = $1, revocation_note = $2 WHERE id = $3 RETURNING *', [rev.revoked_by_id, rev.revocation_reason, rev.target_id])
          applySuccess = r.rows.length > 0
        }

        if (rev.target_type === 'invoice') {
          const r = await client.query('UPDATE invoices SET revoked_at = NOW(), revoked_by_id = $1, revocation_note = $2 WHERE id = $3 RETURNING *', [rev.revoked_by_id, rev.revocation_reason, rev.target_id])
          applySuccess = r.rows.length > 0
        }

        if (rev.target_type === 'loan') {
          const r = await client.query("UPDATE loans SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *", [rev.target_id])
          applySuccess = r.rows.length > 0
        }

        if (rev.target_type === 'company_association') {
          const r = await client.query("UPDATE user_companies SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *", [rev.target_id])
          applySuccess = r.rows.length > 0
        }

        if (rev.target_type === 'admin_privilege') {
          const r = await client.query('UPDATE users SET is_admin = FALSE WHERE id = $1 RETURNING *', [rev.target_id])
          applySuccess = r.rows.length > 0
        }

        if (applySuccess) {
          await client.query('UPDATE revocations SET status = $1, confirmed_at = NOW() WHERE id = $2', ['confirmed', rev.id])
          // notify admins
          try {
            const adminsRes = await client.query('SELECT id FROM users WHERE is_admin = TRUE')
            const msg = `Anulación confirmada (${rev.action_type}) para ${rev.target_type} ID ${rev.target_id}`
            for (const a of adminsRes.rows || []) {
              await client.query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [a.id, 'revocation_confirmed', msg])
            }
          } catch (e) {
            console.error('Error creating notifications for processed revocation', e)
          }

          processed.push({ id: rev.id, status: 'confirmed' })
        } else {
          processed.push({ id: rev.id, status: 'failed' })
        }
      } catch (e) {
        console.error('Error processing revocation id', rev.id, e)
        processed.push({ id: rev.id, status: 'error' })
      }
    }

    if (typeof client.release === "function") client.release()
    return NextResponse.json({ processed })
  } catch (error) {
    console.error('Error processing due revocations', error)
    if (typeof client.release === "function") client.release()
    return NextResponse.json({ message: 'Error processing due revocations' }, { status: 500 })
  }
}
