import Image from "next/image"
import { Target, Eye, Heart, Shield, Users, TrendingUp, Clock, Award, CheckCircle } from "lucide-react"

export default function AboutPage() {
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
          <h1>Sobre Nosotros</h1>
          <p>Conoce más sobre Joshper Solutions y nuestro compromiso contigo</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="nav-tabs">
        <a href="#historia" className="nav-tab">
          Nuestra Historia
        </a>
        <a href="#mision" className="nav-tab">
          Misión y Visión
        </a>
        <a href="#servicios" className="nav-tab">
          Servicios
        </a>
        <a href="#estadisticas" className="nav-tab">
          Estadísticas
        </a>
      </div>

      {/* Content */}
      <div className="content-container">
        {/* Company Description */}
        <div className="feature-card primary animate-fade-in" style={{ marginBottom: "2rem" }}>
          <div className="feature-card-header">
            <div className="feature-card-icon">
              <Heart size={24} />
            </div>
            <div id="mision"></div>
            <h2 className="feature-card-title" style={{ fontSize: "1.5rem" }}>
              ¿Quiénes Somos?
            </h2>
          </div>
          <p className="feature-card-description" style={{ fontSize: "1.1rem", lineHeight: "1.7" }}>
            Joshper Solutions es una empresa comprometida con ofrecer soluciones financieras accesibles, confiables y
            adaptadas a las necesidades de los empleados y empresas en la región. Nos especializamos en préstamos
            personales con tasas competitivas y procesos transparentes.
          </p>
        </div>

        {/* Mission, Vision, Values */}
        <div className="card-grid">
          <div className="feature-card white">
            <div className="feature-card-header">
              <div className="feature-card-icon">
                <Target size={24} />
              </div>
              <div id="servicios"></div>
              <h3 className="feature-card-title">Misión</h3>
            </div>
            <p className="feature-card-description">
              Facilitar el acceso a soluciones financieras justas y transparentes, ayudando a empleados y empresas a
              alcanzar sus metas económicas con confianza y seguridad.
            </p>
          </div>

          <div className="feature-card white">
            <div className="feature-card-header">
              <div className="feature-card-icon">
                <Eye size={24} />
              </div>
              <h3 className="feature-card-title">Visión</h3>
            </div>
            <p className="feature-card-description">
              Ser la financiera líder en la región, reconocida por nuestra innovación, transparencia y compromiso con el
              bienestar financiero de nuestros clientes.
            </p>
          </div>

          <div className="feature-card white">
            <div className="feature-card-header">
              <div className="feature-card-icon">
                <Heart size={24} />
              </div>
              <h3 className="feature-card-title">Valores</h3>
            </div>
            <div className="feature-card-description">
              <div className="flex items-center mb-2">
                <Shield size={16} className="mr-2 text-blue-600" />
                <span>Transparencia total</span>
              </div>
              <div className="flex items-center mb-2">
                <Users size={16} className="mr-2 text-blue-600" />
                <span>Compromiso con el cliente</span>
              </div>
              <div className="flex items-center">
                <TrendingUp size={16} className="mr-2 text-blue-600" />
                <span>Crecimiento sostenible</span>
              </div>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div style={{ marginTop: "3rem" }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Nuestros Servicios</h2>

          <div className="card-grid">
            <div className="feature-card secondary">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <TrendingUp size={24} />
                </div>
                <h3 className="feature-card-title">Préstamos Personales</h3>
              </div>
              <div className="feature-card-description">
                <div className="flex items-center mb-2">
                  <CheckCircle size={16} className="mr-2" />
                  <span>Tasa fija del 6% mensual</span>
                </div>
                <div className="flex items-center mb-2">
                  <CheckCircle size={16} className="mr-2" />
                  <span>Proceso de aprobación rápido</span>
                </div>
                <div className="flex items-center mb-2">
                  <CheckCircle size={16} className="mr-2" />
                  <span>Flexibilidad en plazos</span>
                </div>
                <div className="flex items-center"></div>
              </div>
            </div>

            <div className="feature-card white">
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Shield size={24} />
                </div>
                <h3 className="feature-card-title">Garantías y Seguridad</h3>
              </div>
              <div className="feature-card-description">
                <div className="flex items-center mb-2">
                  <CheckCircle size={16} className="mr-2 text-blue-600" />
                  <span>Datos protegidos</span>
                </div>
                <div className="flex items-center mb-2">
                  <CheckCircle size={16} className="mr-2 text-blue-600" />
                  <span>Procesos transparentes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div id="estadisticas"></div>
        <div style={{ marginTop: "3rem" }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">¿Por qué elegir Joshper Solutions?</h2>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-value">Transparencia</p>
                  <p className="stat-label">Total y Real</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="stat-card">
              <div>
                <p className="stat-value">100% Online</p>
                <p className="stat-label">Desde Cualquier Lugar</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-value">Progreso</p>
                  <p className="stat-label">En Crecimiento</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-value">98%</p>
                  <p className="stat-label">Satisfacción Cliente</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ marginTop: "3rem" }}>
          <div className="feature-card primary" style={{ textAlign: "center" }}>
            <div className="feature-card-header" style={{ justifyContent: "center" }}>
              <div className="feature-card-icon">
                <Heart size={24} />
              </div>
              <h3 className="feature-card-title" style={{ fontSize: "1.5rem" }}>
                ¿Listo para comenzar tu experiencia financiera?
              </h3>
            </div>
            <p className="feature-card-description" style={{ fontSize: "1.1rem", marginBottom: "2rem" }}>
              Únete a más de 1,000 clientes que han confiado en nosotros para sus necesidades financieras. Experimenta
              la diferencia de trabajar con una financiera que realmente se preocupa por ti.
            </p>
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
          </div>
        </div>
      </div>
    </div>
  )
}
