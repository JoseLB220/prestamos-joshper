"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

type CompanyAssoc = {
  assoc_id: number
  id: number
  nombre_empresa: string
  rnc: string
  representante: string
  empleados: number
  sector: string
  correo: string
  telefono: string
  status: string
  created_at: string
}

export default function CompaniesAssociated() {
  const [items, setItems] = useState<CompanyAssoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchList() }, [])

  const fetchList = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/user/companies')
      if (!res.ok) return
      const data = await res.json()
      setItems(Array.isArray(data.companies) ? data.companies : [])
    } catch (e) {
      console.error('Error loading companies', e)
      setItems([])
    } finally { setLoading(false) }
  }

  if (loading) return <div>Loading companies...</div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Empresas Asociadas</h3>
      {items.length === 0 && <div className="text-sm text-gray-500">No hay empresas asociadas.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((c) => (
          <Card key={c.assoc_id} className="border">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex justify-between items-center">
                <span>{c.nombre_empresa}</span>
                <span className={`text-xs px-2 py-1 rounded ${c.status === 'approved' ? 'bg-green-100 text-green-800' : c.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {c.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 space-y-1">
                <div><strong>RNC:</strong> {c.rnc}</div>
                <div><strong>Representante:</strong> {c.representante}</div>
                <div><strong>Empleados:</strong> {c.empleados}</div>
                <div><strong>Sector:</strong> {c.sector}</div>
                <div><strong>Correo:</strong> {c.correo}</div>
                <div><strong>Teléfono:</strong> {c.telefono}</div>
                <div className="text-xs text-gray-500 mt-2">Asociada: {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
