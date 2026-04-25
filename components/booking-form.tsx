"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { CheckCircle2, ArrowRight, ArrowLeft, Loader2, Trash2, PlusCircle, AlertCircle, CreditCard, Banknote, Smartphone, Wallet } from "lucide-react"

// Import the Server Action
import { getAvailableSlots } from "@/app/actions/instructors"

// FIX 5: Webhook moved to /api/booking — do not call Make directly from the client
const BOOKING_API = "/api/booking"

const WORKING_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]

const packages = [
  { id: "c8m-5",   label: "Code 8 Manual: 5 Hours",  code: "8M",   hours: 5,  price: "R1550" },
  { id: "c8m-10",  label: "Code 8 Manual: 10 Hours", code: "8M",   hours: 10, price: "R2550" },
  { id: "c8m-15",  label: "Code 8 Manual: 15 Hours", code: "8M",   hours: 15, price: "R3650" },
  { id: "c8m-20",  label: "Code 8 Manual: 20 Hours", code: "8M",   hours: 20, price: "R4800" },
  { id: "c8a-5",   label: "Code 8 Auto: 5 Hours",    code: "8A",   hours: 5,  price: "R1600" },
  { id: "c8a-10",  label: "Code 8 Auto: 10 Hours",   code: "8A",   hours: 10, price: "R2650" },
  { id: "c8a-15",  label: "Code 8 Auto: 15 Hours",   code: "8A",   hours: 15, price: "R3800" },
  { id: "c8a-20",  label: "Code 8 Auto: 20 Hours",   code: "8A",   hours: 20, price: "R5000" },
  { id: "c10-5",   label: "Code 10: 5 Hours",        code: "10",   hours: 5,  price: "R1950" },
  { id: "c10-10",  label: "Code 10: 10 Hours",       code: "10",   hours: 10, price: "R3100" },
  { id: "c10-15",  label: "Code 10: 15 Hours",       code: "10",   hours: 15, price: "R4350" },
  { id: "c10-20",  label: "Code 10: 20 Hours",       code: "10",   hours: 20, price: "R5600" },
  { id: "test-prep", label: "Test Day Prep",          code: "Spec", hours: 2,  price: "R750", description: "Vehicle + 2hr Mock Test" },
]

const PAYMENT_METHODS = [
  { id: "eft",     label: "Instant EFT", icon: Banknote,    description: "Direct bank transfer" },
  { id: "ewallet", label: "E-Wallet",    icon: Wallet,      description: "Send to mobile wallet" },
  { id: "card",    label: "Card",        icon: CreditCard,  description: "Debit or credit card" },
  { id: "cash",    label: "Cash",        icon: Smartphone,  description: "Pay on first session" },
]

// FIX 2: Normalise a SA phone number to 27XXXXXXXXX format
function normaliseSAPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("27") && digits.length === 11) return digits
  if (digits.startsWith("0") && digits.length === 10) return "27" + digits.slice(1)
  return null
}

function isValidSAPhone(raw: string): boolean {
  return normaliseSAPhone(raw) !== null
}

