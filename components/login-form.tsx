"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Lock, Mail, CheckCircle, TrendingUp, Users, Zap } from "lucide-react"
import { PasswordInput } from "@/components/ui/password-input"

export default function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido, ${result.user.nombre}`,
        })

        // Redirect based on user role
        if (result.user.is_admin) {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
        router.refresh()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error,
          variant: "destructive",
        })
      }
    } catch (error) {
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        
        {/* Left Section - Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Logo */}
          <div className="mb-8">
            <Image src="/logo_joshper.png" alt="Joshper Solutions" width={180} height={75} priority />
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido a Joshper</h1>
            <p className="text-gray-600">Inicia sesión en tu cuenta para gestionar tus préstamos</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="text-gray-600">Mantener sesión iniciada</span>
              </label>
              <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Iniciando sesión..." : "Entrar a mi cuenta"}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Crear cuenta
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Al iniciar sesión, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>

        {/* Right Section - Illustration & Benefits */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-50 to-purple-50 rounded-3xl -z-10" />
            
            {/* Main Illustration Area */}
            <div className="p-12 text-center">
              {/* Hero Icon/Illustration */}
              <div className="mb-12 flex justify-center">
                <div className="relative w-64 h-64 flex items-center justify-center">
                  {/* Decorative circles */}
                  <div className="absolute inset-0 rounded-full border-2 border-blue-200 opacity-50" />
                  <div className="absolute inset-8 rounded-full border-2 border-blue-300 opacity-30" />
                  
                  {/* Central Icon */}
                  <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>

              {/* Benefits Section */}
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Ventajas de Joshper</h2>
              
              <div className="space-y-6">
                {/* Benefit 1 */}
                <div className="flex items-start gap-4 text-left">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Gestión Rápida</h3>
                    <p className="text-gray-600 text-sm">Solicita y gestiona préstamos en minutos</p>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="flex items-start gap-4 text-left">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Soporte Empresarial</h3>
                    <p className="text-gray-600 text-sm">Equipo disponible para ayudarte en todo momento</p>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="flex items-start gap-4 text-left">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Procesos Seguros</h3>
                    <p className="text-gray-600 text-sm">Auditoría completa y backups automáticos de todos tus datos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
