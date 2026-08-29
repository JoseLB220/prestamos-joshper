"use client"

import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building, Check, X } from "lucide-react"

interface AdminCompaniesTabProps {
  companies: any[]
  onApproveCompany: (id: number) => void
  onRejectCompany: (id: number) => void
}

export function AdminCompaniesTab({
  companies,
  onApproveCompany,
  onRejectCompany,
}: AdminCompaniesTabProps) {
  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-center pb-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Building className="h-5 w-5 text-orange-600" /> Registro de Empresas Afiliadas
        </h2>
        <Badge variant="outline">{companies.length} Registros</Badge>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No hay empresas registradas.</div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>RNC</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Cargo / Sueldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.nombre_empresa || c.company_name}</TableCell>
                  <TableCell>{c.rnc || "N/A"}</TableCell>
                  <TableCell>{c.user_email || c.user_name || `ID ${c.user_id}`}</TableCell>
                  <TableCell>
                    {c.cargo || c.position || "Empleado"}
                    {c.sueldo ? ` - DOP ${Number(c.sueldo).toLocaleString()}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.estado === "aprobado" || c.status === "approved"
                          ? "default"
                          : c.estado === "rechazado" || c.status === "rejected"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {c.estado || c.status || "pendiente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {(c.estado === "pendiente" || c.status === "pending") && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onApproveCompany(c.id)}
                        >
                          <Check className="w-4 h-4 mr-1" /> Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onRejectCompany(c.id)}
                        >
                          <X className="w-4 h-4 mr-1" /> Rechazar
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default AdminCompaniesTab
