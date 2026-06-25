import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/pg";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);

    const result = await query(
      `
      SELECT
        la.*,
        u.nombre, u.apellido, u.email,
        u.cedula_pasaporte as user_document,
        u.numero_celular as user_phone
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.user_id = $1
      ORDER BY la.created_at DESC
      LIMIT 50
      `,
      [params.id]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching user loans:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
