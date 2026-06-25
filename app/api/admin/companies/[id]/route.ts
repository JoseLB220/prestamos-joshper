import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/pg";
import { requireAdmin, getUserFromRequest } from "@/lib/auth";
import { getClient } from "@/lib/pg";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const client = await getClient()
  try {
    const actor = await getUserFromRequest(request)
    await requireAdmin(request);

  const { id } = params;
  const { estado, reason } = await request.json();

    if (typeof estado !== "string") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    // Get old values before updating
    const oldRes = await query(`SELECT * FROM companies WHERE id = $1 LIMIT 1`, [id]);
    const oldValues = oldRes.rows[0];

    const result = await query(
      `
      UPDATE companies
      SET estado = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [estado, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
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
          [actor?.id || null, `UPDATE (${estado})`, 'companies', id, JSON.stringify(oldValues), JSON.stringify(newValues)]
        );
      }
    } catch (auditErr) {
      console.warn('Error recording audit log for company update:', auditErr);
    }

    // If company was rejected, try to notify the requesting user (match by correo)
    try {
      if (estado === 'rechazado') {
        const companyRes = await query(`SELECT correo FROM companies WHERE id = $1 LIMIT 1`, [id])
        const company = companyRes.rows[0]
        if (company && company.correo) {
          const userRes = await client.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [company.correo])
          if (userRes.rows.length > 0) {
            const targetUserId = userRes.rows[0].id
              const companyRes2 = await client.query(`SELECT nombre_empresa, rnc FROM companies WHERE id = $1 LIMIT 1`, [id])
              const comp = companyRes2.rows[0] || {}
              const msg = `Tu solicitud de asociación de empresa fue rechazada. Razón: ${reason || 'Sin especificar'}` + `\n\nEmpresa: ${comp.nombre_empresa || ''}\nRNC: ${comp.rnc || ''}`
              await client.query(`INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`, [targetUserId, 'admin_comment', msg])
          }
        }
      }
    } catch (notifyErr) {
      console.error('Error creando notificación por rechazo de empresa:', notifyErr)
    }

    // ALSO: update any pending user_company associations for this company so user sees status changes
    try {
      const mappedStatus = estado === 'aprobado' ? 'approved' : estado === 'rechazado' ? 'rejected' : estado
      const ucRes = await client.query(
        `UPDATE user_companies SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE company_id = $2 RETURNING id, user_id`,
        [mappedStatus, id]
      )

      if (ucRes.rows.length > 0) {
        for (const r of ucRes.rows) {
          try {
            const userId = r.user_id
            const message = mappedStatus === 'approved'
              ? `Tu solicitud de asociación de empresa ha sido aprobada. Empresa ID: ${id}`
              : mappedStatus === 'rejected'
                ? `Tu solicitud de asociación de empresa ha sido rechazada. Razón: ${reason || 'Sin especificar'}`
                : `El estado de tu solicitud de asociación ha sido actualizado a: ${mappedStatus}`

            await client.query(`INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`, [userId, 'company_status', message])
          } catch (innerErr) {
            console.error('Error creando notificación para user_company:', innerErr)
          }
        }
      }
    } catch (ucErr) {
      console.error('Error actualizando user_companies para company:', ucErr)
    }

    client.release();
    return NextResponse.json({ message: "Estado de empresa actualizado exitosamente" });
  } catch (error: any) {
    client.release();
    console.error("Update company error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
