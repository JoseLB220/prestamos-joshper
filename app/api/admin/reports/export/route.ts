import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { requireAdmin } from "@/lib/auth"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return ""
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

function arrayToCsv(headers: string[], rows: any[][]): string {
  const headerRow = headers.map(escapeCsvField).join(",")
  const dataRows = rows.map((row) => row.map(escapeCsvField).join(","))
  // Añadir UTF-8 BOM (\uFEFF) para que Excel abra acentos y caracteres especiales automáticamente
  return "\uFEFF" + [headerRow, ...dataRows].join("\r\n")
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const searchParams = request.nextUrl.searchParams
    const reportType = searchParams.get("type") || "loans" // loans | payments | users | companies
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const status = searchParams.get("status")

    let csvContent = ""
    let fileName = `reporte_${reportType}_${new Date().toISOString().split("T")[0]}.csv`

    if (reportType === "loans") {
      let sql = `
        SELECT 
          la.id,
          la.nombre_completo,
          la.documento,
          la.telefono,
          la.empresa,
          la.monto,
          la.plazo,
          la.frecuencia,
          la.estado,
          la.cuenta_banco,
          la.nombre_banco,
          la.tipo_cuenta,
          la.created_at,
          u.email as user_email
        FROM loan_applications la
        LEFT JOIN users u ON la.user_id = u.id
        WHERE 1=1
      `
      const params: any[] = []

      if (status && status !== "todos") {
        params.push(status)
        sql += ` AND la.estado = $${params.length}`
      }
      if (startDate) {
        params.push(startDate)
        sql += ` AND la.created_at >= $${params.length}`
      }
      if (endDate) {
        params.push(endDate)
        sql += ` AND la.created_at <= $${params.length}`
      }

      sql += ` ORDER BY la.created_at DESC`

      const result = await query(sql, params)
      const headers = [
        "ID Solicitud",
        "Cliente",
        "Email",
        "Documento",
        "Teléfono",
        "Empresa",
        "Monto (DOP)",
        "Plazo (Meses)",
        "Frecuencia",
        "Estado",
        "Banco",
        "No. Cuenta",
        "Tipo Cuenta",
        "Fecha Solicitud",
      ]

      const rows = result.rows.map((r: any) => [
        r.id,
        r.nombre_completo,
        r.user_email || "",
        r.documento,
        r.telefono,
        r.empresa,
        r.monto,
        r.plazo,
        r.frecuencia,
        r.estado,
        r.nombre_banco,
        r.cuenta_banco,
        r.tipo_cuenta,
        new Date(r.created_at).toLocaleString("es-DO"),
      ])

      csvContent = arrayToCsv(headers, rows)
    } else if (reportType === "payments") {
      let sql = `
        SELECT 
          p.id,
          p.loan_id,
          p.amount,
          p.capital_amount,
          p.interest_amount,
          p.late_fee,
          p.payment_type,
          p.payment_method,
          p.reference_number,
          p.status,
          p.payment_date,
          p.created_at,
          la.nombre_completo,
          la.documento
        FROM payments p
        LEFT JOIN loan_applications la ON p.loan_id = la.id
        WHERE 1=1
      `
      const params: any[] = []

      if (status && status !== "todos") {
        params.push(status)
        sql += ` AND p.status = $${params.length}`
      }
      if (startDate) {
        params.push(startDate)
        sql += ` AND p.payment_date >= $${params.length}`
      }
      if (endDate) {
        params.push(endDate)
        sql += ` AND p.payment_date <= $${params.length}`
      }

      sql += ` ORDER BY p.payment_date DESC`

      const result = await query(sql, params)
      const headers = [
        "ID Pago",
        "ID Préstamo",
        "Cliente",
        "Documento",
        "Monto Total (DOP)",
        "Abono Capital",
        "Interés Cubierto",
        "Mora",
        "Tipo de Pago",
        "Método",
        "No. Referencia",
        "Estado",
        "Fecha de Pago",
      ]

      const rows = result.rows.map((r: any) => [
        r.id,
        r.loan_id,
        r.nombre_completo || "N/A",
        r.documento || "N/A",
        r.amount,
        r.capital_amount || 0,
        r.interest_amount || 0,
        r.late_fee || 0,
        r.payment_type,
        r.payment_method,
        r.reference_number || "",
        r.status,
        new Date(r.payment_date || r.created_at).toLocaleString("es-DO"),
      ])

      csvContent = arrayToCsv(headers, rows)
    } else if (reportType === "users") {
      const result = await query(`
        SELECT 
          id, nombre, apellido, email, cedula_pasaporte, numero_celular,
          is_admin, can_request_loans, can_associate_companies, created_at
        FROM users
        ORDER BY created_at DESC
      `)

      const headers = [
        "ID Usuario",
        "Nombre",
        "Apellido",
        "Email",
        "Cédula/Pasaporte",
        "Celular",
        "Rol Admin",
        "Permiso Préstamos",
        "Permiso Empresas",
        "Fecha Registro",
      ]

      const rows = result.rows.map((r: any) => [
        r.id,
        r.nombre || "",
        r.apellido || "",
        r.email,
        r.cedula_pasaporte || "",
        r.numero_celular || "",
        r.is_admin ? "Sí" : "No",
        r.can_request_loans ? "Sí" : "No",
        r.can_associate_companies ? "Sí" : "No",
        new Date(r.created_at).toLocaleString("es-DO"),
      ])

      csvContent = arrayToCsv(headers, rows)
    } else if (reportType === "companies") {
      const result = await query(`
        SELECT 
          id, rnc, razon_social, nombre_comercial, email_corporativo,
          telefono_contacto, estado, created_at
        FROM companies
        ORDER BY created_at DESC
      `)

      const headers = [
        "ID Empresa",
        "RNC",
        "Razón Social",
        "Nombre Comercial",
        "Email Corporativo",
        "Teléfono",
        "Estado",
        "Fecha Registro",
      ]

      const rows = result.rows.map((r: any) => [
        r.id,
        r.rnc,
        r.razon_social,
        r.nombre_comercial || "",
        r.email_corporativo || "",
        r.telefono_contacto || "",
        r.estado,
        new Date(r.created_at).toLocaleString("es-DO"),
      ])

      csvContent = arrayToCsv(headers, rows)
    } else {
      return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 })
    }

    logger.info(`Exportación de reporte ejecutada: ${reportType} (${fileName})`)

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    logger.error("Error al exportar reporte:", { error: error.message || error, stack: error.stack })
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 })
  }
}
