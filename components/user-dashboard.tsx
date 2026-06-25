"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import {
  Plus,
  FileText,
  Calculator,
  Building,
  TrendingUp,
  Clock,
  CheckCircle,
  MessageSquare,
  Eye,
  Send,
  Bell,
  BellRing,
} from "lucide-react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// UI
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// (Puedes mantener tu simulador y registro de empresas como estaban, no se tocan)
import LoanSimulator from "@/components/loan-simulator"
import CompanyRegistration from "@/components/company-registration"
import LoanRequestForm from "@/components/loan-request-form"
import CompaniesAssociated from "@/components/companies-associated"

/** =========================
  import CompanyRegistration from "./company-registration"
 * ========================= */
interface LoanApplication {
  id: number
  empresa?: string
  monto: number
  plazo?: number // en meses
  frecuencia?: "mensual" | "quincenal" | string
  tasa_anual?: number // si tu API lo envía, mejor
  estado: "pendiente" | "aprobado" | "rechazado" | string

  // Campos que pueden venir desde API para préstamos activos
  installment_amount?: number // monto de la cuota regular
  total_installments?: number // total de cuotas del préstamo
  paid_installments?: number // cuotas ya pagadas (aprobadas)
  remaining_installments?: number // cuotas restantes
  next_installment_amount?: number // monto de próxima cuota (si varía)

  created_at: string
  approved_at?: string | null
  next_payment_date?: string | null

  // legacy / alternate field names that backend may return
  remaining_amount?: number
  remaining?: number
  remainingAmount?: number
  paidInstallments?: number
  paid?: number
  total_paid?: number
  paid_amount?: number
  paidAmount?: number
}

interface AdminComment {
  id: number
  loan_id: number
  comment: string
  created_at: string
  nombre?: string
  apellido?: string
}

// Notification item used in the notifications bell
type NotificationItem = {
  id: string
  type: string
  title: string
  description?: string
  loanId?: number
  date?: string
  is_read?: boolean
  raw?: any
  link?: string | null
}

interface UserDashboardProps {
  user: {
    id: number
    nombre: string
    apellido: string
    email: string
    cedula_pasaporte: string
    numero_celular: string
    is_admin: boolean
    can_request_loans: boolean
    can_associate_companies: boolean
  }
}


/** Helpers de fechas */
const toDate = (v?: string | null) => (v ? new Date(v) : undefined)
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + n)
  return nd
}
const addMonths = (d: Date, n: number) => {
  const nd = new Date(d)
  nd.setMonth(nd.getMonth() + n)
  return nd
}
const diffDays = (a: Date, b: Date) =>
  Math.ceil((startOfDay(a).getTime() - startOfDay(b).getTime()) / (24 * 3600 * 1000))
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/** Keys de localStorage por usuario */
const lsKeys = {
  readComments: (userId: number) => `ls:${userId}:readAdminComments`,
  dailyReminder: (userId: number) => `ls:${userId}:paymentReminderShown`,
}

/** =========================
 * Cálculos financieros
 * ========================= */

/** cuota fija por período (francés) */
function calcFixedInstallment(principal: number, ratePerPeriod: number, periods: number) {
  if (principal <= 0 || periods <= 0) return 0
  if (ratePerPeriod <= 0) return principal / periods
  const q = Math.pow(1 + ratePerPeriod, periods)
  return (principal * ratePerPeriod * q) / (q - 1)
}

/** Construir tabla de amortización */
function buildAmortizationSchedule(opts: {
  monto: number
  plazoMeses: number
  tasaAnual: number
  frecuencia: "mensual" | "quincenal"
}) {
  const { monto, plazoMeses, tasaAnual, frecuencia } = opts
  const periods = frecuencia === "quincenal" ? plazoMeses * 2 : plazoMeses
  const ratePerPeriod = frecuencia === "quincenal" ? tasaAnual / 100 / 24 : tasaAnual / 100 / 12

  const installment = calcFixedInstallment(monto, ratePerPeriod, periods)
  let balance = monto
  const rows: {
    n: number
    saldoAnterior: number
    interes: number
    capital: number
    cuota: number
    saldoRestante: number
  }[] = []

  for (let i = 1; i <= periods; i++) {
    const interes = balance * ratePerPeriod
    const capital = Math.max(0, installment - interes)
    const saldoRestante = Math.max(0, balance - capital)
    rows.push({
      n: i,
      saldoAnterior: balance,
      interes,
      capital,
      cuota: capital + interes,
      saldoRestante,
    })
    balance = saldoRestante
  }

  const total = rows.reduce((s, r) => s + r.cuota, 0)
  const interesesTotales = total - monto
  return {
    periods,
    installment,
    total,
    interesesTotales,
    rows,
  }
}

/** Derivar contadores de cuotas y próxima cuota cuando API no las da */
function deriveInstallmentInfo(loan: LoanApplication) {
  const total =
    loan.total_installments ??
    (loan.plazo ? (loan.frecuencia?.toLowerCase() === "quincenal" ? loan.plazo * 2 : loan.plazo) : undefined)

  const tasa = loan.tasa_anual ?? 24 // valor por defecto si no viene; AJUSTA a tu negocio
  const schedule = buildAmortizationSchedule({
    monto: loan.monto,
    plazoMeses: loan.plazo ?? 0,
    tasaAnual: tasa,
    frecuencia: (loan.frecuencia?.toLowerCase() as any) === "quincenal" ? "quincenal" : "mensual",
  })

  const cuota = loan.installment_amount ?? schedule.installment
  // si no tenemos info real de pagos, estimamos pagadas por fecha
  let paid = loan.paid_installments
  if (paid == null) {
    const base = toDate(loan.approved_at ?? loan.created_at)
    if (base) {
      const now = new Date()
      const msPer = loan.frecuencia?.toLowerCase() === "quincenal" ? 1000 * 60 * 60 * 24 * 15 : 1000 * 60 * 60 * 24 * 30
      const est = Math.max(0, Math.floor((now.getTime() - base.getTime()) / msPer))
      paid = Math.min(est, schedule.periods)
    } else {
      paid = 0
    }
  }

  const remaining =
    loan.remaining_installments ?? (total != null && paid != null ? Math.max(total - paid, 0) : undefined)

  const nextAmount = loan.next_installment_amount ?? cuota

  return {
    total_installments: total ?? schedule.periods,
    paid_installments: paid ?? 0,
    remaining_installments: remaining ?? Math.max((total ?? schedule.periods) - (paid ?? 0), 0),
    installment_amount: cuota,
    next_installment_amount: nextAmount,
  }
}

/** =========================
 * Formulario inline con simulación (actualizado)
 * ========================= */
function LoanRequestFormInline({ user, onSubmitted }: { user: UserDashboardProps["user"]; onSubmitted?: () => void }) {
  return <LoanRequestForm user={user as any} onSubmitted={onSubmitted} />
}

