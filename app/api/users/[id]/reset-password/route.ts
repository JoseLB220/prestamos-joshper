export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"
import bcrypt from "bcrypt"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request)

    const { newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const result = await query(
      `
      UPDATE users
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
      `,
      [hashedPassword, params.id],
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada exitosamente",
    })
  } catch (error: any) {
    console.error("Error resetting password:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
