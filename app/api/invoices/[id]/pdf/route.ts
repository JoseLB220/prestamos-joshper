import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import pool from "@/lib/pg"
import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"

// This route uses Node-only libraries (pdfkit) and accesses the database.
// Force Node runtime and dynamic behavior so Next doesn't try to run this in the Edge runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin (optional - you might want to allow users to download their own invoices)
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 })
    }

    const invoiceId = params.id
    if (!invoiceId) {
      return NextResponse.json({ error: "ID de factura es requerido" }, { status: 400 })
    }

    // Fetch invoice data
    const result = await pool.query(
      `
      SELECT
        i.id,
        i.invoice_number,
        u.nombre as user_name,
        u.apellido as user_lastname,
        u.email as user_email,
        u.numero_celular as user_phone,
        i.payment_amount,
        i.payment_type,
        i.payment_date,
        i.loan_id,
        la.empresa as company_name,
        i.admin_notes,
        i.created_at
      FROM
        invoices i
      JOIN
        users u ON i.user_id = u.id
      LEFT JOIN
        loan_applications la ON i.loan_id = la.id
      WHERE
        i.id = $1
      `,
      [invoiceId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    const invoice = result.rows[0]

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Factura ${invoice.invoice_number}`,
        Author: 'Joshper Solutions',
        Subject: 'Factura de Pago',
      }
    })

    // Try to locate system TTF fonts (preferred) to avoid pdfkit AFM file loading issues.
    const ttfCandidates = [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
      '/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf',
      '/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf',
      '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
      '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'
    ]

    const findTtf = () => {
      for (const p of ttfCandidates) {
        try { if (fs.existsSync(p)) return p } catch (e) { }
      }
      return null
    }

    // Register fonts on the PDF document if we find TTFs
    let fontRegular = 'Helvetica'
    let fontBold = 'Helvetica-Bold'
    try {
      const regularPath = findTtf()
      if (regularPath) {
        // register both regular and bold mapping if possible
        try {
          doc.registerFont('R', regularPath)
          fontRegular = 'R'
          // attempt to derive a bold candidate next to the regular path
          const boldGuess = regularPath.replace(/\.ttf$/i, '-Bold.ttf')
          if (fs.existsSync(boldGuess)) {
            doc.registerFont('B', boldGuess)
            fontBold = 'B'
          }
        } catch (e) {
          // registration failed; leave fallbacks
          console.warn('Font registration failed', e)
        }
      }
    } catch (e) {
      // ignore
    }

    // Set response headers for PDF download
    const buffers: Buffer[] = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {})

    // Company header
    doc
      .fontSize(24)
      .font(fontBold)
      .text('Joshper Solutions', { align: 'center' })
      .fontSize(12)
      .font(fontRegular)
      .text('Soluciones Financieras Integrales', { align: 'center' })
      .text('Tel: (809) 555-0123 | RNC: 123-45678-9', { align: 'center' })
      .moveDown(2)

    // Invoice title
    doc
      .fontSize(18)
      .font(fontBold)
      .text('FACTURA', { align: 'center' })
      .moveDown()

    // Invoice details
    const invoiceY = doc.y
    doc
      .fontSize(12)
      .font(fontBold)
      .text('Factura #:')
      .font(fontRegular)
      .text(invoice.invoice_number)

    doc
      .fontSize(12)
      .font(fontBold)
      .text('Fecha:', 300, invoiceY)
      .font(fontRegular)
      .text(new Date(invoice.payment_date).toLocaleDateString('es-DO'), 350, doc.y - 12)

    doc.moveDown(2)

    // Client information
    doc
      .fontSize(14)
      .font(fontBold)
      .text('Información del Cliente')
      .moveDown(0.5)

    doc
      .fontSize(11)
      .font(fontBold)
      .text('Nombre:')
      .font(fontRegular)
      .text(`${invoice.user_name} ${invoice.user_lastname}`)
      .moveDown(0.5)

    doc
      .fontSize(11)
      .font(fontBold)
      .text('Email:')
      .font(fontRegular)
      .text(invoice.user_email)
      .moveDown(0.5)

    if (invoice.user_phone) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Teléfono:')
        .font('Helvetica')
        .text(invoice.user_phone)
        .moveDown(0.5)
    }

    doc.moveDown()

    // Payment details
    doc
      .fontSize(14)
      .font(fontBold)
      .text('Detalles del Pago')
      .moveDown(0.5)

    const tableTop = doc.y
    const itemX = 50
    const descriptionX = 150
    const amountX = 400

    // Table headers
    doc
      .fontSize(11)
      .font(fontBold)
      .text('Concepto', itemX, tableTop)
      .text('Descripción', descriptionX, tableTop)
      .text('Monto', amountX, tableTop)

    // Table line
    doc
      .moveTo(50, doc.y + 5)
      .lineTo(550, doc.y + 5)
      .stroke()
      .moveDown()

    // Table content
    const concept = invoice.payment_type === 'installment' ? 'Pago de Cuota' : 'Abono Extra'
    const description = `Préstamo #${invoice.loan_id}${invoice.company_name ? ` - ${invoice.company_name}` : ''}`

    doc
      .fontSize(10)
      .font(fontRegular)
      .text(concept, itemX, doc.y)
      .text(description, descriptionX, doc.y)
      .text(formatCurrency(invoice.payment_amount), amountX, doc.y)
      .moveDown()

    // Total
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(0.5)

    doc
      .fontSize(12)
      .font(fontBold)
      .text('TOTAL:', amountX - 50, doc.y)
      .text(formatCurrency(invoice.payment_amount), amountX, doc.y)
      .moveDown(2)

    // Admin notes
    if (invoice.admin_notes) {
      doc
        .fontSize(11)
        .font(fontBold)
        .text('Notas:')
        .moveDown(0.5)
        .font(fontRegular)
        .fontSize(10)
        .text(invoice.admin_notes)
        .moveDown()
    }

    // Footer
    doc
      .fontSize(9)
      .font(fontRegular)
      .text('Documento no válido como comprobante fiscal', { align: 'center' })
      .moveDown(0.5)
      .text('Gracias por su pago puntual', { align: 'center' })
      .moveDown(0.5)
      .text(`Generado el ${new Date().toLocaleDateString('es-DO')} a las ${new Date().toLocaleTimeString('es-DO')}`, { align: 'center' })

    // Finalize PDF
    doc.end()

    // Wait for PDF to be generated
    await new Promise((resolve) => {
      doc.on('end', resolve)
    })

    // Combine buffers and return PDF
    const pdfBuffer = Buffer.concat(buffers)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Factura-${invoice.invoice_number}.pdf"`,
      },
    })

  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(amount || 0)
}
