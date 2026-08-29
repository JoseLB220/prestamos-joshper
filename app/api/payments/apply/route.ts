import { NextResponse, type NextRequest } from "next/server"
import { getClient } from "@/lib/pg"
import { getUserFromRequest } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { sendPaymentConfirmedEmail } from "@/lib/email"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/apply
 * Body: { loanId: number, amount: number, notes?: string, applyAs?: 'installment'|'partial'|'full', userId?: number }
 */
export async function POST(request: NextRequest) {
  const client = await getClient()

  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })

    const body = await request.json()
    const loanId = Number(body.loanId)
    const amount = Number(body.amount)
    const notes = body.notes || null
    const applyAs = body.applyAs || null
    const specifiedUserId = body.userId ? Number(body.userId) : null

    if (!loanId || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const colInfo = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'collected_by' LIMIT 1"
    )
    const hasCollectedBy = colInfo.rows.length > 0

    await client.query('BEGIN')

    const loanRes = await client.query('SELECT id, user_id, monto, plazo, frecuencia, next_payment_date FROM loan_applications WHERE id = $1 LIMIT 1', [loanId])
    if (loanRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
    }

    const loan = loanRes.rows[0]
    if (loan.user_id !== actor.id && !actor.is_admin) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const payerId = actor.is_admin && specifiedUserId ? specifiedUserId : actor.id

    const paidSumRes = await client.query('SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE loan_id = $1 AND status = $2', [loanId, 'paid'])
    const paidSoFar = parseFloat(paidSumRes.rows[0]?.paid || 0)
    const remaining = parseFloat(loan.monto) - paidSoFar

    const paymentType = (applyAs === 'full' || amount >= remaining) ? 'full' : (applyAs === 'installment' ? 'installment' : 'partial')
    const status = 'paid'

    const paymentDate = new Date().toISOString()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const insertRes = await client.query(
      `INSERT INTO payments (user_id, loan_id, amount, payment_type, payment_date, due_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [payerId, loanId, amount, paymentType, paymentDate, dueDate.toISOString(), status, notes]
    )

    const paymentId = insertRes.rows[0].id

    if (amount >= remaining) {
      try {
        await client.query('UPDATE loan_applications SET next_payment_date = NULL, updated_at = NOW() WHERE id = $1', [loanId])
      } catch (e) {
        logger.error('Error clearing next_payment_date after full payment', e)
      }
    } else {
      try {
        const freq = (loan.frecuencia || 'mensual').toString().toLowerCase()
        const base = loan.next_payment_date ? new Date(loan.next_payment_date) : new Date()
        let nextDate = new Date(base)
        if (freq === 'quincenal') nextDate.setDate(nextDate.getDate() + 15)
        else nextDate.setMonth(nextDate.getMonth() + 1)
        await client.query('UPDATE loan_applications SET next_payment_date = $1, updated_at = NOW() WHERE id = $2', [nextDate.toISOString(), loanId])
      } catch (e) {
        logger.error('Error updating next_payment_date after partial payment', e)
      }
    }

    const invRes = await client.query('SELECT generate_invoice_number() as number')
    const invoiceNumber = invRes.rows[0].number

    const loanInfo = await client.query('SELECT empresa FROM loan_applications WHERE id = $1', [loanId])
    const empresa = loanInfo.rows[0]?.empresa || `Préstamo #${loanId}`

    const collectedBy = actor.is_admin ? actor.id : null

    let invoiceId: number | null = null
    if (hasCollectedBy) {
      const invoiceInsert = await client.query(
        `INSERT INTO invoices (invoice_number, user_name, user_lastname, user_email, user_phone, payment_amount, payment_type, payment_date, loan_id, company_name, admin_notes, user_id, collected_by)
         SELECT $1, u.nombre, u.apellido, u.email, u.numero_celular, $2, $3, $4, $5, $6, $7, u.id, $8
         FROM users u WHERE u.id = $9 RETURNING id`,
        [invoiceNumber, amount, paymentType, paymentDate, loanId, empresa, 'Pago aplicado automáticamente', collectedBy, payerId]
      )
      invoiceId = invoiceInsert.rows[0]?.id
    } else {
      const invoiceInsert = await client.query(
        `INSERT INTO invoices (invoice_number, user_name, user_lastname, user_email, user_phone, payment_amount, payment_type, payment_date, loan_id, company_name, admin_notes, user_id)
         SELECT $1, u.nombre, u.apellido, u.email, u.numero_celular, $2, $3, $4, $5, $6, $7, u.id
         FROM users u WHERE u.id = $8 RETURNING id`,
        [invoiceNumber, amount, paymentType, paymentDate, loanId, empresa, 'Pago aplicado automáticamente', payerId]
      )
      invoiceId = invoiceInsert.rows[0]?.id
    }

    try {
      await client.query('INSERT INTO notifications (user_id, loan_id, type, message) VALUES ($1, $2, $3, $4)', [loan.user_id, loanId, 'payment_due', `Se registró un pago de ${amount} para tu préstamo (${empresa}).`])
    } catch (e) {
      logger.error('Error creating notification for payment', e)
    }

    // Enviar email transaccional al usuario
    try {
      const payerRes = await client.query('SELECT email, nombre FROM users WHERE id = $1 LIMIT 1', [payerId])
      const payerUser = payerRes.rows[0]
      if (payerUser?.email) {
        sendPaymentConfirmedEmail({
          to: payerUser.email,
          nombre: payerUser.nombre || 'Cliente',
          monto: amount,
          saldoRestante: Math.max(0, remaining - amount),
        }).catch((err) => logger.error("Error al enviar email de confirmación de pago:", err))
      }
    } catch (mailErr) {
      logger.error("Error obteniendo datos para email de pago:", mailErr)
    }

    try {
      const tbl = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' LIMIT 1"
      )
      if (tbl.rows.length > 0) {
        const auditPayload = {
          id: paymentId,
          user_id: payerId,
          loan_id: loanId,
          amount,
          payment_type: paymentType,
          payment_date: paymentDate,
        }
        await client.query(
          `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, created_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
          [actor.id, 'INSERT', 'payments', paymentId, JSON.stringify(auditPayload)]
        )
      }
    } catch (e: any) {
      logger.error('Error inserting audit_log for manual payment:', { error: e.message || e })
    }

    await client.query('COMMIT')
    logger.info(`Pago aplicado exitosamente ID ${paymentId} para préstamo #${loanId} por actor ID ${actor.id}`)

    return NextResponse.json({ success: true, paymentId, invoiceId })
  } catch (error: any) {
    await client.query('ROLLBACK')
    logger.error('Error al aplicar pago:', { error: error.message || error, stack: error.stack })
    return NextResponse.json({ error: 'Error interno al aplicar pago' }, { status: 500 })
  } finally {
    if (typeof client.release === 'function') client.release()
  }
}
