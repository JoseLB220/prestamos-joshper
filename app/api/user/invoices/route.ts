import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/pg"
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get("auth-token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ message: "Token requerido" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 })
    }

    const userId = decoded.id

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const invoicesResult = await query(
      `
      SELECT 
        i.id,
        i.invoice_number,
        i.user_name,
        i.user_lastname,
        i.payment_amount,
        i.payment_type,
        i.payment_date,
        i.loan_id,
        i.company_name,
        i.created_at,
        p.due_date,
        p.payment_date AS payment_real_date,
        la.monto AS loan_amount,
        la.plazo AS loan_term,
        la.estado AS loan_status,
        CASE 
          WHEN p.payment_date IS NOT NULL AND la.created_at IS NOT NULL 
          THEN EXTRACT(MONTH FROM AGE(p.payment_date, la.created_at)) + 1
          ELSE NULL 
        END AS installment_number
      FROM invoices i
      LEFT JOIN payments p 
        ON p.user_id = i.user_id 
        AND p.amount = i.payment_amount 
        AND DATE(p.payment_date) = DATE(i.payment_date)
      LEFT JOIN loan_applications la 
        ON la.id = i.loan_id
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [userId, limit, offset],
    )

    const countResult = await query("SELECT COUNT(*) as total FROM invoices WHERE user_id = $1", [userId])
    const totalInvoices = Number.parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalInvoices / limit)

    return NextResponse.json({
      invoices: invoicesResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalInvoices,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching user invoices:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
