"use client"

import React, { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Clock, CreditCard, CheckCircle, Check, X, Download, ChevronLeft, ChevronRight, Search } from "lucide-react"

interface AdminPaymentsTabProps {
  pendingPayments: any[]
  activeLoans: any[]
  formatCurrency: (amount: number) => string
  formatDate: (dateString: string) => string
  getStatusBadge: (status: string) => string
  onOpenAddPayment: () => void
  onConfirmPayment: (payment: any) => void
  onRejectPayment: (payment: any) => void
  onSelectLoanForPayment: (loan: any) => void
  onViewUserDetails: (userId: number) => void
}

export function AdminPaymentsTab({
  pendingPayments = [],
  activeLoans = [],
  formatCurrency,
  formatDate,
  getStatusBadge,
  onOpenAddPayment,
  onConfirmPayment,
  onRejectPayment,
  onSelectLoanForPayment,
  onViewUserDetails,
}: AdminPaymentsTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingPage, setPendingPage] = useState(1)
  const [activePage, setActivePage] = useState(1)
  const itemsPerPage = 10

  const filteredPending = useMemo(() => {
    if (!searchTerm) return pendingPayments
    const term = searchTerm.toLowerCase()
    return pendingPayments.filter(
      (p: any) =>
        `${p.user_name || ""} ${p.user_lastname || ""}`.toLowerCase().includes(term) ||
        (p.user_email || "").toLowerCase().includes(term) ||
        (p.receipt_number || "").toLowerCase().includes(term) ||
        (p.notes || "").toLowerCase().includes(term)
    )
  }, [pendingPayments, searchTerm])

  const filteredActive = useMemo(() => {
    if (!searchTerm) return activeLoans
    const term = searchTerm.toLowerCase()
    return activeLoans.filter(
      (l: any) =>
        `${l.user_name || ""} ${l.user_lastname || ""}`.toLowerCase().includes(term) ||
        (l.user_email || "").toLowerCase().includes(term)
    )
  }, [activeLoans, searchTerm])

  const totalPendingPages = Math.ceil(filteredPending.length / itemsPerPage) || 1
  const paginatedPending = useMemo(() => {
    const start = (pendingPage - 1) * itemsPerPage
    return filteredPending.slice(start, start + itemsPerPage)
  }, [filteredPending, pendingPage, itemsPerPage])

  const totalActivePages = Math.ceil(filteredActive.length / itemsPerPage) || 1
  const paginatedActive = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage
    return filteredActive.slice(start, start + itemsPerPage)
  }, [filteredActive, activePage, itemsPerPage])

  const handleExportCsv = () => {
    window.open("/api/admin/reports/export?type=payments", "_blank")
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Préstamos y Pagos</h2>
          <p className="text-sm text-gray-500">Supervisión de amortizaciones, cuotas y desembolsos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
            title="Exportar reporte de pagos a CSV"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <Button
            onClick={onOpenAddPayment}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all text-sm"
          >
            <Plus size={16} />
            Agregar Pago Manual
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre de cliente, email o referencia..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setPendingPage(1)
            setActivePage(1)
          }}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock size={16} />
            Pagos Pendientes ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CreditCard size={16} />
            Préstamos Activos ({activeLoans.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {filteredPending.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center shadow-sm">
              <CheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay pagos pendientes</h3>
              <p className="text-gray-600">Los pagos pendientes de confirmación aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Recibo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notas</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedPending.map((payment: any) => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {payment.user_name} {payment.user_lastname}
                            </div>
                            <div className="text-xs text-gray-500">{payment.user_email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatCurrency(payment.amount ?? payment.payment_amount ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                              payment.payment_type === "installment"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {payment.payment_type === "installment" ? "Cuota" : "Abono Extra"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formatDate(payment.payment_date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 font-mono">{payment.receipt_number || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={payment.notes}>
                          {payment.notes || "Sin notas"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1.5">
                            <button
                              className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded hover:shadow transition-all"
                              onClick={() => onConfirmPayment(payment)}
                              title="Confirmar pago"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded hover:shadow transition-all"
                              onClick={() => onRejectPayment(payment)}
                              title="Rechazar pago"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPendingPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border">
                  <span className="text-xs text-gray-500">
                    Página {pendingPage} de {totalPendingPages} ({filteredPending.length} pagos)
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                      disabled={pendingPage === 1}
                      className="p-1.5 border rounded text-xs disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPendingPage((p) => Math.min(totalPendingPages, p + 1))}
                      disabled={pendingPage === totalPendingPages}
                      className="p-1.5 border rounded text-xs disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {filteredActive.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center shadow-sm">
              <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay préstamos activos</h3>
              <p className="text-gray-600">Los préstamos aparecerán aquí cuando sean aprobados</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monto Original</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monto Restante</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cuota</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cuotas Restantes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Próximo Pago</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedActive.map((loan: any) => (
                      <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {loan.user_name} {loan.user_lastname}
                            </div>
                            <div className="text-xs text-gray-500">{loan.user_email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">{formatCurrency(loan.original_amount)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(loan.remaining_amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{formatCurrency(loan.installment_amount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {loan.remaining_installments} / {loan.total_installments}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formatDate(loan.next_payment_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(loan.status)}`}>
                            {loan.status === "active"
                              ? "Activo"
                              : loan.status === "completed"
                              ? "Completado"
                              : loan.status === "overdue"
                              ? "Vencido"
                              : loan.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1.5">
                            {(loan.user_id || loan.userId) && (
                              <button
                                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                                onClick={() => onViewUserDetails(Number(loan.user_id || loan.userId))}
                              >
                                Perfil
                              </button>
                            )}
                            <button
                              className="p-1 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                              onClick={() => onSelectLoanForPayment(loan)}
                              title="Registrar pago"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalActivePages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border">
                  <span className="text-xs text-gray-500">
                    Página {activePage} de {totalActivePages} ({filteredActive.length} préstamos)
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                      disabled={activePage === 1}
                      className="p-1.5 border rounded text-xs disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setActivePage((p) => Math.min(totalActivePages, p + 1))}
                      disabled={activePage === totalActivePages}
                      className="p-1.5 border rounded text-xs disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminPaymentsTab
