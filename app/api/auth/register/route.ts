import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { hashPassword } from "@/lib/auth"
import saveDataUrlToPublicUploads from '@/lib/saveDataUrl'
import uploadDataUrlToCloudinary from '@/lib/cloudinary'
import { userRegisterSchema, formatZodError } from "@/lib/validations/schemas"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar payload con Zod
    const validation = userRegisterSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: formatZodError(validation.error) },
        { status: 400 }
      )
    }

    const {
      nombre,
      apellido,
      email,
      cedula_pasaporte,
      telefono,
      password,
      documento_foto,
    } = validation.data

    const numero_celular = telefono || body.numero_celular || null

    if (!cedula_pasaporte || !documento_foto) {
      return NextResponse.json({ error: "Todos los campos son requeridos, incluyendo la foto del documento" }, { status: 400 })
    }

    logger.info(`Intento de registro para: ${email}`)

    // Verifica si ya existe un usuario con ese email o documento
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1 OR cedula_pasaporte = $2",
      [email, cedula_pasaporte]
    )
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Ya existe un usuario con este email o documento" }, { status: 400 })
    }

    const hashedPassword = hashPassword(password)

    let documentoFotoToSave: string | null = documento_foto || null
    if (typeof documentoFotoToSave === 'string' && documentoFotoToSave.startsWith('data:image')) {
      const saved = await saveDataUrlToPublicUploads(documentoFotoToSave, 'doc')
      if (saved) {
        documentoFotoToSave = saved
      } else {
        const cloudUrl = await uploadDataUrlToCloudinary(documentoFotoToSave)
        if (cloudUrl) {
          documentoFotoToSave = cloudUrl
        } else {
          documentoFotoToSave = documento_foto
        }
      }
    }

    const result = await query(
      `INSERT INTO users (
        nombre, apellido, email, cedula_pasaporte, numero_celular, password, documento_foto,
        is_admin, can_request_loans, can_associate_companies
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, false, true, true
      ) RETURNING id`,
      [
        nombre,
        apellido,
        email,
        cedula_pasaporte,
        numero_celular,
        hashedPassword,
        documentoFotoToSave || null,
      ]
    )

    logger.info(`Usuario registrado exitosamente con ID: ${result.rows[0].id}`)

    return NextResponse.json(
      {
        message: "Usuario registrado exitosamente",
        id: result.rows[0].id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    logger.error("Error en registro:", { error: error.message || error, stack: error.stack })
    const errorMessage = error?.message?.includes("connect")
      ? "Error de conexión con la base de datos. Verifica DATABASE_URL."
      : (error?.message || "Error interno del servidor. Por favor intenta nuevamente.")
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
