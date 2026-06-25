// Filepath: app/user/invoices/page.tsx
"use client"

import { useState, useEffect } from "react"
import { FileText, Download, Eye, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import ProfessionalInvoice from "@/components/professional-invoice"

interface Invoice {
id: string
invoice_number: string
user_name: string
user_lastname: string
payment_amount: number
payment_type: string
payment_date: string
loan_id: number
company_name?: string
created_at: string
}

export default function UserInvoicesPage() {
const [invoices, setInvoices] = useState<Invoice[]>([])
const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
const [isLoading, setIsLoading] = useState(true)
const router = useRouter()

useEffect(() => {
    fetchInvoices()
}, [])

const fetchInvoices = async () => {
    try {
    setIsLoading(true)
    const response = await fetch('/api/user/invoices')
    if (response.ok) {
        const data = await response.json()
        setInvoices(Array.isArray(data.invoices) ? data.invoices : [])
    }
    } catch (error) {
    console.error('Error fetching invoices:', error)
    } finally {
    setIsLoading(false)
    }
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    }).format(amount)
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-DO')
}

if (isLoading) {
    return (
    <div className="container mx-auto p-6">
        <div className="text-center py-12">
        <p className="text-gray-600">Cargando facturas...</p>
        </div>
    </div>
    )
}

return (
    <div className="container mx-auto p-6">
    <div className="flex items-center mb-6">
        <Button 
        variant="outline" 
        onClick={() => router.back()}
        className="mr-4"
        >
        <ArrowLeft size={16} className="mr-2" />
        Volver
        </Button>
        <h1 className="text-2xl font-bold">Mis Facturas</h1>
    </div>

    {invoices.length === 0 ? (
        <div className="text-center py-12">
        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">No tienes facturas aún</p>
        <p className="text-sm text-gray-500 mt-2">
            Las facturas se generan automáticamente cuando tus pagos son aprobados
        </p>
        </div>
    ) : (
        <div className="grid gap-4">
        {invoices.map((invoice) => (
            <div key={invoice.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
                <div className="flex-1">
                <h3 className="font-semibold text-lg">Factura #{invoice.invoice_number}</h3>
                <p className="text-sm text-gray-600">{formatDate(invoice.payment_date)}</p>
                <p className="text-lg font-bold text-green-600">
                    {formatCurrency(invoice.payment_amount)}
                </p>
                <p className="text-sm text-gray-600">
                    {invoice.payment_type === "installment" ? "Pago de cuota" : "Abono extra"} • 
                    Préstamo #{invoice.loan_id}
                </p>
                {invoice.company_name && (
                    <p className="text-sm text-gray-600">Empresa: {invoice.company_name}</p>
                )}
                </div>
                <Button
                onClick={() => {
                    setSelectedInvoice(invoice)
                    setIsInvoiceOpen(true)
                }}
                className="ml-4"
                >
                <Eye size={16} className="mr-2" />
                Ver Factura
                </Button>
            </div>
            </div>
        ))}
        </div>
    )}

    <ProfessionalInvoice
        invoiceData={selectedInvoice}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
    />
    </div>
)
}