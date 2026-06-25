"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Loan = {
  id: number
  empresa?: string
  nombre_completo?: string
  monto?: number
  estado?: string
  created_at?: string
  user_id?: number
}

export default function LoanSearch({ onSelect }: { onSelect: (loan: Loan) => void }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Loan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      void doSearch()
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function doSearch() {
    if (query.trim().length === 0) {
      setResults([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const url = `/api/loans/search?q=${encodeURIComponent(query)}&limit=20`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setResults(Array.isArray(data.loans) ? data.loans : [])
    } catch (err: any) {
      console.error("Loan search error", err)
      setError(err.message || "Error buscando préstamos")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar préstamo por id, empresa o nombre..."
        />
        <Button onClick={() => void doSearch()} disabled={loading} size="sm">
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="space-y-1 max-h-56 overflow-auto">
        {results.length === 0 && query.trim().length > 0 && !loading && (
          <div className="text-sm text-muted-foreground">No se encontraron préstamos</div>
        )}

        {results.map((loan) => (
          <div key={loan.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <div className="text-sm font-medium">{loan.empresa || loan.nombre_completo || `Préstamo #${loan.id}`}</div>
              <div className="text-xs text-muted-foreground">Monto: {loan.monto ? new Intl.NumberFormat('es-DO', {style:'currency', currency:'DOP'}).format(loan.monto) : '-'}</div>
            </div>
            <div>
              <Button size="sm" onClick={() => onSelect(loan)}>
                Seleccionar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
