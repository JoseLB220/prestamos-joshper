"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import ProjectPrompt from '@/components/ui/project-prompt'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Payment {
  id: number
  amount: number
  payment_type: string
  status: string
  payment_date: string
  user_name: string
  user_lastname: string
  user_email: string
  empresa: string
  loan_amount: number
  receipt_url?: string
}

export function paymentmanagement() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  const fetchPendingPayments = async () => {
    try {
      setError(null)
      const response = await fetch('/api/admin/pending-payments')
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Asegúrate de que data.payments existe y es un array
      const paymentsData = Array.isArray(data) ? data : 
                          Array.isArray(data?.payments) ? data.payments : 
                          Array.isArray(data?.data) ? data.data : []
      
      setPayments(paymentsData)
      
    } catch (error: any) {
      console.error('Error fetching payments:', error)
      setError(error.message || 'Error al cargar los pagos')
      
      // Datos de ejemplo para debugging
      setPayments([
        {
          id: 1,
          amount: 5000,
          payment_type: "installment",
          status: "pending",
          payment_date: new Date().toISOString(),
          user_name: "Ejemplo",
          user_lastname: "Usuario",
          user_email: "ejemplo@email.com",
          empresa: "Empresa Ejemplo",
          loan_amount: 50000
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (paymentId: number) => {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: 'PUT'
      })

      if (response.ok) {
  setPayments(payments.filter(p => p.id !== paymentId))
  toast({ title: 'Pago aprobado', description: 'Pago aprobado exitosamente', variant: 'default' })
      } else {
        throw new Error('Error al aprobar el pago')
      }
    } catch (error: any) {
      console.error('Error approving payment:', error)
      toast({ title: 'Error al aprobar el pago', description: error.message || 'Error desconocido', variant: 'destructive' })
    }
  }

  const handleReject = async (paymentId: number) => {
    // open project prompt modal
    setRejectTarget(paymentId)
    setShowRejectPrompt(true)
  }

  const [showRejectPrompt, setShowRejectPrompt] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [showRejectResult, setShowRejectResult] = useState(false)
  const [rejectResultData, setRejectResultData] = useState<any | null>(null)
  const { toast } = useToast()

  const confirmReject = async (reason: string) => {
    if (!rejectTarget) return
    if (!reason || reason.trim().length === 0) {
      toast({ title: 'Se requiere razón', description: 'Proporciona la razón del rechazo', variant: 'destructive' })
      return
    }
    try {
      const response = await fetch(`/api/admin/payments/${rejectTarget}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (response.ok) {
        const json = await response.json().catch(() => null)
        setPayments((prev) => prev.filter((p) => p.id !== rejectTarget))
        toast({ title: 'Pago rechazado', description: 'Pago rechazado exitosamente', variant: 'default' })
        // show a confirmation modal with details for admin
        setRejectResultData(json?.payment || json)
        setShowRejectResult(true)
      } else {
        const err = await response.json().catch(() => ({}))
        toast({ title: 'Error', description: err.error || 'Error al rechazar el pago', variant: 'destructive' })
      }
    } catch (e) {
      console.error('Error rejecting payment:', e)
      toast({ title: 'Error', description: 'Error al rechazar el pago', variant: 'destructive' })
    } finally {
      setShowRejectPrompt(false)
      setRejectTarget(null)
    }
  }

  // small result dialog after rejecting
  const RejectResultDialog = () => {
    if (!showRejectResult || !rejectResultData) return null
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowRejectResult(false)} />
        <div className="relative z-50 bg-white rounded-lg shadow-xl p-6 max-w-xl w-full">
          <h3 className="text-lg font-semibold mb-2">La solicitud de pago de cuota ha sido rechazada</h3>
          <div className="text-sm text-gray-700 mb-3">
            {rejectResultData && (
              <div className="space-y-1">
                <div><strong>ID:</strong> {rejectResultData.id}</div>
                <div><strong>Monto:</strong> RD${Number(rejectResultData.amount).toFixed(2)}</div>
                <div><strong>Usuario:</strong> {rejectResultData.user_name} {rejectResultData.user_lastname}</div>
                <div><strong>Motivo:</strong> {rejectResultData.rejection_note || 'Sin especificar'}</div>
              </div>
            )}
          </div>
          {rejectResultData?.receipt_url && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Comprobante adjunto:</p>
              <img src={rejectResultData.receipt_url} alt="Comprobante" className="max-h-48 w-auto rounded border" />
            </div>
          )}
          <div className="flex justify-end">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => setShowRejectResult(false)}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-4">Cargando pagos pendientes...</div>

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Pagos Pendientes</h2>
      
      {error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <strong>Advertencia:</strong> {error}
        </div>
      )}
      
      {payments.length === 0 ? (
        <p>No hay pagos pendientes</p>
      ) : (
        payments.map((payment) => (
          <Card key={payment.id} className="border border-gray-200">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex justify-between items-center text-lg">
                <span>Pago #{payment.id}</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Pendiente
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm"><strong>Usuario:</strong> {payment.user_name} {payment.user_lastname}</p>
                  <p className="text-sm"><strong>Email:</strong> {payment.user_email}</p>
                  <p className="text-sm"><strong>Empresa:</strong> {payment.empresa}</p>
                </div>
                <div>
                  <p className="text-sm"><strong>Monto del préstamo:</strong> RD${payment.loan_amount?.toLocaleString()}</p>
                  <p className="text-sm"><strong>Monto del pago:</strong> RD${payment.amount?.toLocaleString()}</p>
                  <p className="text-sm"><strong>Tipo:</strong> {payment.payment_type === 'installment' ? 'Cuota' : 'Abono'}</p>
                  <p className="text-sm"><strong>Fecha:</strong> {new Date(payment.payment_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              {payment.receipt_url && (
                <div className="mt-4">
                  <strong className="text-sm">Recibo:</strong>
                  <div className="mt-2">
                    <img
                      src={payment.receipt_url}
                      alt="Recibo de pago"
                      className="max-w-full h-auto max-h-64 border rounded shadow-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => handleApprove(payment.id)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Aprobar
                </Button>
                <Button 
                  onClick={() => handleReject(payment.id)}
                  variant="destructive"
                  size="sm"
                >
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      {/* Prompt modal for rejecting payments */}
      <ProjectPrompt
        open={showRejectPrompt}
        title="Rechazar pago"
        description="Ingresa la razón por la cual rechazas este pago."
        placeholder="Razón..."
        onOpenChange={(o) => !o && setShowRejectPrompt(false)}
        onConfirm={confirmReject}
        onCancel={() => setShowRejectPrompt(false)}
      />
      {showRejectResult && <RejectResultDialog />}
    </div>
  )
}