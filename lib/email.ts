import nodemailer from 'nodemailer'
import { logger } from '@/lib/logger'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
}

const emailFrom = process.env.EMAIL_FROM || 'Joshper Solutions <notificaciones@joshper.com>'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport(smtpConfig)
  }
  return transporter
}

/**
 * Enviar un email genérico. Si no hay SMTP configurado, registra el correo en logs sin romper el flujo.
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  const mailer = getTransporter()

  if (!mailer) {
    logger.info(`[EMAIL SIMULATED] Para: ${to} | Asunto: "${subject}" (Configura SMTP_USER y SMTP_PASS en .env para envío real)`)
    return true
  }

  try {
    await mailer.sendMail({
      from: emailFrom,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
    })
    logger.info(`[EMAIL ENVIADO] Exitosamente a: ${to} | Asunto: "${subject}"`)
    return true
  } catch (error: any) {
    logger.error(`[EMAIL ERROR] Fallo al enviar a ${to}:`, { error: error.message || error })
    return false
  }
}

// -----------------------------------------------------------------------------
// Plantillas de Correo HTML Responsivas y Profesionales
// -----------------------------------------------------------------------------

const emailHeader = `
<div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
  <h1 style="color: #ffffff; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 24px; font-weight: 700;">
    JOSHPER <span style="color: #38bdf8;">SOLUTIONS</span>
  </h1>
  <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Gestión Financiera y Préstamos</p>
</div>
`

const emailFooter = `
<div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-radius: 0 0 8px 8px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #64748b; margin-top: 24px;">
  <p style="margin: 0 0 6px 0;">Este es un mensaje automático de <strong>Joshper Solutions</strong>.</p>
  <p style="margin: 0;">Si tienes preguntas, contáctanos en soporte@joshper.com</p>
</div>
`

/**
 * Notificación: Solicitud de préstamo recibida
 */
export async function sendLoanApplicationReceivedEmail(params: {
  to: string
  nombre: string
  monto: number
  plazo: number
  frecuencia: string
}) {
  const { to, nombre, monto, plazo, frecuencia } = params
  const formattedMonto = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(monto)

  const html = `
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
    ${emailHeader}
    <div style="padding: 28px; color: #334155; line-height: 1.6;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">¡Hola ${nombre}!</h2>
      <p>Hemos recibido tu solicitud de préstamo y nuestro equipo de analistas está evaluándola.</p>
      
      <div style="background: #f8fafc; border-left: 4px solid #38bdf8; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Detalles de la Solicitud:</h3>
        <p style="margin: 4px 0;"><strong>Monto solicitado:</strong> ${formattedMonto}</p>
        <p style="margin: 4px 0;"><strong>Plazo:</strong> ${plazo} meses</p>
        <p style="margin: 4px 0;"><strong>Modalidad de pago:</strong> ${frecuencia === 'quincenal' ? 'Quincenal' : 'Mensual'}</p>
        <p style="margin: 4px 0;"><strong>Estado:</strong> <span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">En Revisión</span></p>
      </div>

      <p>Te notificaremos por este medio en cuanto tu solicitud sea procesada.</p>
    </div>
    ${emailFooter}
  </div>
  `

  return sendEmail({
    to,
    subject: `Solicitud de Préstamo Recibida - Joshper Solutions`,
    html,
  })
}

/**
 * Notificación: Préstamo Aprobado o Rechazado
 */
