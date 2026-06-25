"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LoanSimulatorProps {
  user?: {
    id: number
  }
}

export default function LoanSimulator({ user }: LoanSimulatorProps) {
  const [result, setResult] = useState<any>(null)
  const [amortizationTable, setAmortizationTable] = useState<any[]>([])

  const calculateLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    const monto = Number.parseFloat(data.monto as string)
    const salario = Number.parseFloat(data.sueldo as string)
    const prestaciones = Number.parseFloat(data.prestaciones as string)
    const plazo = Number.parseInt(data.plazo as string)
    const frecuencia = data.frecuencia as string
    const interes = 0.06

    const pagos = frecuencia === "quincenal" ? plazo * 2 : plazo
    const cuota = (monto * interes) / (1 - Math.pow(1 + interes, -pagos))

    // Validate loan policies
    if (monto > 0.9 * prestaciones || cuota > 0.35 * salario) {
      setResult({
        error: "El préstamo no cumple con las políticas (90% de prestaciones o cuota mayor al 35% del salario).",
      })
      setAmortizationTable([])
      return
    }

    // Generate amortization table
    let saldo = monto
    const table = []

    for (let i = 1; i <= pagos; i++) {
      const interesCuota = saldo * interes
      const capital = cuota - interesCuota
      const saldoRestante = Math.max(0, saldo - capital)

      table.push({
        numero: i,
        saldoAnterior: saldo,
        interes: interesCuota,
        capital: capital,
        cuota: cuota,
        saldoRestante: saldoRestante,
      })

      saldo = saldoRestante
    }

    setResult({
      monto,
      pagos,
      cuota,
      totalIntereses: table.reduce((sum, row) => sum + row.interes, 0),
    })
    setAmortizationTable(table)

    // Save simulation if user is logged in
    if (user) {
      try {
        await fetch("/api/loan-simulations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } catch (error) {
        console.error("Error saving simulation:", error)
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={calculateLoan} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sueldo">Sueldo mensual</Label>
            <Input id="sueldo" name="sueldo" type="number" step="0.01" min="0" required />
          </div>
          <div>
            <Label htmlFor="prestaciones">Prestaciones estimadas</Label>
            <Input id="prestaciones" name="prestaciones" type="number" step="0.01" min="0" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="monto">Monto solicitado</Label>
            <Input id="monto" name="monto" type="number" step="0.01" min="0" required />
          </div>
          <div>
            <Label htmlFor="frecuencia">Frecuencia de pago</Label>
            <Select name="frecuencia" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar frecuencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="quincenal">Quincenal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="plazo">Plazo (meses)</Label>
          <Input id="plazo" name="plazo" type="number" min="1" max="12" required />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">
            <strong>Tasa de interés:</strong> 6% mensual
          </p>
        </div>

        <Button type="submit" className="w-full btn-primary">
          Calcular Préstamo
        </Button>
      </form>

      {result && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Resultado de la Simulación</CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <div className="text-red-600 font-semibold">{result.error}</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{formatCurrency(result.monto)}</div>
                    <div className="text-sm text-blue-600">Monto</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-900">{result.pagos}</div>
                    <div className="text-sm text-yellow-600">Pagos</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">{formatCurrency(result.cuota)}</div>
                    <div className="text-sm text-green-600">Cuota</div>
                  </div>
                </div>

                {amortizationTable.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-blue-900 text-white">
                          <th className="p-2">#</th>
                          <th className="p-2">Saldo Anterior</th>
                          <th className="p-2">Interés</th>
                          <th className="p-2">Capital</th>
                          <th className="p-2">Cuota</th>
                          <th className="p-2">Saldo Restante</th>
                        </tr>
                      </thead>
                      <tbody>
                        {amortizationTable.map((row, index) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <td className="p-2 text-center">{row.numero}</td>
                            <td className="p-2 text-right">{formatCurrency(row.saldoAnterior)}</td>
                            <td className="p-2 text-right">{formatCurrency(row.interes)}</td>
                            <td className="p-2 text-right">{formatCurrency(row.capital)}</td>
                            <td className="p-2 text-right">{formatCurrency(row.cuota)}</td>
                            <td className="p-2 text-right">{formatCurrency(row.saldoRestante)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
