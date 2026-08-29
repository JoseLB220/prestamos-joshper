"use client"

import React, { useState, useMemo } from "react"
import { Eye, MessageSquare, Check, X, RotateCcw, Download, ChevronLeft, ChevronRight, Search } from "lucide-react"

interface AdminLoansTabProps {
  loanApplications: any[]
  formatCurrency: (amount: number) => string
  formatDate: (dateString: string) => string
  getStatusBadge: (status: string) => string
  onViewDetails: (id: number, type: string) => void
  onOpenComments: (loan: any) => void
  onUpdateStatus: (id: number, status: string) => void
}

export function AdminLoansTab({
  loanApplications = [],
  formatCurrency,
  formatDate,
  getStatusBadge,
  onViewDetails,
  onOpenComments,
  onUpdateStatus,
}: AdminLoansTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filtrado reactivo
  const filteredLoans = useMemo(() => {
    return loanApplications.filter((loan: any) => {
      const matchesStatus =
        statusFilter === "todos" || (loan.estado && loan.estado.toLowerCase() === statusFilter.toLowerCase())
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        `${loan.nombre || ""} ${loan.apellido || ""}`.toLowerCase().includes(searchLower) ||
        (loan.email || "").toLowerCase().includes(searchLower) ||
        (loan.documento || "").toLowerCase().includes(searchLower) ||
        (loan.empresa || "").toLowerCase().includes(searchLower)

      return matchesStatus && matchesSearch
    })
  }, [loanApplications, searchTerm, statusFilter])

  // Paginación
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage) || 1
  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredLoans.slice(start, start + itemsPerPage)
  }, [filteredLoans, currentPage, itemsPerPage])

  const handleExportCsv = () => {
    const url = `/api/admin/reports/export?type=loans${statusFilter !== "todos" ? `&status=${statusFilter}` : ""}`
    window.open(url, "_blank")
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Solicitudes de Préstamo</h2>
          <p className="text-sm text-gray-500">Total registradas: {loanApplications.length} solicitudes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
            title="Exportar a archivo CSV / Excel"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-lg border border-gray-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente, cédula, empresa, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los Estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
          </select>

          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 por pág.</option>
            <option value={25}>25 por pág.</option>
            <option value={50}>50 por pág.</option>
          </select>
        </div>
      </div>

      {/* Tabla de Préstamos */}
      <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedLoans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No se encontraron solicitudes con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedLoans.map((loan: any) => (
                <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">
                        {loan.nombre} {loan.apellido}
                      </div>
                      <div className="text-xs text-gray-500">{loan.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div className="text-gray-900 text-sm">{loan.documento}</div>
                      {loan.user_document && (
                        <div className="text-xs text-gray-500">Usuario: {loan.user_document}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{loan.empresa}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(loan.monto)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(loan.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(loan.estado)}`}
                    >
                      {loan.estado ? loan.estado.charAt(0).toUpperCase() + loan.estado.slice(1) : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1.5">
                      <button
                        className="inline-flex items-center p-1.5 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 hover:shadow transition-all"
                        onClick={() => onViewDetails(loan.id, "loan")}
                        title="Ver detalles"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="inline-flex items-center p-1.5 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 hover:shadow transition-all"
                        onClick={() => onOpenComments(loan)}
                        title="Comentarios / Historial"
                      >
                        <MessageSquare size={15} />
                      </button>
                      {loan.estado === "pendiente" && (
                        <>
                          <button
                            className="inline-flex items-center p-1.5 border border-transparent rounded text-white bg-green-600 hover:bg-green-700 hover:shadow transition-all"
                            onClick={() => onUpdateStatus(loan.id, "aprobado")}
                            title="Aprobar solicitud"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="inline-flex items-center p-1.5 border border-transparent rounded text-white bg-red-600 hover:bg-red-700 hover:shadow transition-all"
                            onClick={() => onUpdateStatus(loan.id, "rechazado")}
                            title="Rechazar solicitud"
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}
                      {loan.estado !== "pendiente" && (
                        <button
                          className="inline-flex items-center p-1.5 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 hover:shadow transition-all"
                          onClick={() => onUpdateStatus(loan.id, "pendiente")}
                          title="Restaurar a pendiente"
                        >
                          <RotateCcw size={15} />
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

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">
            Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, filteredLoans.length)}
            </span>{" "}
            de <span className="font-medium">{filteredLoans.length}</span> resultados
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm px-3 text-gray-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminLoansTab
