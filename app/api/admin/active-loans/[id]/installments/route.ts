import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request)

    // Get loan details first
    const loanResult = await query(
      `
      SELECT * FROM active_loans WHERE id = $1
    `,
      [params.id],
    )

    if (loanResult.rows.length === 0) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 })
    }

    const loan = loanResult.rows[0]

    // Generate pending installments based on remaining installments
    const pendingInstallments = []
    const currentDate = new Date(loan.next_payment_date)

    for (let i = 0; i < loan.remaining_installments; i++) {
      const dueDate = new Date(currentDate)

      if (loan.frequency === "mensual") {
        dueDate.setMonth(dueDate.getMonth() + i)
      } else {
        dueDate.setDate(dueDate.getDate() + i * 15)
      }

      // Calculate capital and interest for each installment
      const interestAmount = loan.remaining_amount * (loan.interest_rate / 100)
      const capitalAmount = loan.installment_amount - interestAmount

      pendingInstallments.push({
        installment_number: loan.total_installments - loan.remaining_installments + i + 1,
        due_date: dueDate.toISOString().split("T")[0],
        amount: loan.installment_amount,
        capital: capitalAmount,
        interest: interestAmount,
      })
    }

    return NextResponse.json(pendingInstallments)
  } catch (error: any) {
    console.error("Error fetching pending installments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
