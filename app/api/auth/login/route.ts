import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { comparePassword, generateToken } from "@/lib/auth"
import { userLoginSchema, formatZodError } from "@/lib/validations/schemas"
import { logger } from "@/lib/logger"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar con Zod
    const validation = userLoginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: formatZodError(validation.error) },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    const result = await query(
      `SELECT id, nombre, apellido, email, cedula_pasaporte, is_admin,
              can_request_loans, can_associate_companies, password
      FROM users
      WHERE email = $1`,
      [email]
    )

    const user = result.rows[0]

    if (!user) {
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 })
    }

    if (!comparePassword(password, user.password)) {
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 })
    }

    delete user.password

    const token = generateToken(user)

    const response = NextResponse.json({
      message: "Inicio de sesión exitoso",
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        is_admin: Boolean(user.is_admin),
        can_request_loans: Boolean(user.can_request_loans),
        can_associate_companies: Boolean(user.can_associate_companies),
      },
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: "/",
    })

    logger.info(`Inicio de sesión exitoso para usuario ID: ${user.id} (${user.email})`)
    return response
  } catch (error: any) {
    logger.error("Error en login:", { error: error.message || error, stack: error.stack })
    return NextResponse.json(
      { error: "Error interno del servidor. Por favor intenta nuevamente." },
      { status: 500 }
    )
  }
}
