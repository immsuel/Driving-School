"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, Trash2, PlusCircle,
  AlertCircle, CreditCard, Banknote, Smartphone, Wallet, X,
  RefreshCw, Info,
} from "lucide-react"

import { getAvailableSlots, getBatchAvailability } from "@/app/actions/instructors"
import type { AssignedInstructor, DayAvailability } from "@/app/actions/instructors"

const BOOKING_API = "/api/booking"

const WORKING_HOURS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00",
]

const packages = [
  { id: "c8m-5",    label: "Code 8 Manual: 5 Hours",  code: "8M",   hours: 5,  price: "R1,550",  priceNum: 1550 },
  { id: "c8m-10",   label: "Code 8 Manual: 10 Hours", code: "8M",   hours: 10, price: "R2,550",  priceNum: 2550 },
  { id: "c8m-15",   label: "Code 8 Manual: 15 Hours", code: "8M",   hours: 15, price: "R3,650",  priceNum: 3650 },
  { id: "c8m-20",   label: "Code 8 Manual: 20 Hours", code: "8M",   hours: 20, price: "R4,800",  priceNum: 4800 },
  { id: "c8a-5",    label: "Code 8 Auto: 5 Hours",    code: "8A",   hours: 5,  price: "R1,600",  priceNum: 1600 },
  { id: "c8a-10",   label: "Code 8 Auto: 10 Hours",   code: "8A",   hours: 10, price: "R2,650",  priceNum: 2650 },
  { id: "c8a-15",   label: "Code 8 Auto: 15 Hours",   code: "8A",   hours: 15, price: "R3,800",  priceNum: 3800 },
  { id: "c8a-20",   label: "Code 8 Auto: 20 Hours",   code: "8A",   hours: 20, price: "R5,000",  priceNum: 5000 },
  { id: "c10-5",    label: "Code 10: 5 Hours",        code: "10",   hours: 5,  price: "R1,950",  priceNum: 1950 },
  { id: "c10-10",   label: "Code 10: 10 Hours",       code: "10",   hours: 10, price: "R3,100",  priceNum: 3100 },
  { id: "c10-15",   label: "Code 10: 15 Hours",       code: "10",   hours: 15, price: "R4,350",  priceNum: 4350 },
  { id: "c10-20",   label: "Code 10: 20 Hours",       code: "10",   hours: 20, price: "R5,600",  priceNum: 5600 },
  { id: "test-prep",label: "Test Day Prep",            code: "Spec", hours: 2,  price: "R750",    priceNum: 750,  description: "Vehicle + 2hr Mock Test" },
]

const PAYMENT_METHODS = [
  { id: "eft",     label: "Instant EFT", icon: Banknote,   description: "Direct bank transfer" },
  { id: "ewallet", label: "E-Wallet",    icon: Wallet,     description: "Send to mobile wallet" },
  { id: "card",    label: "Card",        icon: CreditCard, description: "Debit or credit card" },
  { id: "cash",    label: "Cash",        icon: Smartphone, description: "Pay on first session" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  // Use local calendar date — avoids UTC-midnight shift bugs
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function normaliseSAPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("264") && digits.length === 12) return digits
  if (digits.startsWith("0")   && digits.length === 10) return "264" + digits.slice(1)
  return null
}
function isValidSAPhone(raw: string): boolean { return normaliseSAPhone(raw) !== null }

function getBlockedSlotsForSelection(startTime: string, duration: number): string[] {
  const idx = WORKING_HOURS.indexOf(startTime)
  if (idx === -1) return []
  return WORKING_HOURS.slice(idx, idx + duration)
}

/** Advance a Date by N days, skipping Sundays */
function advanceDays(from: Date, days: number): Date {
  const d = new Date(from.getTime() + days * 86_400_000)
  if (d.getDay() === 0) return new Date(d.getTime() + 86_400_000) // skip Sunday
  return d
}

