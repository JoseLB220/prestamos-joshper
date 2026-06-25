import { type NextRequest, NextResponse } from "next/server"
import { getClient, query } from "@/lib/pg"
import { requireAdmin, getUserFromRequest } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const client = await getClient()

  try {
    const actor = await getUserFromRequest(request)
    await requireAdmin(request)

    const { activeLoanId, paymentAmount, paymentType, notes, adminId } = await request.json()

    if (!activeLoanId || !paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Datos de pago inválidos" }, { status: 400 })
    }

    await client.query("BEGIN")

    try {
      // Get loan details from loan_applications table
      const loanResult = await client.query(
        `
        SELECT la.*, u.nombre as user_name, u.apellido as user_lastname, u.email as user_email
        FROM loan_applications la
        JOIN users u ON la.user_id = u.id
        WHERE la.id = $1 AND la.estado IN ('aprobado', 'active')
      `,
        [activeLoanId],
      )

      if (loanResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 })
      }

      const loan = loanResult.rows[0]

      // Calculate capital and interest amounts
      const interestRate = loan.interest_rate || 2.5
      const interestAmount = paymentType === "installment" ? loan.remaining_amount * (interestRate / 100) : 0
      const capitalAmount = paymentAmount - interestAmount

      // Generate receipt number
      const receiptResult = await client.query("SELECT generate_receipt_number() as number")
      const receiptNumber = receiptResult.rows[0].number

      // Create payment record
      const paymentResult = await client.query(
        `
        INSERT INTO loan_payments (
          active_loan_id, user_id, payment_amount, capital_amount,
          interest_amount, payment_type, status, confirmed_by,
          confirmed_at, receipt_number, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, CURRENT_TIMESTAMP, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *
      `,
        [
          activeLoanId,
          loan.user_id,
          paymentAmount,
          capitalAmount,
          interestAmount,
          paymentType,
          adminId,
          receiptNumber,
          notes,
        ],
      )

      const payment = paymentResult.rows[0]

      // Update loan_applications table
      const newRemainingAmount = Math.max(0, loan.remaining_amount - capitalAmount)
      const newRemainingInstallments =
        paymentType === "installment" ? Math.max(0, loan.remaining_installments - 1) : loan.remaining_installments

      // Calculate next payment date
      const nextPaymentDate = new Date(loan.next_payment_date)
      if (paymentType === "installment") {
        if (loan.frequency === "mensual") {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)
        } else {
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 15)
        }
      }

      const loanStatus = newRemainingAmount <= 0 ? "completed" : "active"

      const oldLoanValues = loan
      await client.query(
        `
        UPDATE loan_applications
        SET
          remaining_amount = $1,
          remaining_installments = $2,
          next_payment_date = $3,
          estado = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `,
        [
          newRemainingAmount,
          newRemainingInstallments,
          nextPaymentDate.toISOString().split("T")[0],
          loanStatus,
          activeLoanId,
        ],
      )

      // Get updated loan values for audit
      const updatedLoanRes = await client.query(`SELECT * FROM loan_applications WHERE id = $1`, [activeLoanId])
      const newLoanValues = updatedLoanRes.rows[0]

      // Record audit log for payment
      try {
        const tableExistsRes = await client.query(
          "SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' LIMIT 1"
        )
        if (tableExistsRes.rows.length > 0) {
          await client.query(
            `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [actor?.id || null, 'INSERT (manual_payment)', 'payments', activeLoanId, JSON.stringify({
              payment_amount: paymentAmount,
              payment_type: paymentType,
              notes,
              receipt_number: receiptNumber
            })]
          )
          
          // Also record the loan update
          await client.query(
            `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [actor?.id || null, 'UPDATE (manual_payment)', 'loan_applications', activeLoanId, JSON.stringify(oldLoanValues), JSON.stringify(newLoanValues)]
          )
        }
      } catch (auditErr) {
        console.warn('Error recording audit log for manual payment:', auditErr)
      }

      // Generate invoice with admin notes + loan_id. Prefer to populate collected_by when available.
      const invoiceNumberResult = await client.query("SELECT generate_invoice_number() as number")
      const invoiceNumber = invoiceNumberResult.rows[0].number

      // Detect collected_by column
      const colInfo = await client.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'collected_by' LIMIT 1"
      )
      const hasCollectedBy = colInfo.rows.length > 0

      let invoice
      if (hasCollectedBy) {
        const invoiceResult = await client.query(
          `INSERT INTO invoices (
            payment_id, invoice_number, user_id, loan_id, amount, admin_notes, payment_date, created_at, collected_by
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $7)
          RETURNING *`,
          [payment.id, invoiceNumber, loan.user_id, activeLoanId, paymentAmount, notes, actor?.id]
        )
        invoice = invoiceResult.rows[0]
      } else {
        const invoiceResult = await client.query(
          `INSERT INTO invoices (
            payment_id, invoice_number, user_id, loan_id, amount, admin_notes, payment_date, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *`,
          [payment.id, invoiceNumber, loan.user_id, activeLoanId, paymentAmount, notes]
        )
        invoice = invoiceResult.rows[0]
      }

      // Create notification for admins
      const notificationMessage = `Nuevo pago de ${Number(paymentAmount).toFixed(2)} DOP registrado para ${loan.user_name} ${loan.user_lastname}.`

      await client.query(
        `
        INSERT INTO notifications (message, link, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
        `,
        [notificationMessage, `/admin/dashboard?tab=payments&invoice_id=${invoice.id}`],
      )

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        message: "Pago registrado exitosamente",
        payment: payment,
        invoice: invoice,
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } catch (error: any) {
    console.error("Error creating manual payment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    client.release()
  }
}
