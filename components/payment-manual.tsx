"use client"

import React, { useState } from "react"
import LoanSearch from "@/components/loan-search"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function PaymentManual() {
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null)
  const [amount, setAmount] = useState("")
  const [paymentType, setPaymentType] = useState("installment")
  const [notes, setNotes] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!selectedLoan) {
      setMessage("Selecciona primero un préstamo")
      return
    }
    if (!amount || Number(amount) <= 0) {
      setMessage("Ingresa un monto válido")
      return
    }
    if (!receiptFile) {
      setMessage("Adjunta un recibo (imagen o PDF)")
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("loanId", String(selectedLoan.id))
      fd.append("amount", String(amount))
      fd.append("paymentType", paymentType)
      fd.append("notes", notes || "")
      fd.append("receiptFile", receiptFile)

      const res = await fetch("/api/payments", {
        method: "POST",
        body: fd,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Error registrando el pago")
      }

      setMessage("Pago registrado exitosamente. Pendiente de revisión.")
      // reset
      setSelectedLoan(null)
      setAmount("")
      setNotes("")
      setReceiptFile(null)

    } catch (err: any) {
      console.error("Payment error", err)
      setMessage(err.message || "Error interno")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 border rounded">
      <h3 className="text-lg font-semibold">Pago Manual / Abono</h3>

      <div>
        <Label>Buscar préstamo</Label>
        <LoanSearch onSelect={(loan) => setSelectedLoan(loan)} />
      </div>

      {selectedLoan && (
        <div className="p-3 border rounded bg-gray-50">
          <div className="text-sm font-medium">{selectedLoan.empresa || selectedLoan.nombre_completo || `Préstamo #${selectedLoan.id}`}</div>
          <div className="text-xs text-muted-foreground">Monto del préstamo: {selectedLoan.monto ? new Intl.NumberFormat('es-DO', {style:'currency', currency:'DOP'}).format(selectedLoan.monto) : '-'}</div>
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => setSelectedLoan(null)}>Cambiar selección</Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <Label>Monto a pagar</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej. 1500" />
        </div>

        <div>
          <Label>Tipo</Label>
          <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full rounded-md border px-3 py-2">
            <option value="installment">Pago de cuota</option>
            <option value="partial">Abono parcial</option>
            <option value="extra">Abono extra</option>
          </select>
        </div>

        <div>
          <Label>Notas (opcional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas para el administrador" />
        </div>

        <div>
          <Label>Recibo (imagen o PDF)</Label>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
        </div>

        {message && <div className="text-sm text-center text-gray-700">{message}</div>}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Registrar pago"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => {
            setSelectedLoan(null); setAmount(""); setNotes(""); setReceiptFile(null); setMessage(null)
          }}>
            Limpiar
          </Button>
        </div>
      </form>
    </div>
  )
}
