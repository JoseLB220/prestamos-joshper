
import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/pg";
import { requireAdmin } from "@/lib/auth";

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const searchTerm = `%${q.toLowerCase()}%`;

    const result = await query(
      `
      SELECT
        id, nombre, apellido, email, cedula_pasaporte, numero_celular,
        is_admin, can_request_loans, can_associate_companies, created_at
      FROM users
      WHERE
        LOWER(nombre) LIKE $1 OR
        LOWER(apellido) LIKE $1 OR
        LOWER(email) LIKE $1 OR
        LOWER(cedula_pasaporte) LIKE $1
      ORDER BY nombre, apellido
      LIMIT 20
      `,
      [searchTerm]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error searching users:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
