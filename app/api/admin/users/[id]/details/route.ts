// app/api/admin/users/[id]/details/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request)

    // Convertir el ID a número entero
    const userId = Number.parseInt(params.id, 10)

    // Validar que sea un número válido
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    // Consulta principal del usuario
    const userResult = await query(
      `
      SELECT
        id, nombre, apellido, email, cedula_pasaporte, numero_celular,
        documento_foto, is_admin, can_request_loans, can_associate_companies,
        profile_edits_count, last_profile_edit, created_at, updated_at
      FROM users
      WHERE id = $1
      `,
      [userId],
    )

    const user = userResult.rows[0]

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Normalize documento_foto URL and check file existence
    if (user.documento_foto) {
      try {
        const docFoto = user.documento_foto
        let filePathToCheck = null

        if (typeof docFoto === 'string' && docFoto.startsWith('http://localhost:8081/uploads/')) {
          // Normalize values written before uploads were served by the unified proxy.
          const relativePath = docFoto.replace('http://localhost:8081', '')
          user.documento_foto = relativePath
          filePathToCheck = path.join(process.cwd(), relativePath.replace(/^\//, ''))
        } else if (typeof docFoto === 'string' && docFoto.startsWith('/uploads')) {
          filePathToCheck = path.join(process.cwd(), docFoto.replace(/^\//, ''))
        } else if (typeof docFoto === 'string' && !docFoto.startsWith('http') && !docFoto.startsWith('/uploads')) {
          // If it's just a filename, assume it's in uploads
          filePathToCheck = path.join(process.cwd(), 'uploads', docFoto)
        }

        if (filePathToCheck) {
          try {
            await fs.promises.access(filePathToCheck, fs.constants.R_OK)
            // Keep upload paths relative so they use the current proxy origin.
            if (!docFoto.startsWith('http')) {
              user.documento_foto = docFoto.startsWith('/') ? docFoto : '/uploads/' + docFoto
            }
          } catch (err) {
            // file missing — clear the field so frontend shows placeholder
            user.documento_foto = null
          }
        }
      } catch (e) {
        // ignore any file-check errors and return profile as-is
        console.error('Error checking documento_foto file existence', e)
      }
    }

    // Consultas relacionadas
    const loansResult = await query(
      `
      SELECT * FROM loan_applications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId],
    )

    const paymentsResult = await query(
      `
      SELECT * FROM payments
      WHERE user_id = $1
      ORDER BY payment_date DESC
      LIMIT 50
      `,
      [userId],
    )

    const invoicesResult = await query(
      `
      SELECT * FROM invoices
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId],
    )

    const commentsResult = await query(
      `
      SELECT lc.*, la.id as loan_id, la.monto, u.nombre as admin_name, u.apellido as admin_lastname
      FROM loan_comments lc
      JOIN loan_applications la ON lc.loan_id = la.id
      JOIN users u ON lc.admin_id = u.id
      WHERE la.user_id = $1
      ORDER BY lc.created_at DESC
      LIMIT 50
      `,
      [userId],
    )

    const loanApplications = loansResult.rows.map((app) => ({
      ...app,
      sueldo: Number(app.sueldo),
      prestaciones: Number(app.prestaciones),
      monto: Number(app.monto),
    }))

    const payments = paymentsResult.rows
    const invoices = invoicesResult.rows
    const comments = commentsResult.rows

    // Estructura final esperada por el frontend
    const userDetails = {
      user: {
        ...user,
        is_admin: Boolean(user.is_admin),
        can_request_loans: Boolean(user.can_request_loans),
        can_associate_companies: Boolean(user.can_associate_companies),
        profile_edits_count: user.profile_edits_count ?? 0,
      },
      // Estos campos deben coincidir con lo que espera el frontend
      cuotas: payments, // Asumiendo que "cuotas" son pagos
      recibos: invoices, // Asumiendo que "recibos" son facturas
      notas: comments, // Asumiendo que "notas" son comentarios
      acuerdos: loanApplications, // Asumiendo que "acuerdos" son préstamos
      adjuntos: user.documento_foto ? [{ id: "documento_foto", name: "Documento de Identidad", url: user.documento_foto, type: "image" }] : [], // Asumiendo que "adjuntos" es la foto del documento
    }

    return NextResponse.json(userDetails)
  } catch (error: any) {
    console.error("Get user details error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