/** =========================
 * Componente principal
 * ========================= */
export default function UserDashboard({ user }: UserDashboardProps) {
  console.log("User recibido:", user)
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([])
  const [simulations, setSimulations] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"overview" | "loans" | "simulator" | "company">("overview")
  const [showNewLoanForm, setShowNewLoanForm] = useState(false)

  // Comentarios del admin
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null)
  const [loanComments, setLoanComments] = useState<AdminComment[]>([])
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)

  // Detalles
  const [selectedLoanDetails, setSelectedLoanDetails] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Pagos
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<LoanApplication | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentType, setPaymentType] = useState<string>("installment")
  const [paymentNotes, setPaymentNotes] = useState<string>("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false)
  // track a recently-submitted payment to poll for admin approval
  const [pendingPaymentLoanId, setPendingPaymentLoanId] = useState<number | null>(null)
  const pendingPollAttemptsRef = useRef<number>(0)
  const previousLoanSnapshotRef = useRef<Record<number, any>>({})

  // Notificaciones
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [commentsByLoan, setCommentsByLoan] = useState<Record<number, AdminComment[]>>({})
  const [unreadByLoan, setUnreadByLoan] = useState<Record<number, number>>({})
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([])
  const [showAdminDenialModal, setShowAdminDenialModal] = useState(false)
  const [adminDenialNotification, setAdminDenialNotification] = useState<NotificationItem | null>(null)
  // track previous loan statuses to detect transitions (pendiente -> aprobado/rechazado)
  const prevLoanStatusRef = useRef<Record<number, string>>({})
  // Mora notification state
  const [moraNotifications, setMoraNotifications] = useState<Record<number, boolean>>({})
  // Overdue modal state
  const [showOverdueModal, setShowOverdueModal] = useState(false)
  const [overdueLoan, setOverdueLoan] = useState<LoanApplication | null>(null)

  const notifPanelRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()

  // keep previous loans snapshot to detect transitions (approved, payment confirmed, completed)
  const prevLoansRef = useRef<Record<number, LoanApplication | undefined>>({})
  const initialLoansLoadedRef = useRef<boolean>(true)

  const pushLocalNotification = (item: NotificationItem) => {
    setNotificationItems((prev) => {
      // avoid duplicates by id
      if (prev.some((p) => p.id === item.id)) return prev
      return [item, ...prev]
    })
  }

  // server-backed notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
        if (data?.notifications) {
        // map DB rows to NotificationItem shape
        const items: NotificationItem[] = (data.notifications || []).map((n: any) => ({
          id: String(n.id),
          // normalize server types: admin_comment -> comment for UI
          type: (n.type === 'admin_comment' ? 'comment' : (n.type ?? 'notification')),
          title: n.message,
          description: n.message,
          loanId: n.loan_id,
          date: n.created_at,
          is_read: !!n.is_read,
          raw: n,
          link: n.link ?? n.receipt_url ?? null,
        }))
        setNotificationItems(items)
        // if any notification references a loan, refresh loans so UI shows updated next_payment_date / paid counts
        const hasLoanRef = (items || []).some((it) => !!it.loanId)
        if (hasLoanRef) {
          // refresh loans to pick up updated next_payment_date and counters
          fetchLoanApplications().catch(() => {})
        }
        // Check for unread admin rejection notifications and show a one-time modal
        try {
          // Detect admin-created rejection notifications (mapped to 'comment') where message contains 'rechaz'
          const unreadRejection = items.find((it) => !it.is_read && (it.type === 'comment' || String(it.raw?.type) === 'admin_comment') && /rechaz/i.test(String(it.description || '')))
          if (unreadRejection) {
            setAdminDenialNotification(unreadRejection)
            setShowAdminDenialModal(true)
            // do not mark read here; wait for user to dismiss so it's the "first visit" experience
          }
        } catch (e) {
          console.error('Error checking rejection notifications', e)
        }
      }
    } catch (e) {
      console.error('Error fetching notifications', e)
    }
  }

  const markNotificationRead = async (notificationId: number) => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      if (!res.ok) return
      // refresh notifications
      await fetchNotifications()
    } catch (e) {
      console.error('Error marking notification read', e)
    }
  }

  const handleDismissAdminDenial = async () => {
    if (!adminDenialNotification) {
      setShowAdminDenialModal(false)
      return
    }
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: Number(adminDenialNotification.id) }),
      })
    } catch (e) {
      console.error('Error marking admin denial read', e)
    } finally {
      setShowAdminDenialModal(false)
      setAdminDenialNotification(null)
      // refresh notifications panel
      fetchNotifications().catch(() => {})
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', { method: 'PUT' })
      if (!res.ok) return
      await fetchNotifications()
    } catch (e) {
      console.error('Error marking all notifications read', e)
    }
  }

  /** =========================
   * Effects: carga inicial
   * ========================= */
  useEffect(() => {
    fetchLoanApplications()
    fetchSimulations()
  }, [])

  /** Cargar préstamos */
  const fetchLoanApplications = async () => {
    try {
      const response = await fetch("/api/loan-applications")
      if (response.ok) {
        const data: LoanApplication[] = await response.json()
        const list = Array.isArray(data) ? data : []
        // detect transitions vs previous snapshot
        try {
          list.forEach((loan) => {
            const prev = prevLoansRef.current[loan.id]
            if (prev) {
              // detect approval
              if (prev.estado === "pendiente" && loan.estado === "aprobado") {
                pushLocalNotification({
                  id: `status:${loan.id}:${Date.now()}`,
                  type: "status",
                  title: "Tu solicitud fue aprobada",
                  description: `Préstamo #${loan.id} ha sido aprobado por el administrador`,
                  loanId: loan.id,
                  date: loan.approved_at ?? new Date().toISOString(),
                })
              }
              // detect payment confirmed by admin: paid_installments increased or total_paid increased or remaining decreased
              const prevPaid = Number(prev.paid_installments ?? prev.paid ?? 0)
              const curPaid = Number(loan.paid_installments ?? loan.paid ?? 0)
              const prevRemaining = Number(prev.remaining_installments ?? prev.remaining ?? 0)
              const curRemaining = Number(loan.remaining_installments ?? loan.remaining ?? 0)
              const prevTotalPaid = Number(prev.total_paid ?? prev.paid_amount ?? 0)
              const curTotalPaid = Number(loan.total_paid ?? loan.paid_amount ?? 0)
              if (curPaid > prevPaid || curTotalPaid > prevTotalPaid || (curRemaining < prevRemaining && curRemaining >= 0)) {
                pushLocalNotification({
                  id: `payment:${loan.id}:${Date.now()}`,
                  type: "payment",
                  title: "Pago confirmado",
                  description: `Un pago fue confirmado para tu préstamo #${loan.id}`,
                  loanId: loan.id,
                  date: new Date().toISOString(),
                })
              }
              // detect completion
              const total = Number(loan.total_installments ?? 0)
              if (total > 0 && curPaid >= total && (prev.paid_installments ?? 0) < total) {
                pushLocalNotification({
                  id: `completed:${loan.id}:${Date.now()}`,
                  type: "completed",
                  title: "Préstamo pagado",
                  description: `Has completado todas las cuotas del préstamo #${loan.id}`,
                  loanId: loan.id,
                  date: new Date().toISOString(),
                })
              }
            }
            // update snapshot
            prevLoansRef.current[loan.id] = { ...loan }
          })
        } catch (e) {
          // ignore
        }

        setLoanApplications(list)
      } else {
        setLoanApplications([])
      }
    } catch (error) {
      console.error("Error fetching loan applications:", error)
      setLoanApplications([])
    }
  }

  /** Cargar simulaciones */
  const fetchSimulations = async () => {
    try {
      const response = await fetch("/api/loan-simulations")
      if (response.ok) {
        const data = await response.json()
        setSimulations(Array.isArray(data) ? data : [])
      } else {
        setSimulations([])
      }
    } catch (error) {
      console.error("Error fetching simulations:", error)
      setSimulations([])
    }
  }

  /** Cargar todos los comentarios de todos los préstamos del usuario */
  useEffect(() => {
    const loadAllComments = async () => {
      if (!loanApplications?.length) {
        setCommentsByLoan({})
        return
      }
      try {
        const results = await Promise.all(
          loanApplications.map(async (l) => {
            try {
              const res = await fetch(`/api/admin/loan-applications/${l.id}/comments`)
              if (!res.ok) return [l.id, []] as [number, AdminComment[]]
              const rows = (await res.json()) as AdminComment[]
              return [l.id, Array.isArray(rows) ? rows : []] as [number, AdminComment[]]
            } catch {
              return [l.id, []] as [number, AdminComment[]]
            }
          }),
        )
        const map: Record<number, AdminComment[]> = {}
        results.forEach(([loanId, rows]) => {
          map[loanId] = rows
        })
        setCommentsByLoan(map)
      } catch (e) {
        console.error(e)
        setCommentsByLoan({})
      }
    }
    loadAllComments()
  }, [loanApplications])

  /** Calcular "no leídos" usando localStorage */
  useEffect(() => {
    const readMapRaw = localStorage.getItem(lsKeys.readComments(user?.id))
    const readMap: Record<number, number[]> = readMapRaw ? JSON.parse(readMapRaw) : {}

    const unread: Record<number, number> = {}
    Object.entries(commentsByLoan || {}).forEach(([loanIdStr, comments]) => {
      const loanId = Number(loanIdStr)
      const readIds = new Set(readMap[loanId] || [])
      const count = (comments || []).filter((c) => !readIds.has(c.id)).length
      unread[loanId] = count
    })
    setUnreadByLoan(unread)
  }, [commentsByLoan, user?.id])

  /** Construir notificaciones */
  useEffect(() => {
    const commentNotifs: {
      id: string
      type: "comment"
      title: string
      description?: string
      loanId: number
      date?: string
    }[] = []
    Object.entries(unreadByLoan || {}).forEach(([loanIdStr, count]) => {
      const loanId = Number(loanIdStr)
      if (count > 0) {
        const last = (commentsByLoan[loanId] || []).slice(-1)[0]
        commentNotifs.push({
          id: `c:${loanId}:${last?.id ?? Date.now()}`,
          type: "comment",
          title: `${count} comentario${count > 1 ? "s" : ""} del administrador`,
          description: `Solicitud #${loanId}${last?.created_at ? ` · ${new Date(last.created_at).toLocaleDateString("es-DO")}` : ""}`,
          loanId,
          date: last?.created_at,
        })
      }
    })

    const today = startOfDay(new Date())
    const paymentNotifs: {
      id: string
      type: "payment"
      title: string
      description?: string
      loanId: number
      date?: string
    }[] = (loanApplications || [])
      .map((loan) => {
        const next = computeNextPaymentDate(loan)
        if (!next) return null
        const days = diffDays(next, today)
        if (days >= 0 && days <= 3) {
          return {
            id: `p:${loan.id}:${isoDate(next)}`,
            type: "payment" as const,
            title: days === 0 ? "¡Pago vence hoy!" : `Pago vence en ${days} día${days === 1 ? "" : "s"}`,
            description: `${loan.empresa ?? `Préstamo #${loan.id}`} · ${next.toLocaleDateString("es-DO")}`,
            loanId: loan.id,
            date: isoDate(next),
          }
        }
        return null
      })
      .filter(Boolean) as any[]

    // Add overdue notifications
    const overdueNotifs: {
      id: string
      type: "payment"
      title: string
      description?: string
      loanId: number
      date?: string
    }[] = []
    loanApplications
      .filter((loan) => loan.estado === "aprobado")
      .forEach((loan) => {
        const next = computeNextPaymentDate(loan)
        if (next && next < today) {
          const daysOverdue = diffDays(today, next)
          if (daysOverdue > 0) {
            overdueNotifs.push({
              id: `overdue:${loan.id}:${isoDate(next)}`,
              type: "payment" as const,
              title: `¡Pago atrasado! ${daysOverdue} día${daysOverdue === 1 ? '' : 's'} de retraso`,
              description: `${loan.empresa ?? `Préstamo #${loan.id}`} · Mora aplicada`,
              loanId: loan.id,
              date: isoDate(next),
            })
          }
        }
      })

    // Merge derived comment/payment/overdue reminders into existing notifications, avoiding duplicates.
    ;(commentNotifs as any[])
      .concat(paymentNotifs as any[])
      .concat(overdueNotifs as any[])
      .forEach((n) => {
        setNotificationItems((prev) => {
          if (prev.some((p) => p.id === n.id)) return prev
          return [n, ...prev]
        })
      })
  }, [loanApplications, unreadByLoan, commentsByLoan])

  /**
   * Polling for changes: fetch loans and comments periodically to detect
   * - status transitions (pendiente -> aprobado/rechazado)
   * - new admin comments (we already compute unread using localStorage, but
   *   we want the bell to show an item when a new comment arrives)
   */
  // fetch server notifications on mount
  useEffect(() => {
    fetchNotifications().catch(() => {})
  }, [])

  // Poll notifications periodically so that admin-created notifications (e.g., payment confirmations)
  // are detected and trigger a loans refresh automatically.
  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchNotifications().catch(() => {})
    }, 5000)
    return () => window.clearInterval(interval)
  }, [])

  // When loans or comments update, compute transient notifications for
  // status changes and new comments, and merge with existing notificationItems.
  // we now rely on server notifications (created by admin endpoints). Keep local derived notifications as a fallback.

  /** Toast diario para pagos próximos y mora */
  useEffect(() => {
    if (!notificationItems?.length) return
    const todayISO = isoDate(new Date())
    const reminderRaw = localStorage.getItem(lsKeys.dailyReminder(user?.id))
    const reminderMap: Record<number, string> = reminderRaw ? JSON.parse(reminderRaw) : {}

    notificationItems
      .filter((n) => n.type === "payment" && n.loanId)
      .forEach((n) => {
        const loanId = n.loanId as number
        if (reminderMap[loanId] !== todayISO) {
          toast({ title: n.title, description: n.description ?? "" })
          reminderMap[loanId] = todayISO
        }
      })

    // Check for overdue payments (mora)
    const today = startOfDay(new Date())
    loanApplications
      .filter((loan) => loan.estado === "aprobado")
      .forEach((loan) => {
        const next = computeNextPaymentDate(loan)
        if (next && next < today) {
          const daysOverdue = diffDays(today, next)
          if (daysOverdue > 0 && !moraNotifications[loan.id]) {
            toast({
              title: "¡Pago atrasado!",
              description: `Tu préstamo #${loan.id} tiene ${daysOverdue} día${daysOverdue === 1 ? '' : 's'} de retraso. Se aplicarán intereses de mora.`,
              variant: "destructive"
            })
            setMoraNotifications(prev => ({ ...prev, [loan.id]: true }))
            // Show overdue modal on day 30
            if (daysOverdue >= 30) {
              setOverdueLoan(loan)
              setShowOverdueModal(true)
            }
          }
        }
      })

    localStorage.setItem(lsKeys.dailyReminder(user?.id), JSON.stringify(reminderMap))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationItems, loanApplications, moraNotifications])

  /** Cerrar panel si se hace click fuera */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!showNotifPanel) return
      const el = notifPanelRef.current
      if (el && !el.contains(e.target as Node)) {
        setShowNotifPanel(false)
      }
    }
    window.addEventListener("click", onClick)
    return () => window.removeEventListener("click", onClick)
  }, [showNotifPanel])

  /** =========================
   * Acciones
   * ========================= */
  const fetchLoanComments = async (loanId: number) => {
    try {
      const response = await fetch(`/api/admin/loan-applications/${loanId}/comments`)
      if (response.ok) {
        const data = (await response.json()) as AdminComment[]
        setLoanComments(Array.isArray(data) ? data : [])
      } else {
        setLoanComments([])
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
      setLoanComments([])
    }
  }

  const viewLoanDetails = async (loanId: number) => {
    try {
      const response = await fetch(`/api/admin/loan-applications/${loanId}/details`)
      if (response.ok) {
        const data = await response.json()
        setSelectedLoanDetails(data ?? {})
        setIsDetailsOpen(true)
      }
    } catch (error) {
      console.error("Error fetching loan details:", error)
    }
  }
  const openComments = async (loan: LoanApplication) => {
    setSelectedLoan(loan)
    await fetchLoanComments(loan.id)
    setIsCommentsOpen(true)

    const readRaw = localStorage.getItem(lsKeys.readComments(user?.id))
    const readMap: Record<number, number[]> = readRaw ? JSON.parse(readRaw) : {}
    const current = (commentsByLoan[loan.id] || []).map((c) => c.id)
    const setIds = new Set([...(readMap[loan.id] || []), ...current])
    readMap[loan.id] = Array.from(setIds)
    localStorage.setItem(lsKeys.readComments(user?.id), JSON.stringify(readMap))
    setUnreadByLoan((prev) => ({ ...prev, [loan.id]: 0 }))
  }

  const openPayModal = (loan: LoanApplication | null = null) => {
    setSelectedLoanForPayment(loan)
    if (loan?.installment_amount || loan?.next_installment_amount) {
      setPaymentAmount(String(loan.next_installment_amount ?? loan.installment_amount))
    } else {
      setPaymentAmount("")
    }
    setPaymentType("installment")
    setPaymentNotes("")
    setReceiptFile(null)
    setIsPayModalOpen(true)
  }

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setReceiptFile(file)
      // Create preview URL for images or PDFs
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        const url = URL.createObjectURL(file)
        setReceiptPreviewUrl(url)
      } else {
        setReceiptPreviewUrl(null)
      }
    } else {
      setReceiptFile(null)
      setReceiptPreviewUrl(null)
    }
  }

  const submitPayment = async () => {
    if (!selectedLoanForPayment) {
      toast({ title: "Error", description: "Selecciona un préstamo", variant: "destructive" })
      return
    }
    const amountNum = Number(paymentAmount)
    if (!paymentAmount || isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Error", description: "Ingresa un monto válido", variant: "destructive" })
      return
    }
    if (!receiptFile) {
      toast({ title: "Error", description: "Debes adjuntar un recibo", variant: "destructive" })
      return
    }

    setIsSubmittingPayment(true)
    try {
      const fd = new FormData()
      // --- CORRECCIÓN: Usar 'type' en lugar de 'paymentType' ---
      fd.append("loanId", String(selectedLoanForPayment.id))
      fd.append("amount", paymentAmount)
      fd.append("type", paymentType) // <-- Cambio clave aquí
      fd.append("paymentDate", new Date().toISOString())
      if (paymentNotes) fd.append("notes", paymentNotes)
      if (receiptFile) fd.append("receiptFile", receiptFile)

      const res = await fetch("/api/payments", { method: "POST", body: fd })

      if (res.ok) {
        toast({ title: "Pago enviado", description: "Tu pago quedó en espera de confirmación del admin" })
        setIsPayModalOpen(false)
        setPaymentAmount("")
        setPaymentNotes("")
        setReceiptFile(null)
        // Keep selectedLoanForPayment so user can reference; start polling to detect admin approval
        const loanId = selectedLoanForPayment?.id ?? null
        if (loanId != null) {
          // store snapshot before refresh
          const currentLoan = (loanApplications || []).find((l) => l.id === loanId)
          if (currentLoan) previousLoanSnapshotRef.current[loanId] = { ...currentLoan }
          setPendingPaymentLoanId(loanId)
          pendingPollAttemptsRef.current = 0
        }
        fetchLoanApplications()
      } else {
        const err = await res.json().catch(() => ({ error: "Error desconocido" }))
        toast({ title: "Error", description: err.error || "No se pudo registrar el pago", variant: "destructive" })
      }
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "Error al enviar el pago", variant: "destructive" })
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  // Polling: when a payment was submitted, poll loans until admin approves (or timeout)
  useEffect(() => {
    if (!pendingPaymentLoanId) return

    let interval: number | null = null
    const startPolling = () => {
      // call immediately once to speed up detection
      fetchLoanApplications().catch(() => {})
      interval = window.setInterval(async () => {
        try {
          pendingPollAttemptsRef.current = (pendingPollAttemptsRef.current || 0) + 1
          await fetchLoanApplications()
        } catch (e) {
          // ignore
        }
      }, 5000)
    }

    // start immediate polling
    startPolling()

    return () => {
      if (interval != null) window.clearInterval(interval)
    }
  }, [pendingPaymentLoanId])

  // detect approval by comparing snapshots after each loans refresh
  useEffect(() => {
    if (!pendingPaymentLoanId) return
    const loanId = pendingPaymentLoanId
    const prev = previousLoanSnapshotRef.current[loanId]
    const current = (loanApplications || []).find((l) => l.id === loanId)
    if (!current) return

    // compare remaining_amount, paid_installments or total_paid
    const prevRemaining = Number(prev?.remaining_amount ?? prev?.remaining ?? prev?.remainingAmount ?? 0)
    const currRemaining = Number(current?.remaining_amount ?? current?.remaining ?? current?.remainingAmount ?? 0)
    const prevPaidCount = Number(prev?.paid_installments ?? prev?.paidInstallments ?? prev?.paid ?? 0)
    const currPaidCount = Number(current?.paid_installments ?? current?.paidInstallments ?? current?.paid ?? 0)
    const prevTotalPaid = Number(prev?.total_paid ?? prev?.paid_amount ?? prev?.paidAmount ?? 0)
    const currTotalPaid = Number(current?.total_paid ?? current?.paid_amount ?? current?.paidAmount ?? 0)

    const approved =
      (currRemaining && prevRemaining && currRemaining < prevRemaining) ||
      (currPaidCount && currPaidCount > prevPaidCount) ||
      (currTotalPaid && currTotalPaid > prevTotalPaid)

    // also stop after some attempts (~1 minute)
    if (approved) {
      toast({ title: "Pago aprobado", description: "El pago fue aprobado y el monto se actualizó" })
      // update UI: refresh selected loan data so the payment modal shows updated remaining/next installment
      const updatedLoan = current
      if (updatedLoan) {
        // update the selected loan for payment if it's the same loan
        setSelectedLoanForPayment((prev) => (prev && prev.id === loanId ? { ...prev, ...updatedLoan } : prev))
        // update paymentAmount to the new next_installment_amount or installment_amount
        const newAmount =
          updatedLoan.next_installment_amount ?? updatedLoan.installment_amount ?? updatedLoan.installment_amount ?? null
        if (newAmount != null) setPaymentAmount(String(newAmount))
      }
      setPendingPaymentLoanId(null)
      delete previousLoanSnapshotRef.current[loanId]
      pendingPollAttemptsRef.current = 0
    } else if ((pendingPollAttemptsRef.current || 0) > 12) {
      // give up after ~1 minute (12 * 5s)
      setPendingPaymentLoanId(null)
      pendingPollAttemptsRef.current = 0
      delete previousLoanSnapshotRef.current[loanId]
    }
  }, [loanApplications, pendingPaymentLoanId])

  /** =========================
   * Derivados y helpers
   * ========================= */
  const getStatusBadge = (status: string) => {
    const variants = { pendiente: "status-pending", aprobado: "status-approved", rechazado: "status-rejected" }
    return variants[status as keyof typeof variants] || variants.pendiente
  }
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount ?? 0)
  const formatDate = (dateString?: string) => (dateString ? new Date(dateString).toLocaleDateString("es-DO") : "-")

  const getStats = () => {
    const totalLoans = loanApplications?.length ?? 0
    const approvedLoans = (loanApplications || []).filter((loan) => loan.estado === "aprobado").length
    const pendingLoans = (loanApplications || []).filter((loan) => loan.estado === "pendiente").length
    const totalAmount = (loanApplications || [])
      .filter((loan) => loan.estado === "aprobado")
      .reduce((sum, loan) => sum + (loan.monto || 0), 0)
    return { totalLoans, approvedLoans, pendingLoans, totalAmount }
  }
  const stats = getStats()

  function computeNextPaymentDate(loan?: LoanApplication | null): Date | undefined {
    if (!loan) return undefined
    const now = startOfDay(new Date())
    const byApi = toDate(loan.next_payment_date ?? null)
    if (byApi && !isNaN(byApi.getTime())) return startOfDay(byApi)
    const base = toDate(loan.approved_at ?? loan.created_at)
    if (!base || isNaN(base.getTime())) return undefined
    const freq = (loan.frecuencia || "").toLowerCase()
    if (freq === "quincenal") {
      let candidate = startOfDay(base)
      while (candidate < now) candidate = addDays(candidate, 15)
      return candidate
    }
    const day = base.getDate()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), day)
    if (thisMonth >= now) return thisMonth
    return addMonths(thisMonth, 1)
  }

  function daysUntilNextPayment(loan?: LoanApplication | null) {
    const next = computeNextPaymentDate(loan)
    if (!next) return undefined
    return diffDays(next, startOfDay(new Date()))
  }

  const totalUnreadComments = useMemo(
    () => Object.values(unreadByLoan || {}).reduce((a, b) => a + b, 0),
    [unreadByLoan],
  )

  const paymentDueSoonCount = useMemo(() => {
    const today = startOfDay(new Date())
    return (loanApplications || []).reduce((acc, loan) => {
      const next = computeNextPaymentDate(loan)
      if (!next) return acc
      const days = diffDays(next, today)
      return acc + (days >= 0 && days <= 3 ? 1 : 0)
    }, 0)
  }, [loanApplications])

  const overdueLoansCount = useMemo(() => {
    const today = startOfDay(new Date())
    return (loanApplications || []).reduce((acc, loan) => {
      const next = computeNextPaymentDate(loan)
      if (!next) return acc
      const days = diffDays(today, next)
      return acc + (days > 0 ? 1 : 0)
    }, 0)
  }, [loanApplications])

  const notifCount = totalUnreadComments + paymentDueSoonCount + overdueLoansCount

  /** =========================
   * Render
   * ========================= */
  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div className="main-header relative">
        <div className="content-container">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 flex items-center justify-center">
              <Image src="/logo_joshper.png" alt="Joshper Solutions" width={150} height={75} />
            </div>

            {/* Campanita */}
            <div className="relative" ref={notifPanelRef}>
              <button
                type="button"
                className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowNotifPanel((v) => !v)
                }}
                aria-label="Notificaciones"
                title="Notificaciones"
              >
                {notifCount > 0 ? <BellRing className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                {notifCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "#ef4444", color: "white" }}
                  >
                    {notifCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl border bg-white z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="text-sm font-semibold text-gray-900">Notificaciones</div>
                    <div className="text-xs text-gray-600">Comentarios del admin y próximos pagos</div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500 text-center">Sin notificaciones</div>
                    ) : (
                      notificationItems.map((n) => (
                        <div
                          key={n.id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b transition-colors"
                          onClick={() => {
                            if (n.type === "comment" && n.loanId) {
                              const loan = loanApplications.find((l) => l.id === n.loanId)
                              if (loan) openComments(loan)
                            }
                            if (n.type === "payment" && n.loanId) {
                              const loan = loanApplications.find((l) => l.id === n.loanId) || null
                              openPayModal(loan)
                            }
                            setShowNotifPanel(false)
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                n.type === "comment" ? "bg-blue-500" : "bg-orange-500"
                              }`}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                {n.type === "comment" ? "💬 Comentario del administrador" : "⏰ Pago próximo"}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">{n.title}</div>
                              {n.description && <div className="text-xs text-gray-500 mt-1">{n.description}</div>}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <h1>Panel de Usuario</h1>
          <p>Bienvenido, {`${user?.nombre ?? ""} ${user?.apellido ?? ""}`.trim()}</p>

          {user?.is_admin && (
            <div className="mt-3">
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/me")
                    if (!res.ok) {
                      toast({ title: 'No autenticado', description: 'Inicia sesión para acceder al panel de administración', variant: 'destructive' })
                      return
                    }
                    const data = await res.json()
                    if (data?.is_admin) {
                      window.location.href = "/admin"
                    } else {
                      toast({ title: 'Sin permisos', description: 'No tienes permiso de administrador', variant: 'destructive' })
                    }
                  } catch (e) {
                    console.error('Error validating admin permissions', e)
                    toast({ title: 'Error', description: 'Error validando permisos', variant: 'destructive' })
                  }
                }}
              >
                Administración
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin denial one-time modal */}
      {showAdminDenialModal && adminDenialNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop: semi-transparent dark so user can focus on the modal but still see context */}
          <div className="absolute inset-0 bg-black/50" onClick={handleDismissAdminDenial}></div>

          <div className="relative z-60 w-full max-w-md mx-4">
            <div className="bg-white border border-gray-100 rounded-lg shadow-2xl p-6">
              <h3 className="text-center text-lg font-semibold mb-2">Notificación importante</h3>

              <div className="text-sm text-gray-700 mb-4 whitespace-pre-line text-center">
                {adminDenialNotification.title}
              </div>

              {/* Compact details box (matches screenshot) */}
              <div className="bg-gray-50 border border-gray-100 rounded-md p-3 text-sm text-gray-700 mb-4">
                {/* try to extract structured lines from message for nicer layout */}
                {String(adminDenialNotification.description || adminDenialNotification.title)
                  .split(/\n|\r\n/) // preserve line breaks
                  .map((line, idx) => (
                    <div key={idx} className="leading-snug">{line}</div>
                  ))}
              </div>

              {/* Optional image/receipt preview */}
              {(() => {
                const explicit = adminDenialNotification.link || adminDenialNotification.raw?.link || adminDenialNotification.raw?.receipt_url || null
                const text = String(adminDenialNotification.title || adminDenialNotification.description || '')
                const urlRegex = /(https?:\/\/[^\s]+)|(\/uploads\/[^\s]+)/i
                const match = text.match(urlRegex)
                const extracted = match ? match[0] : null
                const imageSrc = explicit || extracted
                if (imageSrc) {
                  return (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Comprobante adjunto:</p>
                      <img src={imageSrc} alt="Comprobante" className="max-h-48 w-auto rounded border" />
                    </div>
                  )
                }
                return null
              })()}

              <div className="flex justify-between items-center gap-3">
                <button
                  className="flex-1 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    // Leave it unread and just close
                    setShowAdminDenialModal(false)
                  }}
                >
                  Cerrar
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleDismissAdminDenial}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Resumen
        </button>
        <button className={`nav-tab ${activeTab === "loans" ? "active" : ""}`} onClick={() => setActiveTab("loans")}>
          Mis Préstamos
        </button>
        <button
          className={`nav-tab ${activeTab === "simulator" ? "active" : ""}`}
          onClick={() => setActiveTab("simulator")}
        >
          Simulador
        </button>
        <button
          className={`nav-tab ${activeTab === "company" ? "active" : ""}`}
          onClick={() => setActiveTab("company")}
        >
          Empresas
        </button>
      </div>

      {/* Content */}
      <div className="content-container">
        {activeTab === "overview" && (
          <div className="animate-fade-in">
            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="stat-value">{stats.totalLoans}</p>
                    <p className="stat-label">Total Préstamos</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="stat-value">{stats.approvedLoans}</p>
                    <p className="stat-label">Aprobados</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="stat-value">{stats.pendingLoans}</p>
                    <p className="stat-label">Pendientes</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="stat-value" style={{ fontSize: "1.5rem" }}>
                      {formatCurrency(stats.totalAmount)}
                    </p>
                    <p className="stat-label">Monto Total</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Próximo pago (resumen) */}
            {loanApplications?.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {(loanApplications || [])
                  .filter((l) => l.estado === "aprobado")
                  .slice(0, 4)
                  .map((loan) => {
                    const next = computeNextPaymentDate(loan)
                    const dias = daysUntilNextPayment(loan)
                    const info = deriveInstallmentInfo(loan)
                    return (
                      <div key={loan.id} className="feature-card white flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-500">{loan.empresa ?? `Préstamo #${loan.id}`}</div>
                          <div className="text-lg font-semibold">
                            Próximo pago: {next ? next.toLocaleDateString("es-DO") : "—"}
                          </div>
                          {typeof dias === "number" && dias >= 0 && (
                            <div className="text-sm text-gray-600">
                              Vence en {dias} día{dias === 1 ? "" : "s"}
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            {info.paid_installments}/{info.total_installments} • Próx. cuota{" "}
                            {formatCurrency(info.next_installment_amount ?? info.installment_amount)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-700">
                            {info.paid_installments}/{info.total_installments}
                          </span>
                          {Number(info.paid_installments ?? 0) >= Number(info.total_installments ?? Infinity) ? (
                            <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-800">
                              Pago completado
                            </span>
                          ) : (
                            <Button onClick={() => openPayModal(loan)} className="bg-green-600 hover:bg-green-700">
                              <Send size={14} className="mr-2" />
                              Pagar
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ marginTop: "2rem" }}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
              <div className="card-grid">
                {user?.can_request_loans && (
                  <div
                    className="feature-card primary"
                    onClick={() => {
                      setActiveTab("loans")
                      setShowNewLoanForm(true)
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="feature-card-header">
                      <div className="feature-card-icon">
                        <Plus size={20} />
                      </div>
                      <h3 className="feature-card-title">Solicitar Préstamo</h3>
                    </div>
                    <p className="feature-card-description">
                      Solicita un nuevo préstamo con nuestras tasas competitivas
                    </p>
                  </div>
                )}

                <div className="feature-card secondary" onClick={() => setActiveTab("simulator")}>
                  <div className="feature-card-header">
                    <div className="feature-card-icon">
                      <Calculator size={20} />
                    </div>
                    <h3 className="feature-card-title">Simular Préstamo</h3>
                  </div>
                  <p className="feature-card-description">Calcula tu cuota antes de solicitar</p>
                </div>

                {user?.can_associate_companies && (
                  <div className="feature-card white" onClick={() => setActiveTab("company")}>
                    <div className="feature-card-header">
                      <div className="feature-card-icon">
                        <Building size={20} />
                      </div>
                      <h3 className="feature-card-title">Asociar Empresa</h3>
                    </div>
                    <p className="feature-card-description">Registra tu empresa en nuestro sistema</p>
                  </div>
                )}
              </div>
            </div>

            <div className="feature-card white" onClick={() => (window.location.href = "/user/invoices")}>
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <FileText size={20} />
                </div>
                <h3 className="feature-card-title">Mis Facturas</h3>
              </div>
              <p className="feature-card-description">Ver y descargar mis facturas</p>
            </div>

            {/* Recent Activity */}
            {loanApplications?.length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Actividad Reciente</h2>
                <div className="w-full overflow-x-auto bg-white rounded-lg border">
                  <table className="w-full min-w-[800px]">
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
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Próximo pago
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Comentarios
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(loanApplications || []).slice(0, 5).map((loan) => {
                        const next = computeNextPaymentDate(loan)
                        const unread = unreadByLoan[loan.id] || 0
                        return (
                          <tr key={loan.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-gray-900">{formatDate(loan.created_at)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-gray-900">{loan.empresa}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-gray-900">{formatCurrency(loan.monto)}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(loan.estado)}`}
                              >
                                {loan.estado?.charAt(0)?.toUpperCase() + loan.estado?.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-gray-900">
                              {next ? next.toLocaleDateString("es-DO") : "—"}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <button
                                className="relative inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                                onClick={() => openComments(loan)}
                              >
                                <MessageSquare size={14} />
                                {unread > 0 && (
                                  <span className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                                    {unread}
                                  </span>
                                )}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "loans" && (
          <div className="animate-fade-in">
            {showNewLoanForm ? (
              <div className="form-container">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="feature-card-icon" style={{ background: "#3b82f6", color: "white" }}>
                      <Plus size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Nueva Solicitud de Préstamo</h2>
                  </div>
                  <button className="btn btn-outline" onClick={() => setShowNewLoanForm(false)}>
                    Cancelar
                  </button>
                </div>

                {/* >>> Formulario actualizado con simulación integrada <<< */}
                <LoanRequestFormInline
                  user={user}
                  onSubmitted={() => {
                    setShowNewLoanForm(false)
                    fetchLoanApplications()
                  }}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Mis Solicitudes de Préstamo</h2>
                  <div className="flex items-center gap-2">
                    {user?.can_request_loans && (
                      <button className="btn btn-primary" onClick={() => setShowNewLoanForm(true)}>
                        <Plus size={16} />
                        Nueva Solicitud
                      </button>
                    )}
                  </div>
                </div>

                {(loanApplications || []).length === 0 ? (
                  <div className="feature-card white" style={{ textAlign: "center", padding: "3rem" }}>
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes solicitudes</h3>
                    <p className="text-gray-600 mb-4">Comienza solicitando tu primer préstamo</p>
                    {user?.can_request_loans && (
                      <button className="btn btn-primary" onClick={() => setShowNewLoanForm(true)}>
                        <Plus size={16} />
                        Solicitar Préstamo
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Todos mis Préstamos</h3>
                    <div className="w-full overflow-x-auto bg-white rounded-lg border">
                      <table className="w-full min-w-[1000px]">
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
                              Frecuencia
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Próximo Pago
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cuotas
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(loanApplications || []).map((loan) => {
                            const next = computeNextPaymentDate(loan)
                            const unread = unreadByLoan[loan.id] || 0
                            const dias = daysUntilNextPayment(loan)
                            const info = deriveInstallmentInfo(loan)
                            return (
                              <tr key={loan.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-gray-900">
                                  {formatDate(loan.created_at)}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-gray-900">{loan.empresa}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-gray-900">
                                  {formatCurrency(loan.monto)}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-gray-900">{loan.plazo ?? "—"} meses</td>
                                <td className="px-4 py-4 whitespace-nowrap text-gray-900">{loan.frecuencia ?? "—"}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-gray-900">
                                  {next ? (
                                    <>
                                      {next.toLocaleDateString("es-DO")}
                                      {typeof dias === "number" && dias >= 0 && (
                                        <span className="ml-2 text-xs text-gray-500">
                                          (en {dias} día{dias === 1 ? "" : "s"})
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(loan.estado)}`}
                                  >
                                    {loan.estado?.charAt(0)?.toUpperCase() + loan.estado?.slice(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {loan.estado === "aprobado" ? (
                                    <div className="text-sm">
                                      <div>
                                        {info.paid_installments}/{info.total_installments}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Próx.: {formatCurrency(info.next_installment_amount ?? info.installment_amount)}
                                      </div>
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="flex gap-2">
                                    <button
                                      className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                                      onClick={() => viewLoanDetails(loan.id)}
                                    >
                                      <Eye size={14} />
                                      Ver
                                    </button>
                                    <button
                                      className="relative inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                                      onClick={() => openComments(loan)}
                                    >
                                      <MessageSquare size={14} />
                                      Comentarios
                                      {unread > 0 && (
                                        <span className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                                          {unread}
                                        </span>
                                      )}
                                    </button>

                                    {loan.estado === "aprobado" && (
                                      Number(info.paid_installments ?? 0) >= Number(info.total_installments ?? Infinity) ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-800">
                                          Pago completado
                                        </span>
                                      ) : (
                                        <button
                                          className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700"
                                          onClick={() => openPayModal(loan)}
                                          title={`${info.paid_installments}/${info.total_installments} · ${formatCurrency(info.next_installment_amount ?? info.installment_amount)}`}
                                        >
                                          <Send size={14} />
                                          Hacer pago
                                        </button>
                                      )
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "simulator" && (
          <div className="animate-fade-in">
            <LoanSimulator />
          </div>
        )}

        {activeTab === "company" && (
          <div className="animate-fade-in">
                <div className="grid grid-cols-1 gap-6">
                  <CompanyRegistration />
                  <CompaniesAssociated />
                </div>
          </div>
        )}
      </div>

      {/* Comments Modal */}
      <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <DialogContent className="max-w-2xl bg-white shadow-lg">
          <DialogHeader>
            <DialogTitle>Comentarios del Administrador</DialogTitle>
          </DialogHeader>

          {selectedLoan && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Solicitud de Préstamo #{selectedLoan.id}</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  Empresa: {selectedLoan.empresa}
                  <br />
                  Monto: {formatCurrency(selectedLoan.monto)}
                  <br />
                  Estado:{" "}
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedLoan.estado)}`}
                  >
                    {selectedLoan.estado?.charAt(0)?.toUpperCase() + selectedLoan.estado?.slice(1)}
                  </span>
                </p>
              </div>

              {loanComments.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No hay comentarios</div>
              ) : (
                loanComments.map((comment) => (
                  <div key={comment.id} className="mb-4 p-4 rounded-md shadow-sm bg-white">
                    <div className="text-sm font-medium text-gray-900">
                      {comment.nombre} {comment.apellido}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</div>
                    <div className="mt-2 text-gray-700">{comment.comment}</div>
                  </div>
                ))
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white shadow-lg">
          <DialogHeader>
            <DialogTitle>Detalles de la Solicitud</DialogTitle>
          </DialogHeader>
          {selectedLoanDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Empresa:</strong> {selectedLoanDetails?.empresa ?? "—"}
                </div>
                <div>
                  <strong>Documento:</strong> {selectedLoanDetails?.documento ?? "—"}
                </div>
                <div>
                  <strong>Teléfono:</strong> {selectedLoanDetails?.telefono ?? "—"}
                </div>
                <div>
                  <strong>Tiempo en empresa:</strong> {selectedLoanDetails?.tiempo_empresa ?? "—"} meses
                </div>
                <div>
                  <strong>Sueldo:</strong> {formatCurrency(selectedLoanDetails?.sueldo ?? 0)}
                </div>
                <div>
                  <strong>Prestaciones:</strong> {formatCurrency(selectedLoanDetails?.prestaciones ?? 0)}
                </div>
                <div>
                  <strong>Monto solicitado:</strong> {formatCurrency(selectedLoanDetails?.monto ?? 0)}
                </div>
                <div>
                  <strong>Frecuencia:</strong> {selectedLoanDetails?.frecuencia ?? "—"}
                </div>
                <div>
                  <strong>Plazo:</strong> {selectedLoanDetails?.plazo ?? "—"} meses
                </div>
                <div>
                  <strong>Estado:</strong>{" "}
                  <span className={`status-badge ${getStatusBadge(selectedLoanDetails?.estado ?? "pendiente")}`}>
                    {selectedLoanDetails?.estado ?? "pendiente"}
                  </span>
                </div>
                {selectedLoanDetails?.nombre_banco && (
                  <>
                    <div>
                      <strong>Banco:</strong> {selectedLoanDetails?.nombre_banco}
                    </div>
                    <div>
                      <strong>Cuenta:</strong> {selectedLoanDetails?.cuenta_banco}
                    </div>
                    <div>
                      <strong>Tipo de cuenta:</strong> {selectedLoanDetails?.tipo_cuenta}
                    </div>
                  </>
                )}
                <div>
                  <strong>Fecha solicitud:</strong> {formatDate(selectedLoanDetails?.created_at)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Payment Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-md bg-white shadow-lg">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>

          {selectedLoanForPayment && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Préstamo #{selectedLoanForPayment.id}</h3>
              <div className="mb-4">
                    <p className="text-sm text-gray-500">
                      Empresa: {selectedLoanForPayment.empresa}
                      <br />
                      Monto: {formatCurrency(selectedLoanForPayment.monto)}
                    </p>

                    {/* Mostrar la cuota estimada / próxima cuota debajo del monto total */}
                    <div className="mt-2 text-sm text-gray-600">
                      {(() => {
                        try {
                          const info = deriveInstallmentInfo(selectedLoanForPayment)
                          return (
                            <>
                              <strong>Cuota a pagar:</strong> {formatCurrency(info.next_installment_amount ?? info.installment_amount)}
                            </>
                          )
                        } catch (e) {
                          return null
                        }
                      })()}
                    </div>
                  </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto a pagar</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de pago</label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cuota regular" />
                    </SelectTrigger>
                    <SelectContent className="bg-white shadow-lg">
                      <SelectItem value="installment">Cuota regular</SelectItem>
                      <SelectItem value="partial">Pago parcial</SelectItem>
                      <SelectItem value="full">Pago total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Información adicional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adjuntar recibo *</label>
                  <Input type="file" accept="image/*,application/pdf" onChange={handleReceiptFileChange} />
                  {receiptFile && (
                    <p className="mt-2 text-sm text-gray-500">Archivo seleccionado: {receiptFile.name}</p>
                  )}
                </div>

                {receiptPreviewUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vista previa del recibo</label>
                    {receiptFile?.type.startsWith('image/') ? (
                      <img src={receiptPreviewUrl} alt="Vista previa del recibo" className="max-w-full h-auto border rounded" />
                    ) : (
                      <iframe src={receiptPreviewUrl} className="w-full h-64 border rounded" title="Vista previa del PDF" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  disabled={isSubmittingPayment}
                  className="bg-green-600 hover:bg-green-700"
                  onClick={submitPayment}
                >
                  {isSubmittingPayment ? "Enviando..." : "Enviar Pago"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Overdue Modal */}
      <Dialog open={showOverdueModal} onOpenChange={setShowOverdueModal}>
        <DialogContent className="max-w-md bg-white shadow-lg">
          <DialogHeader>
            <DialogTitle>¡Pago Atrasado!</DialogTitle>
          </DialogHeader>

          {overdueLoan && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  Tu préstamo #{overdueLoan.id} ({overdueLoan.empresa}) tiene pagos atrasados.
                </p>
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    Se aplicarán intereses de mora por los días de retraso.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <strong>Monto a pagar:</strong>
                  {(() => {
                    try {
                      const info = deriveInstallmentInfo(overdueLoan)
                      const next = computeNextPaymentDate(overdueLoan)
                      const today = startOfDay(new Date())
                      const daysOverdue = next ? diffDays(today, next) : 0
                      const overdueInterest = (info.next_installment_amount ?? info.installment_amount) * 0.01 * daysOverdue // Example: 1% per day
                      const totalDue = (info.next_installment_amount ?? info.installment_amount) + overdueInterest
                      return (
                        <div className="mt-2">
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalDue)}</p>
                          <p className="text-xs text-gray-600">
                            Cuota regular: {formatCurrency(info.next_installment_amount ?? info.installment_amount)}<br/>
                            Mora ({daysOverdue} días): {formatCurrency(overdueInterest)}
                          </p>
                        </div>
                      )
                    } catch (e) {
                      return <p className="mt-2 text-gray-600">Calculando...</p>
                    }
                  })()}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowOverdueModal(false)}>
                  Cerrar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowOverdueModal(false)
                    openPayModal(overdueLoan)
                  }}
                >
                  Pagar Ahora
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
