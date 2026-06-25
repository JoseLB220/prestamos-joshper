
import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/pg";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const result = await query(`
      SELECT
        id, nombre, apellido, email, cedula_pasaporte, numero_celular,
        is_admin, can_request_loans, can_associate_companies,
        profile_edits_count, last_profile_edit, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    const users = result.rows.map(user => ({
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      cedula_pasaporte: user.cedula_pasaporte,
      numero_celular: user.numero_celular,
      is_admin: Boolean(user.is_admin),
      can_request_loans: Boolean(user.can_request_loans),
      can_associate_companies: Boolean(user.can_associate_companies),
      profile_edits_count: user.profile_edits_count ?? 0,
      last_profile_edit: user.last_profile_edit,
      created_at: user.created_at,
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

