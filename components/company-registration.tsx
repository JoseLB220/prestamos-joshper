"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function CompanyRegistration() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const payload = Object.fromEntries(formData.entries())

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const contentType = res.headers.get('content-type') || ''
      let serverMessage = ''
      try {
        if (contentType.includes('application/json')) {
          const json = await res.json()
          serverMessage = (json && (json.message || json.error)) || JSON.stringify(json)
        } else {
          serverMessage = await res.text()
        }
      } catch (parseErr) {
        serverMessage = 'Respuesta inválida del servidor'
      }

      if (!res.ok) {
        console.error('Server responded with non-OK:', res.status, serverMessage)
        toast({ title: 'Error', description: serverMessage || 'Error al enviar la solicitud', variant: 'destructive' })
        return
      }

      toast({ title: 'Solicitud enviada', description: serverMessage || 'Solicitud enviada correctamente' })
      form.reset()
    } catch (err) {
      console.error('Fetch error posting company:', err)
      toast({ title: 'Error', description: 'Error de conexión con el servidor', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nombre_empresa">Nombre de la empresa</Label>
        <Input id="nombre_empresa" name="nombre_empresa" required />
      </div>

      <div>
        <Label htmlFor="rnc">RNC</Label>
        <Input id="rnc" name="rnc" placeholder="000000000" required />
      </div>

      <div>
        <Label htmlFor="representante">Representante</Label>
        <Input id="representante" name="representante" required />
      </div>

      <div>
        <Label htmlFor="empleados">Cantidad de empleados</Label>
        <Input id="empleados" name="empleados" type="number" min="1" required />
      </div>

      <div>
        <Label htmlFor="sector">Sector</Label>
        <Input id="sector" name="sector" required />
      </div>

      <div>
        <Label htmlFor="correo">Correo electrónico</Label>
        <Input id="correo" name="correo" type="email" required />
      </div>

      <div>
        <Label htmlFor="telefono">Teléfono</Label>
        <Input id="telefono" name="telefono" placeholder="809-000-0000" required />
      </div>

      <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
      </Button>
    </form>
  )
}
