"use client"

import React, { useEffect, useState } from 'react'
import ProjectPrompt from '@/components/ui/project-prompt'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function AdminHistory() {
  const [logs, setLogs] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  // tick forces periodic re-render so revoke buttons disappear after the time window
  const [tick, setTick] = useState(0)

  useEffect(() => {
    fetchMe()
    fetchLogs()
  }, [page, pageSize])

  // periodic tick to re-evaluate canRevoke without requiring manual reload
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30 * 1000) // every 30s
    return () => clearInterval(id)
  }, [])

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/me')
      if (res.ok) setMe(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/audit-log?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (res.ok) {
        // Handle both new paginated response and old array response for backwards compatibility
        if (data.data && data.pagination) {
          setLogs(Array.isArray(data.data) ? data.data : [])
          setPagination(data.pagination)
        } else if (Array.isArray(data)) {
          setLogs(data)
          setPagination(null)
        } else {
          setLogs([])
          setPagination(null)
        }
      } else {
        // API returned error object
        const message = data?.error || 'Error fetching audit log'
        setError(message)
        setLogs([])
        setPagination(null)
      }
    } catch (e) {
      console.error(e)
      setError('Error de red al cargar historial')
    } finally { setLoading(false) }
  }

  const handleRevoke = async (id: number) => {
    // Open the project prompt modal instead of native dialogs
    setRevokeTarget(id)
    setShowRevokePrompt(true)
  }

  // modal state
  const [showRevokePrompt, setShowRevokePrompt] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<number | null>(null)
  const { toast } = useToast()

  const onConfirmRevoke = async (note: string) => {
    if (!revokeTarget) return
    if (!note || String(note).trim().length === 0) {
      toast({ title: 'Se requiere nota', description: 'Debes proveer una razón para la revocación', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch(`/api/admin/audit-log/${revokeTarget}/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) })
      if (res.ok) {
        await fetchLogs()
        toast({ title: 'Acción revocada', description: 'La acción fue revocada y registrada', variant: 'default' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: err.error || 'No se pudo revocar', variant: 'destructive' })
      }
    } catch (e) {
      console.error(e)
      toast({ title: 'Error de red', description: 'Por favor inténtalo más tarde', variant: 'destructive' })
    } finally {
      setShowRevokePrompt(false)
      setRevokeTarget(null)
    }
  }

  const getRemainingMs = (entry: any) => {
    if (!entry?.created_at) return 0
    const created = new Date(entry.created_at).getTime()
    const elapsed = Date.now() - created
    const windowMs = 15 * 60 * 1000
    return Math.max(0, windowMs - elapsed)
  }

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return '00:00'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const canRevoke = (entry: any) => {
    if (!me) return false
    // Use actor_id returned by the API (or fallback to user_id)
    const actorId = entry.actor_id ?? entry.user_id
    if (!actorId) return false
    if (actorId !== me.id) return false
    const created = new Date(entry.created_at)
    const diff = (Date.now() - created.getTime()) / 1000 / 60
    return diff <= 15
  }

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination && page < pagination.totalPages) {
      setPage(page + 1)
    }
  }

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(parseInt(e.target.value, 10))
    setPage(1)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-slate-800">Historial de Administradores</h1>
      <p className="text-sm text-slate-600 mb-6">Registro de acciones administrativas: aprobaciones, pagos manuales, asociaciones y cambios de usuario.</p>
      
      {/* Pagination Info and Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          {pagination ? (
            <>
              Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, pagination.total)} de {pagination.total} registros
            </>
          ) : (
            'Cargando información de paginación...'
          )}
        </div>
        
        <div className="flex gap-2">
          <select 
            value={pageSize} 
            onChange={handlePageSizeChange}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="5">5 por página</option>
            <option value="10">10 por página</option>
            <option value="25">25 por página</option>
            <option value="50">50 por página</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center">Cargando...</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-slate-100">
          {error && (
            <div className="p-4 bg-yellow-50 text-yellow-800 mb-4 rounded">{error}</div>
          )}
          <table className="w-full table-auto">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Fecha</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Acción</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Tabla</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Registro</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Administrador</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Detalles</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !error && (
                <tr><td colSpan={7} className="py-6 text-center text-gray-500">No hay acciones registradas.</td></tr>
              )}
              {logs.map((l: any) => (
                <tr key={l.id} className="border-t hover:bg-slate-50">
                  <td className="py-3 px-4 align-top text-sm text-slate-600">{l.created_at ? new Date(l.created_at).toLocaleString() : '-'}</td>
                  <td className="py-3 px-4 align-top text-sm"> <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">{l.action}</span> </td>
                  <td className="py-3 px-4 align-top text-sm text-slate-700">{l.table_name}</td>
                  <td className="py-3 px-4 align-top text-sm text-slate-600">{l.record_id}</td>
                  <td className="py-3 px-4 align-top text-sm text-slate-700">{l.actor_display || l.admin_name || ''}</td>
                  <td className="py-3 px-4 align-top">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-3 rounded border border-slate-100 text-slate-700 max-h-40 overflow-auto">{JSON.stringify(l.new_values || l.old_values || {}, null, 2)}</pre>
                      </div>
                      {canRevoke(l) ? (
                        <div className="flex-shrink-0 text-right">
                          <div className="mb-2">
                            <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleRevoke(l.id)}>Revocar</Button>
                          </div>
                          <div className="text-xs text-slate-500">Tiempo restante: {formatRemaining(getRemainingMs(l))}</div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-top text-sm">
                    <span className="text-sm text-gray-500">--</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-between items-center gap-2 p-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button onClick={handlePreviousPage} disabled={page === 1} variant="outline" size="sm">← Anterior</Button>
                <div className="px-3 text-sm">Página {page} de {pagination.totalPages}</div>
                <Button onClick={handleNextPage} disabled={page >= pagination.totalPages} variant="outline" size="sm">Siguiente →</Button>
              </div>
              <div className="text-sm text-slate-600">Total: {pagination.total} registros</div>
            </div>
          )}
        </div>
      )}
      {/* Revoke prompt modal */}
      <ProjectPrompt
        open={showRevokePrompt}
        onOpenChange={(o: boolean) => {
          setShowRevokePrompt(o)
          if (!o) setRevokeTarget(null)
        }}
        title="Revocar acción"
        description="Proporciona una nota que explique por qué reviertes esta acción (requerido)."
        placeholder="Motivo de la revocación"
        confirmLabel="Revocar"
        cancelLabel="Cancelar"
        onConfirm={onConfirmRevoke}
      />
    </div>
  )
}
