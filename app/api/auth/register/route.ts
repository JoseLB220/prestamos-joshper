import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { hashPassword } from "@/lib/auth"
import saveDataUrlToPublicUploads from '@/lib/saveDataUrl'
import uploadDataUrlToCloudinary from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nombre,
      apellido,
      email,
      cedula_pasaporte,
      numero_celular,
      password,
      documento_foto,
    } = body

    console.log("Registration attempt for:", email)

    // Validaciones básicas
    if (!nombre || !apellido || !email || !cedula_pasaporte || !numero_celular || !password || !documento_foto) {
      return NextResponse.json({ error: "Todos los campos son requeridos, incluyendo la foto del documento" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Formato de email inválido" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    // Verifica si ya existe un usuario con ese email o documento
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1 OR cedula_pasaporte = $2",
      [email, cedula_pasaporte]
    )
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Ya existe un usuario con este email o documento" }, { status: 400 })
    }

    const hashedPassword = hashPassword(password)

    // Prepare documento_foto value to save. Prefer local file save to images container, then Cloudinary, then data URL as fallback.
    let documentoFotoToSave: string | null = documento_foto || null
    if (typeof documentoFotoToSave === 'string' && documentoFotoToSave.startsWith('data:image')) {
      // try to save in uploads directory for images container
      const saved = await saveDataUrlToPublicUploads(documentoFotoToSave, 'doc')
      if (saved) {
        documentoFotoToSave = saved
      } else {
        // Fallback to Cloudinary if configured
        const cloudUrl = await uploadDataUrlToCloudinary(documentoFotoToSave)
        if (cloudUrl) {
          documentoFotoToSave = cloudUrl
        } else {
          documentoFotoToSave = documento_foto // fallback to storing data URL in DB
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

    console.log("User registered successfully with ID:", result.rows[0].id)

    return NextResponse.json(
      {
        message: "Usuario registrado exitosamente",
        id: result.rows[0].id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor. Por favor intenta nuevamente." },
      { status: 500 }
    )
  }
}
