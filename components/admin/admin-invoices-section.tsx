"use client"

import React from "react"
import { Button } from "@/components/ui/button"

interface AdminInvoicesSectionProps {
  recentInvoices: any[]
  isAdmin: boolean
  formatCurrency: (amount: number) => string
  formatDate: (dateString: string) => string
  onFetchReceipts: () => void
  onOpenReceiptsModal: () => void
  onViewInvoice: (invoice: any) => void
}

export function AdminInvoicesSection({
  recentInvoices,
  isAdmin,
  formatCurrency,
  formatDate,
  onFetchReceipts,
  onOpenReceiptsModal,
  onViewInvoice,
}: AdminInvoicesSectionProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Facturas Recientes</h3>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                onFetchReceipts()
                onOpenReceiptsModal()
              }}
            >
              Recibos de Cobros Manuales
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="data-table">
          <table style={{ width: "100%", minWidth: "800px" }}>
            <thead>
              <tr>
                <th>Factura #</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((invoice: any) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number}</td>
                  <td>{`${invoice.user_name || ""} ${invoice.user_lastname || ""}`.trim()}</td>
                  <td>{formatCurrency(invoice.amount ?? invoice.payment_amount ?? 0)}</td>
                  <td>{formatDate(invoice.payment_date ?? invoice.date ?? invoice.created_at ?? invoice.createdAt)}</td>
                  <td>
                    <button
                      className="btn btn-outline"
                      style={{ padding: "0.5rem", fontSize: "0.75rem" }}
                      onClick={() => onViewInvoice(invoice)}
                    >
                      Ver Factura
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminInvoicesSection
