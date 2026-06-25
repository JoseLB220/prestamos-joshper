import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/pg";
import { requireAdmin, getUserFromRequest } from "@/lib/auth";
import { getClient } from "@/lib/pg";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const client = await getClient()
  try {
    const actor = await getUserFromRequest(request);
    await requireAdmin(request);

    const tokenUser = await getUserFromRequest(request);
    const { id } = params;

    // Evitar que el admin se quite permisos a sí mismo
    if (tokenUser?.id === parseInt(id)) {
      return NextResponse.json(
        { error: "No puedes modificar tus propios permisos" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Get old values before updating
    const oldRes = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    const oldValues = oldRes.rows[0];

    const isAdmin = Boolean(data.is_admin);
    const canRequestLoans = Boolean(data.can_request_loans);
    const canAssociateCompanies = Boolean(data.can_associate_companies);

    const result = await query(
      `
      UPDATE users
      SET is_admin = $1,
          can_request_loans = $2,
          can_associate_companies = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [isAdmin, canRequestLoans, canAssociateCompanies, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const newValues = result.rows[0];

    // Record the audit log
    try {
      const tableExistsRes = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' LIMIT 1"
      );
      if (tableExistsRes.rows.length > 0) {
        await client.query(
          `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [actor?.id || null, 'UPDATE (permissions)', 'users', id, JSON.stringify(oldValues), JSON.stringify(newValues)]
        );
      }
    } catch (auditErr) {
      console.warn('Error recording audit log for user update:', auditErr);
    }

    client.release();
    return NextResponse.json({ message: "Usuario actualizado exitosamente" });
  } catch (error: any) {
    client.release();
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const client = await getClient()
  try {
    const actor = await getUserFromRequest(request);
    await requireAdmin(request);

    const tokenUser = await getUserFromRequest(request);
    const { id } = params;

    // Evitar que admin se elimine a sí mismo
    if (tokenUser?.id === parseInt(id)) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propio usuario" },
        { status: 403 }
      );
    }

    // Get old values before deleting
    const oldRes = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    const oldValues = oldRes.rows[0];

    const result = await query(
      `
      DELETE FROM users
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Record the audit log
    try {
      const tableExistsRes = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' LIMIT 1"
      );
      if (tableExistsRes.rows.length > 0) {
        await client.query(
          `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [actor?.id || null, 'DELETE', 'users', id, JSON.stringify(oldValues)]
        );
      }
    } catch (auditErr) {
      console.warn('Error recording audit log for user deletion:', auditErr);
    }

    client.release();
    return NextResponse.json({ message: "Usuario eliminado exitosamente" });
  } catch (error: any) {
    client.release();
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
