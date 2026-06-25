import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request)

    const invoiceId = Number.parseInt(params.id)
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: "ID de factura inválido" }, { status: 400 })
    }

    const invoiceResult = await query(
      `
      SELECT 
        i.*,
        la.monto as loan_total,
        la.plazo as loan_term,
        la.frecuencia as payment_frequency,
        (la.monto - COALESCE(SUM(p.amount), 0)) as remaining_amount
      FROM invoices i
      LEFT JOIN loan_applications la ON i.loan_id = la.id
      LEFT JOIN payments p ON la.id = p.loan_id AND p.status = 'paid' AND p.id != (
        SELECT id FROM payments WHERE loan_id = la.id AND amount = i.payment_amount AND DATE(payment_date) = DATE(i.payment_date) LIMIT 1
      )
      WHERE i.id = $1
      GROUP BY i.id, la.id
      `,
      [invoiceId],
    )

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    const invoice = invoiceResult.rows[0]

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura ${invoice.invoice_number}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 20mm;
            }
            .no-print {
              display: none !important;
            }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
          }
          
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          
          .company-info h1 {
            color: #2563eb;
            font-size: 28px;
            margin-bottom: 5px;
          }
          
          .company-info p {
            color: #666;
            font-size: 14px;
          }
          
          .invoice-details {
            text-align: right;
          }
          
          .invoice-details h2 {
            color: #2563eb;
            font-size: 24px;
            margin-bottom: 10px;
          }
          
          .invoice-details p {
            font-size: 14px;
            color: #666;
          }
          
          .client-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          
          .client-info h3 {
            color: #2563eb;
            margin-bottom: 10px;
            font-size: 16px;
          }
          
          .client-info p {
            font-size: 14px;
            margin-bottom: 5px;
          }
          
          .payment-details {
            margin: 30px 0;
          }
          
          .payment-details table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .payment-details th {
            background: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          
          .payment-details td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .payment-details tr:last-child td {
            border-bottom: none;
          }
          
          .total-section {
            margin-top: 30px;
            text-align: right;
          }
          
          .total-row {
            display: flex;
            justify-content: flex-end;
            gap: 20px;
            margin-bottom: 10px;
            font-size: 16px;
          }
          
          .total-row.grand-total {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
            padding-top: 10px;
            border-top: 2px solid #2563eb;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            background: #10b981;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>Joshper Solutions</h1>
              <p>Soluciones Financieras Integrales</p>
              <p>Tel: (809) 555-0123</p>
              <p>RNC: 123-45678-9</p>
            </div>
            <div class="invoice-details">
              <h2>FACTURA</h2>
              <p><strong>${invoice.invoice_number}</strong></p>
              <p>Fecha: ${new Date(invoice.payment_date).toLocaleDateString("es-DO", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
              <p><span class="status-badge">PAGADO</span></p>
            </div>
          </div>
          
          <div class="client-info">
            <h3>Cliente</h3>
            <p><strong>${invoice.user_name} ${invoice.user_lastname}</strong></p>
            <p>Email: ${invoice.user_email}</p>
            ${invoice.user_phone ? `<p>Teléfono: ${invoice.user_phone}</p>` : ""}
            ${invoice.company_name ? `<p>Empresa: ${invoice.company_name}</p>` : ""}
          </div>
          
          <div class="payment-details">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Préstamo</th>
                  <th style="text-align: right;">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Pago de Cuota</strong><br>
                    <small>Tipo: ${
                      invoice.payment_type === "installment"
                        ? "Cuota Regular"
                        : invoice.payment_type === "partial"
                          ? "Pago Parcial"
                          : "Pago Total"
                    }</small>
                  </td>
                  <td>
                    Préstamo #${invoice.loan_id}<br>
                    ${invoice.loan_total ? `<small>Total: RD$${Number(invoice.loan_total).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</small>` : ""}
                  </td>
                  <td style="text-align: right;">
                    <strong>RD$${Number(invoice.payment_amount).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="total-section">
            ${
              invoice.loan_total
                ? `
              <div class="total-row">
                <span>Total del Préstamo:</span>
                <span>RD$${Number(invoice.loan_total).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
              </div>
            `
                : ""
            }
            <div class="total-row">
              <span>Monto Pagado:</span>
              <span>RD$${Number(invoice.payment_amount).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
            </div>
            ${
              invoice.remaining_amount !== null
                ? `
              <div class="total-row">
                <span>Saldo Restante:</span>
                <span>RD$${Number(invoice.remaining_amount).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
              </div>
            `
                : ""
            }
            <div class="total-row grand-total">
              <span>Total Pagado:</span>
              <span>RD$${Number(invoice.payment_amount).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Documento no válido como comprobante fiscal</p>
            <p>Gracias por su pago puntual</p>
            <p>© ${new Date().getFullYear()} Joshper Solutions - Todos los derechos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="factura-${invoice.invoice_number}.html"`,
      },
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
