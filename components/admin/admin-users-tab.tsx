"use client"

import React, { useState, useMemo } from "react"
import { Eye, FileText, Key, UserCheck, Shield, Trash2, Download, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface AdminUsersTabProps {
  users: any[]
  currentUserId: number
  formatDate: (dateString: string) => string
  onViewUserDetails: (userId: number) => void
  onViewUserLoans: (userId: number) => void
  onResetPassword: (user: any) => void
  onToggleAdmin: (userId: number, currentStatus: boolean) => void
  onDeleteUser: (userId: number) => void
}

export function AdminUsersTab({
  users = [],
  currentUserId,
  formatDate,
  onViewUserDetails,
  onViewUserLoans,
  onResetPassword,
  onToggleAdmin,
  onDeleteUser,
}: AdminUsersTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    const term = searchTerm.toLowerCase()
    return users.filter(
      (u: any) =>
        `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term) ||
        (u.cedula_pasaporte || "").toLowerCase().includes(term) ||
        (u.numero_celular || "").toLowerCase().includes(term)
    )
  }, [users, searchTerm])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(start, start + itemsPerPage)
  }, [filteredUsers, currentPage, itemsPerPage])

  const handleExportCsv = () => {
    window.open("/api/admin/reports/export?type=users", "_blank")
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-sm text-gray-500">Total registrados: {users.length} usuarios</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          title="Exportar usuarios a CSV"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar usuario por nombre, email, documento o teléfono..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full min-w-[850px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Documento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Permisos</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Registro</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((userData: any) => (
                <tr key={userData.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {userData.nombre} {userData.apellido}
                      </div>
                      <div className="text-xs text-gray-500">{userData.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{userData.cedula_pasaporte || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{userData.numero_celular || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {userData.is_admin && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800">
                          Admin
                        </span>
                      )}
                      {userData.can_request_loans && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                          Préstamos
                        </span>
                      )}
                      {userData.can_associate_companies && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
                          Empresas
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDate(userData.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1.5">
                      <button
                        className="p-1.5 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                        onClick={() => onViewUserDetails(userData.id)}
                        title="Ver Detalles"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="p-1.5 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                        onClick={() => onViewUserLoans(userData.id)}
                        title="Ver Solicitudes"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        className="p-1.5 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                        onClick={() => onResetPassword(userData)}
                        title="Resetear Contraseña"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        className={`p-1.5 border border-transparent rounded text-white shadow-sm ${
                          userData.is_admin ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                        onClick={() => onToggleAdmin(userData.id, userData.is_admin)}
                        title={userData.is_admin ? "Quitar Admin" : "Hacer Admin"}
                      >
                        {userData.is_admin ? <UserCheck size={14} /> : <Shield size={14} />}
                      </button>
                      {userData.id !== currentUserId && (
                        <button
                          className="p-1.5 border border-transparent rounded text-white bg-red-600 hover:bg-red-700 shadow-sm"
                          onClick={() => onDeleteUser(userData.id)}
                          title="Eliminar Usuario"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border">
          <span className="text-xs text-gray-500">
            Página {currentPage} de {totalPages} ({filteredUsers.length} usuarios)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border rounded text-xs disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border rounded text-xs disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsersTab
