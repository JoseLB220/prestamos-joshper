import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin, getUserFromRequest } from "@/lib/auth"
import { query } from "@/lib/pg"
import { getClient } from "@/lib/pg"
import { sendLoanStatusUpdateEmail } from "@/lib/email"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const client = await getClient()
  try {
    const actor = await getUserFromRequest(request)
    await requireAdmin(request)

  const { id } = params
  const { estado, reason } = await request.json()

    // Get the old values before updating
    const oldRes = await query(`SELECT * FROM loan_applications WHERE id = $1 LIMIT 1`, [id])
    const oldValues = oldRes.rows[0]

    // If approving, set next_payment_date to 30 days from now
    let updateSql = `
      UPDATE loan_applications
      SET estado = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `
    let queryParams = [estado, id]

    if (estado === 'aprobado') {
      updateSql = `
        UPDATE loan_applications
        SET estado = $1, next_payment_date = CURRENT_DATE + INTERVAL '30 days', updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `
    }

    await query(updateSql, queryParams)

    // Get the new values after updating
    const newRes = await query(`SELECT * FROM loan_applications WHERE id = $1 LIMIT 1`, [id])
    const newValues = newRes.rows[0]

    // Record the audit log
    try {
      const tableExistsRes = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' LIMIT 1"
      )
      if (tableExistsRes.rows.length > 0) {
        await client.query(
          `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [actor?.id || null, `UPDATE (${estado})`, 'loan_applications', id, JSON.stringify(oldValues), JSON.stringify(newValues)]
        )
      }
    } catch (auditErr) {
      console.warn('Error recording audit log for loan update:', auditErr)
    }

    // create a notification for the loan owner about status change
    try {
      const loanRes = await query(`SELECT user_id FROM loan_applications WHERE id = $1 LIMIT 1`, [id])
      const loan = loanRes.rows[0]
      if (loan) {
        // Build a detailed message including loan summary so frontend can show a rich popup
        const loanSummaryRes = await query(`SELECT id, monto, plazo, frecuencia, documento FROM loan_applications WHERE id = $1 LIMIT 1`, [id])
        const loanSummary = loanSummaryRes.rows[0] || {}

        let msg = ''
        if (estado === 'aprobado') {
          msg = `Tu solicitud fue aprobada. El primer pago debe realizarse en 30 días.`
        } else if (estado === 'rechazado') {
          msg = `Tu solicitud fue rechazada. Razón: ${reason || 'Sin especificar'}`
        } else {
          msg = `Estado actualizado a ${estado}`
        }

        // Append loan details to the message so the user modal can display them.
        const details = `\n\nDetalles de la solicitud:\nID: ${loanSummary.id || id}\nEmpresa: ${loanSummary.empresa || ''}\nMonto: RD$${Number(loanSummary.monto || 0).toFixed(2)}\nPlazo: ${loanSummary.plazo || ''} meses\nFrecuencia: ${loanSummary.frecuencia || ''}\nDocumento: ${loanSummary.documento || ''}`

        const finalMessage = msg + details

        // Use 'admin_comment' for rejection notifications so frontend shows the denial modal (matches payment rejection)
        const notifType = (estado === 'rechazado') ? 'admin_comment' : 'application_status'
        await query(`INSERT INTO notifications (user_id, loan_id, type, message) VALUES ($1, $2, $3, $4)`, [loan.user_id, id, notifType, finalMessage])

        // Enviar email transaccional al usuario
        try {
          const userRes = await query(`SELECT email, nombre FROM users WHERE id = $1 LIMIT 1`, [loan.user_id])
          const loanUser = userRes.rows[0]
          if (loanUser?.email && (estado === 'aprobado' || estado === 'rechazado')) {
            sendLoanStatusUpdateEmail({
              to: loanUser.email,
              nombre: loanUser.nombre || 'Cliente',
              monto: Number(loanSummary.monto || 0),
              estado: estado as 'aprobado' | 'rechazado',
              motivo: reason,
            }).catch((err) => console.error("Error al enviar email de estado de préstamo:", err))
          }
        } catch (mailErr) {
          console.error("Error enviando email de estado:", mailErr)
        }
      }
    } catch (e) {
      console.error('Error creating notification for status change', e)
    }

    client.release()
    return NextResponse.json({ message: "Estado actualizado exitosamente", loan: newValues })
  } catch (error) {
    client.release()
    console.error("Update loan application error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
