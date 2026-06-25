import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/pg";

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== PUT /api/admin/payments/[id]/confirm ===");

    // 1. Verificar autenticación
    const tokenCookie = request.cookies.get("auth-token");
    console.log("Raw cookie object:", tokenCookie);

    const token = tokenCookie?.value;
    console.log("Token value:", token);

    if (!token) {
      console.log("❌ No se encontró token en la cookie 'auth-token'");
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // ✅ CORREGIDO: Usar await aquí
    const decoded = await verifyToken(token);
    console.log("Decoded token:", decoded);

    if (!decoded) {
      console.log("❌ Token inválido o expirado");
      return NextResponse.json({ message: "Token inválido" }, { status: 401 });
    }

    // 2. Verificar permisos de admin
    const userResult = await query("SELECT is_admin, email FROM users WHERE id = $1", [decoded.id]);
    console.log("Usuario encontrado en DB:", userResult.rows[0]);

    if (userResult.rows.length === 0) {
      console.log("❌ Usuario no encontrado en la base de datos");
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    if (!userResult.rows[0].is_admin) {
      console.log("❌ Usuario no es administrador");
      return NextResponse.json({ message: "Acceso denegado. Se requieren permisos de administrador." }, { status: 403 });
    }

    console.log("✅ Autenticación y autorización exitosas");

    // 3. Obtener ID del pago de los parámetros
    const paymentId = Number.parseInt(params.id);
    if (isNaN(paymentId)) {
      console.log("❌ ID de pago inválido:", params.id);
      return NextResponse.json({ message: "ID de pago inválido" }, { status: 400 });
    }

    console.log("Buscando pago con ID:", paymentId);

    // 4. Obtener detalles del pago antes de actualizarlo (para generar factura)
    const paymentResult = await query(
      `
      SELECT p.*, u.nombre as user_nombre, u.apellido as user_apellido, u.email as user_email, u.numero_celular as user_phone,
             la.empresa as company_name, la.id as loan_app_id
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN loan_applications la ON p.loan_id = la.id
      WHERE p.id = $1
      `,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      console.log("❌ Pago no encontrado en la base de datos");
      return NextResponse.json({ message: "Pago no encontrado" }, { status: 404 });
    }

    const payment = paymentResult.rows[0];
    console.log("✅ Pago encontrado:", payment);

    // 5. Actualizar el estado del pago a 'paid' (en lugar de 'confirmed')
    // ❌ CORREGIDO: Cambié 'confirmed' por 'paid' porque es un valor válido en la tabla
    await query(
      `
      UPDATE payments 
      SET status = 'paid'
      WHERE id = $1
      `,
      [paymentId]
    );
    console.log("✅ Pago actualizado a 'paid'");

    // 6. Generar número de factura
    const invoiceNumberResult = await query("SELECT generate_invoice_number() as number");
    const invoiceNumber = invoiceNumberResult.rows[0].number;
    console.log("Número de factura generado:", invoiceNumber);

    // 7. Crear la factura en la tabla 'invoices'
    const invoiceResult = await query(
      `
      INSERT INTO invoices (
        invoice_number,
        user_name,
        user_lastname,
        user_email,
        user_phone,
        payment_amount,
        payment_type,
        payment_date,
        loan_id,
        company_name,
        admin_notes,
        user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
      `,
      [
        invoiceNumber,
        payment.user_nombre,
        payment.user_apellido,
        payment.user_email,
        payment.user_phone,
        payment.amount,
        payment.payment_type,
        payment.payment_date,
        payment.loan_app_id,
        payment.company_name,
        "Pago confirmado por admin",
        payment.user_id,
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;
    console.log("✅ Factura creada con ID:", invoiceId);

    // 8. Obtener la factura recién creada para devolverla en la respuesta
    const finalInvoiceResult = await query(
      `SELECT * FROM invoices WHERE id = $1`,
      [invoiceId]
    );

    console.log("✅ Factura devuelta:", finalInvoiceResult.rows[0]);

    // create a notification for the user about payment confirmation
    try {
      await query(`INSERT INTO notifications (user_id, loan_id, type, message) VALUES ($1, $2, $3, $4)`, [
        payment.user_id,
        payment.loan_app_id,
        'payment_due',
        `Tu pago de ${payment.amount} ha sido confirmado por el administrador`,
      ])
    } catch (e) {
      console.error('Error creating notification for payment confirmation', e)
    }

    // Update loan next_payment_date based on frequency (if possible)
    try {
      const loanRes = await query(`SELECT frecuencia, next_payment_date FROM loan_applications WHERE id = $1 LIMIT 1`, [payment.loan_app_id])
      const loan = loanRes.rows[0]
      if (loan) {
        const freq = (loan.frecuencia || 'mensual').toString().toLowerCase()
        const baseDate = payment.payment_date ? new Date(payment.payment_date) : new Date()
        let nextDate = new Date(baseDate)
        if (freq === 'quincenal') {
          nextDate.setDate(nextDate.getDate() + 15)
        } else {
          // mensual
          nextDate.setMonth(nextDate.getMonth() + 1)
        }
        // store only date (no time) or timestamp as DB supports
        await query(`UPDATE loan_applications SET next_payment_date = $1, updated_at = NOW() WHERE id = $2`, [nextDate.toISOString(), payment.loan_app_id])
      }
    } catch (e) {
      console.error('Error updating loan next_payment_date after payment confirmation', e)
    }

    return NextResponse.json({
      message: "Pago confirmado y factura generada automáticamente",
      paymentId: paymentId,
      invoice: finalInvoiceResult.rows[0],
    });

  } catch (error: any) {
    console.error("❌ Error confirming payment:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}