export async function sendLoanStatusUpdateEmail(params: {
  to: string
  nombre: string
  monto: number
  estado: 'aprobado' | 'rechazado'
  motivo?: string
}) {
  const { to, nombre, monto, estado, motivo } = params
  const formattedMonto = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(monto)
  const isApproved = estado === 'aprobado'

  const html = `
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
    ${emailHeader}
    <div style="padding: 28px; color: #334155; line-height: 1.6;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Estimado(a) ${nombre},</h2>
      
      ${isApproved ? `
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 18px;">🎉 ¡Tu préstamo ha sido APROBADO!</h3>
          <p style="margin: 4px 0; color: #047857;">Monto aprobado: <strong>${formattedMonto}</strong></p>
          <p style="margin: 8px 0 0 0; color: #065f46; font-size: 14px;">El desembolso se gestionará en tu cuenta bancaria registrada.</p>
        </div>
        <p>Puedes ingresar al sistema para consultar tu tabla de amortización y próximas fechas de pago.</p>
      ` : `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 18px;">Estado de Solicitud: Rechazada</h3>
          <p style="margin: 4px 0; color: #b91c1c;">Lamentamos informarte que tu solicitud por <strong>${formattedMonto}</strong> no pudo ser aprobada en este momento.</p>
          ${motivo ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #7f1d1d;"><strong>Motivo:</strong> ${motivo}</p>` : ''}
        </div>
        <p>Agradecemos tu interés. Podrás postular a una nueva solicitud más adelante.</p>
      `}
    </div>
    ${emailFooter}
  </div>
  `

  return sendEmail({
    to,
    subject: isApproved
      ? `🎉 ¡Préstamo Aprobado! - Joshper Solutions`
      : `Actualización sobre tu Solicitud de Préstamo - Joshper Solutions`,
    html,
  })
}

/**
 * Notificación: Pago Recibido / Registrado
 */
export async function sendPaymentReceivedEmail(params: {
  to: string
  nombre: string
  monto: number
  metodo: string
  referencia?: string
}) {
  const { to, nombre, monto, metodo, referencia } = params
  const formattedMonto = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(monto)

  const html = `
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
    ${emailHeader}
    <div style="padding: 28px; color: #334155; line-height: 1.6;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Hola ${nombre},</h2>
      <p>Hemos registrado tu comprobante de pago en el sistema.</p>
      
      <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">Detalle del Pago Reportado:</h3>
        <p style="margin: 4px 0;"><strong>Monto:</strong> ${formattedMonto}</p>
        <p style="margin: 4px 0;"><strong>Método:</strong> ${metodo}</p>
        ${referencia ? `<p style="margin: 4px 0;"><strong>No. Referencia:</strong> ${referencia}</p>` : ''}
        <p style="margin: 4px 0;"><strong>Estado:</strong> <span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Pendiente de Verificación</span></p>
      </div>

      <p>Tan pronto como el equipo administrativo valide la transacción, recibirás la confirmación final y tu factura actualizada.</p>
    </div>
    ${emailFooter}
  </div>
  `

  return sendEmail({
    to,
    subject: `Comprobante de Pago Recibido (${formattedMonto}) - Joshper Solutions`,
    html,
  })
}

/**
 * Notificación: Pago Confirmado / Aprobado
 */
export async function sendPaymentConfirmedEmail(params: {
  to: string
  nombre: string
  monto: number
  capitalPagado?: number
  interesPagado?: number
  saldoRestante?: number
}) {
  const { to, nombre, monto, capitalPagado, interesPagado, saldoRestante } = params
  const formattedMonto = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(monto)

  const html = `
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
    ${emailHeader}
    <div style="padding: 28px; color: #334155; line-height: 1.6;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">¡Pago Confirmado, ${nombre}!</h2>
      <p>Tu pago ha sido validado exitosamente y aplicado a tu préstamo.</p>
      
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">Resumen del Abono:</h3>
        <p style="margin: 4px 0; color: #047857; font-size: 18px;"><strong>Total Abonado: ${formattedMonto}</strong></p>
        ${capitalPagado !== undefined ? `<p style="margin: 4px 0;"><strong>Abono a Capital:</strong> RD$ ${capitalPagado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>` : ''}
        ${interesPagado !== undefined ? `<p style="margin: 4px 0;"><strong>Interés Cubierto:</strong> RD$ ${interesPagado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>` : ''}
        ${saldoRestante !== undefined ? `<p style="margin: 4px 0; color: #1e293b;"><strong>Balance Restante:</strong> RD$ ${saldoRestante.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>` : ''}
        <p style="margin: 6px 0 0 0;"><strong>Estado:</strong> <span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Aplicado</span></p>
      </div>

      <p>Puedes descargar tu factura oficial directamente desde tu portal en Joshper Solutions.</p>
    </div>
    ${emailFooter}
  </div>
  `

  return sendEmail({
    to,
    subject: `✅ Pago Confirmado y Aplicado (${formattedMonto}) - Joshper Solutions`,
    html,
  })
}
