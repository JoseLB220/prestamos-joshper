import { type NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/pg";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
  const actor = await requireAdmin(request);

  const { id } = params;
  const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const client = await getClient()
    let result: any = null
    try {
      await client.query('BEGIN')
      // Propagate current admin email to the DB session so triggers can record actor
      if (actor && actor.email) {
        const escapedEmail = actor.email.replace(/'/g, "''")
        await client.query(`SET LOCAL app.current_user_email = '${escapedEmail}'`)
      }

  result = await client.query(
        `
        UPDATE users
        SET password = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id
        `,
        [hashedPassword, id]
      );
      await client.query('COMMIT')
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    

    return NextResponse.json({ message: "Contraseña actualizada exitosamente" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