export default function BookingForm() {
  const [step, setStep] = useState(0)
  const [filter, setFilter] = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null)
  const [hoursPerDay, setHoursPerDay] = useState("1")
  const [sessions, setSessions] = useState<{ date: Date; time: string; duration: number }[]>([])
  // FIX: Start as undefined so the availability useEffect doesn't fire until
  // the user actually selects a date. Previously set to new Date(), which
  // triggered an Airtable → iCal fetch immediately on entering step 1
  // before the user had chosen anything, causing the timeout cascade.
  const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined)
  const [currentTime, setCurrentTime] = useState("")
  const [busySlots, setBusySlots] = useState<string[]>([])
  const [availableOnDay, setAvailableOnDay] = useState(true)
  const [noInstructors, setNoInstructors] = useState(false)
  const [assignedInstructor, setAssignedInstructor] = useState<{ firstName: string; lastName: string; phone: string } | null>(null)
  // FIX 3: Track in-flight availability request so we can cancel stale ones
  const availabilityController = useRef<AbortController | null>(null)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", location: "" })
  const [phoneError, setPhoneError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // FIX 4: Store the booking reference so we can show it on success
  const [bookingRef, setBookingRef] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [showProofScreen, setShowProofScreen] = useState(false)

  const totalHoursBooked = sessions.reduce((acc, s) => acc + s.duration, 0)
  const hoursRemaining = selectedPackage ? selectedPackage.hours - totalHoursBooked : 0

  // FIX 6: Clamp intensity to what the package actually supports
  const maxIntensity = selectedPackage
    ? Math.min(3, selectedPackage.hours)
    : 1
  const intensity = Math.min(parseInt(hoursPerDay), maxIntensity)
  const nextSessionDuration = Math.min(intensity, hoursRemaining)

  const getBlockedSlotsForSelection = (startTime: string, sessionDuration: number) => {
    const startIndex = WORKING_HOURS.indexOf(startTime)
    if (startIndex === -1) return []
    return WORKING_HOURS.slice(startIndex, startIndex + sessionDuration)
  }

  // FIX 3: Cancel any in-flight availability request when the date changes; disable date
  // picker while loading so concurrent calls can't be fired.
  // FIX: Guard added — currentDate must be defined before we fetch. This
  // prevents the effect from running on initial render when currentDate is
  // undefined (previously new Date() caused an immediate fetch on mount).
  useEffect(() => {
    if (!currentDate || step !== 1 || !selectedPackage) return

    if (availabilityController.current) {
      availabilityController.current.abort()
    }

    const controller = new AbortController()
    availabilityController.current = controller

    async function syncWithCalendars() {
      setIsCheckingAvailability(true)
      try {
        const dateStr = `${currentDate!.getFullYear()}-${String(currentDate!.getMonth() + 1).padStart(2, "0")}-${String(currentDate!.getDate()).padStart(2, "0")}`
        const result = await getAvailableSlots(dateStr, selectedPackage.code)
        if (!controller.signal.aborted) {
          setBusySlots(result.busySlots)
          setAvailableOnDay(result.availableOnDay)
          setNoInstructors(!result.hasInstructors)
          setAssignedInstructor(result.assignedInstructor)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to sync calendars")
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingAvailability(false)
        }
      }
    }

    syncWithCalendars()

    return () => { controller.abort() }
  }, [currentDate, step, selectedPackage])

  const addSession = () => {
    if (currentDate && currentTime && hoursRemaining > 0) {
      const selectedRange = getBlockedSlotsForSelection(currentTime, nextSessionDuration)
      const hasOverlap = sessions.some(
        (s) =>
          s.date.toDateString() === currentDate.toDateString() &&
          getBlockedSlotsForSelection(s.time, s.duration).some((t) => selectedRange.includes(t))
      )
      if (hasOverlap) return alert("Overlaps with your itinerary.")
      setSessions([...sessions, { date: currentDate, time: currentTime, duration: nextSessionDuration }])
      setCurrentTime("")
    }
  }

  // FIX 2: Validate phone on blur so the user gets inline feedback
  const handlePhoneBlur = () => {
    if (formData.phone && !isValidSAPhone(formData.phone)) {
      setPhoneError("Enter a valid SA number: 082 000 0000 or 27820000000")
    } else {
      setPhoneError("")
    }
  }

  const canProceed = () => {
    if (step === 0) return !!selectedPackage
    if (step === 1) return hoursRemaining === 0
    if (step === 2) {
      return (
        !!formData.firstName &&
        !!formData.lastName &&
        !!formData.email &&
        isValidSAPhone(formData.phone) &&
        !!formData.location
      )
    }
    if (step === 3) return !!paymentMethod
    return true
  }

  const handleSubmit = async (method: string) => {
    setIsSubmitting(true)
    const isCash = method === "cash"

    // FIX 4: Generate ref before submitting so it can be shown in SuccessScreen
    const ref = `DR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    setBookingRef(ref)

    // FIX 2: Normalise phone before sending to the backend
    const normalisedPhone = normaliseSAPhone(formData.phone) ?? formData.phone

    const payload = {
      package: selectedPackage?.label,
      totalHours: selectedPackage?.hours,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: normalisedPhone,
      pickupAddress: formData.location,
      paymentMethod: method,
      paid: isCash ? 1 : 0,
      instructorFirstName: assignedInstructor?.firstName ?? null,
      instructorLastName: assignedInstructor?.lastName ?? null,
      instructorPhone: assignedInstructor?.phone ?? null,
      sessions: sessions.map((s) => ({
        date: `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}-${String(s.date.getDate()).padStart(2, "0")}`,
        time: s.time,
        duration: `${s.duration}h`,
        phone: normalisedPhone,
        formattedSlot: `${s.date.toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "short" })} @ ${s.time} (${s.duration}h)`,
      })),
      bookingRef: ref,
      timestamp: new Date().toISOString(),
    }

    try {
      // FIX 5: Post to our own API route, not directly to Make
      const response = await fetch(BOOKING_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        if (isCash) setSubmitted(true)
      } else {
        alert("Booking failed. Please try again.")
      }
    } catch (error) {
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

  // FIX 4: Pass bookingRef into SuccessScreen
  if (submitted) return <SuccessScreen package={selectedPackage} bookingRef={bookingRef} />

  if (showProofScreen) {
    return (
      <div className="flex flex-col gap-10">
        <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 ${step === 1 ? "p-0 lg:p-12 overflow-hidden" : "p-6 lg:p-12"}`}>
          <ProofOfPaymentScreen
            package={selectedPackage}
            paymentMethod={paymentMethod!}
            bookingRef={bookingRef}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="bg-white border border-slate-200 p-6 lg:p-12 rounded-[2rem] shadow-xl shadow-slate-100">

        {step === 0 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            {!filter ? (
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { id: "8M", label: "Code 8 Manual" },
                  { id: "8A", label: "Code 8 Auto" },
                  { id: "10", label: "Code 10 Truck" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilter(cat.id)}
                    className="p-10 rounded-2xl border border-slate-100 bg-slate-50 text-center hover:border-indigo-600 hover:bg-white hover:shadow-lg transition-all group"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">License Type</p>
                    <p className="text-xl font-black uppercase text-slate-900 mt-1">{cat.label}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                <button
                  onClick={() => { setFilter(null); setSelectedPackage(null) }}
                  className="group flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase transition-all hover:translate-x-[-4px]"
                >
                  <ArrowLeft className="h-3 w-3" /> Change License Type
                </button>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {packages
                    .filter((p) => p.code === filter || p.code === "Spec")
                    .map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => { setSelectedPackage(pkg); setSessions([]) }}
                        className={`p-6 rounded-xl border text-left transition-all ${
                          selectedPackage?.id === pkg.id
                            ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600"
                            : "border-slate-100 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase text-indigo-600 mb-2">{pkg.price}</p>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-900">{pkg.label}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* FIX 6: Only show session intensity if package has more than 1 hour, and cap options to package size */}
            {selectedPackage && selectedPackage.hours > 1 && (
              <div className="p-8 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Session Intensity</Label>
                <Select
                  value={hoursPerDay}
                  onValueChange={(v) => {
                    setHoursPerDay(v)
                    setSessions([])
                  }}
                >
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
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <>
            {/* ─────────────────────────────────────────────────────────────
                DESKTOP layout: side-by-side, unchanged feel
            ───────────────────────────────────────────────────────────────*/}
            <div className="hidden lg:flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hours Scheduled</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    {totalHoursBooked} / {selectedPackage?.hours}h
                  </p>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalHoursBooked / (selectedPackage?.hours ?? 1)) * 100)}%` }}
                  />
                </div>
                {hoursRemaining === 0 && (
                  <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> All hours scheduled — you&apos;re ready to continue!
                  </p>
                )}
              </div>

              <div className="flex gap-10">
                {/* Left: calendar + time slots */}
                <div className="flex-1 space-y-6">
                  <div className={`bg-white p-4 border border-slate-100 rounded-2xl shadow-inner flex justify-center transition-opacity ${isCheckingAvailability ? "opacity-60 pointer-events-none" : ""}`}>
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={(date) => { setCurrentDate(date); setBusySlots([]); setCurrentTime(""); setAvailableOnDay(true); setNoInstructors(false); setAssignedInstructor(null) }}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      className="rounded-md border-none"
                    />
                  </div>
                  {noInstructors && <div className="p-5 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3"><AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /><p className="text-[11px] text-red-700 font-bold uppercase tracking-wide leading-relaxed">No instructors are currently available for this license type. Please contact us directly.</p></div>}
                  {!noInstructors && !availableOnDay && <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3"><AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" /><p className="text-[11px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">No instructors are available on this day. Please select a different date.</p></div>}
                  {!currentDate && <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3"><AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" /><p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide leading-relaxed">Select a date above to see available time slots.</p></div>}
                  <div className="grid grid-cols-5 gap-3">
                    {WORKING_HOURS.map((time, idx) => {
                      const requestedRange = WORKING_HOURS.slice(idx, idx + nextSessionDuration)
                      const isBlockedByGoogle = requestedRange.some((t) => busySlots.includes(t))
                      const isBlockedByItinerary = sessions.some((s) => s.date.toDateString() === currentDate?.toDateString() && getBlockedSlotsForSelection(s.time, s.duration).some((t) => requestedRange.includes(t)))
                      const isOutOfBounds = requestedRange.length < nextSessionDuration
                      const isDisabled = !currentDate || isBlockedByGoogle || isBlockedByItinerary || isOutOfBounds
                      return (
                        <button key={time} disabled={isDisabled || isCheckingAvailability} onClick={() => setCurrentTime(time)}
                          className={`h-14 rounded-xl border text-[11px] font-black transition-all flex flex-col items-center justify-center gap-1 ${isDisabled ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed" : currentTime === time ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "border-slate-200 text-slate-600 bg-white hover:border-indigo-600"}`}>
                          {isCheckingAvailability ? <Loader2 className="h-3 w-3 animate-spin" /> : isDisabled && currentDate ? <><AlertCircle className="h-3 w-3" /><span className="text-[8px]">TAKEN</span></> : time}
                        </button>
                      )
                    })}
                  </div>
                  <Button onClick={addSession} disabled={!currentTime || hoursRemaining <= 0} className="w-full h-16 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.15em] hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-20">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add {nextSessionDuration}h Session
                    {hoursRemaining > 0 && <span className="ml-2 text-[10px] font-black opacity-70">({hoursRemaining}h left after)</span>}
                  </Button>
                </div>
                {/* Right: itinerary */}
                <div className="w-96 border-l border-slate-100 pl-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Your Itinerary</p>
                      {sessions.length > 0 && <p className="text-[10px] text-slate-500 font-bold mt-0.5">{new Set(sessions.map(s => s.date.toDateString())).size} day{new Set(sessions.map(s => s.date.toDateString())).size > 1 ? "s" : ""} selected</p>}
                    </div>
                    <div className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-black text-indigo-600">{totalHoursBooked}/{selectedPackage?.hours}H</div>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {sessions.length === 0 && <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-100"><p className="text-[10px] text-slate-400 uppercase font-black mb-1">No sessions yet</p><p className="text-[9px] text-slate-300 uppercase font-bold">Pick a date &amp; time, then tap Add Session</p></div>}
                    {sessions.map((s, i) => (
                      <div key={i} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                        <div>
                          <p className="text-[12px] font-black text-slate-900 uppercase">{s.date.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.time} • {s.duration}hr session</p>
                        </div>
                        <button onClick={() => setSessions(sessions.filter((_, idx) => idx !== i))} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                MOBILE layout: fixed footer, no scrolling required
                The card's own padding is overridden so we can go edge-to-edge.
            ───────────────────────────────────────────────────────────────*/}
            <div className="lg:hidden -mx-6 -mt-6 animate-in fade-in slide-in-from-bottom-4">

              {/* Scrollable content area — only this scrolls, not the page */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(100svh - 280px)" }}>
                <div className="px-5 pt-5 space-y-4 pb-4">

                  {/* Inline progress pill */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${Math.min(100, (totalHoursBooked / (selectedPackage?.hours ?? 1)) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 shrink-0">{totalHoursBooked}/{selectedPackage?.hours}H</span>
                  </div>

                  {/* Instruction hint — only shown before first session */}
                  {sessions.length === 0 && (
                    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1.5">How this works</p>
                      <p className="text-[11px] font-bold text-indigo-700 leading-relaxed">
                        Pick a date → choose a start time → tap <strong>Add Session</strong>. Repeat until all {selectedPackage?.hours} hours are scheduled across as many days as you like.
                      </p>
                    </div>
                  )}

                  {/* "Keep going" nudge after adding a session */}
                  {sessions.length > 0 && hoursRemaining > 0 && !currentDate && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <p className="text-[11px] font-bold text-emerald-700">
                        Session added! Pick another date for your next {nextSessionDuration}h — {hoursRemaining}h left.
                      </p>
                    </div>
                  )}

                  {/* Calendar */}
                  <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm flex justify-center transition-opacity py-2 ${isCheckingAvailability ? "opacity-60 pointer-events-none" : ""}`}>
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={(date) => { setCurrentDate(date); setBusySlots([]); setCurrentTime(""); setAvailableOnDay(true); setNoInstructors(false); setAssignedInstructor(null) }}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      className="rounded-md border-none"
                    />
                  </div>

                  {/* Status messages */}
                  {noInstructors && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3"><AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /><p className="text-[11px] text-red-700 font-bold uppercase tracking-wide leading-relaxed">No instructors available for this license type. Please contact us.</p></div>}
                  {!noInstructors && !availableOnDay && <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3"><AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" /><p className="text-[11px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">No instructors on this day — pick a different date.</p></div>}

                  {/* Time slots — only shown once a valid date is picked */}
                  {currentDate && availableOnDay && !noInstructors && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                        {currentDate.toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "short" })} — pick a start time
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {WORKING_HOURS.map((time, idx) => {
                          const requestedRange = WORKING_HOURS.slice(idx, idx + nextSessionDuration)
                          const isBlockedByGoogle = requestedRange.some((t) => busySlots.includes(t))
                          const isBlockedByItinerary = sessions.some((s) => s.date.toDateString() === currentDate?.toDateString() && getBlockedSlotsForSelection(s.time, s.duration).some((t) => requestedRange.includes(t)))
                          const isOutOfBounds = requestedRange.length < nextSessionDuration
                          const isDisabled = isBlockedByGoogle || isBlockedByItinerary || isOutOfBounds
                          return (
                            <button key={time} disabled={isDisabled || isCheckingAvailability} onClick={() => setCurrentTime(time)}
                              className={`h-14 rounded-xl border text-[11px] font-black transition-all flex flex-col items-center justify-center gap-1 ${isDisabled ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed" : currentTime === time ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "border-slate-200 text-slate-700 bg-white"}`}>
                              {isCheckingAvailability ? <Loader2 className="h-3 w-3 animate-spin" /> : isDisabled ? <><AlertCircle className="h-3 w-3" /><span className="text-[8px]">TAKEN</span></> : time}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Booked sessions list */}
                  {sessions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Your sessions</p>
                      {sessions.map((s, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50">
                          <div>
                            <p className="text-[12px] font-black text-slate-900 uppercase">{s.date.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{s.time} • {s.duration}h</p>
                          </div>
                          <button onClick={() => setSessions(sessions.filter((_, idx) => idx !== i))} className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom breathing room so last item isn't hidden behind fixed footer */}
                  <div className="h-4" />
                </div>
              </div>

              {/* ── Fixed bottom action bar ── */}
              <div className="border-t border-slate-100 bg-white px-5 py-4 space-y-3">
                {/* Add session button — primary action when a time is selected */}
                {currentDate && currentTime && hoursRemaining > 0 && (
                  <Button onClick={addSession} className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-[0.12em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add {nextSessionDuration}h — {currentDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })} @ {currentTime}
                  </Button>
                )}

                {/* Continue / Back row */}
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => setStep(0)} className="h-14 px-5 rounded-2xl text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={hoursRemaining !== 0}
                    className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.12em] hover:bg-indigo-600 transition-all disabled:opacity-25"
                  >
                    {hoursRemaining === 0 ? <>Continue <ArrowRight className="ml-2 h-4 w-4" /></> : <>{hoursRemaining}h still to schedule</>}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          // FIX 2: Pass phone validation props down
          <PersonalDetailsForm
            formData={formData}
            setFormData={setFormData}
            phoneError={phoneError}
            onPhoneBlur={handlePhoneBlur}
          />
        )}

        {/* FIX 1: Removed dead step 3 (FinalReview) — flow is now 0→1→2→3 then submit */}
        {step === 3 && (
          <PaymentMethodStep
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
            package={selectedPackage}
          />
        )}

        <div className={`mt-16 flex items-center justify-between border-t border-slate-100 pt-10 ${step === 1 ? "hidden lg:flex" : ""}`}>
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 0 || isSubmitting}
            className="text-slate-400 hover:text-slate-900 uppercase text-[10px] font-black tracking-widest"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={() => {
              if (step === 3) {
                handlePaymentNext()
              } else {
                setStep(step + 1)
              }
            }}
            disabled={!canProceed() || isSubmitting}
            className="h-16 rounded-2xl bg-indigo-600 px-12 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-20 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {step === 3
                  ? paymentMethod === "cash"
                    ? "Confirm Booking"
                    : "Next Step"
                  : "Next Step"}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PaymentMethodStep({
  selectedMethod,
  onSelect,
  package: pkg,
}: {
  selectedMethod: string | null
  onSelect: (id: string) => void
  package: any
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
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`p-8 rounded-2xl border text-left transition-all group ${
              selectedMethod === id
                ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600"
                : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"
            }`}
          >
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                selectedMethod === id
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-400 group-hover:text-indigo-600 border border-slate-100"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className={`text-sm font-black uppercase tracking-widest ${selectedMethod === id ? "text-indigo-600" : "text-slate-900"}`}>
              {label}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{description}</p>
          </button>
        ))}
      </div>
      {selectedMethod && selectedMethod !== "cash" && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">
            You'll be shown payment details on the next screen. Your booking is only confirmed once proof of payment is received.
          </p>
        </div>
      )}
      {selectedMethod === "cash" && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wide leading-relaxed">
            Cash payment is due on your first session. Your booking will be confirmed immediately.
          </p>
        </div>
      )}
    </div>
  )
}

