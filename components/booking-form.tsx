"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, Trash2, PlusCircle,
  AlertCircle, CreditCard, Banknote, Smartphone, Wallet, X,
  RefreshCw, Info, ExternalLink, Minus, Plus, Repeat, CalendarDays,
  Zap,
} from "lucide-react"

import { getAvailableSlots, getBatchAvailability } from "@/app/actions/instructors"
import type { AssignedInstructor, DayAvailability } from "@/app/actions/instructors"
import { WORKING_HOURS } from "@/app/actions/booking-constants"

const BOOKING_API = "/api/booking"

const PLACEHOLDER_IMG = "https://deesdrivertraining.co.za/images/14.png"

// ---------------------------------------------------------------------------
// Booking categories & vehicles
// ---------------------------------------------------------------------------

const INDIVIDUAL_VEHICLES = [
  {
    id:          "learners",
    label:       "Learners Licence",
    sub:         "Preparation and test booking assistance",
    code:        "LL",
    pricePerHour: 250,
    popular:     false,
    image:       "https://deesdrivertraining.co.za/images/13.png",
  },
  {
    id:          "c8m",
    label:       "Light Motor Vehicle — Code 08 Manual",
    sub:         "Standard manual gearbox vehicle",
    code:        "8M",
    pricePerHour: 350,
    popular:     true,
    image:       "https://deesdrivertraining.co.za/images/14.png",
  },
  {
    id:          "c8a",
    label:       "Light Motor Vehicle — Code 08 Automatic",
    sub:         "Automatic / special controls vehicle",
    code:        "8A",
    pricePerHour: 370,
    popular:     false,
    image:       "https://deesdrivertraining.co.za/images/15.png",
  },
  {
    id:          "c10",
    label:       "Heavy Motor Vehicle — Code 10 (C1)",
    sub:         "Truck or bus — rigid body",
    code:        "10",
    pricePerHour: 480,
    popular:     false,
    image:       "https://deesdrivertraining.co.za/images/9.png",
  },
  {
    id:          "c14",
    label:       "Combination Vehicle — Code 14 (EC)",
    sub:         "Semi-truck / articulated combination",
    code:        "14",
    pricePerHour: 600,
    popular:     false,
    image:       "https://deesdrivertraining.co.za/images/12.png",
  },
]

const ADVANCE_VEHICLES = [
  {
    id:          "lifestyle",
    label:       "Light Motor Vehicle — Lifestyle Driving",
    sub:         "Defensive & advanced techniques for everyday drivers",
    code:        "LD",
    pricePerHour: 400,
    popular:     false,
    image:       PLACEHOLDER_IMG,
  },
  {
    id:          "closed-body",
    label:       "Heavy Motor Vehicle — Closed Body",
    sub:         "Advanced handling for closed-body heavy vehicles",
    code:        "CB",
    pricePerHour: 520,
    popular:     false,
    image:       PLACEHOLDER_IMG,
  },
  {
    id:          "superlink",
    label:       "Combination Vehicle — Super Link (2 Trailers)",
    sub:         "Advanced training for super-link articulated rigs",
    code:        "SL",
    pricePerHour: 680,
    popular:     false,
    image:       PLACEHOLDER_IMG,
  },
  {
    id:          "forklift",
    label:       "Forklift — Renewals Only (On Site)",
    sub:         "On-site renewal certification for forklift operators",
    code:        "FK",
    pricePerHour: 450,
    popular:     false,
    image:       PLACEHOLDER_IMG,
  },
  {
    id:          "4x4",
    label:       "4×4 Training — On Road and Off Road",
    sub:         "Comprehensive on-road and off-road 4×4 technique",
    code:        "4X",
    pricePerHour: 520,
    popular:     false,
    image:       PLACEHOLDER_IMG,
  },
]

const MIN_HOURS = 2

// ---------------------------------------------------------------------------
// Optional add-ons
// ---------------------------------------------------------------------------

const ADDONS = [
  {
    id:          "car-hire",
    label:       "Car hire for drivers test",
    description: "Use one of our vehicles on your test day",
    price:       "R350",
    priceNum:    350,
  },
  {
    id:          "transport",
    label:       "Transport to NaTIS testing facility",
    description: "We'll drive you to and from the testing centre",
    price:       "R200",
    priceNum:    200,
  },
]

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = [
  { id: "eft",     label: "Instant EFT", icon: Banknote,   description: "Direct bank transfer" },
  { id: "ewallet", label: "E-Wallet",    icon: Wallet,     description: "Send to mobile wallet" },
  { id: "card",    label: "Card",        icon: CreditCard, description: "Debit or credit card via PayFast" },
  { id: "cash",    label: "Cash",        icon: Smartphone, description: "Pay on first session" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function normaliseSAPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("27") && digits.length === 11)  return digits
  if (digits.startsWith("0")  && digits.length === 10)  return "27" + digits.slice(1)
  return null
}
function isValidSAPhone(raw: string): boolean { return normaliseSAPhone(raw) !== null }

function getBlockedSlotsForSelection(startTime: string, duration: number): string[] {
  const idx = WORKING_HOURS.indexOf(startTime)
  if (idx === -1) return []
  return WORKING_HOURS.slice(idx, idx + duration)
}

function advanceDays(from: Date, days: number): Date {
  const d = new Date(from.getTime() + days * 86_400_000)
  if (d.getDay() === 0) return new Date(d.getTime() + 86_400_000)
  return d
}

function buildCandidateDates(start: Date, gapDays: number, count: number): Date[] {
  const dates: Date[] = []
  let current = start
  while (dates.length < count) {
    current = advanceDays(current, gapDays)
    dates.push(new Date(current))
  }
  return dates
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })
}

/**
 * Returns every weekday (Mon–Sat) date string in a given year/month
 * that falls on or after `earliest`.
 */
function weekdaysInMonth(year: number, month: number, earliest: Date): string[] {
  const result: string[] = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    d.setHours(0, 0, 0, 0)
    if (d < earliest) continue
    if (d.getDay() === 0) continue // Sunday
    result.push(toDateStr(d))
  }
  return result
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookingCategory = "individual" | "advance"
type Vehicle = typeof INDIVIDUAL_VEHICLES[0]
type Session  = { date: Date; time: string; duration: number }
type FormData = { firstName: string; lastName: string; email: string; phone: string; location: string }

export interface AutoFillPreview {
  proposed: Array<{ date: Date; time: string; duration: number; available: boolean }>
  skipped:  Date[]
  status:   "ready" | "partial" | "none"
}

