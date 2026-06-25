import { NextResponse, type NextRequest } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getClient } from "@/lib/pg"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await getClient()

  try {
    await client.query("BEGIN")

    const user = await getUserFromRequest(request)
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const paymentId = parseInt(params.id, 10)
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "ID de pago inválido" }, { status: 400 })
    }

    const { note } = await request.json()

    // Mark the payment as rejected (do not change to 'paid' or count as paid)
    const result = await client.query(
      `UPDATE payments SET rejected = TRUE, rejection_note = COALESCE(rejection_note,'') || $2, rejected_at = NOW(), rejected_by_id = $3 WHERE id = $1 RETURNING *`,
      [paymentId, `\nRechazado: ${note}`, user.id]
    )

    if (result.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }

    const payment = result.rows[0]

    // Register the rejection in the revocations table
    try {
      await client.query(
        `INSERT INTO revocations (
          action_type,
          target_type,
          target_id,
          actor_id,
          original_data,
          reason,
          revocation_reason,
          revoked_by_id,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'PAYMENT_REJECTED',
          'payment',
          paymentId,
          payment.user_id,
          JSON.stringify(payment),
          `Pago rechazado: ${note}`,
          note,
          user.id,
          'confirmed'
        ]
      )
    } catch (revErr) {
      console.error('Error registering revocation for payment rejection', revErr)
    }

    // Crear notificación para el usuario (usar 'admin_comment' para evitar restricciones del CHECK)
    try {
      // Build a detailed message including payment details and receipt URL (if any)
  const receiptInfo = payment.receipt_url ? `\nComprobante: ${payment.receipt_url}` : ''
      const paymentDetails = `\n\nDetalles del pago:\nID: ${payment.id}\nMonto: RD$${Number(payment.amount).toFixed(2)}\nFecha: ${payment.payment_date || payment.created_at || ''}${receiptInfo}`
      const finalMsg = `Tu pago fue rechazado. Razón: ${note || 'Sin especificar'}` + paymentDetails

      await client.query(
        `INSERT INTO notifications (user_id, loan_id, type, message) 
         VALUES ($1, $2, $3, $4)`,
        [payment.user_id, payment.loan_id, 'admin_comment', finalMsg]
      )
    } catch (notifyErr) {
      console.error('Error creating notification for payment rejection', notifyErr)
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Pago rechazado exitosamente",
      payment: result.rows[0]
    })

  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error al rechazar pago:", error)
    return NextResponse.json(
      { error: "Error al rechazar pago" },
      { status: 500 },
    )
  } finally {
    if (typeof client.release === "function") {
      client.release()
    }
  }
}