// FIX 4: Accept and display bookingRef
function ProofOfPaymentScreen({
  package: pkg,
  paymentMethod,
  bookingRef,
}: {
  package: any
  paymentMethod: string
  bookingRef: string
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
          <span className="font-black text-slate-900">{pkg?.price}</span>, send your proof of payment to:
        </p>
      </div>
      <div className="p-8 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp / Contact Number</p>
        <p className="text-3xl font-black tracking-tight text-indigo-600">0612713583</p>
      </div>
      {/* FIX 4: Show booking reference */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Booking Reference</p>
        <p className="text-xl font-black tracking-widest text-slate-900">{bookingRef}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">Include this when sending proof of payment</p>
      </div>
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide leading-relaxed px-4">
        Your sessions will be confirmed once payment is verified.
      </p>
    </div>
  )
}

// FIX 2: Added phoneError + onPhoneBlur props for inline validation feedback
function PersonalDetailsForm({
  formData,
  setFormData,
  phoneError,
  onPhoneBlur,
}: {
  formData: any
  setFormData: any
  phoneError: string
  onPhoneBlur: () => void
}) {
  return (
    <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">First Name</Label>
          <Input
            className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Last Name</Label>
          <Input
            className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Address</Label>
          <Input
            type="email"
            className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600"
            placeholder="email@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="space-y-3">
          <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Cell Number</Label>
          <Input
            className={`h-14 rounded-xl bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600 ${
              phoneError ? "border-red-400 focus:ring-red-400" : "border-slate-200"
            }`}
            placeholder="082 000 0000"
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
      <div className="space-y-3">
        <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Pickup Address</Label>
        <Input
          className="h-14 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600"
          placeholder="123 Street Name, Suburb, City"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>
    </div>
  )
}

// FIX 4: Show booking reference on success screen
function SuccessScreen({ package: pkg, bookingRef }: { package: any; bookingRef: string }) {
  return (
    <div className="rounded-[3rem] bg-indigo-600 p-16 text-center shadow-2xl shadow-indigo-200 animate-in zoom-in duration-500">
      <div className="mx-auto h-24 w-24 bg-white rounded-full flex items-center justify-center mb-10 shadow-xl">
        <CheckCircle2 className="h-12 w-12 text-indigo-600" />
      </div>
      <h3 className="text-5xl font-[950] uppercase tracking-tighter text-white">Booking Confirmed.</h3>
      <p className="text-indigo-100 mt-6 uppercase text-[11px] tracking-[0.2em] font-bold max-w-sm mx-auto leading-relaxed">
        Your {pkg?.label} schedule has been logged. Our coordinator will contact you shortly to confirm the pickup details.
      </p>
      {/* FIX 4: Display booking reference */}
      <div className="mt-8 inline-block px-8 py-4 rounded-2xl bg-white/10 border border-white/20">
        <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest mb-1">Booking Reference</p>
        <p className="text-2xl font-black tracking-widest text-white">{bookingRef}</p>
      </div>
      <div className="mt-8">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="h-14 rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white hover:text-indigo-600 uppercase text-[11px] font-black tracking-widest px-10"
        >
          Book Another Class
        </Button>
      </div>
    </div>
  )
}