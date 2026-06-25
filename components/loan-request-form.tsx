"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import TenureSelector from './ui/tenure-selector'

// Types
interface UserProps {
  id: number
  nombre: string
  apellido: string
  email: string
  cedula_pasaporte: string
  numero_celular: string
  is_admin: boolean
  can_request_loans: boolean
  can_associate_companies: boolean
}

/** =========================
 * Cálculos financieros
 * ========================= */

/** cuota fija por período (francés) */
function calcFixedInstallment(principal: number, ratePerPeriod: number, periods: number) {
  if (principal <= 0 || periods <= 0) return 0
  if (ratePerPeriod <= 0) return principal / periods
  const q = Math.pow(1 + ratePerPeriod, periods)
  return (principal * ratePerPeriod * q) / (q - 1)
}

/** Construir tabla de amortización */
function buildAmortizationSchedule(opts: {
  monto: number
  plazoMeses: number
  tasaAnual: number
  frecuencia: "mensual" | "quincenal"
}) {
  const { monto, plazoMeses, tasaAnual, frecuencia } = opts
  const periods = frecuencia === "quincenal" ? plazoMeses * 2 : plazoMeses
  const ratePerPeriod = frecuencia === "quincenal" ? tasaAnual / 100 / 24 : tasaAnual / 100 / 12

  const installment = calcFixedInstallment(monto, ratePerPeriod, periods)
  let balance = monto
  const rows: {
    n: number
    saldoAnterior: number
    interes: number
    capital: number
    cuota: number
    saldoRestante: number
  }[] = []

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


/** =========================
 * Formulario inline con simulación (actualizado)
 * ========================= */
export default function LoanRequestForm({
  user,
  onSubmitted,
}: {
  user: UserProps
  onSubmitted?: () => void
}) {
  const DEFAULT_TASA_ANUAL = 24 // usada sólo para la simulación y envío al backend
  const { toast } = useToast()

  // Campos (todos obligatorios). Uso string para validar mejor y permitir ''
  const [empresa, setEmpresa] = useState<string>("")
  const [documento, setDocumento] = useState<string>("")
  const [telefono, setTelefono] = useState<string>("")

  // Auto-rellenar documento y teléfono desde el perfil del usuario
  useEffect(() => {
    let mounted = true
    if (user?.cedula_pasaporte) {
      setDocumento(user.cedula_pasaporte)
    }
    if (user?.numero_celular) {
      setTelefono(user.numero_celular)
    }

    // If the server-provided `user` object is partial (no cedula/telefono), try fetching full profile
    const needsDocumento = !user?.cedula_pasaporte
    const needsTelefono = !user?.numero_celular
    if ((needsDocumento || needsTelefono) && user) {
      ;(async () => {
        try {
          const res = await fetch("/api/profile")
          if (!mounted) return
          if (!res.ok) return
          const data = await res.json()
          if (!mounted || !data) return
          if (needsDocumento && data.cedula_pasaporte) setDocumento(data.cedula_pasaporte)
          if (needsTelefono && data.numero_celular) setTelefono(data.numero_celular)
        } catch (err) {
          // ignore - best-effort only
        }
      })()
    }
    return () => {
      mounted = false
    }
  }, [user?.cedula_pasaporte, user?.numero_celular])
  const [tiempoEmpresa, setTiempoEmpresa] = useState<string>("") // meses
  const [sueldo, setSueldo] = useState<string>("")
  const [prestaciones, setPrestaciones] = useState<string>("") // puede ser 0 pero requerido
  const [banco, setBanco] = useState<string>("")
  const [tipoCuenta, setTipoCuenta] = useState<"ahorros" | "corriente">("ahorros")
  const [cuentaBanco, setCuentaBanco] = useState<string>("")
  const [montoSolicitado, setMontoSolicitado] = useState<string>("")
  const [plazoMeses, setPlazoMeses] = useState<string>("")
  const [frecuencia, setFrecuencia] = useState<"mensual" | "quincenal">("mensual")

  // Validación
  type Errors = Partial<
    Record<
      | "empresa"
      | "documento"
      | "telefono"
      | "tiempoEmpresa"
      | "sueldo"
      | "prestaciones"
      | "banco"
      | "tipoCuenta"
      | "cuentaBanco"
      | "montoSolicitado"
      | "plazoMeses"
      | "frecuencia",
      string
    >
  >
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const markTouched = (name: string) => setTouched((t) => ({ ...t, [name]: true }))

  const parseNumber = (v: string) => {
    if (v == null) return Number.NaN
    const trimmed = `${v}`.trim().replace(",", ".")
    if (trimmed === "") return Number.NaN
    return Number(trimmed)
  }

  const validateAll = (): Errors => {
    const e: Errors = {}

    if (!empresa.trim()) e.empresa = "Este campo es obligatorio"
    // Documento y teléfono se validan pero no requieren edición aquí
    if (!documento.trim()) e.documento = "Este campo es obligatorio"
    if (!telefono.trim()) e.telefono = "Este campo es obligatorio"

    const nTiempo = parseNumber(tiempoEmpresa)
    if (Number.isNaN(nTiempo)) e.tiempoEmpresa = "Ingresa un número válido"
    else if (nTiempo < 0) e.tiempoEmpresa = "No puede ser negativo"

    const nSueldo = parseNumber(sueldo)
    if (Number.isNaN(nSueldo)) e.sueldo = "Ingresa un número válido"
    else if (nSueldo <= 0) e.sueldo = "Debe ser mayor que 0"

    const nPrest = parseNumber(prestaciones)
    if (prestaciones.trim() === "") e.prestaciones = "Este campo es obligatorio"
    else if (Number.isNaN(nPrest)) e.prestaciones = "Ingresa un número válido"
    else if (nPrest < 0) e.prestaciones = "No puede ser negativo"

    if (!banco.trim()) e.banco = "Este campo es obligatorio"
    if (!tipoCuenta) e.tipoCuenta = "Selecciona un tipo de cuenta"
    if (!cuentaBanco.trim()) e.cuentaBanco = "Este campo es obligatorio"

    const nMonto = parseNumber(montoSolicitado)
    if (Number.isNaN(nMonto)) e.montoSolicitado = "Ingresa un número válido"
    else if (nMonto <= 0) e.montoSolicitado = "Debe ser mayor que 0"

    const nPlazo = parseNumber(plazoMeses)
    if (Number.isNaN(nPlazo)) e.plazoMeses = "Ingresa un número válido"
    else if (!Number.isInteger(nPlazo) || nPlazo <= 0) e.plazoMeses = "Debe ser un entero > 0"

    if (!frecuencia) e.frecuencia = "Selecciona una frecuencia"

    return e
  }

  const showError = (name: keyof Errors) => !!(touched[name] && errors[name])

  // Simulación / preview
  const [sim, setSim] = useState<ReturnType<typeof buildAmortizationSchedule> | null>(null)
  const [stage, setStage] = useState<"form" | "preview">("form") // preview = simulación mostrada

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount ?? 0)

  const handlePreview = async () => {
    const e = validateAll()
    setErrors(e)
    setTouched({
      empresa: true,
      documento: true,
      telefono: true,
      tiempoEmpresa: true,
      sueldo: true,
      prestaciones: true,
      banco: true,
      tipoCuenta: true,
      cuentaBanco: true,
      montoSolicitado: true,
      plazoMeses: true,
      frecuencia: true,
    })
    if (Object.keys(e).length > 0) {
      toast({
        title: "Revisa el formulario",
        description: "Completa todos los campos obligatorios.",
        variant: "destructive",
      })
      return
    }

    const monto = parseNumber(montoSolicitado)
    const plazo = parseNumber(plazoMeses)
    const calc = buildAmortizationSchedule({
      monto,
      plazoMeses: plazo,
      tasaAnual: DEFAULT_TASA_ANUAL,
      frecuencia,
    })
    setSim(calc)
    setStage("preview")
  }

  const handleConfirmSubmit = async () => {
    try {
      const monto = parseNumber(montoSolicitado)
      const plazo = parseNumber(plazoMeses)
      const tiempo = parseNumber(tiempoEmpresa)
      const sueldoNum = parseNumber(sueldo)
      const prestNum = parseNumber(prestaciones)

      const res = await fetch("/api/loan-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,

          // Datos principales de la solicitud
          empresa,
          documento,
          telefono,
          tiempo_empresa: tiempo,
          sueldo: sueldoNum,
          prestaciones: prestNum,

          // Datos bancarios
          nombre_banco: banco,
          tipo_cuenta: tipoCuenta,
          cuenta_banco: cuentaBanco,

          // Préstamo
          monto,
          plazo,
          frecuencia,

          // Campos nuevos para la base de datos
          documento_foto: null,
          next_payment_date: null,

          // Para compatibilidad con tu backend/simulador
          tasa_anual: DEFAULT_TASA_ANUAL,
        }),
      })

      if (res.ok) {
        toast({ title: "Solicitud enviada", description: "Tu solicitud fue enviada para revisión." })
        // Reset
        setEmpresa("")
        // No reset documento y telefono, mantenerlos del perfil (se auto-rellenarán con useEffect)
        setTiempoEmpresa("")
        setSueldo("")
        setPrestaciones("")
        setBanco("")
        setTipoCuenta("ahorros")
        setCuentaBanco("")
        setMontoSolicitado("")
        setPlazoMeses("")
        setFrecuencia("mensual")
        setErrors({})
        setTouched({})
        setSim(null)
        setStage("form")
        onSubmitted?.()
      } else {
        const err = await res.json().catch(() => ({ error: "Error desconocido" }))
        toast({ title: "Error", description: err.error || "No se pudo enviar la solicitud", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "No se pudo enviar la solicitud", variant: "destructive" })
    }
  }

  const inputClass = (hasError?: boolean) => `bg-white ${hasError ? "border-red-500" : "border-gray-300"}`

  return (
    <div className="form-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card-icon" style={{ background: "#3b82f6", color: "white" }}>
            <Plus size={20} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Nueva Solicitud de Préstamo</h2>
        </div>
      </div>

      {/* ====== Form ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Empresa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
          <Input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            onBlur={() => markTouched("empresa")}
            className={inputClass(showError("empresa"))}
            placeholder="Empresa donde trabajas"
          />
          {showError("empresa") && <p className="mt-1 text-xs text-red-600">{errors.empresa}</p>}
        </div>

        {/* Documento / Cédula */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Documento / Cédula *</label>
          <Input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            onBlur={() => markTouched("documento")}
            className={inputClass(showError("documento"))}
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">Auto-rellenado desde "Mi Perfil" (puedes editarlo ahí)</p>
          {showError("documento") && <p className="mt-1 text-xs text-red-600">{errors.documento}</p>}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
          <Input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            onBlur={() => markTouched("telefono")}
            className={inputClass(showError("telefono"))}
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">Auto-rellenado desde "Mi Perfil" (puedes editarlo ahí)</p>
          {showError("telefono") && <p className="mt-1 text-xs text-red-600">{errors.telefono}</p>}
        </div>

  {/* Tiempo en empresa (meses) - selector visual */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tiempo en empresa (meses) *</label>
          {/* TenureSelector: preset cards + custom input */}
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore-next-line */}
          <TenureSelector
            value={tiempoEmpresa}
            onChange={(val: number) => {
              setTiempoEmpresa(String(val))
              markTouched('tiempoEmpresa')
            }}
          />
          {showError('tiempoEmpresa') && <p className="mt-1 text-xs text-red-600">{errors.tiempoEmpresa}</p>}
        </div>

        {/* Sueldo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sueldo *</label>
          <Input
            type="number"
            step="0.01"
            value={sueldo}
            onChange={(e) => setSueldo(e.target.value)}
            onBlur={() => markTouched("sueldo")}
            className={inputClass(showError("sueldo"))}
            placeholder="0.00"
          />
          {showError("sueldo") && <p className="mt-1 text-xs text-red-600">{errors.sueldo}</p>}
        </div>

        {/* Prestaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prestaciones *</label>
          <Input
            type="number"
            step="0.01"
            value={prestaciones}
            onChange={(e) => setPrestaciones(e.target.value)}
            onBlur={() => markTouched("prestaciones")}
            className={inputClass(showError("prestaciones"))}
            placeholder="0.00"
          />
          {showError("prestaciones") && <p className="mt-1 text-xs text-red-600">{errors.prestaciones}</p>}
        </div>
      </div>

      {/* Banco / Tipo / Cuenta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Banco */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Banco *</label>
          <Input
            value={banco}
            onChange={(e) => setBanco(e.target.value)}
            onBlur={() => markTouched("banco")}
            className={inputClass(showError("banco"))}
            placeholder="Banco Popular"
          />
          {showError("banco") && <p className="mt-1 text-xs text-red-600">{errors.banco}</p>}
        </div>

        {/* Tipo de cuenta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de cuenta *</label>
          <Select value={tipoCuenta} onValueChange={(v: any) => setTipoCuenta(v)}>
            <SelectTrigger className={inputClass(showError("tipoCuenta"))}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white shadow-lg">
              <SelectItem value="ahorros">Ahorros</SelectItem>
              <SelectItem value="corriente">Corriente</SelectItem>
            </SelectContent>
          </Select>
          {showError("tipoCuenta") && <p className="mt-1 text-xs text-red-600">{errors.tipoCuenta}</p>}
        </div>

        {/* Cuenta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta *</label>
          <Input
            value={cuentaBanco}
            onChange={(e) => setCuentaBanco(e.target.value)}
            onBlur={() => markTouched("cuentaBanco")}
            className={inputClass(showError("cuentaBanco"))}
            placeholder="000-0000000-0"
          />
          {showError("cuentaBanco") && <p className="mt-1 text-xs text-red-600">{errors.cuentaBanco}</p>}
        </div>
      </div>

      {/* Monto / Plazo / Frecuencia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Monto solicitado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Monto solicitado *</label>
          <Input
            type="number"
            step="0.01"
            value={montoSolicitado}
            onChange={(e) => setMontoSolicitado(e.target.value)}
            onBlur={() => markTouched("montoSolicitado")}
            className={inputClass(showError("montoSolicitado"))}
            placeholder="0.00"
          />
          {showError("montoSolicitado") && <p className="mt-1 text-xs text-red-600">{errors.montoSolicitado}</p>}
        </div>

        {/* Plazo (meses) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Plazo (meses) *</label>
          <Input
            type="number"
            value={plazoMeses}
            onChange={(e) => setPlazoMeses(e.target.value)}
            onBlur={() => markTouched("plazoMeses")}
            className={inputClass(showError("plazoMeses"))}
            placeholder="6"
          />
          {showError("plazoMeses") && <p className="mt-1 text-xs text-red-600">{errors.plazoMeses}</p>}
        </div>

        {/* Frecuencia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia *</label>
          <Select value={frecuencia} onValueChange={(v: any) => setFrecuencia(v)}>
            <SelectTrigger className={inputClass(showError("frecuencia"))}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white shadow-lg">
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
            </SelectContent>
          </Select>
          {showError("frecuencia") && <p className="mt-1 text-xs text-red-600">{errors.frecuencia}</p>}
        </div>
      </div>

      {/* Botones */}
      {stage === "form" && (
        <div className="flex gap-2 justify-end mt-6">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handlePreview}>
            Enviar solicitud
          </Button>
        </div>
      )}

      {/* Simulación / Preview */}
      {stage === "preview" && sim && (
        <div className="mt-6">
          <div className="feature-card white">
            <h3 className="text-xl font-bold mb-4">Resultado de la Simulación</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg border bg-white">
                <div className="text-sm text-gray-500">Monto</div>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(parseNumber(montoSolicitado))}</div>
              </div>
              <div className="p-4 rounded-lg border bg-white">
                <div className="text-sm text-gray-500">Pagos</div>
                <div className="text-2xl font-bold">{sim.periods}</div>
              </div>
              <div className="p-4 rounded-lg border bg-white">
                <div className="text-sm text-gray-500">Cuota</div>
                <div className="text-2xl font-bold text-green-700">{formatCurrency(sim.installment)}</div>
              </div>
            </div>

            {/* Tabla de amortización */}
            {sim && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tabla de Amortización</h3>
                <div className="overflow-x-auto">
                  <div className="data-table">
                    <table style={{ width: "100%", minWidth: "600px" }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Saldo Anterior</th>
                          <th>Interés</th>
                          <th>Capital</th>
                          <th>Cuota</th>
                          <th>Saldo Restante</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sim.rows.map((r) => (
                          <tr key={r.n}>
                            <td>{r.n}</td>
                            <td>{formatCurrency(r.saldoAnterior)}</td>
                            <td>{formatCurrency(r.interes)}</td>
                            <td>{formatCurrency(r.capital)}</td>
                            <td>{formatCurrency(r.cuota)}</td>
                            <td>{formatCurrency(r.saldoRestante)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setStage("form")}>
                Editar datos
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleConfirmSubmit}>
                Confirmar envío
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
