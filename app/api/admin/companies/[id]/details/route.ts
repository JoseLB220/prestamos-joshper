import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/pg";
import { requireAdmin } from "@/lib/auth";

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);

    const { id } = params;

    const result = await query(
      `
      SELECT * FROM companies
      WHERE id = $1
      `,
      [id]
    );

    const companyDetails = result.rows[0];

    if (!companyDetails) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    return NextResponse.json(companyDetails);
  } catch (error: any) {
    console.error("Get company details error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