/** Build a list of candidate future dates for auto-fill, skipping Sundays */
function buildCandidateDates(start: Date, gapDays: number, count: number): Date[] {
  const dates: Date[] = []
  let current = start
  while (dates.length < count) {
    current = advanceDays(current, gapDays)
    dates.push(new Date(current))
  }
  return dates
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Session    = { date: Date; time: string; duration: number }
type FormData   = { firstName: string; lastName: string; email: string; phone: string; location: string }

/** Result of the auto-fill availability check, shown to the user before committing */
export interface AutoFillPreview {
  proposed:  Array<{ date: Date; time: string; duration: number; available: boolean }>
  skipped:   Date[]   // dates where the chosen time was already taken
  status:    "ready" | "partial" | "none"
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BookingForm() {
  const [step, setStep]                   = useState(0)
  const [filter, setFilter]               = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<typeof packages[0] | null>(null)
  const [hoursPerDay, setHoursPerDay]     = useState("1")
  const [sessions, setSessions]           = useState<Session[]>([])

  // Current date / time selection
  const [currentDate, setCurrentDate]     = useState<Date | undefined>(undefined)
  const [currentTime, setCurrentTime]     = useState("")

  // Availability for the currently selected date (single-date fetch)
  const [busySlots, setBusySlots]         = useState<string[]>([])
  const [availableOnDay, setAvailableOnDay] = useState(true)
  const [noInstructors, setNoInstructors] = useState(false)
  const [assignedInstructor, setAssignedInstructor] = useState<AssignedInstructor | null>(null)

  // Loading states
  const [isCheckingAvailability, setIsCheckingAvailability]     = useState(false)
  const [isTransitioningToScreenB, setIsTransitioningToScreenB] = useState(false)

  // Auto-fill state
  const [repeatConfig, setRepeatConfig]   = useState<"none" | "weekly" | "biweekly">("none")
  const [autoFillLoading, setAutoFillLoading] = useState(false)
  const [autoFillPreview, setAutoFillPreview] = useState<AutoFillPreview | null>(null)

  // UI
  const [showPolicyModal, setShowPolicyModal] = useState(false)

  // Personal details
  const [formData, setFormData]           = useState<FormData>({ firstName: "", lastName: "", email: "", phone: "", location: "" })
  const [phoneError, setPhoneError]       = useState("")

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

  const totalHoursBooked    = sessions.reduce((acc, s) => acc + s.duration, 0)
  const hoursRemaining      = selectedPackage ? selectedPackage.hours - totalHoursBooked : 0
  const maxIntensity        = selectedPackage ? Math.min(3, selectedPackage.hours) : 1
  const intensity           = Math.min(parseInt(hoursPerDay), maxIntensity)
  const nextSessionDuration = Math.min(intensity, hoursRemaining)

  // ---------------------------------------------------------------------------
  // Single-date availability fetch (fires when user picks a calendar date)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!currentDate || step !== 1 || !selectedPackage) return

    if (availabilityController.current) availabilityController.current.abort()
    const controller = new AbortController()
    availabilityController.current = controller

    async function sync() {
      setIsCheckingAvailability(true)
      // Clear auto-fill preview whenever the anchor date changes
      setAutoFillPreview(null)
      setRepeatConfig("none")
      try {
        const result = await getAvailableSlots(toDateStr(currentDate!), selectedPackage!.code)
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
  }, [currentDate, step, selectedPackage])

  // ---------------------------------------------------------------------------
  // Clear auto-fill preview when the user changes the repeat config
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setAutoFillPreview(null)
  }, [repeatConfig])

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
    if (!useDate || !useTime || hoursRemaining <= 0) return
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
  // Availability-aware auto-fill
  //
  // Phase 1 (Preview): fetch real availability for all candidate dates,
  //   build a preview showing which are bookable and which are skipped.
  // Phase 2 (Commit): user reviews the preview and confirms, sessions are added.
  // ---------------------------------------------------------------------------

  const previewAutoFill = useCallback(async () => {
    if (!currentDate || !currentTime || !selectedPackage || repeatConfig === "none") return

    const gapDays = repeatConfig === "weekly" ? 7 : 14

    // How many additional sessions do we need?
    const sessionsNeeded = Math.ceil((hoursRemaining - nextSessionDuration) / nextSessionDuration)
    if (sessionsNeeded <= 0) return

    // Build a slightly over-sized candidate list to absorb skipped dates
    // (we try up to 3× the needed sessions to handle gaps)
    const candidates = buildCandidateDates(currentDate, gapDays, sessionsNeeded * 3)

    setAutoFillLoading(true)
    setAutoFillPreview(null)

    try {
      const results: DayAvailability[] = await getBatchAvailability(
        candidates.map(toDateStr),
        selectedPackage.code
      )

      let remainingHours = hoursRemaining - nextSessionDuration
      const proposed: AutoFillPreview["proposed"] = []
      const skipped:  Date[]                      = []

      for (let i = 0; i < results.length; i++) {
        if (remainingHours <= 0) break

        const day = results[i]
        const dur = Math.min(nextSessionDuration, remainingHours)

        if (!day.availableOnDay || !day.hasInstructors) {
          skipped.push(candidates[i])
          continue
        }

        // Build the range the proposed session would occupy
        const range = getBlockedSlotsForSelection(currentTime, dur)

        // Check against Airtable busy slots for that date
        const blockedByAirtable = range.some((t) => day.busySlots.includes(t))

        // Check against sessions already in the user's itinerary for that date
        const blockedByItinerary = sessions.some(
          (s) =>
            s.date.toDateString() === candidates[i].toDateString() &&
            getBlockedSlotsForSelection(s.time, s.duration).some((t) => range.includes(t))
        )

        if (blockedByAirtable || blockedByItinerary) {
          skipped.push(candidates[i])
          proposed.push({ date: candidates[i], time: currentTime, duration: dur, available: false })
        } else {
          proposed.push({ date: candidates[i], time: currentTime, duration: dur, available: true })
          remainingHours -= dur
        }
      }

      const availableCount = proposed.filter((p) => p.available).length
      const status: AutoFillPreview["status"] =
        availableCount === 0 ? "none" :
        remainingHours > 0   ? "partial" : "ready"

      setAutoFillPreview({ proposed, skipped, status })
    } catch {
      console.error("Batch availability check failed")
    } finally {
      setAutoFillLoading(false)
    }
  }, [currentDate, currentTime, selectedPackage, repeatConfig, hoursRemaining, nextSessionDuration, sessions])

  const commitAutoFill = () => {
    if (!autoFillPreview) return

    // Add the anchor session first
    const anchorRange = getBlockedSlotsForSelection(currentTime, nextSessionDuration)
    const anchorOverlap = sessions.some(
      (s) =>
        currentDate &&
        s.date.toDateString() === currentDate.toDateString() &&
        getBlockedSlotsForSelection(s.time, s.duration).some((t) => anchorRange.includes(t))
    )
    if (!anchorOverlap && currentDate && currentTime) {
      setSessions((prev) => [...prev, { date: currentDate, time: currentTime, duration: nextSessionDuration }])
    }

    // Add only the available auto-fill sessions
    const toAdd = autoFillPreview.proposed.filter((p) => p.available)
    setSessions((prev) => [...prev, ...toAdd])

    // Reset
    setAutoFillPreview(null)
    setRepeatConfig("none")
    setCurrentTime("")
    setCurrentDate(undefined)
    setBusySlots([])
  }

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const handlePhoneBlur = () => {
    if (formData.phone && !isValidSAPhone(formData.phone)) {
      setPhoneError("Enter a valid Namibian number: 081 000 0000 or 264810000000")
    } else {
      setPhoneError("")
    }
  }

  const canProceed = () => {
    if (step === 0) return !!selectedPackage
    if (step === 1) return hoursRemaining === 0
    if (step === 2) return !!formData.firstName && !!formData.lastName && !!formData.email && isValidSAPhone(formData.phone) && !!formData.location
    if (step === 3) return !!paymentMethod
    return true
  }

  const handleSubmit = async (method: string) => {
    setIsSubmitting(true)
    const isCash = method === "cash"
    const ref    = `DR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    setBookingRef(ref)
    const normalisedPhone = normaliseSAPhone(formData.phone) ?? formData.phone
    const payload = {
      package:             selectedPackage?.label,
      totalHours:          selectedPackage?.hours,
      firstName:           formData.firstName,
      lastName:            formData.lastName,
      email:               formData.email,
      phone:               normalisedPhone,
      pickupAddress:       formData.location,
      paymentMethod:       method,
      paid:                isCash ? 1 : 0,
      instructorFirstName: assignedInstructor?.firstName ?? null,
      instructorLastName:  assignedInstructor?.lastName  ?? null,
      instructorPhone:     assignedInstructor?.phone     ?? null,
      instructorEmail:     assignedInstructor?.email     ?? null,   // FIX: was missing
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
    if (paymentMethod === "cash") {
      handleSubmit("cash")
    } else {
      setShowProofScreen(true)
      handleSubmit(paymentMethod)
    }
  }

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (submitted)       return <SuccessScreen package={selectedPackage} bookingRef={bookingRef} formData={formData} />
  if (showProofScreen) return (
    <div className="flex flex-col gap-10">
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 p-6 lg:p-12">
        <ProofOfPaymentScreen package={selectedPackage} paymentMethod={paymentMethod!} bookingRef={bookingRef} formData={formData} />
      </div>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-10">
      {showPolicyModal && <PolicyModal onClose={() => setShowPolicyModal(false)} />}

      <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 ${step === 1 ? "p-0 lg:p-12 overflow-hidden" : "p-6 lg:p-12"}`}>

        {/* ─── STEP 0: Package Selection ─────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            {!filter ? (
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1 of 4</p>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Choose License Type</h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    { id: "8M", label: "Code 8 Manual", from: "From R1,550" },
                    { id: "8A", label: "Code 8 Auto",   from: "From R1,600" },
                    { id: "10", label: "Code 10 Truck", from: "From R1,950" },
                  ].map((cat) => (
                    <button key={cat.id} onClick={() => setFilter(cat.id)}
                      className="p-10 rounded-2xl border border-slate-100 bg-slate-50 text-center hover:border-indigo-600 hover:bg-white hover:shadow-lg transition-all group">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">License Type</p>
                      <p className="text-xl font-black uppercase text-slate-900 mt-1">{cat.label}</p>
                      <p className="text-[11px] font-bold text-indigo-500 mt-2 uppercase tracking-wide">{cat.from}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setFilter("Spec"); setSelectedPackage(packages.find(p => p.id === "test-prep") ?? null) }}
                  className="w-full p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between hover:border-indigo-400 hover:bg-white transition-all group">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Standalone</p>
                    <p className="text-sm font-black uppercase text-slate-900">Test Day Prep — Vehicle + 2hr Mock Test</p>
                  </div>
                  <span className="text-lg font-black text-indigo-600 group-hover:translate-x-1 transition-transform">R750 →</span>
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <button onClick={() => { setFilter(null); setSelectedPackage(null) }}
                  className="group flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase transition-all hover:translate-x-[-4px]">
                  <ArrowLeft className="h-3 w-3" /> Change License Type
                </button>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left font-black uppercase tracking-widest text-slate-400 pb-3 pr-6">Hours</th>
                        <th className="text-right font-black uppercase tracking-widest text-slate-400 pb-3 pr-4">Price</th>
                        <th className="text-right font-black uppercase tracking-widest text-slate-400 pb-3">Per Hour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packages.filter(p => p.code === filter).map(pkg => (
                        <tr key={pkg.id} className={`border-b border-slate-50 cursor-pointer transition-colors hover:bg-indigo-50 ${selectedPackage?.id === pkg.id ? "bg-indigo-50" : ""}`}
                          onClick={() => { setSelectedPackage(pkg); setSessions([]) }}>
                          <td className="py-3 pr-6 font-black text-slate-900">{pkg.hours}h</td>
                          <td className="py-3 pr-4 text-right font-black text-indigo-600">{pkg.price}</td>
                          <td className="py-3 text-right text-slate-400 font-bold">R{Math.round(pkg.priceNum / pkg.hours)}/hr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedPackage && (
                  <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Selected</p>
                      <p className="text-sm font-black uppercase text-slate-900">{selectedPackage.label}</p>
                    </div>
                    <p className="text-xl font-black text-indigo-600">{selectedPackage.price}</p>
                  </div>
                )}
              </div>
            )}

            {selectedPackage && selectedPackage.hours > 1 && (
              <div className="p-8 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Session Intensity</Label>
                <Select value={hoursPerDay} onValueChange={(v) => { setHoursPerDay(v); setSessions([]) }}>
                  <SelectTrigger className="h-14 rounded-xl border-slate-200 bg-white text-slate-900 focus:ring-indigo-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="1">1 Hour / Session</SelectItem>
                    {selectedPackage.hours >= 2 && <SelectItem value="2">2 Hours / Session</SelectItem>}
                    {selectedPackage.hours >= 3 && <SelectItem value="3">3 Hours / Session</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 font-bold uppercase italic">We recommend 2h sessions for faster learning.</p>
                <p className="text-[10px] text-indigo-500 font-bold uppercase">
                  = {Math.ceil(selectedPackage.hours / Math.min(parseInt(hoursPerDay), maxIntensity))} sessions to schedule
                </p>
              </div>
            )}

            <button onClick={() => setShowPolicyModal(true)} className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wide hover:text-indigo-500 transition-colors">
              <Info className="h-3 w-3" /> View cancellation &amp; refund policy
            </button>
          </div>
        )}

        {/* ─── STEP 1: Scheduling ────────────────────────────────────────── */}
        {step === 1 && (
          <>
            {/* DESKTOP */}
            <div className="hidden lg:flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <ProgressBar total={selectedPackage?.hours ?? 0} booked={totalHoursBooked} />

              <div className="flex gap-10">
                <div className="flex-1 space-y-6">
                  {/* Calendar */}
                  <div className={`bg-white p-4 border border-slate-100 rounded-2xl shadow-inner flex justify-center transition-opacity ${isCheckingAvailability ? "opacity-60 pointer-events-none" : ""}`}>
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      className="rounded-md border-none"
                    />
                  </div>

                  {/* Status messages */}
                  {noInstructors && <StatusBanner variant="error">No instructors are currently available for this license type. Please contact us directly.</StatusBanner>}
                  {!noInstructors && !availableOnDay && <StatusBanner variant="warning">No instructors are available on this day. Please select a different date.</StatusBanner>}
                  {!currentDate && <StatusBanner variant="neutral">Select a date above to see available time slots.</StatusBanner>}

                  {/* Time grid */}
                  <div className="grid grid-cols-5 gap-3">
                    {WORKING_HOURS.map((time, idx) => {
                      const range             = WORKING_HOURS.slice(idx, idx + nextSessionDuration)
                      const blockedByAirtable = range.some((t) => busySlots.includes(t))
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

                  {/* Auto-fill panel */}
                  {currentDate && currentTime && hoursRemaining > nextSessionDuration && (
                    <AutoFillPanel
                      repeatConfig={repeatConfig}
                      setRepeatConfig={setRepeatConfig}
                      hoursRemaining={hoursRemaining}
                      nextSessionDuration={nextSessionDuration}
                      autoFillLoading={autoFillLoading}
                      autoFillPreview={autoFillPreview}
                      onPreview={previewAutoFill}
                      onCommit={commitAutoFill}
                    />
                  )}

                  <Button onClick={() => addSession()} disabled={!currentTime || hoursRemaining <= 0}
                    className="w-full h-16 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.15em] hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-20">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add {nextSessionDuration}h Session
                    {hoursRemaining > 0 && <span className="ml-2 text-[10px] font-black opacity-70">({hoursRemaining}h left after)</span>}
                  </Button>
                </div>

                {/* Itinerary sidebar */}
                <div className="w-96 border-l border-slate-100 pl-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Your Itinerary</p>
                      {sessions.length > 0 && <p className="text-[10px] text-slate-500 font-bold mt-0.5">{new Set(sessions.map(s => s.date.toDateString())).size} day(s) selected</p>}
                    </div>
                    <div className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-black text-indigo-600">{totalHoursBooked}/{selectedPackage?.hours}H</div>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {sessions.length === 0 ? (
                      <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase font-black mb-1">No sessions yet</p>
                        <p className="text-[9px] text-slate-300 uppercase font-bold">Pick a date &amp; time, then tap Add Session</p>
                      </div>
                    ) : sessions.map((s, i) => (
                      <div key={i} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                        <div>
                          <p className="text-[12px] font-black text-slate-900 uppercase">{s.date.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.time} • {s.duration}hr session</p>
                        </div>
                        <button onClick={() => setSessions(sessions.filter((_, idx) => idx !== i))}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* MOBILE */}
            <div className="lg:hidden -mx-6 -mt-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="px-5 pt-5 pb-3">
                <ProgressBar total={selectedPackage?.hours ?? 0} booked={totalHoursBooked} />
                {sessions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {sessions.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 pl-3 pr-1.5 py-1">
                        <span className="text-[10px] font-black text-indigo-700 uppercase">
                          {s.date.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })} · {s.time}
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
                <div className="px-5 space-y-4 pb-4">
                  <div>
                    <p className="text-xl font-[950] uppercase tracking-tighter text-slate-900 leading-tight">
                      {sessions.length === 0 ? `Choose a date for lesson 1` : hoursRemaining > 0 ? `Choose a date for lesson ${sessions.length + 1}` : `All ${selectedPackage?.hours} hours scheduled`}
                    </p>
                    {hoursRemaining > 0 && <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">{hoursRemaining}h remaining · tap any available date</p>}
                  </div>
                  {isTransitioningToScreenB ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Checking availability…</p>
                    </div>
                  ) : hoursRemaining > 0 && (
                    <Calendar
                      mode="single"
                      selected={undefined}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      className="p-0 rounded-none border-none shadow-none bg-transparent"
                    />
                  )}
                </div>
              )}

              {/* SCREEN B — Time picker */}
              {currentDate && (
                <div className="px-5 space-y-5 pb-4 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-[950] uppercase tracking-tighter text-slate-900 leading-tight">
                        {currentDate.toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "long" })}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">Choose a start time for lesson {sessions.length + 1}</p>
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

                  {noInstructors && <StatusBanner variant="error">No instructors available for this license type. Please contact us.</StatusBanner>}
                  {!noInstructors && !availableOnDay && !isCheckingAvailability && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">No instructors on this day.</p>
                        <button onClick={() => { setCurrentDate(undefined); setCurrentTime(""); setIsTransitioningToScreenB(false) }} className="text-[10px] font-black text-amber-600 underline mt-1">Pick a different date</button>
                      </div>
                    </div>
                  )}

                  {!isCheckingAvailability && availableOnDay && !noInstructors && (
                    <div className="grid grid-cols-2 gap-2">
                      {WORKING_HOURS.map((time, idx) => {
                        const range             = WORKING_HOURS.slice(idx, idx + nextSessionDuration)
                        const blockedByAirtable = range.some((t) => busySlots.includes(t))
                        const blockedByItinerary = sessions.some((s) =>
                          s.date.toDateString() === currentDate?.toDateString() &&
                          getBlockedSlotsForSelection(s.time, s.duration).some((t) => range.includes(t))
                        )
                        const outOfBounds = range.length < nextSessionDuration
                        const isDisabled  = blockedByAirtable || blockedByItinerary || outOfBounds
                        return (
                          <button key={time} disabled={isDisabled} onClick={() => setCurrentTime(time)}
                            className={`h-14 rounded-xl border text-[11px] font-black transition-all flex flex-col items-center justify-center gap-1 ${isDisabled ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed" : currentTime === time ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "border-slate-200 text-slate-700 bg-white active:scale-95"}`}>
                            {isDisabled ? <><AlertCircle className="h-3 w-3" /><span className="text-[8px]">TAKEN</span></> : time}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Auto-fill panel (mobile) */}
                  {currentTime && hoursRemaining > nextSessionDuration && !isCheckingAvailability && (
                    <AutoFillPanel
                      repeatConfig={repeatConfig}
                      setRepeatConfig={setRepeatConfig}
                      hoursRemaining={hoursRemaining}
                      nextSessionDuration={nextSessionDuration}
                      autoFillLoading={autoFillLoading}
                      autoFillPreview={autoFillPreview}
                      onPreview={previewAutoFill}
                      onCommit={commitAutoFill}
                    />
                  )}
                </div>
              )}

              {/* Sticky bottom action bar (mobile) */}
              <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 space-y-3">
                {currentDate && currentTime && hoursRemaining > 0 && !autoFillPreview && (
                  <Button onClick={() => addSession()}
                    className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-[0.12em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Confirm — {currentDate.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })} @ {currentTime}
                  </Button>
                )}
                {autoFillPreview && autoFillPreview.status !== "none" && (
                  <Button onClick={commitAutoFill}
                    className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-[0.12em] hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98]">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Confirm {autoFillPreview.proposed.filter(p => p.available).length + 1} sessions
                  </Button>
                )}
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => setStep(0)}
                    className="h-14 px-5 rounded-2xl text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setStep(2)} disabled={hoursRemaining !== 0}
                    className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.12em] hover:bg-indigo-600 transition-all disabled:opacity-25">
                    {hoursRemaining === 0 ? <><CheckCircle2 className="mr-2 h-4 w-4" />Continue</> : `${hoursRemaining}h still to schedule`}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── STEP 2: Personal Details ──────────────────────────────────── */}
        {step === 2 && (
          <PersonalDetailsForm formData={formData} setFormData={setFormData} phoneError={phoneError} onPhoneBlur={handlePhoneBlur} />
        )}

        {/* ─── STEP 3: Payment ───────────────────────────────────────────── */}
        {step === 3 && (
          <PaymentMethodStep selectedMethod={paymentMethod} onSelect={setPaymentMethod} package={selectedPackage} onViewPolicy={() => setShowPolicyModal(true)} />
        )}

        {/* ─── Nav bar ───────────────────────────────────────────────────── */}
        <div className={`mt-16 flex items-center justify-between border-t border-slate-100 pt-10 ${step === 1 ? "hidden lg:flex" : ""}`}>
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || isSubmitting}
            className="text-slate-400 hover:text-slate-900 uppercase text-[10px] font-black tracking-widest">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={() => { if (step === 3) { handlePaymentNext() } else { setStep(step + 1) } }}
            disabled={!canProceed() || isSubmitting}
            className="h-16 rounded-2xl bg-indigo-600 px-12 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-20 transition-all">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>{step === 3 ? (paymentMethod === "cash" ? "Confirm Booking" : "Next Step") : "Next Step"} <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AutoFillPanel — availability-aware repeat scheduling UI
