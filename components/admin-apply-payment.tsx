"use client"

import React, { useEffect, useMemo, useState } from "react"

interface Props {
  onSuccess?: (data: any) => void
  onCancel?: () => void
  // Optional data passed from the dashboard for faster rendering
  activeLoans?: any[]
  preselectedLoan?: any | null
}

export default function AdminApplyPayment({ onSuccess, onCancel, activeLoans = [], preselectedLoan = null }: Props) {
  const [query, setQuery] = useState<string>("")
  const [filteredLoans, setFilteredLoans] = useState<any[]>(activeLoans || [])
  const [selectedLoan, setSelectedLoan] = useState<any | null>(preselectedLoan)
  const [amount, setAmount] = useState<string>("")
  const [applyAs, setApplyAs] = useState<string>("installment")
  const [notes, setNotes] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  // helper: when a loan is selected, auto fill amount with next installment + mora if applicable
  const computeAmountForLoan = async (loan: any) => {
    if (!loan) return
    try {
      // Try to read a known installment amount first
      if (loan.installment_amount || loan.installmentAmount) {
        let base = Number(loan.installment_amount ?? loan.installmentAmount ?? loan.installment ?? 0)
        let mora = 0

        // If loan exposes next_payment_date and it's past due, attempt to add mora from loan if provided
        const nextDate = loan.next_payment_date ? new Date(loan.next_payment_date) : null
        if (nextDate && nextDate < new Date()) {
          // Prefer explicit mora fields if present
          mora = Number(loan.mora ?? loan.late_fee ?? loan.penalty ?? 0) || 0
          // If no explicit mora, estimate a small surcharge (assumption: 10% of installment). This is an approximation.
          if (!mora) mora = Math.round(base * 0.1 * 100) / 100
        }

        setAmount(String((base + mora).toFixed(2)))
        return
      }

      // Otherwise, fetch installments and derive the next unpaid installment
      const res = await fetch(`/api/admin/loans/${loan.id}/installments`)
      if (!res.ok) return
      const inst = await res.json()
      const arr = Array.isArray(inst) ? inst : inst.installments ?? inst.data ?? []
      const next = arr.find((it: any) => {
        const status = (it.status ?? it.estado ?? it.paid ?? it.pagado ?? "").toString().toLowerCase()
        return !(status === "paid" || status === "pagada" || status === "pagado")
      }) || arr[0]
      if (!next) return
      const base = Number(next.amount ?? next.monto ?? next.valor ?? 0)
      let mora = Number(next.late_fee ?? next.mora ?? next.penalty ?? 0) || 0
      const due = next.due_date ?? next.fecha_vencimiento ?? next.dueDate ?? next.vencimiento ?? next.date
      if (!mora && due) {
        const dueDate = new Date(due)
        if (!isNaN(dueDate.getTime()) && dueDate < new Date()) {
          // estimate a 10% mora if backend doesn't provide one (assumption)
          mora = Math.round(base * 0.1 * 100) / 100
        }
      }

      setAmount(String((base + mora).toFixed(2)))
    } catch (e) {
      // ignore; leave amount empty
      console.error("Error computing amount for loan", e)
    }
  }

  useEffect(() => {
    if (selectedLoan) {
      computeAmountForLoan(selectedLoan)
    } else {
      setAmount("")
    }
  }, [selectedLoan])

  useEffect(() => {
    // if dashboard passed a preselected loan, use it
    if (preselectedLoan) {
      setSelectedLoan(preselectedLoan)
    }
  }, [preselectedLoan])

  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan)
    setQuery(`${loan.id} - ${loan.user_name ?? loan.userName ?? ""} ${loan.user_lastname ?? ""}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!selectedLoan) {
      setError("Selecciona un préstamo")
      return
    }

    const loanId = Number(selectedLoan.id)
    const amt = Number.parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setError("Monto inválido")
      return
    }

    setLoading(true)
    try {
      const body: any = { loanId, amount: amt, applyAs }
      if (notes) body.notes = notes

      const res = await fetch("/api/payments/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Error al aplicar pago")
      } else {
        setResult(data)
        if (onSuccess) onSuccess(data)
      }
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const loansList = useMemo(() => filteredLoans, [filteredLoans])

  return (
    <div className="max-w-xl p-4 bg-white rounded shadow">
      <h2 className="text-lg font-semibold mb-4">Aplicar abono / pago manual (Admin)</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Buscar Préstamo (por ID, nombre o email)</label>
          <input
            className="border rounded w-full p-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe al menos 2 caracteres para filtrar"
          />

          {query && loansList.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-white">
              {loansList.map((l: any) => (
                <div
                  key={l.id}
                  className={`p-2 cursor-pointer hover:bg-gray-50 ${selectedLoan?.id === l.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectLoan(l)}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">#{l.id} — {l.user_name} {l.user_lastname}</div>
                    <div className="text-sm text-gray-600">{l.user_email}</div>
                  </div>
                  <div className="text-xs text-gray-500">Cuota: {l.installment_amount ?? l.installmentAmount ?? l.installment ?? 'N/A'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm">Monto</label>
          <input className="border rounded w-full p-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {selectedLoan && (
            <div className="text-xs text-gray-500 mt-1">Préstamo seleccionado: #{selectedLoan.id} — {selectedLoan.user_name} {selectedLoan.user_lastname}</div>
          )}
        </div>

        <div>
          <label className="block text-sm">Aplicar como</label>
          <select className="border rounded w-full p-2" value={applyAs} onChange={(e) => setApplyAs(e.target.value)}>
            <option value="installment">Cuota</option>
            <option value="partial">Parcial</option>
            <option value="full">Pago completo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm">Notas (opcional)</label>
          <input className="border rounded w-full p-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div>
          <div className="text-xs text-gray-600">Cobrado por: administrador actual (se asignará automáticamente)</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Aplicando..." : "Aplicar pago"}
          </button>
          <button
            type="button"
            className="px-3 py-2 border rounded"
            onClick={() => {
              if (onCancel) onCancel()
            }}
          >
            Cancelar
          </button>
        </div>
      </form>

      {error && <div className="mt-3 text-red-600">{error}</div>}

      {result && (
        <div className="mt-3 p-3 rounded bg-green-50 border border-green-200">
          <div className="font-medium">Éxito</div>
          <pre className="text-sm mt-2">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
