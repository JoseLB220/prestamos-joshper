// Filepath: app/api/user/invoices/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import pool from "@/lib/pg"

// This route accesses the database and checks authentication via cookies/tokens.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
try {
    const user = await requireAuth(request)
    if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const result = await pool.query(
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
        i.created_at
    FROM 
        invoices i
    WHERE 
        i.user_id = $1
    ORDER BY 
        i.created_at DESC
    LIMIT 10
    `,
    [user.id]
    )

    return NextResponse.json(result.rows)
} catch (error) {
    console.error("Error fetching user invoices:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
}
}