// ---------------------------------------------------------------------------

function AutoFillPanel({
  repeatConfig, setRepeatConfig,
  hoursRemaining, nextSessionDuration,
  autoFillLoading, autoFillPreview,
  onPreview, onCommit,
}: {
  repeatConfig:       "none" | "weekly" | "biweekly"
  setRepeatConfig:    (v: "none" | "weekly" | "biweekly") => void
  hoursRemaining:     number
  nextSessionDuration: number
  autoFillLoading:    boolean
  autoFillPreview:    AutoFillPreview | null
  onPreview:          () => void
  onCommit:           () => void
}) {
  const remainingAfterAnchor = hoursRemaining - nextSessionDuration

  return (
    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        Auto-fill remaining {remainingAfterAnchor}h
      </p>

      {/* Repeat config selector */}
      <div className="flex gap-2">
        {(["none", "weekly", "biweekly"] as const).map((opt) => (
          <button key={opt} onClick={() => setRepeatConfig(opt)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${repeatConfig === opt ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            {opt === "none" ? "No repeat" : opt === "weekly" ? "Weekly" : "Bi-weekly"}
          </button>
        ))}
      </div>

      {/* Check availability button */}
      {repeatConfig !== "none" && !autoFillPreview && (
        <Button onClick={onPreview} disabled={autoFillLoading}
          className="w-full h-12 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:opacity-50">
          {autoFillLoading
            ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Checking availability…</>
            : <><RefreshCw className="mr-2 h-3 w-3" /> Check {repeatConfig} availability</>}
        </Button>
      )}

      {/* Preview results */}
      {autoFillPreview && (
        <div className="space-y-3">
          {/* Status header */}
          {autoFillPreview.status === "ready" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-[10px] font-black uppercase text-emerald-700">
                All {autoFillPreview.proposed.filter(p => p.available).length} sessions available
              </p>
            </div>
          )}
          {autoFillPreview.status === "partial" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-black uppercase text-amber-700">
                {autoFillPreview.proposed.filter(p => p.available).length} of {autoFillPreview.proposed.length} dates available — {autoFillPreview.skipped.length} skipped due to conflicts. You&apos;ll need to manually book the remaining hours.
              </p>
            </div>
          )}
          {autoFillPreview.status === "none" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-[10px] font-black uppercase text-red-700">
                No available slots found at this time on {repeatConfig} dates. Try a different time or schedule manually.
              </p>
            </div>
          )}

          {/* Proposed session list */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {autoFillPreview.proposed.map((p, i) => (
              <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase ${p.available ? "bg-white border border-slate-100 text-slate-700" : "bg-red-50 border border-red-100 text-red-400"}`}>
                <span>{p.date.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })} @ {p.time}</span>
                <span>{p.available ? `${p.duration}h ✓` : "Conflict"}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setRepeatConfig("none") }}
              className="flex-1 h-11 rounded-xl border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:border-slate-300">
              Cancel
            </Button>
            {autoFillPreview.status !== "none" && (
              <Button onClick={onCommit}
                className="flex-1 h-11 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700">
                <CheckCircle2 className="mr-1.5 h-3 w-3" />
                Confirm {autoFillPreview.proposed.filter(p => p.available).length + 1} sessions
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------

function ProgressBar({ total, booked }: { total: number; booked: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hours Scheduled</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{booked} / {total}h</p>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${Math.min(100, (booked / (total || 1)) * 100)}%` }} />
      </div>
      {booked === total && total > 0 && (
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> All hours scheduled — you&apos;re ready to continue!
        </p>
      )}
    </div>
  )
}

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
// Sub-components (unchanged from original)
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
            <p>Sessions may be rescheduled at no charge with at least <strong>24 hours&apos; notice</strong>. Contact your instructor or our coordinator directly.</p>
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
            <p className="font-bold text-slate-500">Questions? Contact us on <span className="text-indigo-600">0612713583</span> (WhatsApp).</p>
          </div>
        </div>
        <Button onClick={onClose} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all">Got it</Button>
      </div>
    </div>
  )
}

function PaymentMethodStep({ selectedMethod, onSelect, package: pkg, onViewPolicy }: {
  selectedMethod: string | null; onSelect: (id: string) => void; package: any; onViewPolicy: () => void
}) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Step 4 of 4</p>
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Payment Method</h3>
        <p className="text-sm text-slate-400 mt-2 font-medium">How would you like to settle {pkg?.price}?</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PAYMENT_METHODS.map(({ id, label, icon: Icon, description }) => (
          <button key={id} onClick={() => onSelect(id)}
            className={`p-8 rounded-2xl border text-left transition-all group ${selectedMethod === id ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600" : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"}`}>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedMethod === id ? "bg-indigo-600 text-white" : "bg-white text-slate-400 group-hover:text-indigo-600 border border-slate-100"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className={`text-sm font-black uppercase tracking-widest ${selectedMethod === id ? "text-indigo-600" : "text-slate-900"}`}>{label}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{description}</p>
          </button>
        ))}
      </div>
      {selectedMethod && selectedMethod !== "cash" && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">
            You&apos;ll be shown payment details on the next screen. Your booking is only confirmed once proof of payment is received.
          </p>
        </div>
      )}
      {selectedMethod === "cash" && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wide leading-relaxed">Cash payment is due on your first session. Your booking will be confirmed immediately.</p>
        </div>
      )}
      <button onClick={onViewPolicy} className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wide hover:text-indigo-500 transition-colors">
        <Info className="h-3 w-3" /> View cancellation &amp; refund policy
      </button>
    </div>
  )
}

