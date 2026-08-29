"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"  
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ProfessionalInvoice from "./professional-invoice"
import AdminApplyPayment from "@/components/admin-apply-payment"
import ProjectPrompt from '@/components/ui/project-prompt'
import AdminOverviewTab from "@/components/admin/admin-overview-tab"
import AdminLoansTab from "@/components/admin/admin-loans-tab"
import AdminCompaniesTab from "@/components/admin/admin-companies-tab"
import AdminUsersTab from "@/components/admin/admin-users-tab"
import AdminPaymentsTab from "@/components/admin/admin-payments-tab"
import AdminInvoicesSection from "@/components/admin/admin-invoices-section"
import {
  BarChart3,
  FileText,
  Building,
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  MessageSquare,
  Check,
  X,
  RotateCcw,
  Key,
  Shield,
  UserCheck,
  Trash2,
  Search,
  Plus,
  Clock,
  CreditCard,
  CheckCircle,
  Bell,
  UserPlus,
  Building2,
  Receipt,
  FileCheck,
  Download,
  Share2,
  Printer,
  User,
  Banknote,
  Calendar,
  FileImage,
  Camera,
} from "lucide-react"

interface AdminDashboardProps {
  user: {
    id: number
    nombre: string
    apellido: string
    is_admin: boolean
  }
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  // ---------------------------
  // States (original + enhanced features)
  // ---------------------------
  const [statistics, setStatistics] = useState<any>(null)
  const [loanApplications, setLoanApplications] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedDetails, setSelectedDetails] = useState<any>(null)
  const [detailsType, setDetailsType] = useState<string>("")
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Search and user-ui states
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userLoans, setUserLoans] = useState<any[]>([])
  const [isUserLoansOpen, setIsUserLoansOpen] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null)
  const [newPassword, setNewPassword] = useState("")
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [loanComments, setLoanComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")

  // Payments and Active Loans states
  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  const [activeLoans, setActiveLoans] = useState<any[]>([])
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<any | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentType, setPaymentType] = useState<string>("installment")
  const [paymentNotes, setPaymentNotes] = useState<string>("")

  // Notifications system
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false)
  const [selectedPaymentForConfirm, setSelectedPaymentForConfirm] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")
  const [isPaymentRejectOpen, setIsPaymentRejectOpen] = useState(false)
  const [selectedPaymentForReject, setSelectedPaymentForReject] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null)
  const [isReceiptsOpen, setIsReceiptsOpen] = useState(false)
  const [adminReceipts, setAdminReceipts] = useState<any[]>([])
  // Shared reject modal state (replaces window.prompt)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<{ type: 'loan' | 'company'; id: number } | null>(null)
  // Show a detailed dialog after rejecting a loan (similar to payment rejection flow)
  const [showLoanRejectResult, setShowLoanRejectResult] = useState(false)
  const [loanRejectResultData, setLoanRejectResultData] = useState<any | null>(null)
  // Delete user modal state (replaces window.confirm)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteUserTarget, setDeleteUserTarget] = useState<number | null>(null)

  // User details states (synchronized)
  const [userDetailActiveTab, setUserDetailActiveTab] = useState<
    "cuotas" | "recibos" | "notas" | "acuerdos" | "adjuntos"
  >("cuotas")
  const [expandedActiveLoanId, setExpandedActiveLoanId] = useState<number | null>(null)
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false)
  const [installmentsLoading, setInstallmentsLoading] = useState<number | null>(null)
  const [loanInstallmentsCache, setLoanInstallmentsCache] = useState<Record<number, any[]>>({})
  const [userReceiptsCache, setUserReceiptsCache] = useState<any[] | null>(null)

  // Ref for search container to detect outside clicks
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const { toast } = useToast()
  // ---------------------------
  // Initial fetches
  // ---------------------------
  useEffect(() => {
    fetchStatistics()
    fetchLoanApplications()
    fetchCompanies()
    fetchUsers()
    fetchActiveLoans()
    fetchPendingPayments()
    fetchAdminNotifications()
    fetchRecentInvoices()
  }, [])

  // ---------------------------
  // Search functionality
  // ---------------------------
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers()
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchResults([])
        setSearchQuery("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const searchUsers = async () => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      }
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const fetchRecentInvoices = async () => {
    try {
      const response = await fetch("/api/admin/invoices/recent")
      if (response.ok) {
        const data = await response.json()
        setRecentInvoices(data)
      }
    } catch (error) {
      console.error("Error fetching recent invoices:", error)
    }
  }

  const fetchAdminReceipts = async () => {
    try {
      const response = await fetch('/api/admin/admin-receipts')
      if (response.ok) {
        const data = await response.json()
        setAdminReceipts(data || [])
      }
    } catch (e) {
      console.error('Error fetching admin receipts', e)
    }
  }
  
  // Helper: normalize invoice objects coming from different endpoints
  const normalizeInvoice = (inv: any) => {
    if (!inv) return null
    const amount = inv.amount ?? inv.payment_amount ?? inv.total_amount ?? 0
    const invoiceNumber = inv.invoice_number ?? inv.invoiceNumber ?? inv.id ?? ""
    const date = inv.payment_date ?? inv.date ?? inv.created_at ?? inv.createdAt ?? null
    const customerName = inv.customer_name ?? inv.customerName ?? `${inv.user_name ?? ""} ${inv.user_lastname ?? ""}`.trim()
    const description = inv.description ?? inv.concept ?? inv.details ?? "Pago"
  
    return {
      id: inv.id,
      invoiceNumber,
      date,
      customerName,
      description,
      amount,
      // also include properties expected by ProfessionalInvoice (snake_case)
      invoice_number: invoiceNumber,
      payment_amount: amount,
      payment_date: date,
      user_name: inv.user_name ?? inv.user_name ?? inv.customer_name ?? "",
      user_lastname: inv.user_lastname ?? "",
      user_email: inv.user_email ?? inv.email ?? "",
      loan_id: inv.loan_id ?? inv.loanId ?? null,
      payment_type: inv.payment_type ?? inv.paymentType ?? "installment",
      company_name: inv.company_name ?? inv.companyName ?? null,
      admin_notes: inv.admin_notes ?? inv.adminNotes ?? null,
      created_at: inv.created_at ?? inv.createdAt ?? date,
      // keep original payload handy if needed
      raw: inv,
    }
  }

  // Helper: normalize user objects from different endpoints
  const normalizeUser = (u: any) => {
    if (!u) return null
    const nombre = u.nombre ?? u.first_name ?? u.firstName ?? u.user_name ?? u.name ?? u.user_name ?? ""
    const apellido = u.apellido ?? u.last_name ?? u.lastName ?? u.user_lastname ?? ""
    const email = u.email ?? u.user_email ?? u.userEmail ?? ""
    const cedula_pasaporte = u.cedula_pasaporte ?? u.cedula ?? u.document ?? u.documento ?? ""
    const numero_celular = u.numero_celular ?? u.phone ?? u.user_phone ?? u.telefono ?? u.phone_number ?? ""
    const created_at = u.created_at ?? u.createdAt ?? u.created ?? null
    const is_admin = u.is_admin ?? u.isAdmin ?? u.admin ?? false
    const can_request_loans = u.can_request_loans ?? u.canRequestLoans ?? u.can_request ?? true

    return {
      ...u,
      nombre,
      apellido,
      email,
      cedula_pasaporte,
      numero_celular,
      created_at,
      is_admin,
      can_request_loans,
      // keep original variants for compatibility
      user_name: u.user_name ?? nombre,
      user_lastname: u.user_lastname ?? apellido,
    }
  }

  // Helper: map user details payload from API to UI-friendly shape
  const mapUserDetailsFromApi = (data: any) => {
    const rawUser = data.user ?? data
    const userObj = normalizeUser(rawUser) || rawUser

    const receiptsRaw = data.recibos ?? data.receipts ?? data.user?.recibos ?? data.user?.receipts ?? []
    const receipts = receiptsRaw.map((r: any) => ({
      id: r.id,
      number: r.invoice_number ?? r.number ?? r.id,
      date: r.payment_date ?? r.date ?? r.created_at ?? r.createdAt,
      amount: r.payment_amount ?? r.amount ?? 0,
      status: r.status ?? r.estado ?? "",
      raw: r,
    }))

    const notesRaw = data.notas ?? data.notes ?? data.user?.notas ?? data.user?.notes ?? data.comments ?? []
    const notes = notesRaw.map((n: any) => ({
      id: n.id,
      title: n.title ?? n.subject ?? `Nota ${n.id}`,
      content: n.comment ?? n.content ?? n.body ?? n.note ?? "",
      created_at: n.created_at ?? n.createdAt ?? n.date ?? null,
      raw: n,
    }))

    const acuerdosRaw = data.acuerdos ?? data.agreements ?? data.loanApplications ?? data.user?.acuerdos ?? []
    const agreements = acuerdosRaw.map((a: any) => ({
      id: a.id,
      title: a.title ?? `Préstamo #${a.id}`,
      date: a.created_at ?? a.createdAt ?? a.date ?? null,
  status: (a.estado ?? a.status ?? (a.aprobado ? "aprobado" : "pendiente")) ?? "",
      monto: a.monto ?? a.amount ?? a.original_amount ?? null,
      raw: a,
    }))

    const attachmentsRaw = data.adjuntos ?? data.attachments ?? data.user?.adjuntos ?? data.user?.attachments ?? []
    const attachments = attachmentsRaw.map((att: any, idx: number) => ({
      id: att.id ?? idx,
      name: att.name ?? (att.url ? att.url.split("/").pop() : `adjunto-${idx}`),
      url: att.url ?? att.path ?? null,
      type: att.type ?? att.file_type ?? "",
      size: att.size ?? null,
      raw: att,
    }))

    const cuotas = data.cuotas ?? data.payments ?? data.user?.cuotas ?? []

    const details = {
      ...userObj,
      receipts,
      notes,
      agreements,
      attachments,
      cuotas,
      activeLoans: agreements,
    }

    return { details, userObj }
  }


  const fetchAdminNotifications = async () => {
    try {
      const response = await fetch("/api/admin/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("[v0] Error fetching admin notifications:", error)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/admin/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
    }
  }

  // ---------------------------
  // User loans & password reset
  // ---------------------------
  const fetchUserLoans = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/loans`)
      if (response.ok) {
        const data = await response.json()
        const rawUser = data.user ?? data
        const userObj = normalizeUser(rawUser) || rawUser

        // Map recibos -> receipts
        const receiptsRaw = data.recibos ?? data.receipts ?? []
        const receipts = receiptsRaw.map((r: any) => ({
          id: r.id,
          number: r.invoice_number ?? r.number ?? r.id,
          date: r.payment_date ?? r.date ?? r.created_at ?? r.createdAt,
          amount: r.payment_amount ?? r.amount ?? 0,
          status: r.status ?? r.estado ?? "",
          raw: r,
        }))

        // Map notas -> notes (transform to {id,title,content,created_at})
        const notesRaw = data.notas ?? data.notes ?? []
        const notes = notesRaw.map((n: any) => ({
          id: n.id,
          title: n.title ?? `Nota de admin ${n.admin_name ? `- ${n.admin_name}` : ""}`,
          content: n.comment ?? n.content ?? n.body ?? n.note ?? "",
          created_at: n.created_at ?? n.createdAt ?? n.date ?? null,
          raw: n,
        }))

        // Map acuerdos -> agreements / activeLoans
        const acuerdosRaw = data.acuerdos ?? data.agreements ?? data.loanApplications ?? []
        const agreements = acuerdosRaw.map((a: any) => ({
          id: a.id,
          title: a.title ?? `Préstamo #${a.id}`,
          date: a.created_at ?? a.createdAt ?? a.date ?? null,
          status: a.estado ?? a.status ?? a.aprobado ?? "",
          monto: a.monto ?? a.amount ?? a.original_amount ?? null,
          raw: a,
        }))

        // Map adjuntos -> attachments
        const attachmentsRaw = data.adjuntos ?? data.attachments ?? []
        const attachments = attachmentsRaw.map((att: any, idx: number) => ({
          id: att.id ?? idx,
          name: att.name ?? (att.url ? att.url.split("/").pop() : `adjunto-${idx}`),
          url: att.url ?? att.path ?? null,
          type: att.type ?? att.file_type ?? "",
          size: att.size ?? null,
          raw: att,
        }))

        // cuotas (pagos) - keep raw list
        const cuotas = data.cuotas ?? data.payments ?? []

        const details = {
          ...userObj,
          receipts,
          notes,
          agreements,
          attachments,
          cuotas,
          // activeLoans used by the UI for the cuotas tab/listing
          activeLoans: agreements,
        }

        setSelectedDetails(details)
        setSelectedUser(userObj)
      }
    } catch (error) {
      console.error("Error fetching user loans:", error)
    }
  }

  const resetUserPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${resetPasswordUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })

      if (response.ok) {
        toast({
          title: "Contraseña actualizada",
          description: "La contraseña ha sido actualizada exitosamente",
        })
        setIsResetPasswordOpen(false)
        setNewPassword("")
        setResetPasswordUser(null)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al actualizar la contraseña",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la contraseña",
        variant: "destructive",
      })
    }
  }

  // ---------------------------
  // Comments for loans
  // ---------------------------
  const fetchLoanComments = async (loanId: number) => {
    try {
      const response = await fetch(`/api/admin/loan-applications/${loanId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setLoanComments(data)
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  const addComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/admin/loan-applications/${selectedLoan.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: newComment.trim(),
          adminId: user.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Comentario agregado",
          description: "El comentario ha sido agregado exitosamente",
        })
        setNewComment("")
        fetchLoanComments(selectedLoan.id)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al agregar el comentario",
        variant: "destructive",
      })
    }
  }

  const openComments = async (loan: any) => {
    setSelectedLoan(loan)
    await fetchLoanComments(loan.id)
    setIsCommentsOpen(true)
  }

  // ---------------------------
  // Existing fetch functions
  // ---------------------------
  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/admin/statistics")
      if (response.ok) {
        const data = await response.json()
        setStatistics(data)
      }
    } catch (error) {
      console.error("Error fetching statistics:", error)
    }
  }

  const fetchLoanApplications = async () => {
    try {
      const response = await fetch("/api/admin/loan-applications")
      if (response.ok) {
        const data = await response.json()
        setLoanApplications(data)
      }
    } catch (error) {
      console.error("Error fetching loan applications:", error)
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies")
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
      }
    } catch (error) {
      console.error("Error fetching companies:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchActiveLoans = async () => {
  try {
    const response = await fetch("/api/admin/active-loans")
    if (response.ok) {
      const data = await response.json()
      setActiveLoans(data)
    } else {
      console.error("Error fetching active loans:", response.statusText)
    }
  } catch (error) {
    console.error("Error fetching active loans:", error)
    // Mostrar datos de ejemplo para debugging
    setActiveLoans([
      {
        id: 1,
        user_name: "Ejemplo",
        user_lastname: "Usuario",
        user_email: "ejemplo@email.com",
        original_amount: 50000,
        remaining_amount: 25000,
        installment_amount: 5000,
        total_installments: 10,
        remaining_installments: 5,
        next_payment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active"
      }
    ])
  }
}

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch("/api/admin/payments/pending")
      if (response.ok) {
        const data = await response.json()
        setPendingPayments(data)
      } else {
        // fallback attempt
        const alt = await fetch("/api/admin/pending-payments").catch(() => null)
        if (alt && alt.ok) {
          const altData = await alt.json()
          setPendingPayments(altData)
        }
      }
    } catch (error) {
      console.error("Error fetching pending payments:", error)
    }
  }

  const fetchUserDetails = async (userId: number) => {
    setIsLoadingUserDetails(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/details`)
      if (response.ok) {
        const data = await response.json()
        const { details, userObj } = mapUserDetailsFromApi(data)
        setSelectedDetails(details)
        setSelectedUser(userObj)
        setDetailsType("user")
        setIsDetailsOpen(true)

        // Clear previous cache for fresh data
        setLoanInstallmentsCache({})
        setUserReceiptsCache(null)
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      toast({
        title: "Error",
        description: "Error al cargar los detalles del usuario",
        variant: "destructive",
      })
    } finally {
      setIsLoadingUserDetails(false)
    }
  }

  const fetchLoanInstallments = async (loanId: number) => {
    if (loanInstallmentsCache[loanId]) {
      return loanInstallmentsCache[loanId]
    }
    setInstallmentsLoading(loanId)
    try {
      const response = await fetch(`/api/admin/loans/${loanId}/installments`)
      if (response.ok) {
        const raw = await response.json()

        // Normalize installments to a consistent shape the UI expects
        const data = (Array.isArray(raw) ? raw : raw.installments ?? raw.data ?? []).map((it: any, idx: number) => {
          const number = it.number ?? it.installment_number ?? it.n ?? idx + 1
          const due_date = it.due_date ?? it.fecha_vencimiento ?? it.dueDate ?? it.vencimiento ?? it.date ?? null
          const amount = it.amount ?? it.monto ?? it.valor ?? 0

          // amount actually paid for this installment (if available)
          const paid_amount = Number(it.paid_amount ?? it.payment_amount ?? it.paidAmount ?? it.monto_pagado ?? it.paid ?? 0)

          // Normalize status: accept boolean flags or strings in Spanish/English
          let status = "pending"
          const rawStatus = (it.status ?? it.estado ?? it.pagado ?? it.paid ?? it.pago)
          if (rawStatus === true || rawStatus === "true" || `${rawStatus}`.toLowerCase() === "paid" || `${rawStatus}`.toLowerCase() === "pagada" || `${rawStatus}`.toLowerCase() === "pagado" || `${rawStatus}`.toLowerCase() === "pago" || `${rawStatus}`.toLowerCase() === "yes") {
            status = "paid"
          }

          return {
            number,
            due_date,
            amount,
            paid_amount,
            status,
            payment_date: it.payment_date ?? it.fecha_pago ?? it.paid_at ?? it.paymentAt ?? null,
            raw: it,
          }
        })

        setLoanInstallmentsCache((prev) => ({ ...prev, [loanId]: data }))
        return data
      }
    } catch (error) {
      console.error("Error fetching loan installments:", error)
    } finally {
      setInstallmentsLoading(null)
    }
    return []
  }

  // ---------------------------
  // Update functions
  // ---------------------------
  const updateLoanStatus = async (id: number, estado: string) => {
    try {
      let reason: string | undefined = undefined
      if (estado === "rechazado") {
        // open shared reject modal instead of prompt
        setRejectTarget({ type: 'loan', id })
        setRejectModalOpen(true)
        return
      }

      const response = await fetch(`/api/admin/loan-applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      })

      if (response.ok) {
        toast({
          title: "Estado actualizado",
          description: `Solicitud ${estado} exitosamente`,
        })
        fetchLoanApplications()
        fetchStatistics()
        fetchActiveLoans()
        fetchPendingPayments()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar el estado",
        variant: "destructive",
      })
    }
  }

  const updateCompanyStatus = async (id: number, estado: string) => {
    try {
      if (estado === "rechazado") {
        setRejectTarget({ type: 'company', id })
        setRejectModalOpen(true)
        return
      }

      const response = await fetch(`/api/admin/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      })

      if (response.ok) {
        toast({
          title: "Estado actualizado",
          description: `Empresa ${estado} exitosamente`,
        })
        fetchCompanies()
        fetchStatistics()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar el estado",
        variant: "destructive",
      })
    }
  }

  // Confirm reject handler used by the shared ProjectPrompt modal
  const confirmReject = async (reason: string) => {
    if (!rejectTarget) return
    if (!reason || reason.trim().length === 0) {
      toast({ title: 'Se requiere razón', description: 'Proporciona la razón del rechazo', variant: 'destructive' })
      return
    }

    try {
      if (rejectTarget.type === 'loan') {
        const response = await fetch(`/api/admin/loan-applications/${rejectTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'rechazado', reason }),
        })
        if (response.ok) {
          const json = await response.json().catch(() => ({}))
          toast({ title: 'Solicitud rechazada', description: 'La solicitud fue rechazada correctamente' })
          // show detailed dialog with returned loan data (if available)
          setLoanRejectResultData(json.loan ?? { id: rejectTarget.id, reason })
          setShowLoanRejectResult(true)
          fetchLoanApplications()
          fetchStatistics()
          fetchActiveLoans()
          fetchPendingPayments()
        } else {
          const err = await response.json().catch(() => ({}))
          toast({ title: 'Error', description: err.error || 'Error al rechazar la solicitud', variant: 'destructive' })
        }
      } else if (rejectTarget.type === 'company') {
        const response = await fetch(`/api/admin/companies/${rejectTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'rechazado', reason }),
        })
        if (response.ok) {
          toast({ title: 'Empresa rechazada', description: 'La empresa fue rechazada correctamente' })
          fetchCompanies()
          fetchStatistics()
        } else {
          const err = await response.json().catch(() => ({}))
          toast({ title: 'Error', description: err.error || 'Error al rechazar la empresa', variant: 'destructive' })
        }
      }
    } catch (e) {
      console.error('Error en confirmReject:', e)
      toast({ title: 'Error', description: 'Error al procesar el rechazo', variant: 'destructive' })
    } finally {
      setRejectModalOpen(false)
      setRejectTarget(null)
    }
  }

  const toggleAdminStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_admin: !currentStatus,
          can_request_loans: true,
          can_associate_companies: true,
        }),
      })

      if (response.ok) {
        toast({
          title: "Permisos actualizados",
          description: `Usuario ${!currentStatus ? "promovido a" : "removido de"} administrador`,
        })
        fetchUsers()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar permisos",
        variant: "destructive",
      })
    }
  }

  const deleteUser = async (id: number) => {
    // Open confirm modal instead of native confirm
    setDeleteUserTarget(id)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async (reason: string) => {
    if (!deleteUserTarget) return
    try {
      const response = await fetch(`/api/admin/users/${deleteUserTarget}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Usuario eliminado",
          description: "El usuario ha sido eliminado exitosamente",
        })
        fetchUsers()
        fetchStatistics()
      } else {
        const err = await response.json().catch(() => ({}))
        toast({ title: 'Error', description: err.error || 'Error al eliminar usuario', variant: 'destructive' })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar usuario",
        variant: "destructive",
      })
    } finally {
      setDeleteModalOpen(false)
      setDeleteUserTarget(null)
    }
  }

  const confirmPayment = async (paymentId: number, action: "confirm" | "reject") => {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNotes: adminNote.trim() || undefined,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: action === "confirm" ? "Pago confirmado" : "Pago rechazado",
          description: action === "confirm" ? "El pago ha sido confirmado exitosamente" : "El pago ha sido rechazado",
        });

        // If payment confirmed and invoice generated, normalize and show invoice modal
        if (action === "confirm" && result.invoiceId) {
          // Fetch the generated invoice details
          const invoiceResponse = await fetch(`/api/invoices/${result.invoiceId}`)
          if (invoiceResponse.ok) {
            const invoiceData = await invoiceResponse.json()
            const inv = normalizeInvoice(invoiceData)
            setSelectedInvoice(inv)
            setSelectedInvoiceData(inv)
            setIsInvoiceOpen(true)
            setIsInvoiceModalOpen(true)
          }
        }

        fetchPendingPayments()
        fetchActiveLoans()
        fetchRecentInvoices()
        // Clear installments cache so UI refetches installments (to include paid_amount)
        setLoanInstallmentsCache({})
        setIsPaymentConfirmOpen(false)
        setSelectedPaymentForConfirm(null)
        setAdminNote("")
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo procesar el pago.",
          variant: "destructive",
        });
      }
    } catch (error) {
       console.error("Error confirming payment:", error);
     toast({
        title: "Error",
        description: "Error de red.",
        variant: "destructive",
      });
    }
  }

  const rejectPaymentHandler = async (paymentId: number) => {
    if (!rejectNote.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa una razón para rechazar el pago",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: rejectNote.trim(),
        }),
      })

      if (response.ok) {
        toast({
          title: "Pago rechazado",
          description: "El pago ha sido rechazado exitosamente. Se ha notificado al usuario.",
        })

        fetchPendingPayments()
        fetchActiveLoans()
        setIsPaymentRejectOpen(false)
        setSelectedPaymentForReject(null)
        setRejectNote("")
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "No se pudo rechazar el pago.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error rejecting payment:", error)
      toast({
        title: "Error",
        description: "Error de red.",
        variant: "destructive",
      })
    }
  }

  const addManualPayment = async () => {
    if (!selectedLoanForPayment || !paymentAmount.trim()) {
      toast({
        title: "Error",
        description: "Selecciona un préstamo y especifica el monto",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeLoanId: selectedLoanForPayment.id,
          paymentAmount: Number.parseFloat(paymentAmount),
          paymentType: paymentType,
          notes: paymentNotes.trim() || undefined,
          adminId: user.id,
        }),
      })

      if (response.ok) {
        const result = await response.json()

        toast({
          title: "Pago agregado",
          description: "El pago manual ha sido registrado exitosamente",
        })

        // Show generated invoice if available (normalize first)
        if (result.invoice) {
          const inv = normalizeInvoice(result.invoice)
          setSelectedInvoice(inv)
          setSelectedInvoiceData(inv)
          setIsInvoiceOpen(true)
          setIsInvoiceModalOpen(true)
        }

        fetchActiveLoans()
        fetchPendingPayments()
        fetchRecentInvoices()
  // clear installments cache to force refetch updated paid amounts
  setLoanInstallmentsCache({})
        setIsAddPaymentOpen(false)
        setSelectedLoanForPayment(null)
        setPaymentAmount("")
        setPaymentType("installment")
        setPaymentNotes("")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al agregar el pago manual",
        variant: "destructive",
      })
    }
  }

  // ---------------------------
  // Handlers for Invoice Modal
  // ---------------------------
  const viewInvoice = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (!response.ok) {
        throw new Error("No se pudo cargar la factura")
      }
  const invoiceData = await response.json()
  const inv = normalizeInvoice(invoiceData)
  setSelectedInvoice(inv)
  setSelectedInvoiceData(inv)
  setIsInvoiceModalOpen(true)
    } catch (error) {
      console.error("Error fetching invoice:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la factura.",
        variant: "destructive",
      })
    }
  }

  const handleViewInvoice = (invoice: any) => {
    const inv = normalizeInvoice(invoice)
    setSelectedInvoice(inv)
    setSelectedInvoiceData(inv)
    setIsInvoiceModalOpen(true)
  }

  const handleCloseInvoice = () => {
    setIsInvoiceModalOpen(false)
    setSelectedInvoiceData(null)
  }

  const generateInvoicePDF = async (invoice: any) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `factura-${invoice.invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Factura Descargada",
          description: "La factura se ha descargado correctamente",
        })
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      })
    }
  }

  const shareInvoice = async (invoice: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Factura ${invoice.invoiceNumber}`,
          text: `Factura por ${invoice.amount} - ${invoice.description}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log(" Share cancelled or failed:", error)
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(
          `Factura ${invoice.invoiceNumber} - ${invoice.amount} - ${invoice.description}`,
        )
        toast({
          title: "Copiado",
          description: "Los detalles de la factura se copiaron al portapapeles",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo compartir la factura",
          variant: "destructive",
        })
      }
    }
  }

  const printInvoice = (invoice: any) => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura ${invoice.invoiceNumber}</title>
            <style>
              @media print {
                body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
                .thermal-receipt { width: 80mm; margin: 0 auto; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .line { border-top: 1px dashed #000; margin: 5px 0; }
                .qr { margin: 10px 0; }
              }
            </style>
          </head>
          <body>
            <div class="thermal-receipt">
              <div class="center bold">JOSHPER SOLUTIONS</div>
              <div class="center">Código: ${invoice.invoiceNumber}</div>
              <div class="center">Fecha: ${new Date(invoice.date).toLocaleDateString()}</div>
              <div class="line"></div>
              <div><strong>Cliente:</strong> ${invoice.customerName}</div>
              <div><strong>Concepto:</strong> ${invoice.description}</div>
              <div class="line"></div>
              <div><strong>Monto:</strong> ${invoice.amount}</div>
              <div class="line"></div>
              <div class="center">¡Gracias por su pago!</div>
              <div class="center qr">
                <div style="width: 60px; height: 60px; border: 1px solid #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 8px;">
                  QR CODE
                </div>
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // ---------------------------
  // Details modal
  // ---------------------------
  const viewDetails = async (id: number, type: string) => {
    try {
      let endpoint = ""
      switch (type) {
        case "user":
          endpoint = `/api/admin/users/${id}/details`
          break
        case "loan":
          endpoint = `/api/admin/loan-applications/${id}/details`
          break
        case "company":
          endpoint = `/api/admin/companies/${id}/details`
          break
        default:
          return
      }

      if (type === "user") {
        setIsLoadingUserDetails(true)
      }

      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        if (type === "user") {
          const { details, userObj } = mapUserDetailsFromApi(data)
          setSelectedDetails(details)
          setSelectedUser(userObj)
          setDetailsType(type)
          setIsDetailsOpen(true)

          // Clear cache for fresh data
          setLoanInstallmentsCache({})
          setUserReceiptsCache(null)
        } else {
          setSelectedDetails(data)
          setDetailsType(type)
          setIsDetailsOpen(true)
        }
      }
    } catch (error) {
      console.error("Error fetching details:", error)
      toast({
        title: "Error",
        description: "Error al cargar los detalles",
        variant: "destructive",
      })
    } finally {
      if (type === "user") {
        setIsLoadingUserDetails(false)
      }
    }
  }

  const openLoanDetails = (loan: any) => {
    setSelectedDetails(loan)
    setDetailsType("loan")
    setIsDetailsOpen(true)
  }

  // ---------------------------
  // Helper functions
  // ---------------------------
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount || 0)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return ""
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return ""
    return d.toLocaleDateString("es-DO")
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "aprobado":
      case "approved":
      case "active":
        return "status-approved"
      case "pendiente":
      case "pending":
        return "status-pending"
      case "rechazado":
      case "rejected":
        return "status-rejected"
      case "completed":
        return "status-completed"
      case "overdue":
        return "status-overdue"
      default:
        return "status-pending"
    }
  }

  // Helper: summarize payments for a loan using cached installments
  const getLoanPaymentSummary = (loanId: number, loan: any) => {
    const inst = loanInstallmentsCache[loanId] || []
    const paidInstallments = inst.filter((i: any) => (i.status || "").toLowerCase() === "paid")
    const paidAmount = paidInstallments.reduce((s: number, i: any) => s + Number(i.paid_amount ?? i.amount ?? 0), 0)
    const paidCount = paidInstallments.length
    const installmentAmount = loan.installment_amount ?? loan.installmentAmount ?? loan.installment ?? (inst[0]?.amount ?? 0)
    const original = loan.original_amount ?? loan.originalAmount ?? loan.original ?? 0
    const remaining = loan.remaining_amount ?? loan.remainingAmount ?? loan.remaining ?? Math.max(0, original - paidAmount)
    return { paidAmount, paidCount, installmentAmount, remaining }
  }

  const renderDetailsModal = () => {
    if (!selectedDetails) return null

    if (detailsType === "user") {
      const userDetails = selectedDetails ?? selectedUser ?? {}
      const userActiveLoans = (userDetails.activeLoans ?? userDetails.agreements ?? userDetails.cuotas ?? []) as any[]

      // Use only the user-specific data from the API, no global fallbacks
      const receiptsToShow = userDetails.receipts || []
      const agreementsToShow = userDetails.agreements || []
      const cuotasToShow = agreementsToShow

      const notesToShow = (userDetails.notes && userDetails.notes.length > 0) ? userDetails.notes : []

      const attachmentsToShow = (userDetails.attachments && userDetails.attachments.length > 0)
        ? userDetails.attachments
        : userDetails.documento_foto
        ? [{ id: "documento_foto", name: "Documento", url: userDetails.documento_foto, type: "image" }]
        : []

      return (
        <div className="space-y-6">
          {/* User Basic Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {userDetails.nombre?.[0]}
                {userDetails.apellido?.[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {userDetails.nombre} {userDetails.apellido}
                </h3>
                <p className="text-gray-600">{userDetails.email}</p>
                <div className="flex gap-2 mt-2">
                  {userDetails.is_admin && <Badge variant="destructive">Administrador</Badge>}
                  {userDetails.can_request_loans && <Badge variant="default">Puede solicitar préstamos</Badge>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Documento:</span>
                <p className="text-gray-900">{userDetails.cedula_pasaporte}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Teléfono:</span>
                <p className="text-gray-900">{userDetails.numero_celular}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Registro:</span>
                <p className="text-gray-900">{formatDate(userDetails.created_at)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Préstamos Activos:</span>
                <p className="text-gray-900 font-semibold">{userActiveLoans.length}</p>
              </div>
            </div>
          </div>

          {/* Tabs for User Details */}
          <Tabs value={userDetailActiveTab} onValueChange={(value: any) => setUserDetailActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="cuotas" className="hover:shadow-lg hover:shadow-blue-500 hover:scale-105 transition-all">Cuotas</TabsTrigger>
              <TabsTrigger value="recibos" className="hover:shadow-lg hover:shadow-blue-500 hover:scale-105 transition-all">Recibos</TabsTrigger>
              <TabsTrigger value="notas" className="hover:shadow-lg hover:shadow-blue-500 hover:scale-105 transition-all">Notas</TabsTrigger>
              <TabsTrigger value="acuerdos" className="hover:shadow-lg hover:shadow-blue-500 hover:scale-105 transition-all">Acuerdos</TabsTrigger>
              <TabsTrigger value="adjuntos" className="hover:shadow-lg hover:shadow-blue-500 hover:scale-105 transition-all">Adjuntos</TabsTrigger>
            </TabsList>

            <TabsContent value="cuotas" className="mt-4">
              <div className="space-y-4">
                {cuotasToShow.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>No hay préstamos activos</p>
                  </div>
                ) : (
                  cuotasToShow.map((loan: any) => {
                    const summary = getLoanPaymentSummary(loan.id, loan)
                    return (
                    <div key={loan.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Préstamo #{loan.id} - {formatCurrency(loan.original_amount)}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Pagado: {formatCurrency(summary.paidAmount)} | Restante: {formatCurrency(summary.remaining)} | Cuota: {" "}
                            {formatCurrency(summary.installmentAmount)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:shadow-lg hover:scale-105 transition-all"
                              onClick={async () => {
                                if (expandedActiveLoanId === loan.id) {
                                  setExpandedActiveLoanId(null)
                                } else {
                                  setExpandedActiveLoanId(loan.id)
                                  await fetchLoanInstallments(loan.id)
                                }
                              }}
                            >
                              Ver Cuotas
                            </Button>
                          </div>
                          <div>
                            <Button variant="ghost" size="sm" className="hover:shadow-lg hover:scale-105 transition-all" onClick={() => viewDetails(loan.id, "loan")}>
                              Ver detalles
                            </Button>
                          </div>
                        </div>
                      </div>

                      {expandedActiveLoanId === loan.id && (
                        <div className="mt-4 border-t pt-4">
                          {installmentsLoading === loan.id ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="text-sm text-gray-600 mt-2">Cargando facturas...</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {/* Filtrar facturas por loan_id */}
                              {(() => {
                                const loanInvoices = receiptsToShow.filter((receipt: any) =>
                                  receipt.loan_id === loan.id ||
                                  receipt.loanId === loan.id ||
                                  receipt.raw?.loan_id === loan.id ||
                                  receipt.raw?.loanId === loan.id
                                )
                                return loanInvoices.length === 0 ? (
                                  <div className="text-center py-4 text-gray-500">
                                    <Receipt size={24} className="mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">No hay facturas para este préstamo</p>
                                  </div>
                                ) : (
                                  loanInvoices.map((receipt: any) => (
                                    <div
                                      key={receipt.id}
                                      className="flex justify-between items-center p-3 bg-gray-50 rounded text-sm cursor-pointer hover:bg-gray-100"
                                      onClick={() => handleViewInvoice(receipt.raw ?? receipt)}
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-blue-100 text-blue-800">
                                          <Receipt size={14} />
                                        </div>
                                        <div>
                                          <div className="font-medium">Factura #{receipt.number}</div>
                                          <div className="text-xs text-gray-500">{formatDate(receipt.date)}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="font-semibold">{formatCurrency(receipt.amount)}</div>
                                        <Badge variant="default">
                                          {receipt.status || "Pagada"}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="recibos" className="mt-4">
              <div className="space-y-4">
                {receiptsToShow.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>No hay recibos disponibles</p>
                  </div>
                ) : (
                  receiptsToShow.map((receipt: any) => (
                    <div
                      key={receipt.id}
                      className="border rounded-lg p-4 bg-white cursor-pointer hover:shadow-sm"
                      onClick={() => handleViewInvoice(receipt.raw ?? receipt)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">Recibo #{receipt.number}</h4>
                          <p className="text-sm text-gray-600">{formatDate(receipt.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(receipt.amount)}</p>
                          <Badge variant="default">{receipt.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="notas" className="mt-4">
              <div className="space-y-4">
                {notesToShow.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>No hay notas disponibles</p>
                  </div>
                ) : (
                  notesToShow.map((note: any) => (
                    <div key={note.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{note.title}</h4>
                        <span className="text-xs text-gray-500">{formatDate(note.created_at)}</span>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="acuerdos" className="mt-4">
              <div className="space-y-4">
                {agreementsToShow.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileCheck size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>No hay acuerdos disponibles</p>
                  </div>
                ) : (
                  agreementsToShow.map((agreement: any) => (
                    <div
                      key={agreement.id}
                      className="border rounded-lg p-4 bg-white cursor-pointer hover:shadow-sm"
                      onClick={() => viewDetails(agreement.id, "loan")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{agreement.title}</h4>
                          <p className="text-sm text-gray-600">{formatDate(agreement.date)}</p>
                        </div>
                        <Badge variant={agreement.status === "active" ? "default" : "secondary"}>
                          {agreement.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="adjuntos" className="mt-4">
              <div className="space-y-4">
                {attachmentsToShow.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>No hay adjuntos disponibles</p>
                  </div>
                ) : (
                  attachmentsToShow.map((attachment: any) => (
                    <div key={attachment.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-center items-center flex-col space-y-4">
                        {attachment.type === "image" && attachment.url ? (
                          <div className="relative">
                            <img
                              src={attachment.url}
                              alt="Documento adjunto"
                              className="max-w-full h-auto rounded border shadow-sm"
                              style={{ maxHeight: "400px" }}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                            <p className="text-sm">Tipo de archivo no soportado para vista previa</p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (attachment.url) {
                              const link = document.createElement('a')
                              link.href = attachment.url
                              link.download = attachment.name || 'adjunto'
                              link.target = '_blank'
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <Download size={16} />
                          Descargar imagen
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )
    }

    if (detailsType === "loan") {
      const loanDetails = selectedDetails

      return (
        <div className="space-y-6">
          {/* Loan Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Solicitud de Préstamo #{loanDetails.id}</h3>
                <p className="text-gray-600">
                  {loanDetails.nombre_completo || `${loanDetails.nombre} ${loanDetails.apellido}`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(loanDetails.monto)}</div>
                <span className={`status-badge ${getStatusBadge(loanDetails.estado)}`}>
                  {loanDetails.estado?.charAt(0)?.toUpperCase() + loanDetails.estado?.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Loan Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Información Personal
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nombre:</span>
                  <span className="font-medium">
                    {loanDetails.nombre_completo || `${loanDetails.nombre} ${loanDetails.apellido}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{loanDetails.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documento:</span>
                  <span className="font-medium">{loanDetails.documento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Teléfono:</span>
                  <span className="font-medium">{loanDetails.telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Doc. Usuario:</span>
                  <span className="font-medium">{loanDetails.user_document}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Teléfono Usuario:</span>
                  <span className="font-medium">{loanDetails.user_phone}</span>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Building className="w-4 h-4 mr-2" />
                Información Laboral
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Empresa:</span>
                  <span className="font-medium">{loanDetails.empresa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiempo en empresa:</span>
                  <span className="font-medium">{loanDetails.tiempo_empresa} años</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sueldo:</span>
                  <span className="font-medium">{formatCurrency(loanDetails.sueldo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prestaciones:</span>
                  <span className="font-medium">{formatCurrency(loanDetails.prestaciones)}</span>
                </div>
              </div>
            </div>

            {/* Loan Terms */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Términos del Préstamo
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto:</span>
                  <span className="font-medium text-green-600">{formatCurrency(loanDetails.monto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frecuencia:</span>
                  <span className="font-medium">{loanDetails.frecuencia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plazo:</span>
                  <span className="font-medium">{loanDetails.plazo} meses</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`status-badge ${getStatusBadge(loanDetails.estado)}`}>
                    {loanDetails.estado?.charAt(0)?.toUpperCase() + loanDetails.estado?.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Banking Information */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Banknote className="w-4 h-4 mr-2" />
                Información Bancaria
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cuenta bancaria:</span>
                  <span className="font-medium">{loanDetails.cuenta_banco}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nombre en cuenta:</span>
                  <span className="font-medium">{loanDetails.nombre_banco}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de cuenta:</span>
                  <span className="font-medium">{loanDetails.tipo_cuenta}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Fechas Importantes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de solicitud:</span>
                <span className="font-medium">{formatDate(loanDetails.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Última actualización:</span>
                <span className="font-medium">{formatDate(loanDetails.updated_at)}</span>
              </div>
              {loanDetails.next_payment_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Próximo pago:</span>
                  <span className="font-medium">{formatDate(loanDetails.next_payment_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Document Photo */}
          {loanDetails.documento_foto && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <FileImage className="w-4 h-4 mr-2" />
                Documento Adjunto
              </h4>
              <div className="text-center">
                {/* Protect against documento_foto being a data URL — use directly for data: and http(s) values. */}
                <img
                  src={
                    loanDetails.documento_foto
                      ? (loanDetails.documento_foto.startsWith("http") || loanDetails.documento_foto.startsWith("data:")
                          ? loanDetails.documento_foto
                          : `${loanDetails.documento_foto.startsWith('/') ? loanDetails.documento_foto : `/uploads/${loanDetails.documento_foto}`}`)
                      : "/placeholder.svg"
                  }
                  alt="Documento"
                  className="max-w-full h-auto rounded border"
                />
              </div>
            </div>
          )}

          {/* User Photo */}
          {loanDetails.user_photo && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                Foto del Usuario
              </h4>
              <div className="text-center">
                <img
                  src={loanDetails.user_photo || "/placeholder.svg"}
                  alt="Usuario"
                  className="max-w-xs h-auto rounded-full border mx-auto"
                />
              </div>
            </div>
          )}
        </div>
      )
    }

    // Company details
    if (detailsType === "company") {
      const company = selectedDetails
      if (!company) return null

      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 to-sky-50 p-6 rounded-lg border border-indigo-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {company.nombre_empresa?.[0] ?? company.nombre?.[0] ?? 'E'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{company.nombre_empresa ?? company.nombre ?? "Empresa"}</h3>
                <p className="text-gray-600">{company.representante ?? company.representative ?? ''}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={company.estado === 'aprobada' ? 'default' : company.estado === 'rechazado' ? 'destructive' : 'secondary'}>
                    {company.estado ?? 'desconocido'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">RNC / Identificador:</span>
                <p className="text-gray-900">{company.rnc ?? company.id_number ?? '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Correo:</span>
                <p className="text-gray-900">{company.correo ?? company.email ?? '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Teléfono:</span>
                <p className="text-gray-900">{company.telefono ?? company.phone ?? '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Sector:</span>
                <p className="text-gray-900">{company.sector ?? '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Empleados:</span>
                <p className="text-gray-900">{company.empleados ?? company.employees ?? '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Creada:</span>
                <p className="text-gray-900">{formatDate(company.created_at ?? company.created)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Última actualización:</span>
                <p className="text-gray-900">{formatDate(company.updated_at ?? company.updatedAt ?? company.updated)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Dirección:</span>
                <p className="text-gray-900">{company.direccion ?? company.address ?? '-'}</p>
              </div>
            </div>

            {company.descripcion && (
              <div className="mt-4 text-sm">
                <h4 className="font-semibold text-gray-800 mb-2">Descripción</h4>
                <p className="text-gray-700">{company.descripcion}</p>
              </div>
            )}
          </div>

          {/* Additional raw data collapsible for debugging */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Datos (raw)</h4>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">{JSON.stringify(company, null, 2)}</pre>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
          {JSON.stringify(selectedDetails, null, 2)}
        </pre>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div className="main-header">
        <div className="content-container">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center flex-1">
              <Image src="/logo_joshper.png" alt="Joshper Solutions" width={150} height={75} />
            </div>
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setIsNotificationsOpen(true)} className="relative hover:shadow-lg hover:scale-105 transition-all">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
          <h1>Panel de Administración</h1>
          <p>Gestiona usuarios, préstamos y empresas</p>

          {/* Search Bar */}
          <div className="mt-4 max-w-md mx-auto" ref={searchContainerRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar usuarios por nombre, email o documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full max-w-md bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                {searchResults.map((user: any) => (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 bg-white"
                    onClick={() => {
                      setSelectedUser(user)
                      fetchUserDetails(user.id)
                    }}
                  >
                    <div className="font-medium text-gray-900">
                      {user.nombre} {user.apellido}
                    </div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                    <div className="text-sm text-gray-600">{user.cedula_pasaporte}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={16} style={{ marginRight: "0.5rem" }} />
          Resumen
        </button>
        <button className={`nav-tab ${activeTab === "loans" ? "active" : ""}`} onClick={() => setActiveTab("loans")}>
          <FileText size={16} style={{ marginRight: "0.5rem" }} />
          Préstamos
        </button>
        <button
          className={`nav-tab ${activeTab === "companies" ? "active" : ""}`}
          onClick={() => setActiveTab("companies")}
        >
          <Building size={16} style={{ marginRight: "0.5rem" }} />
          Empresas
        </button>
        <button className={`nav-tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
          <Users size={16} style={{ marginRight: "0.5rem" }} />
          Usuarios
        </button>
        <button
          className={`nav-tab ${activeTab === "payments" ? "active" : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          <DollarSign size={16} style={{ marginRight: "0.5rem" }} />
          Pagos
        </button>
      </div>

      {/* Content */}
      <div className="content-container">
        {activeTab === "overview" && (
          <AdminOverviewTab statistics={statistics} onNavigateTab={setActiveTab} />
        )}

        {activeTab === "loans" && (
          <AdminLoansTab
            loanApplications={loanApplications}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            onViewDetails={(id, type) => viewDetails(id, type)}
            onOpenComments={(loan) => openComments(loan)}
            onUpdateStatus={(id, status) => updateLoanStatus(id, status)}
          />
        )}

        {activeTab === "companies" && (
          <AdminCompaniesTab
            companies={companies}
            onApproveCompany={(id) => updateCompanyStatus(id, "aprobado")}
            onRejectCompany={(id) => updateCompanyStatus(id, "rechazado")}
          />
        )}

        {activeTab === "users" && (
          <AdminUsersTab
            users={users}
            currentUserId={user.id}
            formatDate={formatDate}
            onViewUserDetails={(id) => fetchUserDetails(id)}
            onViewUserLoans={(id) => fetchUserLoans(id)}
            onResetPassword={(userData) => {
              setResetPasswordUser(userData)
              setIsResetPasswordOpen(true)
            }}
            onToggleAdmin={(id, currentStatus) => toggleAdminStatus(id, currentStatus)}
            onDeleteUser={(id) => deleteUser(id)}
          />
        )}

        {activeTab === "payments" && (
          <AdminPaymentsTab
            pendingPayments={pendingPayments}
            activeLoans={activeLoans}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            onOpenAddPayment={() => setIsAddPaymentOpen(true)}
            onConfirmPayment={(payment) => {
              setSelectedPaymentForConfirm({ ...payment, payment_amount: payment.amount ?? payment.payment_amount })
              setIsPaymentConfirmOpen(true)
            }}
            onRejectPayment={(payment) => {
              setSelectedPaymentForReject({ ...payment, payment_amount: payment.amount ?? payment.payment_amount })
              setIsPaymentRejectOpen(true)
            }}
            onSelectLoanForPayment={(loan) => {
              setSelectedLoanForPayment(loan)
              setIsAddPaymentOpen(true)
            }}
            onViewUserDetails={(uid) => viewDetails(uid, "user")}
          />
        )}
      </div>

      {/* Facturas Recientes */}
      <AdminInvoicesSection
        recentInvoices={recentInvoices}
        isAdmin={Boolean(user.is_admin)}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onFetchReceipts={fetchAdminReceipts}
        onOpenReceiptsModal={() => setIsReceiptsOpen(true)}
        onViewInvoice={(invoice) => {
          const inv = normalizeInvoice(invoice)
          setSelectedInvoice(inv)
          setSelectedInvoiceData(inv)
          setIsInvoiceModalOpen(true)
        }}
      />

      {/* ---------------------------
          Enhanced Modals System
          --------------------------- */}

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {detailsType === "user" && "Detalles del Usuario"}
              {detailsType === "loan" && "Detalles de Solicitud de Préstamo"}
              {detailsType === "company" && "Detalles de la Empresa"}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4">{renderDetailsModal()}</div>
        </DialogContent>
      </Dialog>

      {/* User Loans Modal */}
      <Dialog open={isUserLoansOpen} onOpenChange={setIsUserLoansOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Solicitudes de Préstamo
              {selectedUser && ` - ${selectedUser.nombre} ${selectedUser.apellido}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {userLoans.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Este usuario no tiene solicitudes de préstamo</p>
            ) : (
              /* Added proper responsive table wrapper for user loans modal */
              <div className="w-full overflow-x-auto bg-white rounded-lg border">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plazo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userLoans.map((loan: any) => (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-gray-900">{formatDate(loan.created_at)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-900">{loan.empresa}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-900">{formatCurrency(loan.monto)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-900">{loan.plazo} meses</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(loan.estado)}`}
                          >
                            {loan.estado.charAt(0).toUpperCase() + loan.estado.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                              onClick={() => {
                                setIsUserLoansOpen(false)
                                viewDetails(loan.id, "loan")
                              }}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                              onClick={() => {
                                setIsUserLoansOpen(false)
                                openComments(loan)
                              }}
                            >
                              <MessageSquare size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Resetear Contraseña
              {resetPasswordUser && ` - ${resetPasswordUser.nombre} ${resetPasswordUser.apellido}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Contraseña</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa la nueva contraseña (mínimo 6 caracteres)"
                className="bg-white border-gray-300"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setIsResetPasswordOpen(false)
                  setNewPassword("")
                  setResetPasswordUser(null)
                }}
                className="border-gray-300"
              >
                Cancelar
              </Button>
              <Button onClick={resetUserPassword} className="bg-blue-600 hover:bg-blue-700">
                Actualizar Contraseña
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Comentarios de Solicitud
              {selectedLoan && ` - ${selectedLoan.nombre} ${selectedLoan.apellido}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {loanComments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay comentarios para esta solicitud</p>
              ) : (
                loanComments.map((comment: any) => (
                  <div key={comment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.nombre} {comment.apellido}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 pt-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Agregar un comentario..."
                className="bg-white border-gray-300"
                rows={3}
              />
              <div className="flex gap-2 justify-end mt-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCommentsOpen(false)
                    setNewComment("")
                  }}
                  className="border-gray-300"
                >
                  Cancelar
                </Button>
                <Button onClick={addComment} className="bg-blue-600 hover:bg-blue-700">
                  Agregar Comentario
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================= */}
      {/* ============ NEW NOTIFICATION MODAL ============= */}
      {/* ================================================= */}
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones Administrativas
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} nuevas
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-4 bg-blue-50 p-4 rounded-lg">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    notification.read ? "bg-gray-50 border-gray-200" : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markNotificationAsRead(notification.id)
                    }

                    // Open corresponding modal based on type
                    if (notification.type === "payment_request") {
                      setSelectedPaymentForConfirm(notification.data)
                      setIsPaymentConfirmOpen(true)
                      setIsNotificationsOpen(false)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {notification.type === "new_user" && <UserPlus className="h-5 w-5 text-green-600" />}
                      {notification.type === "loan_request" && <FileText className="h-5 w-5 text-blue-600" />}
                      {notification.type === "company_request" && <Building2 className="h-5 w-5 text-purple-600" />}
                      {notification.type === "payment_request" && <Receipt className="h-5 w-5 text-orange-600" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 truncate">{notification.title}</h4>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      {!notification.read && (
                        <div className="flex items-center gap-1 mt-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span className="text-xs text-blue-600 font-medium">Nueva</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentConfirmOpen} onOpenChange={setIsPaymentConfirmOpen}>
        <DialogContent className="bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Confirmar Pago</DialogTitle>
          </DialogHeader>

          {selectedPaymentForConfirm && (
            <div className="space-y-4 pt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Detalles del Pago</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Usuario:</span>
                    <p>
                      {selectedPaymentForConfirm.user_name} {selectedPaymentForConfirm.user_lastname}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Monto:</span>
                    <p>{formatCurrency(selectedPaymentForConfirm.amount ?? selectedPaymentForConfirm.payment_amount ?? 0)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span>
                    <p>{selectedPaymentForConfirm.payment_type === "installment" ? "Cuota" : "Abono Extra"}</p>
                  </div>
                  <div>
                    <span className="font-medium">Recibo:</span>
                    <p>{selectedPaymentForConfirm.receipt_number}</p>
                  </div>
                </div>
                {selectedPaymentForConfirm.notes && (
                  <div className="mt-3">
                    <span className="font-medium">Notas del usuario:</span>
                    <p className="text-gray-700">{selectedPaymentForConfirm.notes}</p>
                  </div>
                )}
              </div>

              {/* Preview del Recibo */}
              {(() => {
                const receiptUrl = selectedPaymentForConfirm.receipt_url ||
                                 selectedPaymentForConfirm.receiptUrl ||
                                 selectedPaymentForConfirm.image_url ||
                                 selectedPaymentForConfirm.imageUrl ||
                                 selectedPaymentForConfirm.attachment_url ||
                                 selectedPaymentForConfirm.attachmentUrl ||
                                 selectedPaymentForConfirm.file_url ||
                                 selectedPaymentForConfirm.fileUrl ||
                                 selectedPaymentForConfirm.raw?.receipt_url ||
                                 selectedPaymentForConfirm.raw?.receiptUrl ||
                                 selectedPaymentForConfirm.raw?.image_url ||
                                 selectedPaymentForConfirm.raw?.imageUrl

                return receiptUrl ? (
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Recibo Adjunto
                    </h4>
                    <div className="flex justify-center">
                      <img
                        src={receiptUrl}
                        alt="Recibo de pago"
                        className="max-w-full h-auto max-h-96 border border-gray-300 rounded-lg shadow-sm"
                        onError={(e) => {
                          console.error("Error loading receipt image:", receiptUrl)
                          e.currentTarget.style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            parent.innerHTML = '<div class="text-center py-4 text-gray-500"><p class="text-sm">Error al cargar la imagen del recibo</p></div>'
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nota administrativa (opcional)</label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Agregar nota sobre la confirmación del pago..."
                  className="bg-white border-gray-300"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPaymentConfirmOpen(false)
                    setSelectedPaymentForConfirm(null)
                    setAdminNote("")
                  }}
                  className="border-gray-300"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => confirmPayment(selectedPaymentForConfirm.id, "confirm")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentRejectOpen} onOpenChange={setIsPaymentRejectOpen}>
        <DialogContent className="bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Rechazar Pago</DialogTitle>
          </DialogHeader>

          {selectedPaymentForReject && (
            <div className="space-y-4 pt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Detalles del Pago a Rechazar</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Usuario:</span>
                    <p>
                      {selectedPaymentForReject.user_name} {selectedPaymentForReject.user_lastname}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Monto:</span>
                    <p>{formatCurrency(selectedPaymentForReject.amount ?? selectedPaymentForReject.payment_amount ?? 0)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span>
                    <p>{selectedPaymentForReject.payment_type === "installment" ? "Cuota" : "Abono Extra"}</p>
                  </div>
                  <div>
                    <span className="font-medium">Recibo:</span>
                    <p>{selectedPaymentForReject.receipt_number}</p>
                  </div>
                </div>
                {selectedPaymentForReject.notes && (
                  <div className="mt-3">
                    <span className="font-medium">Notas del usuario:</span>
                    <p className="text-gray-700">{selectedPaymentForReject.notes}</p>
                  </div>
                )}
              </div>

              {(() => {
                const receiptUrl = selectedPaymentForReject.receipt_url ||
                                 selectedPaymentForReject.receiptUrl ||
                                 selectedPaymentForReject.image_url ||
                                 selectedPaymentForReject.imageUrl ||
                                 selectedPaymentForReject.attachment_url ||
                                 selectedPaymentForReject.attachmentUrl ||
                                 selectedPaymentForReject.file_url ||
                                 selectedPaymentForReject.fileUrl ||
                                 selectedPaymentForReject.raw?.receipt_url ||
                                 selectedPaymentForReject.raw?.receiptUrl ||
                                 selectedPaymentForReject.raw?.image_url ||
                                 selectedPaymentForReject.raw?.imageUrl

                return receiptUrl ? (
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Recibo Adjunto
                    </h4>
                    <div className="flex justify-center">
                      <img
                        src={receiptUrl}
                        alt="Recibo de pago"
                        className="max-w-full h-auto max-h-96 border border-gray-300 rounded-lg shadow-sm"
                        onError={(e) => {
                          console.error("Error loading receipt image:", receiptUrl)
                          e.currentTarget.style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            parent.innerHTML = '<div class="text-center py-4 text-gray-500"><p class="text-sm">Error al cargar la imagen del recibo</p></div>'
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Razón del rechazo</label>
                <Textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Explica por qué rechazas este pago. Se notificará al usuario..."
                  className="bg-white border-gray-300"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPaymentRejectOpen(false)
                    setSelectedPaymentForReject(null)
                    setRejectNote("")
                  }}
                  className="border-gray-300"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => rejectPaymentHandler(selectedPaymentForReject.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Confirmar Rechazo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Aplicar Pago / Abono (Admin)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Use the reusable client component inside the dashboard modal. */}
            <AdminApplyPayment
              activeLoans={activeLoans}
              preselectedLoan={selectedLoanForPayment}
              onSuccess={(data) => {
                // Refresh dashboard data after successful application
                fetchActiveLoans()
                fetchPendingPayments()
                fetchRecentInvoices()
                setLoanInstallmentsCache({})
                setIsAddPaymentOpen(false)
                setSelectedLoanForPayment(null)
                // If server returned an invoiceId or invoice object, open the invoice modal like other flows
                if (data) {
                  const invoiceId = data.invoiceId || data.invoice?.id
                  const invoiceObj = data.invoice
                  if (invoiceObj) {
                    const inv = normalizeInvoice(invoiceObj)
                    setSelectedInvoice(inv)
                    setSelectedInvoiceData(inv)
                    setIsInvoiceOpen(true)
                    setIsInvoiceModalOpen(true)
                  } else if (invoiceId) {
                    ;(async () => {
                      try {
                        const invRes = await fetch(`/api/invoices/${invoiceId}`)
                        if (invRes.ok) {
                          const invData = await invRes.json()
                          const inv = normalizeInvoice(invData)
                          setSelectedInvoice(inv)
                          setSelectedInvoiceData(inv)
                          setIsInvoiceOpen(true)
                          setIsInvoiceModalOpen(true)
                        }
                      } catch (e) {
                        console.error('Error fetching invoice after apply', e)
                      }
                    })()
                  }
                }

                
              }}
              onCancel={() => {
                setIsAddPaymentOpen(false)
                setSelectedLoanForPayment(null)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="max-w-md bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Factura Generada
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 pt-4">
              {/* Factura estilo móvil profesional */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-lg">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold">Joshper Solutions</h2>
                  <p className="text-blue-100 text-sm">Soluciones Financieras</p>
                </div>

                <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-100">Factura</span>
                    <span className="font-bold">{selectedInvoice.invoiceNumber ?? selectedInvoice.id ?? ""}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-100">Fecha</span>
                    <span className="font-medium">{selectedInvoice.date ? new Date(selectedInvoice.date).toLocaleDateString() : ""}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-blue-100">Cliente:</span>
                    <span className="font-medium">{selectedInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100">Concepto:</span>
                    <span className="font-medium">{selectedInvoice.description}</span>
                  </div>
                </div>

                <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-2xl font-bold">{formatCurrency(Number(selectedInvoice.amount ?? 0))}</span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => generateInvoicePDF(selectedInvoice)}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  onClick={() => shareInvoice(selectedInvoice)}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1"
                  size="sm"
                >
                  <Share2 className="h-4 w-4" />
                  Compartir
                </Button>
                <Button
                  onClick={() => printInvoice(selectedInvoice)}
                  className="bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-1"
                  size="sm"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>

              <div className="text-center pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setIsInvoiceOpen(false)} className="border-gray-300">
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isReceiptsOpen} onOpenChange={setIsReceiptsOpen}>
        <DialogContent className="max-w-4xl bg-white shadow-2xl border-0">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Recibos de Cobros Manuales</DialogTitle>
          </DialogHeader>

          <div className="pt-4">
            {adminReceipts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No hay recibos de cobros manuales</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Recibo #</th>
                      <th>Recaudador</th>
                      <th>Cliente</th>
                      <th>Monto</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminReceipts.map((r: any) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 px-2">{r.invoice_number}</td>
                        <td className="py-2 px-2">{r.collected_by_name} {r.collected_by_lastname}</td>
                        <td className="py-2 px-2">{r.user_name} {r.user_lastname}</td>
                        <td className="py-2 px-2">{formatCurrency(r.payment_amount)}</td>
                        <td className="py-2 px-2">{formatDate(r.payment_date)}</td>
                        <td className="py-2 px-2">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => viewInvoice(r.id)}>Ver Factura</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsReceiptsOpen(false)} className="border-gray-300">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedInvoiceData && (
        <ProfessionalInvoice
          isOpen={isInvoiceModalOpen}
          onClose={handleCloseInvoice}
          invoiceData={selectedInvoiceData}
        />
      )}

      {/* Small result dialog after rejecting a loan application */}
      {showLoanRejectResult && loanRejectResultData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLoanRejectResult(false)} />
          <div className="bg-white rounded-lg p-6 z-10 w-full max-w-xl">
            <h3 className="text-lg font-semibold mb-2">La solicitud de préstamo ha sido rechazada</h3>
            <div className="space-y-2 text-sm">
              <div><strong>ID:</strong> {loanRejectResultData.id}</div>
              <div><strong>Monto:</strong> RD${Number(loanRejectResultData.monto ?? loanRejectResultData.amount ?? loanRejectResultData.original_amount ?? 0).toFixed(2)}</div>
              <div><strong>Plazo:</strong> {loanRejectResultData.plazo ?? loanRejectResultData.term ?? 'N/A'}</div>
              <div><strong>Frecuencia:</strong> {loanRejectResultData.frecuencia ?? loanRejectResultData.frequency ?? 'N/A'}</div>
              <div><strong>Documento:</strong> {loanRejectResultData.documento ?? loanRejectResultData.document ?? 'N/A'}</div>
              <div><strong>Motivo:</strong> {loanRejectResultData.reason ?? loanRejectResultData.rejection_note ?? 'Sin especificar'}</div>
            </div>
            <div className="mt-4 text-right">
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => setShowLoanRejectResult(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Shared reject modal used for loans/companies */}
      <ProjectPrompt
        open={rejectModalOpen}
        title={rejectTarget?.type === 'loan' ? 'Rechazar Solicitud' : 'Rechazar Empresa'}
        description="Ingresa la razón por la cual rechazas este elemento."
        placeholder="Razón..."
        onOpenChange={(o) => !o && setRejectModalOpen(false)}
        onConfirm={confirmReject}
        onCancel={() => { setRejectModalOpen(false); setRejectTarget(null) }}
      />
      <ProjectPrompt
        open={deleteModalOpen}
        title="Eliminar Usuario"
        description="¿Estás seguro de que deseas eliminar este usuario? Opcionalmente agrega una nota."
        placeholder="Razón (opcional)..."
        onOpenChange={(o) => !o && setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalOpen(false); setDeleteUserTarget(null) }}
      />
    </div>
  )
}
