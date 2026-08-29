import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { query } from "@/lib/pg"
import saveDataUrlToPublicUploads from '@/lib/saveDataUrl'
import { logger } from "@/lib/logger"
import { sendLoanApplicationReceivedEmail } from "@/lib/email"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface LoanData {
  user_id: number
  nombre_completo: string
  documento: string
  telefono: string
  empresa: string
  tiempo_empresa: number
  sueldo: number
  prestaciones: number
  monto: number
  frecuencia: string
  plazo: number
  cuenta_banco: string
  nombre_banco: string
  tipo_cuenta: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    if (!user.can_request_loans) {
      return NextResponse.json({ error: "No tienes permisos para solicitar préstamos" }, { status: 403 })
    }

    const body = await request.json()

    // Validar campos requeridos primero
    const requiredFields = [
      "documento", "telefono", "empresa",
      "tiempo_empresa", "sueldo", "prestaciones", "monto",
      "frecuencia", "plazo", "cuenta_banco", "nombre_banco", "tipo_cuenta"
    ]

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ error: `El campo '${field}' es requerido` }, { status: 400 })
      }
    }

    // Validar tipos de datos
    if (!["mensual", "quincenal"].includes(body.frecuencia)) {
      return NextResponse.json({ error: "Frecuencia inválida. Usa 'mensual' o 'quincenal'" }, { status: 400 })
    }

    if (!["ahorros", "corriente"].includes(body.tipo_cuenta.toLowerCase())) {
      return NextResponse.json({ error: "Tipo de cuenta inválido. Usa 'Ahorros' o 'Corriente'" }, { status: 400 })
    }

    const nombreCompleto = `${user.nombre || ''} ${user.apellido || ''}`.trim()
    const finalNombreCompleto = nombreCompleto || user.email || 'Usuario'

    let documentoFotoUrl: string | null = null
    if (body.documento_foto && typeof body.documento_foto === 'string' && body.documento_foto.startsWith('data:image')) {
      documentoFotoUrl = await saveDataUrlToPublicUploads(body.documento_foto, 'doc')
    }

    const loanData: LoanData = {
      user_id: user.id,
      nombre_completo: finalNombreCompleto,
      documento: body.documento,
      telefono: body.telefono,
      empresa: body.empresa,
      tiempo_empresa: Number(body.tiempo_empresa),
      sueldo: Number(body.sueldo),
      prestaciones: Number(body.prestaciones),
      monto: Number(body.monto),
      frecuencia: body.frecuencia,
      plazo: Number(body.plazo),
      cuenta_banco: body.cuenta_banco,
      nombre_banco: body.nombre_banco,
      tipo_cuenta: body.tipo_cuenta.toLowerCase(),
    }

    const numericFields = ["tiempo_empresa", "sueldo", "prestaciones", "monto", "plazo"]
    for (const field of numericFields) {
      if (isNaN(loanData[field as keyof LoanData] as number)) {
        return NextResponse.json({ error: `El campo '${field}' debe ser un número válido` }, { status: 400 })
      }
    }

    await query(`
      INSERT INTO loan_applications (
        user_id, nombre_completo, documento, telefono, empresa, tiempo_empresa,
        sueldo, prestaciones, monto, frecuencia, plazo,
        cuenta_banco, nombre_banco, tipo_cuenta, documento_foto, created_at, estado
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, NOW(), 'pendiente'
      )
    `, [
      loanData.user_id,
      loanData.nombre_completo,
      loanData.documento,
      loanData.telefono,
      loanData.empresa,
      loanData.tiempo_empresa,
      loanData.sueldo,
      loanData.prestaciones,
      loanData.monto,
      loanData.frecuencia,
      loanData.plazo,
      loanData.cuenta_banco,
      loanData.nombre_banco,
      loanData.tipo_cuenta,
      documentoFotoUrl
    ])

    const result = await query(
      `SELECT * FROM loan_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    )

    logger.info(`Solicitud de préstamo creada exitosamente por usuario ${user.id} (Monto: DOP ${loanData.monto})`)

    // Enviar email transaccional de confirmación
    if (user.email) {
      sendLoanApplicationReceivedEmail({
        to: user.email,
        nombre: user.nombre || user.email,
        monto: loanData.monto,
        plazo: loanData.plazo,
        frecuencia: loanData.frecuencia,
      }).catch((err) => logger.error("Error al enviar email de solicitud:", err))
    }

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    logger.error("Error al procesar la solicitud de préstamo:", { error: error.message || error, stack: error.stack })
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    const result = await query(
      `
      SELECT
        la.*,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) AS total_paid,
        COALESCE(COUNT(p.id) FILTER (WHERE p.status = 'paid' AND p.payment_type = 'installment'), 0) AS paid_installments
      FROM loan_applications la
      LEFT JOIN payments p ON p.loan_id = la.id
      WHERE la.user_id = $1
      GROUP BY la.id
      ORDER BY la.created_at DESC
      `,
      [user.id]
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    logger.error("Error al obtener solicitudes de préstamo:", { error: error.message || error, stack: error.stack })
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}