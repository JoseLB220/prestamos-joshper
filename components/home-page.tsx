"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import LoanRequestForm from "@/components/loan-request-form"
import LoanSimulator from "@/components/loan-simulator"
import CompanyRegistration from "@/components/company-registration"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Calculator, Building, FileText, TrendingUp, Shield, Clock } from "lucide-react"

interface HomePageProps {
  user: {
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
}

export default function HomePage({ user }: HomePageProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("servicios")

  // Refs for scrolling
  const serviciosRef = useRef<HTMLDivElement>(null)
  const informacionRef = useRef<HTMLDivElement>(null)
  const beneficiosRef = useRef<HTMLDivElement>(null)

  const { toast } = useToast()

  const showSection = (section: string) => {
    if (section === "loan-request" && !user) {
      toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para solicitar un préstamo', variant: 'destructive' })
      return
    }
    if (section === "company" && !user) {
      toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para asociar una empresa', variant: 'destructive' })
      return
    }
    setActiveSection(section)
  }

  const scrollToSection = (section: string) => {
    setActiveTab(section)
    let targetRef: React.RefObject<HTMLDivElement>

    switch (section) {
      case "servicios":
        targetRef = serviciosRef
        break
      case "informacion":
        targetRef = informacionRef
        break
      case "beneficios":
        targetRef = beneficiosRef
        break
      default:
        return
    }

    if (targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  if (activeSection) {
    return (
      <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        {/* Header */}
        <div className="main-header">
          <div className="content-container">
            <div className="flex items-center justify-center mb-6">
              <Image
                src="/logo_joshper.png"
                alt="Joshper Solutions"
                width={200}
                height={100}
                className="animate-fade-in"
              />
            </div>
            <h1>Joshper Solutions</h1>
            <p>Tu financiera de confianza</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="nav-tabs">
          <button className="nav-tab active" onClick={() => setActiveSection(null)}>
            Volver al Inicio
          </button>
        </div>

        {/* Content */}
        <div className="content-container">
          <div className="form-container animate-fade-in">
            {activeSection === "loan-request" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="feature-card-icon" style={{ background: "#3b82f6", color: "white" }}>
                    <CreditCard size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Solicitar Préstamo</h2>
                </div>
                <LoanRequestForm user={user} />
              </>
            )}
            {activeSection === "simulator" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="feature-card-icon" style={{ background: "#f59e0b", color: "white" }}>
                    <Calculator size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Simulador de Préstamo</h2>
                </div>
                <LoanSimulator user={user} />
              </>
            )}

            {activeSection === "company" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="feature-card-icon" style={{ background: "#10b981", color: "white" }}>
                    <Building size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Asociar Empresa</h2>
                </div>
                <CompanyRegistration />
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div className="main-header">
        <div className="content-container">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logo_joshper.png"
              alt="Joshper Solutions"
              width={200}
              height={100}
              className="animate-fade-in"
            />
          </div>
          <h1>Joshper Solutions</h1>
          <p>Facilitamos préstamos accesibles para tus empleados. ¡Creciendo contigo!</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "servicios" ? "active" : ""}`}
          onClick={() => scrollToSection("servicios")}
        >
          Servicios Principales
        </button>
        <button
          className={`nav-tab ${activeTab === "informacion" ? "active" : ""}`}
          onClick={() => scrollToSection("informacion")}
        >
          Información
        </button>
        <button
          className={`nav-tab ${activeTab === "beneficios" ? "active" : ""}`}
          onClick={() => scrollToSection("beneficios")}
        >
          Beneficios
        </button>
      </div>

      {/* Main Content */}
      <div className="content-container">
        {/* Main Services */}
        <div ref={serviciosRef} id="servicios">
          <div className="card-grid">
            <div
              className="feature-card primary"
              onClick={() => showSection("loan-request")}
              style={{
                cursor: user && !user.can_request_loans ? "not-allowed" : "pointer",
                opacity: user && !user.can_request_loans ? 0.6 : 1,
              }}
            >
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <CreditCard size={24} />
                </div>
                <h3 className="feature-card-title">Solicitar Préstamo</h3>
              </div>
              <p className="feature-card-description">
                Solicita tu préstamo personal con tasas competitivas y proceso rápido de aprobación.
              </p>
              {user && !user.can_request_loans && (
                <p className="text-sm mt-2 opacity-75">Sin permisos para solicitar préstamos</p>
              )}
            </div>

            <div className="feature-card secondary" onClick={() => showSection("simulator")}>
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Calculator size={24} />
                </div>
                <h3 className="feature-card-title">Simular Préstamo</h3>
              </div>
              <p className="feature-card-description">
                Calcula tu cuota mensual y tabla de amortización antes de solicitar tu préstamo.
              </p>
            </div>

            <div
              className="feature-card white"
              onClick={() => showSection("company")}
              style={{
                cursor: user && !user.can_associate_companies ? "not-allowed" : "pointer",
                opacity: user && !user.can_associate_companies ? 0.6 : 1,
              }}
            >
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Building size={24} />
                </div>
                <h3 className="feature-card-title">Asociar Empresa</h3>
              </div>
              <p className="feature-card-description">
                Registra tu empresa para ofrecer beneficios financieros a tus empleados.
              </p>
              {user && !user.can_associate_companies && (
                <p className="text-sm mt-2 text-gray-500">Sin permisos para asociar empresas</p>
              )}
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div ref={informacionRef} id="informacion" style={{ marginTop: "3rem" }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">¿Por qué elegir Joshper Solutions?</h2>

          <div className="card-grid">
            <div className="feature-card white">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <TrendingUp size={24} />
                </div>
                <h3 className="feature-card-title">Tasas Competitivas</h3>
              </div>
              <p className="feature-card-description">
                Ofrecemos una tasa fija del 6% mensual, transparente y sin comisiones ocultas.
              </p>
            </div>

            <div className="feature-card white">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Clock size={24} />
                </div>
                <h3 className="feature-card-title">Proceso Rápido</h3>
              </div>
              <p className="feature-card-description">
                Aprobación en menos de 48 horas con documentación mínima requerida.
              </p>
            </div>

            <div className="feature-card white">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Shield size={24} />
                </div>
                <h3 className="feature-card-title">Seguridad Total</h3>
              </div>
              <p className="feature-card-description">Tus datos están protegidos con estándares de seguridad.</p>
            </div>

            <div className="feature-card white">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <FileText size={24} />
                </div>
                <h3 className="feature-card-title">Transparencia</h3>
              </div>
              <p className="feature-card-description">
                Información clara sobre términos, condiciones y políticas de préstamo.
              </p>
            </div>

            <div className="feature-card white">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Building size={24} />
                </div>
                <h3 className="feature-card-title">Soluciones Empresariales</h3>
              </div>
              <p className="feature-card-description">
                Programas especiales para empresas que quieren beneficiar a sus empleados.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div ref={beneficiosRef} id="beneficios" style={{ marginTop: "3rem" }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Nuestros Beneficios</h2>

          <div className="card-grid">
            <div className="feature-card secondary">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <TrendingUp size={24} />
                </div>
                <h3 className="feature-card-title">98% de Satisfacción</h3>
              </div>
              <p className="feature-card-description">
                Más del 98% de nuestros usuarios están felices con la app. ¡Tú puedes ser el próximo!
              </p>
            </div>

            <div className="feature-card secondary">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Clock size={24} />
                </div>
                <h3 className="feature-card-title">Aprobación Rápida</h3>
              </div>
              <p className="feature-card-description">
                Respuesta en menos de 48 horas para que no esperes por tu dinero.
              </p>
            </div>

            <div className="feature-card secondary">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Shield size={24} />
                </div>
                <h3 className="feature-card-title">Máxima Seguridad</h3>
              </div>
              <p className="feature-card-description">
                Tus datos personales y financieros están completamente protegidos.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <div className="feature-card primary" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h3 className="feature-card-title" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              ¿Listo para comenzar?
            </h3>
            <p className="feature-card-description" style={{ marginBottom: "1.5rem" }}>
              Únete a nuestros clientes satisfechos que han confiado en nosotros para sus necesidades financieras.
            </p>
            {!user && (
              <div className="flex gap-4 justify-center">
                <a href="/auth/register" className="btn btn-secondary">
                  Crear Cuenta
                </a>
                <a
                  href="/auth/login"
                  className="btn btn-outline"
                  style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}
                >
                  Iniciar Sesión
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
