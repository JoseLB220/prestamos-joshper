import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { query } from "@/lib/pg"

// NOTE: This calculation logic is duplicated in the frontend.
// Consider moving to a shared location if it needs to be kept in sync.
function buildAmortizationSchedule(opts: {
  monto: number
  plazoMeses: number
  tasaAnual: number
  frecuencia: "mensual" | "quincenal"
}) {
  const { monto, plazoMeses, tasaAnual, frecuencia } = opts
  const periods = frecuencia === "quincenal" ? plazoMeses * 2 : plazoMeses
  const ratePerPeriod = frecuencia === "quincenal" ? tasaAnual / 100 / 24 : tasaAnual / 100 / 12

  const calcFixedInstallment = (principal: number, ratePerPeriod: number, periods: number) => {
    if (principal <= 0 || periods <= 0) return 0
    if (ratePerPeriod <= 0) return principal / periods
    const q = Math.pow(1 + ratePerPeriod, periods)
    return (principal * ratePerPeriod * q) / (q - 1)
  }

  const installment = calcFixedInstallment(monto, ratePerPeriod, periods)
  let balance = monto
  const rows: any[] = []

  for (let i = 1; i <= periods; i++) {
    const interes = balance * ratePerPeriod
    const capital = Math.max(0, installment - interes)
    const saldoRestante = Math.max(0, balance - capital)
    rows.push({
      n: i,
      saldoAnterior: balance,
      interes,
      capital,
      cuota: capital + interes,
      saldoRestante,
    })
    balance = saldoRestante
  }

  const total = rows.reduce((s, r) => s + r.cuota, 0)
  const interesesTotales = total - monto
  return {
    periods,
    installment,
    total,
    interesesTotales,
    rows,
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !user.id) {
      // Return the simulation result even for non-logged-in users, but don't save it.
      const { monto, plazo, frecuencia, tasa_anual } = await request.json()
       if (!monto || !plazo || !frecuencia) {
        return NextResponse.json({ error: "Monto, plazo y frecuencia son requeridos" }, { status: 400 })
      }
      const simulationResult = buildAmortizationSchedule({
        monto: Number(monto),
        plazoMeses: Number(plazo),
        tasaAnual: Number(tasa_anual) || 24,
        frecuencia: frecuencia,
      })
      return NextResponse.json(simulationResult)
    }

    const { monto, plazo, frecuencia, tasa_anual } = await request.json()

    if (!monto || !plazo || !frecuencia) {
      return NextResponse.json({ error: "Monto, plazo y frecuencia son requeridos" }, { status: 400 })
    }

    const simulationResult = buildAmortizationSchedule({
      monto: Number(monto),
      plazoMeses: Number(plazo),
      tasaAnual: Number(tasa_anual) || 24, // Default rate
      frecuencia: frecuencia,
    })

    await query(
      `
      INSERT INTO loan_simulations (user_id, monto, plazo, frecuencia, tasa_anual, resultado)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [user.id, monto, plazo, frecuencia, tasa_anual || 24, JSON.stringify(simulationResult)],
    )

    return NextResponse.json(simulationResult, { status: 201 })
  } catch (error) {
    console.error("Error processing simulation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !user.id) {
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    const result = await query(
      `
      SELECT * FROM loan_simulations
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [user.id],
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching simulations:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
