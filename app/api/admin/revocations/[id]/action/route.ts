import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getClient } from "@/lib/pg"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req)

    if (!user || !user.is_admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    if (action === "cancel") {
      // Cancel a pending revocation so it never takes effect
      const getRevocationQuery = `SELECT * FROM revocations WHERE id = $1`;
      const revocationResult = await client.query(getRevocationQuery, [revocationId]);
      if (revocationResult.rows.length === 0) {
        if (typeof client.release === "function") client.release();
        return NextResponse.json({ message: "Revocation not found" }, { status: 404 });
      }

      const revocation = revocationResult.rows[0];
      if (revocation.status !== 'pending') {
        if (typeof client.release === "function") client.release();
        return NextResponse.json({ message: 'Only pending revocations can be cancelled' }, { status: 409 });
      }

      const cancelReason = (body && body.reason) ? String(body.reason).trim() : null
      const updateQuery = `UPDATE revocations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by_id = $2, cancelled_reason = $3 WHERE id = $1 RETURNING *`
      const result = await client.query(updateQuery, [revocationId, user.id, cancelReason])

      // Notify admins that revocation was cancelled
      try {
        const adminsRes = await client.query('SELECT id FROM users WHERE is_admin = TRUE')
        const msg = `Anulación cancelada por ${user.email} para ${revocation.target_type} ID ${revocation.target_id}`
        for (const a of adminsRes.rows || []) {
          await client.query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [a.id, 'revocation_cancelled', msg])
        }
      } catch (e) {
        console.error('Failed to notify admins about cancelled revocation', e)
      }

      if (typeof client.release === "function") client.release();
      return NextResponse.json(result.rows[0])
    }

    const body = await req.json()
    const { action } = body // 'confirm', 'restore' or 'cancel'
    const revocationId = parseInt(params.id)

    if (!action || !["confirm", "restore", "cancel"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid action. Must be 'confirm' or 'restore'" },
        { status: 400 }
      )
    }

    const client = await getClient()

    if (action === "confirm") {
      // Apply the revocation action and mark as confirmed
      const getRevocationQuery = `SELECT * FROM revocations WHERE id = $1 FOR UPDATE`
      const revocationResult = await client.query(getRevocationQuery, [revocationId])

      if (revocationResult.rows.length === 0) {
        if (typeof client.release === "function") client.release()
        return NextResponse.json({ message: "Revocation not found" }, { status: 404 })
      }

      const revocation = revocationResult.rows[0]

      if (revocation.status === 'cancelled') {
        if (typeof client.release === "function") client.release()
        return NextResponse.json({ message: 'Revocation already cancelled' }, { status: 409 })
      }

      let applySuccess = false

      try {
        if (revocation.target_type === "payment") {
          const q = `UPDATE payments SET revoked_at = NOW(), revoked_by_id = $1, revocation_note = $2 WHERE id = $3 RETURNING *`
          const r = await client.query(q, [revocation.revoked_by_id, revocation.revocation_reason, revocation.target_id])
          applySuccess = r.rows.length > 0
        }

        if (revocation.target_type === "invoice") {
          const q = `UPDATE invoices SET revoked_at = NOW(), revoked_by_id = $1, revocation_note = $2 WHERE id = $3 RETURNING *`
          const r = await client.query(q, [revocation.revoked_by_id, revocation.revocation_reason, revocation.target_id])
          applySuccess = r.rows.length > 0
        }

        if (revocation.target_type === "loan") {
          const q = `UPDATE loans SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`
          const r = await client.query(q, [revocation.target_id])
          applySuccess = r.rows.length > 0
        }

        if (revocation.target_type === "company_association") {
          const q = `UPDATE user_companies SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *`
          const r = await client.query(q, [revocation.target_id])
          applySuccess = r.rows.length > 0
        }

        if (revocation.target_type === "user_password") {
          applySuccess = true
        }

        if (revocation.target_type === "admin_privilege") {
          const q = `UPDATE users SET is_admin = FALSE WHERE id = $1 RETURNING *`
          const r = await client.query(q, [revocation.target_id])
          applySuccess = r.rows.length > 0
        }

        if (!applySuccess) {
          if (typeof client.release === "function") client.release()
          return NextResponse.json({ message: 'Failed to apply revocation action' }, { status: 500 })
        }

        const updateRevocationQuery = `UPDATE revocations SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1 RETURNING *`
        const updateResult = await client.query(updateRevocationQuery, [revocationId])

        // Notify admins that revocation was confirmed
        try {
          const adminsRes = await client.query('SELECT id FROM users WHERE is_admin = TRUE')
          const msg = `Anulación confirmada (${revocation.action_type}) para ${revocation.target_type} ID ${revocation.target_id}`
          for (const a of adminsRes.rows || []) {
            await client.query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [a.id, 'revocation_confirmed', msg])
          }
        } catch (e) {
          console.error('Failed to notify admins about confirmed revocation', e)
        }

        if (typeof client.release === "function") client.release()
        return NextResponse.json(updateResult.rows[0])
      } catch (e) {
        console.error('Error applying revocation:', e)
        if (typeof client.release === "function") client.release()
        return NextResponse.json({ message: 'Error applying revocation' }, { status: 500 })
      }
    }


    if (action === "restore") {
      // Get the revocation details
      const getRevocationQuery = `
        SELECT * FROM revocations WHERE id = $1
      `

      const revocationResult = await client.query(getRevocationQuery, [revocationId])

      if (revocationResult.rows.length === 0) {
        if (typeof client.release === "function") {
          client.release()
        }
        return NextResponse.json(
          { message: "Revocation not found" },
          { status: 404 }
        )
      }

      const revocation = revocationResult.rows[0]

      // Depending on the target_type, perform the restoration
      let restoreSuccess = false

      if (revocation.target_type === "payment") {
        // Restore payment status from pending to paid/approved
        const updatePaymentQuery = `
          UPDATE payments
          SET status = 'paid', rejected = FALSE, rejection_note = NULL, rejected_at = NULL
          WHERE id = $1
          RETURNING *
        `
        const paymentResult = await client.query(updatePaymentQuery, [revocation.target_id])
        restoreSuccess = paymentResult.rows.length > 0
      }

      if (revocation.target_type === "invoice") {
        // Restore invoice (unrevoke it)
        const updateInvoiceQuery = `
          UPDATE invoices
          SET revoked_at = NULL, revoked_by_id = NULL, revocation_note = NULL
          WHERE id = $1
          RETURNING *
        `
        const invoiceResult = await client.query(updateInvoiceQuery, [revocation.target_id])
        restoreSuccess = invoiceResult.rows.length > 0
      }

      if (revocation.target_type === "loan") {
        // Restore loan status
        const updateLoanQuery = `
          UPDATE loans
          SET status = 'active'
          WHERE id = $1
          RETURNING *
        `
        const loanResult = await client.query(updateLoanQuery, [revocation.target_id])
        restoreSuccess = loanResult.rows.length > 0
      }

      if (revocation.target_type === "company_association") {
        // Restore company association
        const updateAssocQuery = `
          UPDATE user_companies
          SET status = 'pending'
          WHERE id = $1
          RETURNING *
        `
        const assocResult = await client.query(updateAssocQuery, [revocation.target_id])
        restoreSuccess = assocResult.rows.length > 0
      }

      if (revocation.target_type === "user_password") {
        // Password restoration would be handled separately as we can't modify password directly
        // For now, mark as restored
        restoreSuccess = true
      }

      if (revocation.target_type === "admin_privilege") {
        // Restore admin privilege
        const updateUserQuery = `
          UPDATE users
          SET is_admin = FALSE
          WHERE id = $1
          RETURNING *
        `
        const userResult = await client.query(updateUserQuery, [revocation.target_id])
        restoreSuccess = userResult.rows.length > 0
      }

      if (restoreSuccess) {
        const updateRevocationQuery = `
          UPDATE revocations
          SET status = 'restored', restored_at = NOW()
          WHERE id = $1
          RETURNING *
        `
        const updateResult = await client.query(updateRevocationQuery, [revocationId])
        if (typeof client.release === "function") {
          client.release()
        }

        return NextResponse.json(updateResult.rows[0])
      } else {
        if (typeof client.release === "function") {
          client.release()
        }
        return NextResponse.json(
          { message: "Failed to restore target entity" },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error("Error processing revocation action:", error)
    return NextResponse.json(
      { message: "Error processing revocation action" },
      { status: 500 }
    )
  }
}
