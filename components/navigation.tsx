"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, User, LogOut, Settings, BarChart3, UserPlus, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface NavigationProps {
  user?: {
    id: number
    nombre: string
    apellido: string
    email: string
    is_admin: boolean
  }
}

export default function Navigation({ user }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <>
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 text-white hover:text-yellow-400 hover:bg-white/10"
        onClick={toggleMenu}
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {/* Slide Menu */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-16 pb-4">
          <div className="px-6 mb-8">
            <Image src="/logo_joshper.png" alt="Joshper Solutions" width={120} height={60} className="mx-auto" />
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <Link
              href="/"
              className="flex items-center px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Inicio
            </Link>

            {!user ? (
              <>
                <Link
                  href="/auth/register"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Registrar
                </Link>
                <Link
                  href="/auth/login"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Iniciar Sesión
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="mr-3" size={18} />
                  Mi Panel
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="mr-3" size={18} />
                  Mi Perfil
                </Link>
                {user.is_admin && (
                  <>
                    <Link
                      href="/admin"
                      className="flex items-center px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <BarChart3 className="mr-3" size={18} />
                      Administración
                    </Link>
                    <Link
                      href="/admin/history"
                      className="flex items-center px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <UserPlus className="mr-3" size={18} />
                      Historial
                    </Link>
                  </>
                )}
              </>
            )}

            <Link
              href="/about"
              className="flex items-center px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Nosotros
            </Link>

            {/* Theme toggle */}
            <button
              className="flex items-center w-full px-4 py-3 text-white hover:bg-blue-800 rounded-lg transition-colors duration-200"
              onClick={() => {
                const current = theme === 'system' ? (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
                setTheme(current === 'dark' ? 'light' : 'dark')
                setIsMenuOpen(false)
              }}
            >
              {theme === 'dark' ? <Sun className="mr-3" size={18} /> : <Moon className="mr-3" size={18} />}
              {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            </button>
          </nav>

          {user && (
            <div className="px-4 pt-4 border-t border-blue-800">
              <div className="px-4 py-2 text-sm text-blue-200">
                {user.nombre} {user.apellido}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-blue-800"
                onClick={handleLogout}
              >
                <LogOut className="mr-3" size={18} />
                Cerrar Sesión
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {isMenuOpen && <div className="fixed inset-0 z-30 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)} />}
    </>
  )
}
