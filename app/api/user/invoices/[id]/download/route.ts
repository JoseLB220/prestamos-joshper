import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/pg"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ message: "Token requerido" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 })
    }

    const invoiceId = Number.parseInt(params.id)

    // Verify invoice belongs to user
    const invoiceResult = await query("SELECT * FROM invoices WHERE id = $1 AND user_id = $2", [
      invoiceId,
      decoded.id,
    ])

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ message: "Factura no encontrada" }, { status: 404 })
    }

    const invoice = invoiceResult.rows[0]

    // Generate simple PDF content (in a real app, you'd use a PDF library)
    const pdfContent = `
      FACTURA JOSHPER SOLUTIONS
      ========================
      
      Número de Factura: ${invoice.invoice_number}
      Fecha: ${new Date(invoice.created_at).toLocaleDateString()}
      
      Cliente: ${invoice.user_name}
      Email: ${invoice.user_email}
      
      Descripción: ${invoice.description}
      Monto: $${invoice.payment_amount.toLocaleString()}
      Fecha de Pago: ${new Date(invoice.payment_date).toLocaleDateString()}
      
      ========================
      Gracias por su pago
    `

    // Return as text file (in production, use a proper PDF library)
    return new NextResponse(pdfContent, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="factura-${invoice.invoice_number}.txt"`,
      },
    })
  } catch (error) {
    console.error("Error downloading invoice:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