// ---------------------------------------------------------------------------
// Step constants
// 0 — Learners licence gate
// 1 — Vehicle / course selection (category + vehicle + hours)
// 2 — Add-ons
// 3 — Session scheduling
// 4 — Personal details + POPIA consent
// 5 — Payment method
// ---------------------------------------------------------------------------

export default function BookingForm() {
  // Gate
  const [hasLearners, setHasLearners]     = useState<boolean | null>(null)

  // Step
  const [step, setStep]                   = useState(0)

  // Booking category + vehicle + hours
  const [bookingCategory, setBookingCategory] = useState<BookingCategory | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [hoursSelected, setHoursSelected]     = useState<number>(MIN_HOURS)

  // Add-ons
  const [selectedAddons, setSelectedAddons]   = useState<string[]>([])

  // Scheduling
  const [sessions, setSessions]           = useState<Session[]>([])
  const [currentDate, setCurrentDate]     = useState<Date | undefined>(undefined)
  const [currentTime, setCurrentTime]     = useState("")
  const [busySlots, setBusySlots]         = useState<string[]>([])
  const [availableOnDay, setAvailableOnDay]   = useState(true)
  const [noInstructors, setNoInstructors]     = useState(false)
  const [assignedInstructor, setAssignedInstructor] = useState<AssignedInstructor | null>(null)
  const [isCheckingAvailability, setIsCheckingAvailability]     = useState(false)
  const [isTransitioningToScreenB, setIsTransitioningToScreenB] = useState(false)

  // ── NEW: month-level availability for calendar ──────────────────────────
  const [unavailableDates, setUnavailableDates]           = useState<Set<string>>(new Set())
  const [isLoadingMonthAvailability, setIsLoadingMonthAvailability] = useState(false)
  const monthFetchController = useRef<AbortController | null>(null)

  // Auto-fill
  const [repeatConfig, setRepeatConfig]   = useState<"none" | "weekly" | "biweekly">("none")
  const [autoFillLoading, setAutoFillLoading] = useState(false)
  const [autoFillPreview, setAutoFillPreview] = useState<AutoFillPreview | null>(null)

  // UI
  const [showPolicyModal, setShowPolicyModal] = useState(false)

  // Personal details
  const [formData, setFormData]           = useState<FormData>({ firstName: "", lastName: "", email: "", phone: "", location: "" })
  const [phoneError, setPhoneError]       = useState("")
  const [popiaConsent, setPopiaConsent]   = useState(false)

  // Submission
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [submitted, setSubmitted]         = useState(false)
  const [bookingRef, setBookingRef]       = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [showProofScreen, setShowProofScreen] = useState(false)

  const availabilityController = useRef<AbortController | null>(null)

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const nextSessionDuration = hoursSelected
  const totalHoursBooked    = sessions.reduce((sum, s) => sum + s.duration, 0)
  const hoursRemaining      = sessions.length === 0 ? 1 : 0

  const vehiclePrice = (selectedVehicle?.pricePerHour ?? 0) * hoursSelected
  const addonTotal   = selectedAddons.reduce((sum, id) => {
    const a = ADDONS.find((x) => x.id === id)
    return sum + (a?.priceNum ?? 0)
  }, 0)
  const grandTotal    = vehiclePrice + addonTotal
  const grandTotalStr = `R${grandTotal.toLocaleString("en-ZA")}`

  const vehicleList = bookingCategory === "individual" ? INDIVIDUAL_VEHICLES : ADVANCE_VEHICLES

  // ---------------------------------------------------------------------------
  // Month-level availability fetch (NEW)
  // ---------------------------------------------------------------------------

  const fetchMonthAvailability = useCallback(async (month: Date) => {
    if (!selectedVehicle) return
    if (monthFetchController.current) monthFetchController.current.abort()
    const controller = new AbortController()
    monthFetchController.current = controller

    const earliest = new Date()
    earliest.setHours(0, 0, 0, 0)
    const dates = weekdaysInMonth(month.getFullYear(), month.getMonth(), earliest)
    if (dates.length === 0) return

    setIsLoadingMonthAvailability(true)
    try {
      const results = await getBatchAvailability(dates, selectedVehicle.code)
      if (controller.signal.aborted) return
      const blocked = new Set<string>()
      results.forEach((r) => {
        if (!r.hasInstructors || !r.availableOnDay) blocked.add(r.date)
      })
      setUnavailableDates(blocked)
    } catch {
      // silent — time slot checks will still catch issues after date selection
    } finally {
      if (!controller.signal.aborted) setIsLoadingMonthAvailability(false)
    }
  }, [selectedVehicle])

  // Trigger month fetch when entering step 3
  useEffect(() => {
    if (step === 3 && selectedVehicle) {
      fetchMonthAvailability(new Date())
    }
  }, [step, selectedVehicle, fetchMonthAvailability])

  // Clear unavailable dates when vehicle changes
  useEffect(() => {
    setUnavailableDates(new Set())
  }, [selectedVehicle])

  // ---------------------------------------------------------------------------
  // Slot-level availability fetch (existing)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!currentDate || step !== 3 || !selectedVehicle) return

    if (availabilityController.current) availabilityController.current.abort()
    const controller = new AbortController()
    availabilityController.current = controller

    async function sync() {
      setIsCheckingAvailability(true)
      setAutoFillPreview(null)
      setRepeatConfig("none")
      try {
        const result = await getAvailableSlots(toDateStr(currentDate!), selectedVehicle!.code)
        if (controller.signal.aborted) return
        setBusySlots(result.busySlots)
        setAvailableOnDay(result.availableOnDay)
        setNoInstructors(!result.hasInstructors)
        setAssignedInstructor(result.assignedInstructor)
      } catch {
        if (!controller.signal.aborted) console.error("Availability check failed")
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingAvailability(false)
          setIsTransitioningToScreenB(false)
        }
      }
    }
    sync()
    return () => { controller.abort() }
  }, [currentDate, step, selectedVehicle])

  useEffect(() => { setAutoFillPreview(null) }, [repeatConfig])

  useEffect(() => {
    setSelectedVehicle(null)
    setHoursSelected(MIN_HOURS)
  }, [bookingCategory])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    setIsTransitioningToScreenB(true)
    setCurrentDate(date)
    setBusySlots([])
    setCurrentTime("")
    setAvailableOnDay(true)
    setNoInstructors(false)
    setAssignedInstructor(null)
    setAutoFillPreview(null)
    setRepeatConfig("none")
  }

  const addSession = (overrideTime?: string, overrideDate?: Date) => {
    const useDate = overrideDate ?? currentDate
    const useTime = overrideTime ?? currentTime
    if (!useDate || !useTime) return
    const selectedRange = getBlockedSlotsForSelection(useTime, nextSessionDuration)
    const hasOverlap = sessions.some(
      (s) => s.date.toDateString() === useDate.toDateString() &&
        getBlockedSlotsForSelection(s.time, s.duration).some((t) => selectedRange.includes(t))
    )
    if (hasOverlap) return alert("This slot overlaps with an existing session.")
    setSessions((prev) => [...prev, { date: useDate, time: useTime, duration: nextSessionDuration }])
    setCurrentTime("")
    setCurrentDate(undefined)
    setBusySlots([])
  }

  // ---------------------------------------------------------------------------
  // Auto-fill
  // ---------------------------------------------------------------------------

  const previewAutoFill = useCallback(async () => {
    if (!currentDate || !currentTime || !selectedVehicle || repeatConfig === "none") return
    const gapDays = repeatConfig === "weekly" ? 7 : 14
    const sessionsNeeded = 1
    const candidates = buildCandidateDates(currentDate, gapDays, sessionsNeeded * 3)
    setAutoFillLoading(true)
    setAutoFillPreview(null)
    try {
      const results: DayAvailability[] = await getBatchAvailability(candidates.map(toDateStr), selectedVehicle.code)
      const proposed: AutoFillPreview["proposed"] = []
      const skipped: Date[] = []
      for (let i = 0; i < results.length; i++) {
        if (proposed.filter((p) => p.available).length >= sessionsNeeded) break
        const day = results[i]
        if (!day.availableOnDay || !day.hasInstructors) { skipped.push(candidates[i]); continue }
        const range = getBlockedSlotsForSelection(currentTime, nextSessionDuration)
        const blockedByAirtable   = range.some((t) => day.busySlots.includes(t))
        const blockedByItinerary  = sessions.some(
          (s) => s.date.toDateString() === candidates[i].toDateString() &&
            getBlockedSlotsForSelection(s.time, s.duration).some((t) => range.includes(t))
        )
        if (blockedByAirtable || blockedByItinerary) {
          skipped.push(candidates[i])
          proposed.push({ date: candidates[i], time: currentTime, duration: nextSessionDuration, available: false })
        } else {
          proposed.push({ date: candidates[i], time: currentTime, duration: nextSessionDuration, available: true })
        }
      }
      const availableCount = proposed.filter((p) => p.available).length
      const status: AutoFillPreview["status"] = availableCount === 0 ? "none" : "ready"
      setAutoFillPreview({ proposed, skipped, status })
    } catch { console.error("Batch availability check failed") }
    finally { setAutoFillLoading(false) }
  }, [currentDate, currentTime, selectedVehicle, repeatConfig, nextSessionDuration, sessions])

  const commitAutoFill = () => {
    if (!autoFillPreview) return
    const anchorRange = getBlockedSlotsForSelection(currentTime, nextSessionDuration)
    const anchorOverlap = sessions.some(
      (s) => currentDate && s.date.toDateString() === currentDate.toDateString() &&
        getBlockedSlotsForSelection(s.time, s.duration).some((t) => anchorRange.includes(t))
    )
    if (!anchorOverlap && currentDate && currentTime)
      setSessions((prev) => [...prev, { date: currentDate, time: currentTime, duration: nextSessionDuration }])
    setSessions((prev) => [...prev, ...autoFillPreview.proposed.filter((p) => p.available)])
    setAutoFillPreview(null); setRepeatConfig("none"); setCurrentTime(""); setCurrentDate(undefined); setBusySlots([])
  }

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const handlePhoneBlur = () => {
    if (formData.phone && !isValidSAPhone(formData.phone))
      setPhoneError("Enter a valid SA number: 081 000 0000 or 2781 000 0000")
    else setPhoneError("")
  }

  const canProceed = () => {
    if (step === 0) return hasLearners === true
    if (step === 1) return !!bookingCategory && !!selectedVehicle && hoursSelected >= MIN_HOURS
    if (step === 2) return true
    if (step === 3) return sessions.length > 0
    if (step === 4) return (
      !!formData.firstName && !!formData.lastName &&
      !!formData.email && isValidSAPhone(formData.phone) &&
      !!formData.location && popiaConsent
    )
    if (step === 5) return !!paymentMethod
    return true
  }

  const handleSubmit = async (method: string) => {
    setIsSubmitting(true)
    const isCash = method === "cash"
    const ref    = `DEE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    setBookingRef(ref)
    const normalisedPhone = normaliseSAPhone(formData.phone) ?? formData.phone
    const payload = {
      bookingCategory,
      vehicle:             selectedVehicle?.label,
      vehicleCode:         selectedVehicle?.code,
      hoursBooked:         hoursSelected,
      pricePerHour:        selectedVehicle?.pricePerHour,
      addons:              selectedAddons.map((id) => ADDONS.find((a) => a.id === id)?.label),
      totalPrice:          grandTotalStr,
      firstName:           formData.firstName,
      lastName:            formData.lastName,
      email:               formData.email,
      phone:               normalisedPhone,
      pickupAddress:       formData.location,
      paymentMethod:       method,
      paid:                isCash ? 1 : 0,
      popiaConsent:        true,
      instructorFirstName: assignedInstructor?.firstName ?? null,
      instructorLastName:  assignedInstructor?.lastName  ?? null,
      instructorPhone:     assignedInstructor?.phone     ?? null,
      instructorEmail:     assignedInstructor?.email     ?? null,
      sessions: sessions.map((s) => ({
        date:          toDateStr(s.date),
        time:          s.time,
        duration:      `${s.duration}h`,
        phone:         normalisedPhone,
        formattedSlot: `${s.date.toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "short" })} @ ${s.time} (${s.duration}h)`,
      })),
      bookingRef: ref,
      timestamp:  new Date().toISOString(),
    }
    try {
      const response = await fetch(BOOKING_API, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })
      if (response.ok) {
        if (isCash) setSubmitted(true)
      } else {
        alert("Booking failed. Please try again.")
      }
    } catch {
      alert("Booking failed. Please check your connection.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentNext = () => {
    if (!paymentMethod) return
    if (paymentMethod === "cash") { handleSubmit("cash") }
    else { setShowProofScreen(true); handleSubmit(paymentMethod) }
  }

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (submitted) return (
    <SuccessScreen vehicle={selectedVehicle} bookingRef={bookingRef} formData={formData} total={grandTotalStr} />
  )
  if (showProofScreen) return (
    <div className="flex flex-col gap-10">
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 p-6 lg:p-12">
        <ProofOfPaymentScreen
          vehicle={selectedVehicle} paymentMethod={paymentMethod!}
          bookingRef={bookingRef} formData={formData} total={grandTotalStr}
        />
      </div>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const STEP_LABELS = ["Licence check", "Choose course", "Add-ons", "Schedule", "Your details", "Payment"]
  const TOTAL_STEPS = STEP_LABELS.length

  const canShowAutoFill = !!currentDate && !!currentTime && availableOnDay && !noInstructors && !isCheckingAvailability

  // Shared disabled function for both Calendar instances
  const calendarDisabled = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (d < today) return true
    if (d.getDay() === 0 || d.getDay() === 6) return true
    return unavailableDates.has(toDateStr(d))
  }

  const AutoFillPanel = ({ compact = false }: { compact?: boolean }) => {
    if (!canShowAutoFill) return null
    return (
      <div className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-slate-50 ${compact ? "p-4 space-y-3" : "p-5 space-y-4"}`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-700">Auto-fill</p>
            <p className="text-[9px] font-bold text-indigo-400 uppercase">Repeat this slot automatically</p>
          </div>
        </div>

        {/* Repeat options */}
        <div className="grid grid-cols-3 gap-2">
          {(["none", "weekly", "biweekly"] as const).map((opt) => {
            const labels = { none: "Once", weekly: "Weekly", biweekly: "Bi-weekly" }
            const isSelected = repeatConfig === opt
            return (
              <button
                key={opt}
                onClick={() => setRepeatConfig(opt)}
                className={`h-9 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {labels[opt]}
              </button>
            )
          })}
        </div>

        {/* Description */}
        {repeatConfig !== "none" && (
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide leading-relaxed">
            {repeatConfig === "weekly"
              ? `We'll find your next available slot every week on ${currentDate!.toLocaleDateString("en-ZA", { weekday: "long" })} at ${currentTime}.`
              : `We'll find your next available slot every two weeks on ${currentDate!.toLocaleDateString("en-ZA", { weekday: "long" })} at ${currentTime}.`}
          </p>
        )}

        {/* Preview button */}
        {repeatConfig !== "none" && !autoFillPreview && (
          <button
            onClick={previewAutoFill}
            disabled={autoFillLoading}
            className="w-full h-10 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-60 active:scale-[0.98]"
          >
            {autoFillLoading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking dates…</>
              : <><CalendarDays className="h-3.5 w-3.5" /> Preview slots</>}
          </button>
        )}

        {/* Preview results */}
        {autoFillPreview && (
          <div className="space-y-2">
            {autoFillPreview.status === "none" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                  No available slots found for the next few {repeatConfig === "weekly" ? "weeks" : "fortnights"}.
                  Try a different time or date.
                </p>
              </div>
            )}

            {autoFillPreview.status === "ready" && (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  {autoFillPreview.proposed.filter((p) => p.available).length} slot
                  {autoFillPreview.proposed.filter((p) => p.available).length !== 1 ? "s" : ""} found
                </p>
                <div className="space-y-1.5">
                  {autoFillPreview.proposed.map((slot, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-bold uppercase ${
                        slot.available
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : "bg-slate-50 border-slate-100 text-slate-400 line-through"
                      }`}
                    >
                      <span>{formatShortDate(slot.date)}</span>
                      <span>{slot.time} · {slot.duration}h</span>
                      {slot.available
                        ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        : <X className="h-3 w-3 text-slate-300 shrink-0" />}
                    </div>
                  ))}
                </div>

                {autoFillPreview.skipped.length > 0 && (
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-relaxed">
                    {autoFillPreview.skipped.length} date{autoFillPreview.skipped.length > 1 ? "s" : ""} skipped — no instructor available.
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={commitAutoFill}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Add all slots
                  </button>
                  <button
                    onClick={() => { setAutoFillPreview(null); setRepeatConfig("none") }}
                    className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-400 flex items-center justify-center hover:border-red-200 hover:text-red-400 transition-all active:scale-90"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}

            {autoFillPreview.status !== "none" && (
              <button
                onClick={previewAutoFill}
                disabled={autoFillLoading}
                className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-wide transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" /> Re-check availability
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {showPolicyModal && <PolicyModal onClose={() => setShowPolicyModal(false)} />}

      <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 ${step === 3 ? "p-5 lg:p-0 lg:overflow-hidden" : "p-5 lg:p-12"}`}>

        {/* ─── STEP 0: Learners licence gate ─────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Before you begin</p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Do you have your learners licence?</h2>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[12px] text-blue-700 font-bold leading-relaxed">
                A valid learners licence is required before you can book a driving course.
                If you don't have one yet we'll point you to the right place.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setHasLearners(true)}
                className={`p-5 lg:p-8 rounded-2xl border text-left transition-all group active:scale-[0.98] ${hasLearners === true ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600" : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"}`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${hasLearners === true ? "bg-indigo-600 text-white" : "bg-white text-slate-400 border border-slate-100"}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className={`text-sm font-black uppercase tracking-widest ${hasLearners === true ? "text-indigo-600" : "text-slate-900"}`}>
                  Yes, I have my learners licence
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Ready to book a driving course</p>
              </button>

              <button
                onClick={() => setHasLearners(false)}
                className={`p-5 lg:p-8 rounded-2xl border text-left transition-all group active:scale-[0.98] ${hasLearners === false ? "border-amber-500 bg-amber-50 shadow-md ring-1 ring-amber-400" : "border-slate-100 bg-slate-50 hover:border-amber-300 hover:bg-white hover:shadow-md"}`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${hasLearners === false ? "bg-amber-500 text-white" : "bg-white text-slate-400 border border-slate-100"}`}>
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className={`text-sm font-black uppercase tracking-widest ${hasLearners === false ? "text-amber-600" : "text-slate-900"}`}>
                  No, not yet
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">I need to get my learners first</p>
              </button>
            </div>

            {hasLearners === false && (
              <div className="p-5 lg:p-8 rounded-2xl bg-amber-50 border border-amber-200 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-amber-700 mb-1">
                      You'll need your learners licence first
                    </p>
                    <p className="text-[12px] text-amber-700 font-bold leading-relaxed">
                      Book your learners test through the official eNaTIS portal. Once you have your
                      learners licence, come back here to schedule your driving lessons with us.
                    </p>
                  </div>
                </div>
                <a
                  href="https://online.natis.gov.za/#/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl bg-white border border-amber-200 hover:border-amber-400 transition-colors group"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Official portal</p>
                    <p className="text-sm font-black uppercase text-slate-900">Book learners test via eNaTIS →</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-amber-500 group-hover:text-amber-700 transition-colors" />
                </a>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide">
                  Once you have your learners licence, return here and select "Yes" above.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 1: Course / vehicle selection ────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2 of {TOTAL_STEPS}</p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Choose your course</h2>
              <p className="text-sm text-slate-400 font-medium mt-1">Select a booking type, your vehicle or course, and the number of hours.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: "individual", label: "Book for an Individual", sub: "Personal lessons & licence preparation" },
                  { id: "advance",    label: "Advanced Course Day",    sub: "Specialist & advanced driving training" },
                ] as const
              ).map(({ id, label, sub }) => (
                <button
                  key={id}
                  onClick={() => setBookingCategory(id)}
                  className={`p-4 lg:p-6 rounded-2xl border text-left transition-all active:scale-[0.98] ${bookingCategory === id ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600" : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"}`}
                >
                  <p className={`text-[11px] font-black uppercase tracking-widest ${bookingCategory === id ? "text-indigo-600" : "text-slate-900"}`}>
                    {label}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase leading-relaxed">{sub}</p>
                </button>
              ))}
            </div>

            {bookingCategory && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  {bookingCategory === "individual" ? "Individual courses" : "Advanced courses"}
                </p>
                <div className="grid gap-2 lg:gap-3">
                  {vehicleList.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className={`rounded-2xl border text-left transition-all active:scale-[0.99] overflow-hidden ${selectedVehicle?.id === v.id ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600" : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"}`}
                    >
                      <div className="flex items-stretch">
                        <div className="w-28 lg:w-36 shrink-0 relative overflow-hidden bg-slate-100">
                          <img src={v.image} alt={v.label} className="w-full h-full object-cover" />
                          {selectedVehicle?.id === v.id && (
                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                              <CheckCircle2 className="h-6 w-6 text-white drop-shadow" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 p-4 lg:p-5 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-[12px] font-black uppercase tracking-widest leading-tight ${selectedVehicle?.id === v.id ? "text-indigo-600" : "text-slate-900"}`}>
                                {v.label}
                              </p>
                              {"popular" in v && v.popular && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest shrink-0">
                                  Most popular
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">{v.sub}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-black ${selectedVehicle?.id === v.id ? "text-indigo-600" : "text-slate-700"}`}>
                              R{v.pricePerHour}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">per hour</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedVehicle && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Number of hours <span className="text-slate-300">(min. {MIN_HOURS} hours)</span>
                </p>
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <button
                    onClick={() => setHoursSelected((h) => Math.max(MIN_HOURS, h - 1))}
                    disabled={hoursSelected <= MIN_HOURS}
                    className="h-11 w-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-3xl font-black text-slate-900 leading-none">{hoursSelected}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      {hoursSelected === 1 ? "hour" : "hours"}
                    </p>
                  </div>
                  <button
                    onClick={() => setHoursSelected((h) => h + 1)}
                    className="h-11 w-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-90"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Session total</p>
                    <p className="text-[11px] font-bold text-indigo-600 mt-0.5 uppercase">
                      R{selectedVehicle.pricePerHour} × {hoursSelected}h
                    </p>
                  </div>
                  <p className="text-2xl font-black text-indigo-600">R{vehiclePrice.toLocaleString("en-ZA")}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 2: Add-ons ───────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 3 of {TOTAL_STEPS}</p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Optional Add-ons</h2>
              <p className="text-sm text-slate-400 font-medium mt-1">Tick any extras you'd like to add to your booking.</p>
            </div>

            <div className="space-y-3">
              {ADDONS.map((addon) => {
                const isChecked = selectedAddons.includes(addon.id)
                return (
                  <button
                    key={addon.id}
                    onClick={() =>
                      setSelectedAddons((prev) =>
                        isChecked ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
                      )
                    }
                    className={`w-full p-5 lg:p-6 rounded-2xl border text-left transition-all active:scale-[0.99] ${isChecked ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-5 w-5 rounded flex items-center justify-center border-2 shrink-0 transition-colors ${isChecked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"}`}>
                          {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div>
                          <p className={`text-sm font-black uppercase tracking-widest ${isChecked ? "text-indigo-600" : "text-slate-900"}`}>
                            {addon.label}
                          </p>
                          <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase">{addon.description}</p>
                        </div>
                      </div>
                      <p className={`text-base font-black shrink-0 ${isChecked ? "text-indigo-600" : "text-slate-700"}`}>
                        {addon.price}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase text-slate-500">
                <span>{selectedVehicle?.label} ({hoursSelected}h)</span>
                <span>R{vehiclePrice.toLocaleString("en-ZA")}</span>
              </div>
              {selectedAddons.map((id) => {
                const a = ADDONS.find((x) => x.id === id)!
                return (
                  <div key={id} className="flex justify-between text-[11px] font-bold uppercase text-slate-500">
                    <span>{a.label}</span>
                    <span>{a.price}</span>
                  </div>
                )
              })}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black uppercase text-slate-900">
                <span>Total</span>
                <span className="text-indigo-600">{grandTotalStr}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              Add-ons are optional — you can skip this step if you don't need them.
            </p>
          </div>
        )}

        {/* ─── STEP 3: Scheduling ────────────────────────────────────────── */}
        {step === 3 && (
          <>
            {/* ── DESKTOP ── */}
            <div className="hidden lg:flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 p-12">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 4 of {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Choose your session slot</h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                  Your session is <span className="text-indigo-600">{hoursSelected} hour{hoursSelected > 1 ? "s" : ""}</span> — select a start time and we'll block the full duration.
                </p>
              </div>

              <div className="flex gap-10">
                {/* ── Left: calendar + time grid ── */}
                <div className="flex-1 space-y-6">
                  {/* Calendar loading overlay */}
                  <div className="relative">
                    {isLoadingMonthAvailability && (
                      <div className="absolute inset-0 z-10 rounded-2xl bg-white/70 flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Checking availability…</p>
                      </div>
                    )}
                    <div className={`bg-white p-4 border border-slate-100 rounded-2xl shadow-inner flex justify-center transition-opacity ${isCheckingAvailability || isLoadingMonthAvailability ? "opacity-60 pointer-events-none" : ""}`}>
                      <Calendar
                        mode="single"
                        selected={currentDate}
                        onSelect={handleDateSelect}
                        onMonthChange={fetchMonthAvailability}
                        disabled={calendarDisabled}
                        className="rounded-md border-none"
                      />
                    </div>
                  </div>

                  {noInstructors && <StatusBanner variant="error">No instructors are currently available for this licence type. Please contact us directly.</StatusBanner>}
                  {!noInstructors && !availableOnDay && <StatusBanner variant="warning">No instructors are available on this day. Please select a different date.</StatusBanner>}
                  {!currentDate && <StatusBanner variant="neutral">Select a date above to see available time slots.</StatusBanner>}

                  <div className="grid grid-cols-5 gap-3">
                    {WORKING_HOURS.map((time, idx) => {
                      const range              = WORKING_HOURS.slice(idx, idx + nextSessionDuration)
                      const blockedByAirtable  = range.some((t) => busySlots.includes(t))
                      const blockedByItinerary = sessions.some((s) =>
                        s.date.toDateString() === currentDate?.toDateString() &&
                        getBlockedSlotsForSelection(s.time, s.duration).some((t) => range.includes(t))
                      )
                      const outOfBounds = range.length < nextSessionDuration
                      const isDisabled  = !currentDate || blockedByAirtable || blockedByItinerary || outOfBounds
                      return (
                        <button key={time} disabled={isDisabled || isCheckingAvailability} onClick={() => setCurrentTime(time)}
                          className={`h-14 rounded-xl border text-[11px] font-black transition-all flex flex-col items-center justify-center gap-1 ${isDisabled ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed" : currentTime === time ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "border-slate-200 text-slate-600 bg-white hover:border-indigo-600"}`}>
                          {isCheckingAvailability ? <Loader2 className="h-3 w-3 animate-spin" /> : isDisabled && currentDate ? <><AlertCircle className="h-3 w-3" /><span className="text-[8px]">TAKEN</span></> : time}
                        </button>
                      )
                    })}
                  </div>

                  <AutoFillPanel />

                  <Button onClick={() => addSession()} disabled={!currentTime || !!autoFillPreview}
                    className="w-full h-16 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.15em] hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-20">
                    <PlusCircle className="mr-2 h-5 w-5" /> Confirm this slot
                  </Button>
                </div>

                {/* ── Right: slot sidebar ── */}
                <div className="w-80 border-l border-slate-100 pl-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Your slots</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">{selectedVehicle?.label}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{hoursSelected}h per session</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[10px] font-black ${sessions.length > 0 ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"}`}>
                      {sessions.length > 0 ? `✓ ${sessions.length} slot${sessions.length > 1 ? "s" : ""}` : "Pending"}
                    </div>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-black mb-1">No slots yet</p>
                      <p className="text-[9px] text-slate-300 uppercase font-bold">Pick a date &amp; time, then tap Confirm</p>
                    </div>
                  ) : sessions.map((s, i) => (
                    <div key={i} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                      <div>
                        <p className="text-[12px] font-black text-slate-900 uppercase">{formatShortDate(s.date)}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.time} · {s.duration}h</p>
                      </div>
                      <button onClick={() => setSessions(sessions.filter((_, idx) => idx !== i))}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => setSessions([])}
                    className={`text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-wide transition-colors ${sessions.length === 0 ? "invisible" : ""}`}
                  >
                    Clear all slots
                  </button>
                </div>
              </div>
            </div>

            {/* ── MOBILE ── */}
            <div className="lg:hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="pb-2">
                <div className="space-y-1 mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 4 of {TOTAL_STEPS}</p>
                  <h2 className="text-lg font-[950] uppercase tracking-tighter text-slate-900">Choose your session slot</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {hoursSelected}h session · {selectedVehicle?.label}
                  </p>
                </div>
                {sessions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {sessions.map((s, i) => (
                      <div key={i} className="flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 pl-2.5 pr-1 py-1">
                        <span className="text-[10px] font-black text-indigo-700 uppercase">
                          {formatShortDate(s.date)} · {s.time} ({s.duration}h)
                        </span>
                        <button onClick={() => setSessions(sessions.filter((_, idx) => idx !== i))}
                          className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center hover:bg-red-200 hover:text-red-600 transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SCREEN A — Calendar */}
              {!currentDate && (
                <div className="space-y-3 pb-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    {sessions.length > 0 ? "Slot confirmed — tap Continue" : "Tap a date to pick your session slot"}
                  </p>
                  {isTransitioningToScreenB ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Checking availability…</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {isLoadingMonthAvailability && (
                        <div className="absolute inset-0 z-10 rounded-2xl bg-white/60 flex items-center justify-center gap-2 backdrop-blur-[1px]">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Checking availability…</p>
                        </div>
                      )}
                      <Calendar
                        mode="single"
                        selected={undefined}
                        onSelect={handleDateSelect}
                        onMonthChange={fetchMonthAvailability}
                        disabled={calendarDisabled}
                        className="p-0 rounded-none border-none shadow-none bg-transparent [--cell-size:40px]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SCREEN B — Time picker + auto-fill */}
              {currentDate && (
                <div className="space-y-4 pb-36 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-[950] uppercase tracking-tighter text-slate-900 leading-tight">
                        {currentDate.toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "long" })}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">Choose a start time · {hoursSelected}h block</p>
                    </div>
                    <button onClick={() => { setCurrentDate(undefined); setCurrentTime(""); setBusySlots([]); setIsTransitioningToScreenB(false); setAutoFillPreview(null); setRepeatConfig("none") }}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                      <ArrowLeft className="w-3 h-3" /> Change date
                    </button>
                  </div>

                  {isCheckingAvailability && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Checking availability…</p>
                    </div>
                  )}

                  {noInstructors && <StatusBanner variant="error">No instructors available for this licence type. Please contact us.</StatusBanner>}
                  {!noInstructors && !availableOnDay && !isCheckingAvailability && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">No instructors on this day.</p>
                        <button onClick={() => { setCurrentDate(undefined); setCurrentTime(""); setIsTransitioningToScreenB(false) }}
                          className="text-[10px] font-black text-amber-600 underline mt-1">Pick a different date</button>
                      </div>
                    </div>
                  )}

                  {!isCheckingAvailability && availableOnDay && !noInstructors && (
                    <div className="grid grid-cols-3 gap-2">
                      {WORKING_HOURS.map((time, idx) => {
                        const range              = WORKING_HOURS.slice(idx, idx + nextSessionDuration)
                        const blockedByAirtable  = range.some((t) => busySlots.includes(t))
                        const blockedByItinerary = sessions.some((s) =>
                          s.date.toDateString() === currentDate?.toDateString() &&
                          getBlockedSlotsForSelection(s.time, s.duration).some((t) => range.includes(t))
                        )
                        const outOfBounds = range.length < nextSessionDuration
                        const isDisabled  = blockedByAirtable || blockedByItinerary || outOfBounds
                        return (
                          <button key={time} disabled={isDisabled} onClick={() => setCurrentTime(time)}
                            className={`h-12 rounded-xl border text-[11px] font-black transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${isDisabled ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed" : currentTime === time ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "border-slate-200 text-slate-700 bg-white"}`}>
                            {isDisabled ? <><AlertCircle className="h-3 w-3" /><span className="text-[8px]">TAKEN</span></> : time}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {!isCheckingAvailability && availableOnDay && !noInstructors && currentTime && (
                    <AutoFillPanel compact />
                  )}
                </div>
              )}

              {/* Sticky bottom bar (mobile) */}
              <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-slate-100 bg-white px-5 py-4 space-y-3 rounded-b-[2rem]">
                {currentDate && currentTime && !autoFillPreview && (
                  <Button onClick={() => addSession()}
                    className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-[0.12em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Confirm — {formatShortDate(currentDate)} @ {currentTime} ({hoursSelected}h)
                  </Button>
                )}
                {currentDate && currentTime && autoFillPreview?.status === "ready" && (
                  <Button onClick={commitAutoFill}
                    className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-[0.12em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-[0.98]">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Add {autoFillPreview.proposed.filter(p => p.available).length + 1} slots
                  </Button>
                )}
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)}
                    className="h-14 px-5 rounded-2xl text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={sessions.length === 0}
                    className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.12em] hover:bg-indigo-600 transition-all disabled:opacity-25">
                    {sessions.length > 0
                      ? <><CheckCircle2 className="mr-2 h-4 w-4" />Continue</>
                      : "Pick a slot first"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── STEP 4: Personal details + POPIA ─────────────────────────── */}
        {step === 4 && (
          <PersonalDetailsForm
            stepLabel={`Step 5 of ${TOTAL_STEPS}`}
            formData={formData}
            setFormData={setFormData}
            phoneError={phoneError}
            onPhoneBlur={handlePhoneBlur}
            popiaConsent={popiaConsent}
            setPopiaConsent={setPopiaConsent}
          />
        )}

        {/* ─── STEP 5: Payment ───────────────────────────────────────────── */}
        {step === 5 && (
          <PaymentMethodStep
            stepLabel={`Step 6 of ${TOTAL_STEPS}`}
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
            total={grandTotalStr}
            onViewPolicy={() => setShowPolicyModal(true)}
          />
        )}

        {/* ─── Nav bar ───────────────────────────────────────────────────── */}
        <div className={`mt-8 lg:mt-16 flex items-center justify-between border-t border-slate-100 pt-6 lg:pt-10 ${step === 3 ? "hidden lg:flex" : ""}`}>
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || isSubmitting}
            className="text-slate-400 hover:text-slate-900 uppercase text-[10px] font-black tracking-widest">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={() => { if (step === 5) { handlePaymentNext() } else { setStep(step + 1) } }}
            disabled={!canProceed() || isSubmitting}
            className="h-16 rounded-2xl bg-indigo-600 px-12 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-20 transition-all"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                {step === 5
                  ? (paymentMethod === "cash" ? "Confirm Booking" : "Next Step")
                  : step === 0 && hasLearners === false
                    ? "I now have my learners"
                    : "Next Step"}
                {" "}<ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------

function StatusBanner({ variant, children }: { variant: "error" | "warning" | "neutral"; children: React.ReactNode }) {
  const styles = {
    error:   "bg-red-50 border-red-100 text-red-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
    neutral: "bg-slate-50 border-slate-100 text-slate-500",
  }
  const icons = {
    error:   <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />,
    warning: <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />,
    neutral: <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />,
  }
  return (
    <div className={`p-5 rounded-2xl border flex items-start gap-3 ${styles[variant]}`}>
      {icons[variant]}
      <p className="text-[11px] font-bold uppercase tracking-wide leading-relaxed">{children}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Personal details + POPIA consent
// ---------------------------------------------------------------------------

function PersonalDetailsForm({
  stepLabel, formData, setFormData, phoneError, onPhoneBlur, popiaConsent, setPopiaConsent,
}: {
  stepLabel:      string
  formData:       { firstName: string; lastName: string; email: string; phone: string; location: string }
  setFormData:    (d: any) => void
  phoneError:     string
  onPhoneBlur:    () => void
  popiaConsent:   boolean
  setPopiaConsent: (v: boolean) => void
}) {
  return (
    <div className="grid gap-5 lg:gap-8 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stepLabel}</p>
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Your Details</h3>
      </div>

      <div className="grid gap-5 lg:gap-8 sm:grid-cols-2">
        <div className="space-y-2 lg:space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">First Name</Label>
          <Input className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600" placeholder="John"
            value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
        </div>
        <div className="space-y-2 lg:space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Last Name</Label>
          <Input className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600" placeholder="Doe"
            value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
        </div>
      </div>

      <div className="grid gap-5 lg:gap-8 sm:grid-cols-2">
        <div className="space-y-2 lg:space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Address</Label>
          <Input type="email" className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600" placeholder="email@example.com"
            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-2 lg:space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Cell Number</Label>
          <Input
            className={`h-14 rounded-xl bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600 ${phoneError ? "border-red-400 focus:ring-red-400" : "border-slate-200"}`}
            placeholder="081 000 0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            onBlur={onPhoneBlur}
          />
          {phoneError && (
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide flex items-center gap-1 ml-1">
              <AlertCircle className="h-3 w-3" /> {phoneError}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 lg:space-y-3">
        <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Pickup Address</Label>
        <Input className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600" placeholder="123 Street Name, Suburb, City"
          value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
      </div>

      <div className="p-5 lg:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          POPIA — Protection of Personal Information Act
        </p>
        <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
          Dees Driver Training collects your personal information solely to process your driving lesson booking
          and to communicate with you about your sessions. Your details are not shared with any third party
          except where strictly necessary to facilitate your booking (e.g. assigned instructor, NaTIS testing facility).
        </p>
        <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
          You have the right to access, correct, or request the deletion of your personal information at any time.
          For queries, contact us at{" "}
          <span className="text-indigo-600 font-black">admin@deesdrivertraining.co.za</span> or call{" "}
          <span className="text-indigo-600 font-black">031 202 0202</span>.
        </p>
      </div>

      <button
        onClick={() => setPopiaConsent(!popiaConsent)}
        className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all active:scale-[0.99] ${popiaConsent ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white"}`}
      >
        <div className={`h-5 w-5 rounded flex items-center justify-center border-2 shrink-0 mt-0.5 transition-colors ${popiaConsent ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"}`}>
          {popiaConsent && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </div>
        <div>
          <p className={`text-sm font-black uppercase tracking-widest ${popiaConsent ? "text-indigo-600" : "text-slate-900"}`}>
            I consent to my personal information being processed as described above
          </p>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
            Required to complete your booking
          </p>
        </div>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payment method step
// ---------------------------------------------------------------------------

function PaymentMethodStep({
  stepLabel, selectedMethod, onSelect, total, onViewPolicy,
}: {
  stepLabel:      string
  selectedMethod: string | null
  onSelect:       (id: string) => void
  total:          string
  onViewPolicy:   () => void
}) {
  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stepLabel}</p>
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Payment Method</h3>
        <p className="text-sm text-slate-400 mt-2 font-medium">How would you like to settle {total}?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        {PAYMENT_METHODS.map(({ id, label, icon: Icon, description }) => (
          <button key={id} onClick={() => onSelect(id)}
            className={`p-5 lg:p-8 rounded-2xl border text-left transition-all group active:scale-[0.97] ${selectedMethod === id ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600" : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"}`}>
            <div className={`h-10 w-10 lg:h-12 lg:w-12 rounded-xl flex items-center justify-center mb-3 lg:mb-4 transition-colors ${selectedMethod === id ? "bg-indigo-600 text-white" : "bg-white text-slate-400 group-hover:text-indigo-600 border border-slate-100"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className={`text-sm font-black uppercase tracking-widest ${selectedMethod === id ? "text-indigo-600" : "text-slate-900"}`}>{label}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{description}</p>
          </button>
        ))}
      </div>

      {selectedMethod && selectedMethod !== "cash" && (
        <div className="p-4 lg:p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">
            You'll be shown payment details on the next screen. Your booking is only confirmed once proof of payment is received.
          </p>
        </div>
      )}
      {selectedMethod === "cash" && (
        <div className="p-4 lg:p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wide leading-relaxed">
            Cash payment is due on your first session. Your booking will be confirmed immediately.
          </p>
        </div>
      )}

      <button onClick={onViewPolicy} className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wide hover:text-indigo-500 transition-colors">
        <Info className="h-3 w-3" /> View cancellation &amp; refund policy
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Policy modal
// ---------------------------------------------------------------------------

function PolicyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Cancellation &amp; Refund Policy</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 text-[12px] text-slate-600 leading-relaxed">
          <div>
            <p className="font-black uppercase text-slate-900 mb-1">Rescheduling</p>
            <p>Sessions may be rescheduled at no charge with at least <strong>24 hours' notice</strong>. Contact your instructor or our coordinator directly.</p>
          </div>
          <div>
            <p className="font-black uppercase text-slate-900 mb-1">Cancellations</p>
            <p>Cancellations made more than 48 hours before a session receive a <strong>full credit</strong> toward a future booking. Cancellations within 48 hours forfeit that session.</p>
          </div>
          <div>
            <p className="font-black uppercase text-slate-900 mb-1">Refunds</p>
            <p>Refunds for unused sessions (minus any sessions already completed) can be requested within 30 days of booking. Refunds are processed within 5–7 business days.</p>
          </div>
          <div>
            <p className="font-black uppercase text-slate-900 mb-1">No-shows</p>
            <p>If a learner does not arrive for a session without notice, the session is forfeited.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="font-bold text-slate-500">Questions? Contact us on <span className="text-indigo-600">031 202 0202</span> or WhatsApp <span className="text-indigo-600">0612713583</span>.</p>
          </div>
        </div>
        <Button onClick={onClose} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all">Got it</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Proof of payment screen
// ---------------------------------------------------------------------------

function ProofOfPaymentScreen({
  vehicle, paymentMethod, bookingRef, formData, total,
}: {
  vehicle: any; paymentMethod: string; bookingRef: string; formData: FormData; total: string
}) {
  const methodLabel = PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label ?? paymentMethod
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 max-w-lg mx-auto text-center">
      <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto">
        <Banknote className="h-9 w-9 text-indigo-600" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">{methodLabel} Payment</p>
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Send Proof of Payment</h3>
        <p className="text-slate-500 mt-3 text-sm font-medium leading-relaxed">
          Once you've made your {methodLabel.toLowerCase()} payment of{" "}
          <span className="font-black text-slate-900">{total}</span>, send your proof of payment to:
        </p>
      </div>
      <div className="p-8 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp / Contact Number</p>
        <p className="text-3xl font-black tracking-tight text-indigo-600">0612713583</p>
      </div>
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Booking Reference</p>
        <p className="text-xl font-black tracking-widest text-slate-900">{bookingRef}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">Include this when sending proof of payment</p>
      </div>
      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-left space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">What happens next</p>
        <ul className="text-[11px] text-emerald-800 font-bold uppercase space-y-1.5 leading-relaxed">
          <li>→ WhatsApp your proof of payment to 0612713583</li>
          <li>→ Include reference <span className="text-emerald-600">{bookingRef}</span></li>
          <li>→ We'll confirm your session within 2 business hours</li>
          <li>→ A confirmation will be sent to <span className="text-emerald-600">{formData.email}</span></li>
        </ul>
      </div>
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide leading-relaxed px-4">
        Your session will be confirmed once payment is verified.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------

function SuccessScreen({
  vehicle, bookingRef, formData, total,
}: {
  vehicle: any; bookingRef: string; formData: FormData; total: string
}) {
  return (
    <div className="rounded-[3rem] bg-indigo-600 p-16 text-center shadow-2xl shadow-indigo-200 animate-in zoom-in duration-500">
      <div className="mx-auto h-24 w-24 bg-white rounded-full flex items-center justify-center mb-10 shadow-xl">
        <CheckCircle2 className="h-12 w-12 text-indigo-600" />
      </div>
      <h3 className="text-5xl font-[950] uppercase tracking-tighter text-white">Booking Confirmed.</h3>
      <p className="text-indigo-100 mt-6 uppercase text-[11px] tracking-[0.2em] font-bold max-w-sm mx-auto leading-relaxed">
        Your {vehicle?.label} session has been logged. Our coordinator will be in touch shortly to confirm your slot details.
      </p>
      <div className="mt-6 inline-block px-6 py-2 rounded-xl bg-white/10 border border-white/20">
        <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest">Total due: {total}</p>
      </div>
      <div className="mt-4 inline-block px-8 py-4 rounded-2xl bg-white/10 border border-white/20">
        <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest mb-1">Booking Reference</p>
        <p className="text-2xl font-black tracking-widest text-white">{bookingRef}</p>
      </div>
      <p className="mt-6 text-[10px] text-indigo-200 font-bold uppercase tracking-wide">
        A confirmation has been sent to {formData.email}
      </p>
      <div className="mt-8">
        <Button variant="outline" onClick={() => window.location.reload()}
          className="h-14 rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white hover:text-indigo-600 uppercase text-[11px] font-black tracking-widest px-10">
          Book Another Class
        </Button>
      </div>
    </div>
  )
}