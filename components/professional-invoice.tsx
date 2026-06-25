"use client"

import { useState } from "react"
import { Download, Share2, Printer, QrCode, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface InvoiceData {
  id: string
  invoice_number: string
  user_name: string
  user_lastname: string
  user_email: string
  user_phone?: string
  user_address?: string
  payment_amount: number
  payment_type: string
  payment_date: string
  loan_id: number
  company_name?: string
  admin_notes?: string
  created_at: string
}

interface ProfessionalInvoiceProps {
  invoiceData?: InvoiceData | null
  isOpen: boolean
  onClose: () => void
}

export default function ProfessionalInvoice({ invoiceData, isOpen, onClose }: ProfessionalInvoiceProps) {
  const { toast } = useToast()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showThermalPreview, setShowThermalPreview] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount || 0)
  }

  const generatePDF = async () => {
    if (!invoiceData) return
    setIsGeneratingPDF(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceData.id}/pdf`, { method: "GET" })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `Factura-${invoiceData.invoice_number}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error("Error al generar el PDF:", response.statusText)
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const shareInvoice = async () => {
    if (!invoiceData) return
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Factura ${invoiceData.invoice_number}`,
          text: `Factura de pago por ${formatCurrency(invoiceData.payment_amount)}`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      toast({ title: 'Enlace copiado', description: 'Enlace copiado al portapapeles' })
    }
  }

  const buildPrintableHtml = (data: InvoiceData) => {
    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Factura ${data.invoice_number}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 20px; color: #222; background: white }
          .container { max-width: 800px; margin: 0 auto }
          .header { text-align: center; margin-bottom: 20px }
          .company { font-size: 20px; font-weight: 700; color: #2563eb }
          .meta { display:flex; justify-content:space-between; margin-bottom: 10px }
          .card { border: 1px solid #e6e6e6; padding: 12px; border-radius: 6px; margin-bottom: 12px }
          .details { display:flex; justify-content:space-between }
          .total { text-align: right; font-size: 18px; font-weight: 700; color: #0f5132 }
          @media print { body { -webkit-print-color-adjust: exact } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="text-align:center;">
            <div><img src="/logo_joshper.png" alt="logo" style="height:64px;object-fit:contain;margin-bottom:8px"/></div>
            <div class="company">Joshper Solutions</div>
            <div>Soluciones Financieras Integrales</div>
            <div>Tel: (809) 555-0123 · RNC: 123-45678-9</div>
          </div>

          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:700">Factura</div>
                <div>#${data.invoice_number}</div>
              </div>
              <div style="text-align:right">
                <div>Fecha</div>
                <div style="font-weight:700">${new Date(data.payment_date).toLocaleDateString('es-DO')}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div style="margin-bottom:8px;font-weight:700">Cliente</div>
            <div>${data.user_name} ${data.user_lastname}</div>
            <div style="color:#666">${data.user_email}${data.user_phone ? ' · ' + data.user_phone : ''}</div>
          </div>

          <div class="card">
            <div style="margin-bottom:8px;font-weight:700">Detalles del Pago</div>
            <div class="details"><div>Concepto</div><div>${data.payment_type === 'installment' ? 'Pago de Cuota' : 'Abono'}</div></div>
            <div class="details"><div>Préstamo</div><div>#${data.loan_id}</div></div>
            ${data.company_name ? `<div class="details"><div>Empresa</div><div>${data.company_name}</div></div>` : ''}
            <div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px" class="total">Total Pagado: ${formatCurrency(data.payment_amount)}</div>
          </div>

          ${data.admin_notes ? `<div style="font-size:13px;color:#444;margin-top:8px">Notas: ${data.admin_notes}</div>` : ''}

          <div style="margin-top:24px;font-size:12px;color:#666;text-align:center">Documento no válido como comprobante fiscal · Gracias por su pago puntual</div>
        </div>
      </body>
    </html>`

    return html
  }

  const printInvoice = () => {
    if (!invoiceData) return
    const html = buildPrintableHtml(invoiceData)
    const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,scrollbars=0,width=800,height=600')
    if (!w) {
      // fallback to default print
      window.print()
      return
    }
    try {
      // Open a clean document and write HTML
      w.document.open()
      w.document.write(html)
      w.document.close()
      // avoid keeping a reference back to this window
      try {
        // @ts-ignore
        w.opener = null
      } catch (e) {}

      const doPrint = () => {
        try {
          w.focus()
          w.print()
        } catch (e) {
          console.error('Print error', e)
        }
        try {
          w.close()
        } catch (e) {
          // ignore
        }
      }

      // Prefer onload, but fall back to timeout in case it doesn't fire
      let printed = false
      const onLoadHandler = () => {
        if (printed) return
        printed = true  
        doPrint()
      }

      // Some browsers fire load on window; try both
      try {
        w.addEventListener('load', onLoadHandler)
      } catch (e) {
        // ignore
      }

      // Fallback
      setTimeout(() => {
        if (!printed) {
          printed = true
          doPrint()
        }
      }, 800)
    } catch (err) {
      console.error('Error preparing print window', err)
      // last resort
      window.print()
    }
  }

  const printThermal = () => {
    if (!invoiceData) return
    // Open a dedicated print window for thermal receipts to avoid printing the entire app UI behind the modal
    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Recibo Térmico ${invoiceData.invoice_number}</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 8px; }
          .thermal { width: 80mm; max-width: 320px; margin: 0 auto; }
          .center { text-align: center }
          .bold { font-weight: 700 }
          .line { border-top: 1px dashed #000; margin: 6px 0 }
        </style>
      </head>
      <body>
        <div class="thermal">
          <div class="center bold">JOSHPER SOLUTIONS</div>
          <div class="center">Joshper Solutions</div>
          <div class="center">Tel: (809) 555-0123</div>
          <div class="center">RNC: 123-45678-9</div>
          <div class="line"></div>
          <div class="center bold">FACTURA</div>
          <div class="center">#${invoiceData.invoice_number}</div>
          <div class="center">${new Date(invoiceData.payment_date).toLocaleDateString('es-DO')}</div>
          <div class="line"></div>
          <div>Cliente: ${invoiceData.user_name} ${invoiceData.user_lastname}</div>
          <div>${invoiceData.user_email || ''}</div>
          <div class="line"></div>
          <div style="display:flex;justify-content:space-between"><div>Concepto</div><div>${invoiceData.payment_type === 'installment' ? 'Cuota' : 'Abono'}</div></div>
          <div style="display:flex;justify-content:space-between"><div>Préstamo</div><div>#${invoiceData.loan_id}</div></div>
          <div class="line"></div>
          <div style="display:flex;justify-content:space-between;font-weight:700"><div>TOTAL</div><div>${formatCurrency(invoiceData.payment_amount)}</div></div>
          <div class="line"></div>
          <div class="center">Documento no válido como comprobante fiscal</div>
        </div>
        <script>
          window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 200); }
        </script>
      </body>
    </html>`

    const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,scrollbars=0,width=320,height=600')
    if (!w) {
      // If popup blocked, fallback to showing preview in modal
      setShowThermalPreview(true)
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
    try { w.focus() } catch(e) {}
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Factura Profesional</DialogTitle>
          </DialogHeader>

          {!invoiceData ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
              <AlertTriangle className="w-12 h-12 mb-4 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-800">No hay datos de factura</h3>
              <p className="mt-1">No se pudo cargar la información de la factura.</p>
            </div>
          ) : (
            <>
              <div
                className="invoice-container"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "20px",
                  padding: "2rem",
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div className="text-center mb-6">
                  <div className="bg-white/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold">JS</span>
                  </div>
                  <h1 className="text-2xl font-bold mb-1">Joshper Solutions</h1>
                  <p className="text-white/80 text-sm">Soluciones Financieras Integrales</p>
                  <p className="text-white/70 text-xs">Tel: (809) 555-0123</p>
                  <p className="text-white/70 text-xs">RNC: 123-45678-9</p>
                </div>

                <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">Factura</h2>
                      <p className="text-white/80 text-sm">#{invoiceData.invoice_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 text-sm">Fecha</p>
                      <p className="font-semibold">{new Date(invoiceData.payment_date).toLocaleDateString("es-DO")}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/20 pt-4">
                    <h3 className="font-semibold mb-2">Cliente</h3>
                    <p className="text-white/90">
                      {invoiceData.user_name} {invoiceData.user_lastname}
                    </p>
                    <p className="text-white/80 text-sm">{invoiceData.user_email}</p>
                    {invoiceData.user_phone && <p className="text-white/80 text-sm">{invoiceData.user_phone}</p>}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 text-gray-900 mb-6">
                  <h3 className="font-semibold mb-3 text-gray-800">Detalles del Pago</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Concepto:</span>
                      <span className="font-medium">
                        {invoiceData.payment_type === "installment" ? "Pago de Cuota" : "Abono Extra"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Préstamo:</span>
                      <span className="font-medium">#{invoiceData.loan_id}</span>
                    </div>
                    {invoiceData.company_name && (
                      <div className="flex justify-between">  
                        <span className="text-gray-600">Empresa:</span>
                        <span className="font-medium">{invoiceData.company_name}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-800">Total Pagado:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(invoiceData.payment_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {invoiceData.admin_notes && (
                  <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
                    <h3 className="font-semibold mb-2">Notas</h3>
                    <p className="text-white/90 text-sm">{invoiceData.admin_notes}</p>
                  </div>
                )}

                <div className="text-center text-white/70 text-xs">
                  <p>Documento no válido como comprobante fiscal</p>
                  <p className="mt-2">Gracias por su pago puntual</p>
                </div>

                <div className="absolute bottom-4 right-4 bg-white/20 rounded p-2">
                  <QrCode className="w-8 h-8" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGeneratingPDF ? "Generando..." : "Descargar PDF"}
                </Button>
                <Button onClick={shareInvoice} variant="outline" className="flex-1 bg-transparent">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
                <Button onClick={printInvoice} variant="outline" className="flex-1 bg-transparent">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button onClick={printThermal} variant="outline" className="flex-1 bg-gray-100">
                  <Printer className="w-4 h-4 mr-2" />
                  Térmica
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {invoiceData && (
        <Dialog open={showThermalPreview} onOpenChange={setShowThermalPreview}>
          <DialogContent className="max-w-sm bg-white">
            <DialogHeader>
              <DialogTitle className="text-center text-sm font-bold">Vista Previa Térmica</DialogTitle>
            </DialogHeader>

            <div className="thermal-receipt bg-white p-4 font-mono text-xs border-2 border-dashed border-gray-300">
              <div className="text-center mb-4">
                <div className="font-bold text-lg">JS</div>
                <div className="text-xs">Joshper Solutions</div>
                <div className="text-xs">Tel: (809) 555-0123</div>
                <div className="text-xs">RNC: 123-45678-9</div>
                <div className="border-b border-gray-400 my-2"></div>
              </div>

              <div className="mb-4">
                <div className="text-center font-bold">FACTURA</div>
                <div className="text-center">#{invoiceData.invoice_number}</div>
                <div className="text-center text-xs">
                  {new Date(invoiceData.payment_date).toLocaleDateString("es-DO")}
                </div>
              </div>

              <div className="mb-4">
                <div className="font-bold">Cliente:</div>
                <div>
                  {invoiceData.user_name} {invoiceData.user_lastname}
                </div>
                <div className="text-xs">{invoiceData.user_email}</div>
              </div>

              <div className="border-b border-gray-400 my-2"></div>

              <div className="mb-4">
                <div className="flex justify-between">
                  <span>Concepto:</span>
                  <span>{invoiceData.payment_type === "installment" ? "Cuota" : "Abono"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Préstamo:</span>
                  <span>#{invoiceData.loan_id}</span>
                </div>
                <div className="border-b border-gray-400 my-2"></div>
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(invoiceData.payment_amount)}</span>
                </div>
              </div>

              <div className="text-center text-xs mb-4">
                <div>Documento no válido como</div>
                <div>comprobante fiscal</div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 border border-gray-400 mx-auto flex items-center justify-center">
                  <QrCode className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => window.print()} className="flex-1 bg-gray-800 hover:bg-gray-900 text-white">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Térmica
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}