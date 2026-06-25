"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, User, Mail, Phone, CreditCard, Lock, Upload } from "lucide-react"
import { PasswordInput } from "@/components/ui/password-input"

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    // Get form values
    const nombre = formData.get("nombre") as string
    const apellido = formData.get("apellido") as string
    const email = formData.get("email") as string
    const cedula_pasaporte = formData.get("cedula_pasaporte") as string
    const numero_celular = formData.get("numero_celular") as string
    const password = formData.get("password") as string
    const confirm_password = formData.get("confirm_password") as string
    const documento_foto = formData.get("documento_foto") as File

    // Validate passwords match
    if (password !== confirm_password) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Validate required fields
    if (!nombre || !apellido || !email || !cedula_pasaporte || !numero_celular || !password || !documento_foto) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos, incluyendo la foto del documento",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      // If a file was provided, convert it to a base64 data URL so we can store/display it immediately.
      let documentoFotoPayload: string | null = null
      if (documento_foto && documento_foto.size > 0) {
        // validate size (5MB)
        const maxBytes = 5 * 1024 * 1024
        if (documento_foto.size > maxBytes) {
          toast({ title: "Error", description: "La imagen excede el tamaño máximo de 5MB", variant: "destructive" })
          setIsSubmitting(false)
          return
        }
        documentoFotoPayload = await new Promise<string | null>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(documento_foto)
        })
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          apellido,
          email,
          cedula_pasaporte,
          numero_celular,
          password,
          documento_foto: documentoFotoPayload,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Registro exitoso",
          description: "Tu cuenta ha sido creada correctamente",
        })
        router.push("/auth/login")
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al crear la cuenta",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        title: "Error",
        description: "Error de conexión con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div className="main-header">
        <div className="content-container">
          <div className="flex items-center justify-center mb-4">
            <Image src="/logo_joshper.png" alt="Joshper Solutions" width={150} height={75} />
          </div>
          <h1>Crear Cuenta</h1>
          <p>Únete a Joshper Solutions y accede a nuestros servicios financieros</p>
        </div>
      </div>

      {/* Content */}
      <div className="content-container" style={{ maxWidth: "600px" }}>
        <div className="form-container animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="feature-card-icon" style={{ background: "#10b981", color: "white" }}>
              <UserPlus size={20} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Información Personal</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">
                  <User size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
                  Nombre *
                </label>
                <input
                  className="form-input"
                  id="nombre"
                  name="nombre"
                  placeholder="Tu nombre"
                  required
                  minLength={2}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <User size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
                  Apellido *
                </label>
                <input
                  className="form-input"
                  id="apellido"
                  name="apellido"
                  placeholder="Tu apellido"
                  required
                  minLength={2}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
                Correo electrónico *
              </label>
              <input className="form-input" id="email" name="email" type="email" placeholder="tu@email.com" required />
            </div>

            <div className="form-group">
              <label className="form-label">
                <CreditCard size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
                Cédula o Pasaporte *
              </label>
              <input
                className="form-input"
                id="cedula_pasaporte"
                name="cedula_pasaporte"
                placeholder="000-0000000-0"
                required
                minLength={5}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Upload size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
                Foto del documento *
              </label>
              <input
                className="form-input"
                id="documento_foto"
                name="documento_foto"
                type="file"
                accept="image/*"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = () => setPreviewImage(reader.result as string)
                    reader.readAsDataURL(file)
                  } else {
                    setPreviewImage(null)
                  }
                }}
              />
              <p className="text-sm text-gray-500 mt-1">Formatos aceptados: JPG, PNG, GIF (máximo 5MB)</p>
              {previewImage && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Vista previa:</p>
                  <img
                    src={previewImage}
                    alt="Vista previa del documento"
                    className="max-w-xs h-auto rounded-lg border border-gray-300"
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <Phone size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
                Número de celular *
              </label>
              <input
                className="form-input"
                id="numero_celular"
                name="numero_celular"
                placeholder="809-000-0000"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
                  Contraseña *
                </label>
                <PasswordInput
                  className="form-input"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="text-sm text-gray-500 mt-1">Mínimo 6 caracteres</p>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
                  Confirmar contraseña *
                </label>
                <PasswordInput
                  className="form-input"
                  id="confirm_password"
                  name="confirm_password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="feature-card white" style={{ padding: "1rem" }}>
              <p className="text-sm text-gray-600">
                <strong>Nota:</strong> Al crear tu cuenta, aceptas nuestros términos y condiciones. Todos los campos
                marcados con (*) son obligatorios.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isSubmitting}>
              {isSubmitting ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>

          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