function PersonalDetailsForm({ formData, setFormData, phoneError, onPhoneBlur }: {
  formData: FormData; setFormData: (d: FormData) => void; phoneError: string; onPhoneBlur: () => void
}) {
  return (
    <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Step 3 of 4</p>
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Your Details</h3>
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">First Name</Label>
          <Input className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600" placeholder="John"
            value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
        </div>
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Last Name</Label>
          <Input className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600" placeholder="Doe"
            value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Address</Label>
          <Input type="email" className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600" placeholder="email@example.com"
            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Cell Number</Label>
          <Input className={`h-14 rounded-xl bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600 ${phoneError ? "border-red-400 focus:ring-red-400" : "border-slate-200"}`}
            placeholder="081 000 0000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} onBlur={onPhoneBlur} />
          {phoneError && (
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide flex items-center gap-1 ml-1">
              <AlertCircle className="h-3 w-3" /> {phoneError}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Pickup Address</Label>
        <Input className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600" placeholder="123 Street Name, Suburb, City"
          value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
      </div>
    </div>
  )
}

function ProofOfPaymentScreen({ package: pkg, paymentMethod, bookingRef, formData }: {
  package: any; paymentMethod: string; bookingRef: string; formData: FormData
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
          Once you&apos;ve made your {methodLabel.toLowerCase()} payment of{" "}
          <span className="font-black text-slate-900">{pkg?.price}</span>, send your proof of payment to:
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
          <li>→ We&apos;ll confirm your sessions within 2 business hours</li>
          <li>→ A confirmation will be sent to <span className="text-emerald-600">{formData.email}</span></li>
        </ul>
      </div>
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide leading-relaxed px-4">
        Your sessions will be confirmed once payment is verified.
      </p>
    </div>
  )
}

function SuccessScreen({ package: pkg, bookingRef, formData }: { package: any; bookingRef: string; formData: FormData }) {
  return (
    <div className="rounded-[3rem] bg-indigo-600 p-16 text-center shadow-2xl shadow-indigo-200 animate-in zoom-in duration-500">
      <div className="mx-auto h-24 w-24 bg-white rounded-full flex items-center justify-center mb-10 shadow-xl">
        <CheckCircle2 className="h-12 w-12 text-indigo-600" />
      </div>
      <h3 className="text-5xl font-[950] uppercase tracking-tighter text-white">Booking Confirmed.</h3>
      <p className="text-indigo-100 mt-6 uppercase text-[11px] tracking-[0.2em] font-bold max-w-sm mx-auto leading-relaxed">
        Your {pkg?.label} schedule has been logged. Our coordinator will contact you shortly to confirm the pickup details.
      </p>
      <div className="mt-8 inline-block px-8 py-4 rounded-2xl bg-white/10 border border-white/20">
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