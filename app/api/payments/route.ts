// app/api/payments/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getClient } from "@/lib/pg"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { nanoid } from "nanoid"
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const client = await getClient()

  try {
    await client.query("BEGIN")

    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    const formData = await request.formData()
    const loanIdStr = formData.get("loanId")?.toString()
    const amountStr = formData.get("amount")?.toString()
    
    // CAMBIO IMPORTANTE: Buscar tanto 'paymentType' como 'type'
    const paymentType = formData.get("paymentType")?.toString() || formData.get("type")?.toString()
    
    const notes = formData.get("notes") as string | null
    const receiptFile = formData.get("receiptFile") as File | null

    // SOLO estos campos son requeridos (paymentDate se genera automáticamente)
    if (!loanIdStr || !amountStr || !paymentType) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        {
          error: "Faltan datos requeridos",
          missing: {
            loanId: !loanIdStr,
            amount: !amountStr,
            paymentType: !paymentType,
          },
        },
        { status: 400 },
      )
    }

    const loanId = parseInt(loanIdStr, 10)
    const amount = parseFloat(amountStr)

    if (isNaN(loanId) || isNaN(amount) || amount <= 0) {
      await client.query("ROLLBACK")
      return NextResponse.json(
        {
          error: "Datos inválidos",
          invalid: {
            loanId: isNaN(loanId),
            amount: isNaN(amount) || amount <= 0,
          },
        },
        { status: 400 },
      )
    }

    // Verificar que el préstamo existe y pertenece al usuario
    const loanCheck = await client.query(
      "SELECT id, user_id FROM loan_applications WHERE id = $1",
      [loanId]
    )

    if (loanCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 })
    }

    if (loanCheck.rows[0].user_id !== user.id && !user.is_admin) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    let receiptUrl: string | null = null

    // Procesar archivo de recibo (obligatorio)
    if (!receiptFile || receiptFile.size === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Debes adjuntar un recibo" }, { status: 400 })
    }

    try {
      const fileBuffer = Buffer.from(await receiptFile.arrayBuffer())
      // Save to the shared uploads volume served by the reverse proxy.
      const uploadDir = path.join(process.cwd(), "uploads", "receipts")
      await mkdir(uploadDir, { recursive: true })
      const fileExtension = receiptFile.name.split('.').pop() || 'bin'
      const uniqueFilename = `${nanoid()}.${fileExtension}`
      const filePath = path.join(uploadDir, uniqueFilename)
      await writeFile(filePath, fileBuffer)
      receiptUrl = `/uploads/receipts/${uniqueFilename}`
    } catch (fileError) {
      console.error("Error al guardar archivo:", fileError)
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Error al guardar el recibo" }, { status: 500 })
    }

    // Fecha actual para el pago (se genera automáticamente)
    const paymentDate = new Date().toISOString()
    
    // Calcular fecha de vencimiento (30 días desde ahora)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    // Insertar el pago
    const result = await client.query(
      `INSERT INTO payments (
        user_id,
        loan_id,
        amount,
        payment_type,
        payment_date,
        due_date,
        status,
        notes,
        receipt_url
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
      RETURNING id`,
      [
        user.id,
        loanId,
        amount,
        paymentType,
        paymentDate, // ← Fecha actual generada automáticamente
        dueDate.toISOString(),
        notes || null,
        receiptUrl
      ],
    )

    // Obtener información del préstamo para la notificación
    const loanInfo = await client.query(
      "SELECT empresa, monto FROM loan_applications WHERE id = $1",
      [loanId]
    )

    const empresa = loanInfo.rows[0]?.empresa || `Préstamo #${loanId}`
    const formattedAmount = new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount)

    const notificationMessage = `Nuevo pago de ${user.nombre} ${user.apellido} para ${empresa} por ${formattedAmount} está pendiente de revisión.`

    // Crear notificación para administradores
    const adminUsers = await client.query(
      "SELECT id FROM users WHERE is_admin = true"
    )

    for (const admin of adminUsers.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, loan_id, type, message) 
         VALUES ($1, $2, $3, $4)`,
        [admin.id, loanId, 'payment_pending', notificationMessage]
      )
    }

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "Pago registrado exitosamente. Pendiente de confirmación.",
      paymentId: result.rows[0]?.id,
      receiptUrl,
    })

  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error completo al registrar el pago:", error)

    return NextResponse.json(
      {
        error: "Error interno del servidor al registrar el pago.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    )
  } finally {
    if (typeof client.release === "function") {
      client.release()
    }
  }
}

// Método GET para obtener pagos (sin cambios)
export async function GET(request: NextRequest) {
  const client = await getClient()

  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const loanId = searchParams.get('loanId')

    let query = `
      SELECT p.*, la.empresa 
      FROM payments p
      JOIN loan_applications la ON p.loan_id = la.id
      WHERE p.user_id = $1
    `
    let params: any[] = [user.id]

    if (loanId) {
      query += " AND p.loan_id = $2"
      params.push(parseInt(loanId, 10))
    }

    query += " ORDER BY p.created_at DESC"

    const result = await client.query(query, params)

    return NextResponse.json({ payments: result.rows })

  } catch (error: any) {
    console.error("Error al obtener pagos:", error)
    return NextResponse.json(
      { error: "Error al obtener pagos" },
      { status: 500 },
    )
  } finally {
    if (typeof client.release === "function") {
      client.release()
    }
  }
}
