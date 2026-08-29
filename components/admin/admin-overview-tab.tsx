"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, FileText, Building, TrendingUp } from "lucide-react"

interface AdminOverviewTabProps {
  statistics: any
  onNavigateTab: (tab: string) => void
}

export function AdminOverviewTab({ statistics, onNavigateTab }: AdminOverviewTabProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount || 0)
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigateTab("loans")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Préstamos Solicitados</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalLoanApplications || 0}</div>
            <p className="text-xs text-muted-foreground">Solicitudes procesadas en total</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigateTab("payments")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total Prestado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics?.totalDisbursedAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Capital en circulación</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigateTab("users")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Registrados</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Clientes en la plataforma</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigateTab("companies")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Registradas</CardTitle>
            <Building className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalCompanies || 0}</div>
            <p className="text-xs text-muted-foreground">Empresas afiliadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de actividad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" /> Resumen de Cobros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-slate-600">Cobros acumulados</span>
              <span className="font-semibold text-slate-900">{formatCurrency(statistics?.totalCollected || 0)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-slate-600">Pagos pendientes por revisar</span>
              <span className="font-semibold text-amber-600">{statistics?.pendingPaymentsCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Préstamos activos</span>
              <span className="font-semibold text-emerald-600">{statistics?.activeLoansCount || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> Solicitudes Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-slate-600">Solicitudes pendientes</span>
              <span className="font-semibold text-blue-600">{statistics?.pendingLoansCount || 0}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-slate-600">Solicitudes aprobadas</span>
              <span className="font-semibold text-green-600">{statistics?.approvedLoansCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Solicitudes rechazadas</span>
              <span className="font-semibold text-rose-600">{statistics?.rejectedLoansCount || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminOverviewTab
