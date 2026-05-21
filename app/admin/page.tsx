"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Calendar } from "@/components/ui/calendar"
import {
  CheckCircle2, Loader2, Trash2, PlusCircle, AlertCircle,
  CreditCard, Banknote, Smartphone, Wallet, X, CalendarDays,
  User, Phone, Mail, MapPin, Car, Clock, ChevronRight,
  RotateCcw, Zap, RefreshCw, Search, BadgeCheck, Receipt,
  MessageCircle, MessageSquare,
} from "lucide-react"

import { getAvailableSlots, getBatchAvailability } from "@/app/actions/instructors"
import type { AssignedInstructor, DayAvailability } from "@/app/actions/instructors"
import { WORKING_HOURS } from "@/app/actions/booking-constants"

const BOOKING_API = "/api/booking"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const INDIVIDUAL_VEHICLES = [
  { id: "learners", label: "Learners Licence",           code: "LL", pricePerHour: 250 },
  { id: "c8m",      label: "Code 08 Manual",             code: "8M", pricePerHour: 350 },
  { id: "c8a",      label: "Code 08 Automatic",          code: "8A", pricePerHour: 370 },
  { id: "c10",      label: "Code 10 (C1) — Heavy",       code: "10", pricePerHour: 480 },
  { id: "c14",      label: "Code 14 (EC) — Combination", code: "14", pricePerHour: 600 },
]

const ADVANCE_VEHICLES = [
  { id: "lifestyle",   label: "Lifestyle Driving",              code: "LD", pricePerHour: 400 },
  { id: "closed-body", label: "Heavy — Closed Body",            code: "CB", pricePerHour: 520 },
  { id: "superlink",   label: "Combination — Super Link",       code: "SL", pricePerHour: 680 },
  { id: "forklift",    label: "Forklift Renewal (On Site)",     code: "FK", pricePerHour: 450 },
  { id: "4x4",         label: "4×4 On & Off Road",              code: "4X", pricePerHour: 520 },
]

const ALL_VEHICLES = [...INDIVIDUAL_VEHICLES, ...ADVANCE_VEHICLES]

const ADDONS = [
  { id: "car-hire",  label: "Car hire for drivers test",  price: 350 },
  { id: "transport", label: "Transport to NaTIS facility", price: 200 },
]

const PAYMENT_METHODS = [
  { id: "cash",    label: "Cash",     icon: Smartphone },
  { id: "eft",     label: "EFT",      icon: Banknote },
  { id: "ewallet", label: "E-Wallet", icon: Wallet },
  { id: "card",    label: "Card",     icon: CreditCard },
]

const CONTACT_METHODS = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "sms",      label: "SMS",      icon: MessageSquare },
  { id: "email",    label: "Email",    icon: Mail },
]

const MIN_HOURS = 2

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function normaliseSAPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("27") && digits.length === 11) return digits
  if (digits.startsWith("0")  && digits.length === 10) return "27" + digits.slice(1)
  return null
}
function isValidSAPhone(raw: string): boolean { return normaliseSAPhone(raw) !== null }

function getBlockedSlots(startTime: string, duration: number): string[] {
  const idx = WORKING_HOURS.indexOf(startTime)
  if (idx === -1) return []
  return WORKING_HOURS.slice(idx, idx + duration)
}

function advanceDays(from: Date, days: number): Date {
  const d = new Date(from.getTime() + days * 86_400_000)
  if (d.getDay() === 0) return new Date(d.getTime() + 86_400_000)
  return d
}

function buildCandidates(start: Date, gap: number, count: number): Date[] {
  const dates: Date[] = []
  let cur = start
  while (dates.length < count) { cur = advanceDays(cur, gap); dates.push(new Date(cur)) }
  return dates
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })
}

function genRef() {
  return `ADM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Vehicle = typeof ALL_VEHICLES[0]
type Session = { date: Date; time: string; duration: number }
type RepeatMode = "none" | "weekly" | "biweekly"

interface StudentForm {
  firstName:     string
  lastName:      string
  phone:         string
  email:         string
  location:      string
  contactMethod: string
}

// ---------------------------------------------------------------------------
// Print receipt
// ---------------------------------------------------------------------------

function triggerPrint(params: {
  ref: string
  student: StudentForm
  vehicle: Vehicle
  hours: number
  sessions: Session[]
  addons: string[]
  paymentMethod: string
  grandTotal: number
  assignedInstructor: AssignedInstructor | null
}) {
  const { ref, student, vehicle, hours, sessions, addons, paymentMethod, grandTotal, assignedInstructor } = params
  const addonLines = addons
    .map(id => ADDONS.find(a => a.id === id))
    .filter(Boolean)
    .map(a => `<tr><td>${a!.label}</td><td style="text-align:right">R${a!.price}</td></tr>`)
    .join("")

  const sessionLines = sessions
    .map((s, i) => `<tr><td>#${i + 1}</td><td>${fmtDate(s.date)}</td><td>${s.time}</td><td>${s.duration}h</td></tr>`)
    .join("")

  const contactLabel = CONTACT_METHODS.find(c => c.id === student.contactMethod)?.label ?? "—"
  const paymentLabel = PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label ?? "—"

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Booking Receipt — ${ref}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12px;
    color: #111;
    background: #fff;
    padding: 32px 40px;
    max-width: 720px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 2px solid #111;
    margin-bottom: 24px;
  }
  .logo-block h1 {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.5px;
    text-transform: uppercase;
  }
  .logo-block p {
    font-size: 10px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 2px;
  }
  .ref-block { text-align: right; }
  .ref-block .ref-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #888;
    margin-bottom: 3px;
  }
  .ref-block .ref-code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #111;
  }
  .ref-block .ref-date { font-size: 10px; color: #888; margin-top: 3px; }
  .section { margin-bottom: 22px; }
  .section-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #888;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .field label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 1px; }
  .field span { font-size: 12px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; padding: 4px 0; border-bottom: 1px solid #e5e5e5; }
  table td { padding: 6px 0; border-bottom: 1px solid #f2f2f2; color: #222; }
  .totals-table td { border: none; padding: 3px 0; }
  .totals-table .grand-total td { font-size: 14px; font-weight: 700; padding-top: 10px; border-top: 2px solid #111; font-family: 'IBM Plex Mono', monospace; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; text-transform: uppercase; letter-spacing: 1px; }
  .stamp { display: inline-block; border: 2px solid #22c55e; color: #22c55e; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 4px 12px; border-radius: 3px; transform: rotate(-2deg); margin-top: 4px; display: block; width: fit-content; }
  @media print { body { padding: 16px 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo-block">
    <h1>Dees Driver Training</h1>
    <p>Official Booking Receipt</p>
    ${paymentMethod === "cash" ? '<span class="stamp">Confirmed</span>' : ""}
  </div>
  <div class="ref-block">
    <div class="ref-label">Booking Reference</div>
    <div class="ref-code">${ref}</div>
    <div class="ref-date">${new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Student Information</div>
  <div class="grid-2">
    <div class="field"><label>Full Name</label><span>${student.firstName} ${student.lastName}</span></div>
    <div class="field"><label>Cell Number</label><span>${student.phone}</span></div>
    ${student.email ? `<div class="field"><label>Email</label><span>${student.email}</span></div>` : ""}
    ${student.location ? `<div class="field"><label>Pickup Address</label><span>${student.location}</span></div>` : ""}
    <div class="field"><label>Preferred Contact</label><span>${contactLabel}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Course Details</div>
  <div class="grid-2">
    <div class="field"><label>Course</label><span>${vehicle.label}</span></div>
    <div class="field"><label>Hours Booked</label><span>${hours} hour${hours !== 1 ? "s" : ""}</span></div>
    <div class="field"><label>Rate</label><span>R${vehicle.pricePerHour}/hr</span></div>
    <div class="field"><label>Payment Method</label><span>${paymentLabel}</span></div>
  </div>
</div>

${assignedInstructor ? `
<div class="section">
  <div class="section-title">Assigned Instructor</div>
  <div class="grid-2">
    <div class="field"><label>Name</label><span>${assignedInstructor.firstName} ${assignedInstructor.lastName}</span></div>
    <div class="field"><label>Contact</label><span>${assignedInstructor.phone}</span></div>
  </div>
</div>` : ""}

<div class="section">
  <div class="section-title">Scheduled Sessions</div>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Start Time</th><th>Duration</th></tr></thead>
    <tbody>${sessionLines}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Pricing</div>
  <table class="totals-table">
    <tbody>
      <tr><td>Session (${hours}h × R${vehicle.pricePerHour})</td><td style="text-align:right">R${(vehicle.pricePerHour * hours).toLocaleString("en-ZA")}</td></tr>
      ${addonLines}
      <tr class="grand-total"><td></td><td style="text-align:right">R${grandTotal.toLocaleString("en-ZA")}</td></tr>
    </tbody>
  </table>
</div>

<div class="footer">
  <span>Dees Driver Training · Windhoek</span>
  <span>Printed ${new Date().toLocaleString("en-ZA")}</span>
  <span>Ref: ${ref}</span>
</div>
</body>
</html>`

  const win = window.open("", "_blank", "width=800,height=900")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, icon: Icon, children, dim }: {
  title: string; icon: React.ElementType; children: React.ReactNode; dim?: boolean
}) {
  return (
    <div className={`rounded-2xl border transition-all ${
      dim
        ? "border-slate-200 bg-slate-50/60 opacity-40 pointer-events-none select-none"
        : "border-slate-200 bg-white shadow-sm shadow-slate-100"
    }`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-indigo-500" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {children}
      {error && (
        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  )
}

function AdminInput({ value, onChange, placeholder, type = "text", onBlur }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; onBlur?: () => void
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full h-12 px-4 rounded-xl bg-slate-50/50 border border-slate-200 text-slate-900 text-[13px] font-medium placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
    />
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminBookingPage() {
  // ── Student details ──
  const [student, setStudent] = useState<StudentForm>({
    firstName: "", lastName: "", phone: "", email: "", location: "", contactMethod: "whatsapp",
  })
  const [phoneError, setPhoneError] = useState("")

  // ── Course ──
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [hours, setHours]                     = useState(MIN_HOURS)
  const [selectedAddons, setSelectedAddons]   = useState<string[]>([])
  const [paymentMethod, setPaymentMethod]     = useState<string>("cash")

  // ── Scheduling ──
  const [sessions, setSessions]               = useState<Session[]>([])
  const [calDate, setCalDate]                 = useState<Date | undefined>()
  const [selTime, setSelTime]                 = useState("")
  const [busySlots, setBusySlots]             = useState<string[]>([])
  const [availableOnDay, setAvailableOnDay]   = useState(true)
  const [noInstructors, setNoInstructors]     = useState(false)
  const [assignedInstructor, setAssignedInstructor] = useState<AssignedInstructor | null>(null)
  const [checkingAvail, setCheckingAvail]     = useState(false)

  // NEW: per-date instructor map so each session carries the right instructor
  const [sessionInstructors, setSessionInstructors] = useState<Record<string, AssignedInstructor>>({})

  // ── Auto-fill ──
  const [repeatMode, setRepeatMode]           = useState<RepeatMode>("none")
  const [autoFillLoading, setAutoFillLoading] = useState(false)
  const [autoFillPreview, setAutoFillPreview] = useState<{
    proposed: Array<{ date: Date; time: string; duration: number; available: boolean }>
    skipped: Date[]
    status: "ready" | "none"
  } | null>(null)

  // ── Submission ──
  const [submitting, setSubmitting]   = useState(false)
  const [result, setResult]           = useState<{
    ref: string
    studentName: string
    vehicle: Vehicle
    hours: number
    sessions: Session[]
    addons: string[]
    paymentMethod: string
    grandTotal: number
    assignedInstructor: AssignedInstructor | null
    student: StudentForm
  } | null>(null)
  const [submitError, setSubmitError] = useState("")

  const abortRef = useRef<AbortController | null>(null)

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const vehiclePrice  = (selectedVehicle?.pricePerHour ?? 0) * hours
  const addonTotal    = selectedAddons.reduce((s, id) => s + (ADDONS.find(a => a.id === id)?.price ?? 0), 0)
  const grandTotal    = vehiclePrice + addonTotal
  const isLifestyleDriving = selectedVehicle?.code === "LD"
  const studentValid  = !!student.firstName && !!student.lastName && isValidSAPhone(student.phone)
  const courseValid   = !!selectedVehicle && (isLifestyleDriving || hours >= MIN_HOURS)
  const scheduleValid = sessions.length > 0
  const canSubmit     = studentValid && courseValid && scheduleValid && !!paymentMethod && !submitting
  const canShowAutoFill = !!calDate && (isLifestyleDriving || !!selTime) && availableOnDay && !noInstructors && !checkingAvail

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!calDate || !selectedVehicle) return
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setCheckingAvail(true)
    setBusySlots([])
    setSelTime("")
    setAutoFillPreview(null)
    setRepeatMode("none")
    setAssignedInstructor(null)

    getAvailableSlots(toDateStr(calDate), selectedVehicle.code)
      .then(r => {
        if (ctrl.signal.aborted) return
        setBusySlots(r.busySlots)
        setAvailableOnDay(r.availableOnDay)
        setNoInstructors(!r.hasInstructors)
        setAssignedInstructor(r.assignedInstructor)
        // Store instructor for this date in the per-date map
        if (r.assignedInstructor) {
          setSessionInstructors(prev => ({ ...prev, [toDateStr(calDate)]: r.assignedInstructor! }))
        }
        // Lifestyle Driving: auto-add date as session immediately (no time picker needed)
        if (selectedVehicle?.code === "LD" && r.availableOnDay && r.hasInstructors) {
          setSessions(prev => {
            const alreadyAdded = prev.some(s => s.date.toDateString() === calDate.toDateString())
            if (alreadyAdded) return prev
            return [...prev, { date: calDate, time: "08:00", duration: 10 }]
          })
        }
      })
      .catch(() => { if (!ctrl.signal.aborted) console.error("Avail check failed") })
      .finally(() => { if (!ctrl.signal.aborted) setCheckingAvail(false) })

    return () => ctrl.abort()
  }, [calDate, selectedVehicle])

  useEffect(() => { setAutoFillPreview(null) }, [repeatMode])

  // ---------------------------------------------------------------------------
  // Session management
  // ---------------------------------------------------------------------------

  const addSession = () => {
    if (!calDate) return
    if (isLifestyleDriving) {
      const alreadyAdded = sessions.some(s => s.date.toDateString() === calDate.toDateString())
      if (alreadyAdded) return
      setSessions(prev => [...prev, { date: calDate, time: "08:00", duration: 10 }])
      setCalDate(undefined)
      return
    }
    if (!selTime) return
    const range = getBlockedSlots(selTime, hours)
    const overlap = sessions.some(s =>
      s.date.toDateString() === calDate.toDateString() &&
      getBlockedSlots(s.time, s.duration).some(t => range.includes(t))
    )
    if (overlap) { alert("This slot overlaps an existing session."); return }
    setSessions(prev => [...prev, { date: calDate, time: selTime, duration: hours }])
    setSelTime("")
  }

  const removeSession = (i: number) => setSessions(prev => prev.filter((_, idx) => idx !== i))

  // ---------------------------------------------------------------------------
  // Auto-fill
  // ---------------------------------------------------------------------------

  const previewAutoFill = useCallback(async () => {
    if (!calDate || !selTime || !selectedVehicle || repeatMode === "none") return
    const gap = repeatMode === "weekly" ? 7 : 14
    const candidates = buildCandidates(calDate, gap, 4)
    setAutoFillLoading(true)
    setAutoFillPreview(null)

    try {
      const results: DayAvailability[] = await getBatchAvailability(candidates.map(toDateStr), selectedVehicle.code)
      const proposed: typeof autoFillPreview["proposed"] = []
      const skipped: Date[] = []

      // Store instructors for all auto-fill candidate dates
      const newInstructors: Record<string, AssignedInstructor> = {}
      results.forEach((day, i) => {
        if (day.assignedInstructor) {
          newInstructors[toDateStr(candidates[i])] = day.assignedInstructor
        }
      })
      setSessionInstructors(prev => ({ ...prev, ...newInstructors }))

      for (let i = 0; i < results.length; i++) {
        if (proposed.filter(p => p.available).length >= 3) break
        const day = results[i]
        if (!day.availableOnDay || !day.hasInstructors) { skipped.push(candidates[i]); continue }
        const range = getBlockedSlots(selTime, hours)
        const blocked = range.some(t => day.busySlots.includes(t)) ||
          sessions.some(s => s.date.toDateString() === candidates[i].toDateString() &&
            getBlockedSlots(s.time, s.duration).some(t => range.includes(t)))
        if (blocked) { skipped.push(candidates[i]); proposed.push({ date: candidates[i], time: selTime, duration: hours, available: false }) }
        else proposed.push({ date: candidates[i], time: selTime, duration: hours, available: true })
      }

      setAutoFillPreview({
        proposed,
        skipped,
        status: proposed.some(p => p.available) ? "ready" : "none",
      })
    } catch { console.error("Auto-fill failed") }
    finally { setAutoFillLoading(false) }
  }, [calDate, selTime, selectedVehicle, repeatMode, hours, sessions])

  const commitAutoFill = () => {
    if (!autoFillPreview || !calDate || !selTime) return
    const range = getBlockedSlots(selTime, hours)
    const anchorOverlap = sessions.some(s =>
      s.date.toDateString() === calDate.toDateString() &&
      getBlockedSlots(s.time, s.duration).some(t => range.includes(t))
    )
    if (!anchorOverlap) setSessions(prev => [...prev, { date: calDate, time: selTime, duration: hours }])
    setSessions(prev => [...prev, ...autoFillPreview.proposed.filter(p => p.available)])
    setAutoFillPreview(null); setRepeatMode("none"); setSelTime(""); setCalDate(undefined)
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!canSubmit || !selectedVehicle) return
    setSubmitting(true)
    setSubmitError("")
    const ref   = genRef()
    const phone = normaliseSAPhone(student.phone) ?? student.phone

    const payload = {
      package:       selectedVehicle.label,
      totalHours:    hours,
      firstName:     student.firstName,
      lastName:      student.lastName,
      email:         student.email,
      phone,
      pickupAddress: student.location,
      contactMethod: student.contactMethod,
      paymentMethod,
      paid:          paymentMethod === "cash" ? 1 : 0,
      addons:        selectedAddons,
      grandTotal,
      // Per-session instructor looked up from the date map
      sessions: sessions.map((s) => {
        const dateStr    = toDateStr(s.date)
        const instructor = sessionInstructors[dateStr]
        return {
          date:                dateStr,
          formattedDate:       s.date.toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "short" }),
          time:                s.time,
          duration:            `${s.duration}h`,
          instructorFirstName: instructor?.firstName ?? "",
          instructorLastName:  instructor?.lastName  ?? "",
          instructorPhone:     instructor?.phone     ?? "",
        }
      }),
      bookingRef: ref,
      timestamp:  new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }),
    }

    try {
      const res = await fetch(BOOKING_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setResult({
          ref,
          studentName:        `${student.firstName} ${student.lastName}`,
          vehicle:            selectedVehicle,
          hours,
          sessions,
          addons:             selectedAddons,
          paymentMethod,
          grandTotal,
          assignedInstructor,
          student,
        })
      } else {
        setSubmitError("Booking failed — please check your connection and try again.")
      }
    } catch {
      setSubmitError("Network error — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setStudent({ firstName: "", lastName: "", phone: "", email: "", location: "", contactMethod: "whatsapp" })
    setSelectedVehicle(null); setHours(MIN_HOURS); setSelectedAddons([]); setPaymentMethod("cash")
    setSessions([]); setCalDate(undefined); setSelTime(""); setBusySlots([])
    setAvailableOnDay(true); setNoInstructors(false); setAssignedInstructor(null)
    setSessionInstructors({})
    setRepeatMode("none"); setAutoFillPreview(null); setResult(null); setSubmitError("")
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------

  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="rounded-[3rem] bg-indigo-600 p-12 text-center shadow-2xl shadow-indigo-200">
            <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl">
              <BadgeCheck className="h-10 w-10 text-indigo-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200 mb-3">Booking confirmed</p>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white">{result.studentName}</h2>
            <p className="text-indigo-100 text-sm mt-2">has been successfully booked.</p>
            <div className="mt-6 p-4 rounded-2xl bg-white/10 border border-white/20 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Reference</p>
              <p className="text-2xl font-black tracking-widest text-white">{result.ref}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={resetForm}
              className="h-12 rounded-xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
            >
              New booking
            </button>
            <button
              onClick={() => triggerPrint({
                ref:                result.ref,
                student:            result.student,
                vehicle:            result.vehicle,
                hours:              result.hours,
                sessions:           result.sessions,
                addons:             result.addons,
                paymentMethod:      result.paymentMethod,
                grandTotal:         result.grandTotal,
                assignedInstructor: result.assignedInstructor,
              })}
              className="h-12 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <Receipt className="h-4 w-4" /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm shadow-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Car className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Dees Driver Training</p>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Admin — Walk-in Booking</p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="flex items-center gap-2 h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">

            {/* ─── 1. Student details ─── */}
            <Section title="Student Details" icon={User}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name">
                  <AdminInput value={student.firstName} onChange={v => setStudent(s => ({ ...s, firstName: v }))} placeholder="John" />
                </Field>
                <Field label="Last name">
                  <AdminInput value={student.lastName} onChange={v => setStudent(s => ({ ...s, lastName: v }))} placeholder="Doe" />
                </Field>
                <Field label="Cell number" error={phoneError}>
                  <AdminInput
                    value={student.phone}
                    onChange={v => setStudent(s => ({ ...s, phone: v }))}
                    placeholder="081 000 0000"
                    onBlur={() => {
                      if (student.phone && !isValidSAPhone(student.phone))
                        setPhoneError("Invalid SA number")
                      else setPhoneError("")
                    }}
                  />
                </Field>
                <Field label="Email (optional)">
                  <AdminInput type="email" value={student.email} onChange={v => setStudent(s => ({ ...s, email: v }))} placeholder="email@example.com" />
                </Field>
                <div className="col-span-2">
                  <Field label="Pickup address (optional)">
                    <AdminInput value={student.location} onChange={v => setStudent(s => ({ ...s, location: v }))} placeholder="123 Street, Suburb" />
                  </Field>
                </div>

                {/* ── Preferred contact method ── */}
                <div className="col-span-2">
                  <Field label="Preferred method of contact">
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {CONTACT_METHODS.map(({ id, label, icon: Icon }) => {
                        const active = student.contactMethod === id
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setStudent(s => ({ ...s, contactMethod: id }))}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              active
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-700"
                            }`}
                          >
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                            <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                </div>
              </div>
            </Section>

            {/* ─── 2. Course selection ─── */}
            <Section title="Course & Hours" icon={Car} dim={!studentValid}>
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Individual</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {INDIVIDUAL_VEHICLES.map(v => (
                      <button
                        key={v.id}
                        onClick={() => { setSelectedVehicle(v); setCalDate(undefined); setSelTime(""); setSessions([]); setSessionInstructors({}) }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                          selectedVehicle?.id === v.id
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-700"
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest leading-tight">{v.label}</span>
                        <span className={`text-[10px] font-black shrink-0 ml-2 ${selectedVehicle?.id === v.id ? "text-indigo-400" : "text-slate-400"}`}>
                          R{v.pricePerHour}/h
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Advanced</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ADVANCE_VEHICLES.map(v => (
                      <button
                        key={v.id}
                        onClick={() => { setSelectedVehicle(v); setCalDate(undefined); setSelTime(""); setSessions([]); setSessionInstructors({}) }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                          selectedVehicle?.id === v.id
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-700"
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest leading-tight">{v.label}</span>
                        <span className={`text-[10px] font-black shrink-0 ml-2 ${selectedVehicle?.id === v.id ? "text-indigo-400" : "text-slate-400"}`}>
                          R{v.pricePerHour}/h
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedVehicle && (
                  <div className="flex items-center gap-4 pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hours</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHours(h => Math.max(MIN_HOURS, h - 1))}
                        disabled={hours <= MIN_HOURS}
                        className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 transition-all font-bold"
                      >−</button>
                      <span className="w-8 text-center text-lg font-black text-slate-800">{hours}</span>
                      <button
                        onClick={() => setHours(h => h + 1)}
                        className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center hover:border-indigo-300 hover:text-indigo-600 transition-all font-bold"
                      >+</button>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Session total</p>
                      <p className="text-lg font-black text-indigo-600">R{vehiclePrice.toLocaleString("en-ZA")}</p>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* ─── 3. Scheduling ─── */}
            <Section title="Schedule Sessions" icon={CalendarDays} dim={!courseValid}>
              <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">

                <div className="space-y-4">
                  <div className={`rounded-2xl overflow-hidden border border-slate-200 bg-white transition-opacity ${checkingAvail ? "opacity-50 pointer-events-none" : ""}`}>
                    <Calendar
                      mode="single"
                      selected={calDate}
                      onSelect={d => { if (d) { setCalDate(d); setSelTime("") } }}
                      disabled={d => d < new Date() || d.getDay() === 0}
                      className="p-3"
                    />
                  </div>

                  {checkingAvail && (
                    <div className="flex items-center gap-2 text-[11px] text-indigo-500 font-bold uppercase">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability…
                    </div>
                  )}
                  {!checkingAvail && calDate && noInstructors && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold uppercase">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> No instructors for this course type.
                    </div>
                  )}
                  {!checkingAvail && calDate && !availableOnDay && !noInstructors && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 text-[11px] font-bold uppercase">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> No instructors available this day.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {!calDate && !isLifestyleDriving && (
                    <div className="flex items-center gap-3 h-full min-h-[120px]">
                      <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">← Select a date to see time slots</p>
                    </div>
                  )}

                  {isLifestyleDriving && !calDate && (
                    <div className="flex items-center gap-3 h-full min-h-[120px]">
                      <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">← Select a date to add it</p>
                    </div>
                  )}

                  {isLifestyleDriving && calDate && !checkingAvail && availableOnDay && !noInstructors && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold uppercase">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {fmtDate(calDate)} added — pick more dates or continue.
                    </div>
                  )}

                  {!isLifestyleDriving && calDate && !checkingAvail && availableOnDay && !noInstructors && (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        {WORKING_HOURS.map((time, idx) => {
                          const range = WORKING_HOURS.slice(idx, idx + hours)
                          const blockedAirtable   = range.some(t => busySlots.includes(t))
                          const blockedItinerary  = sessions.some(s =>
                            s.date.toDateString() === calDate.toDateString() &&
                            getBlockedSlots(s.time, s.duration).some(t => range.includes(t))
                          )
                          const outOfBounds = range.length < hours
                          const disabled = blockedAirtable || blockedItinerary || outOfBounds
                          return (
                            <button
                              key={time}
                              disabled={disabled}
                              onClick={() => setSelTime(time)}
                              className={`h-10 rounded-xl border text-[11px] font-black transition-all ${
                                disabled
                                  ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                  : selTime === time
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                              }`}
                            >
                              {disabled ? "—" : time}
                            </button>
                          )
                        })}
                      </div>

                      {selTime && !autoFillPreview && (
                        <button
                          onClick={addSession}
                          className="w-full h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Add {fmtDate(calDate)} @ {selTime} ({hours}h)
                        </button>
                      )}

                      {selTime && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-indigo-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Auto-fill recurring slots</p>
                          </div>

                          <div className="flex gap-2">
                            {(["none", "weekly", "biweekly"] as const).map(opt => {
                              const labels = { none: "Once", weekly: "Weekly", biweekly: "Bi-weekly" }
                              return (
                                <button
                                  key={opt}
                                  onClick={() => setRepeatMode(opt)}
                                  className={`h-8 px-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                                    repeatMode === opt
                                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                                      : "border-slate-200 bg-white text-slate-400 hover:border-indigo-300 hover:text-slate-600"
                                  }`}
                                >
                                  {labels[opt]}
                                </button>
                              )
                            })}
                          </div>

                          {repeatMode !== "none" && !autoFillPreview && (
                            <button
                              onClick={previewAutoFill}
                              disabled={autoFillLoading}
                              className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                              {autoFillLoading
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking…</>
                                : <><Search className="h-3.5 w-3.5" />Preview upcoming slots</>}
                            </button>
                          )}

                          {autoFillPreview && (
                            <div className="space-y-2">
                              {autoFillPreview.status === "none" && (
                                <p className="text-[10px] text-amber-600 font-bold uppercase">No available slots found for upcoming weeks.</p>
                              )}
                              {autoFillPreview.status === "ready" && (
                                <>
                                  <div className="space-y-1.5">
                                    {autoFillPreview.proposed.map((slot, i) => (
                                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-bold uppercase ${
                                        slot.available
                                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                          : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                                      }`}>
                                        <span>{fmtDate(slot.date)}</span>
                                        <span>{slot.time} · {slot.duration}h</span>
                                        {slot.available
                                          ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                          : <X className="h-3 w-3 text-slate-400" />}
                                      </div>
                                    ))}
                                  </div>
                                  {autoFillPreview.skipped.length > 0 && (
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">
                                      {autoFillPreview.skipped.length} date{autoFillPreview.skipped.length > 1 ? "s" : ""} skipped — no instructor available.
                                    </p>
                                  )}
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={commitAutoFill}
                                      className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Add {autoFillPreview.proposed.filter(p => p.available).length + 1} slots
                                    </button>
                                    <button
                                      onClick={() => { setAutoFillPreview(null); setRepeatMode("none") }}
                                      className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-400 flex items-center justify-center hover:border-red-200 hover:text-red-400 transition-all"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </>
                              )}
                              <button
                                onClick={previewAutoFill}
                                disabled={autoFillLoading}
                                className="flex items-center gap-1.5 text-[9px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                              >
                                <RefreshCw className="h-3 w-3" /> Re-check
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Section>

            {/* ─── 4. Add-ons ─── */}
            <Section title="Add-ons" icon={PlusCircle} dim={!courseValid}>
              <div className="grid grid-cols-2 gap-3">
                {ADDONS.map(addon => {
                  const on = selectedAddons.includes(addon.id)
                  return (
                    <button
                      key={addon.id}
                      onClick={() => setSelectedAddons(prev => on ? prev.filter(id => id !== addon.id) : [...prev, addon.id])}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                        on
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest">{addon.label}</p>
                        <p className={`text-[10px] font-black mt-0.5 ${on ? "text-indigo-400" : "text-slate-400"}`}>R{addon.price}</p>
                      </div>
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        on ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-transparent"
                      }`}>
                        {on && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </Section>

            {/* ─── 5. Payment method ─── */}
            <Section title="Payment Method" icon={CreditCard} dim={!courseValid}>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all ${
                      paymentMethod === id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                  </button>
                ))}
              </div>
              {paymentMethod === "cash" && (
                <p className="mt-3 text-[10px] text-emerald-600 font-bold uppercase tracking-wide">
                  ✓ Cash due on first session — booking confirmed immediately.
                </p>
              )}
              {paymentMethod !== "cash" && (
                <p className="mt-3 text-[10px] text-amber-600 font-bold uppercase tracking-wide">
                  Proof of payment required before session is confirmed.
                </p>
              )}
            </Section>

          </div>

          {/* ── RIGHT COLUMN — Summary + submit ── */}
          <div className="space-y-5">
            <div className="sticky top-20 space-y-4">

              {/* Summary card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Booking Summary</p>
                </div>

                <div className="p-5 space-y-5">

                  {/* Student */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Student</p>
                    {studentValid ? (
                      <div>
                        <p className="text-sm font-black text-slate-800">{student.firstName} {student.lastName}</p>
                        <p className="text-[11px] text-slate-400 font-bold">{student.phone}</p>
                        {student.contactMethod && (
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            via {CONTACT_METHODS.find(c => c.id === student.contactMethod)?.label}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-300 font-bold uppercase">Not entered</p>
                    )}
                  </div>

                  {/* Course */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Course</p>
                    {selectedVehicle ? (
                      <div>
                        <p className="text-sm font-black text-slate-800">{selectedVehicle.label}</p>
                        <p className="text-[11px] text-slate-400 font-bold">{hours}h · R{selectedVehicle.pricePerHour}/h</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-300 font-bold uppercase">Not selected</p>
                    )}
                  </div>

                  {/* Sessions */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Sessions {sessions.length > 0 && <span className="text-slate-700">{sessions.length}</span>}
                    </p>
                    {sessions.length === 0 ? (
                      <p className="text-[11px] text-slate-300 font-bold uppercase">None added</p>
                    ) : (
                      <div className="space-y-1.5">
                        {sessions.map((s, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                              <span className="text-[11px] text-slate-600 font-bold">{fmtDate(s.date)}</span>
                              <span className="text-[10px] text-slate-400 font-bold">{s.time} · {s.duration}h</span>
                            </div>
                            <button
                              onClick={() => removeSession(i)}
                              className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-50 transition-all"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {sessions.length > 1 && (
                          <button
                            onClick={() => setSessions([])}
                            className="text-[9px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-wide transition-colors mt-1"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add-ons */}
                  {selectedAddons.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Add-ons</p>
                      {selectedAddons.map(id => {
                        const a = ADDONS.find(x => x.id === id)!
                        return (
                          <div key={id} className="flex justify-between text-[11px] font-bold text-slate-500">
                            <span>{a.label}</span><span>R{a.price}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Instructor */}
                  {assignedInstructor && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Assigned Instructor</p>
                      <p className="text-[11px] font-bold text-slate-600">{assignedInstructor.firstName} {assignedInstructor.lastName}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{assignedInstructor.phone}</p>
                    </div>
                  )}

                  {/* Divider + total */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                      <span>Session ({hours}h)</span>
                      <span>R{vehiclePrice.toLocaleString("en-ZA")}</span>
                    </div>
                    {selectedAddons.map(id => {
                      const a = ADDONS.find(x => x.id === id)!
                      return (
                        <div key={id} className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                          <span>{a.label}</span><span>R{a.price}</span>
                        </div>
                      )
                    })}
                    <div className="flex justify-between items-baseline pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</p>
                      <p className="text-2xl font-black text-indigo-600">R{grandTotal.toLocaleString("en-ZA")}</p>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                      Payment: {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validation checklist */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                {[
                  { ok: studentValid,  label: "Student details" },
                  { ok: courseValid,   label: "Course selected" },
                  { ok: scheduleValid, label: "Session scheduled" },
                ].map(({ ok, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${ok ? "bg-indigo-100 text-indigo-500" : "bg-slate-100 text-slate-300"}`}>
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${ok ? "text-slate-600" : "text-slate-300"}`}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Submit error */}
              {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold uppercase">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{submitError}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-16 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-20 disabled:pointer-events-none"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Confirming…</>
                  : <><BadgeCheck className="h-4 w-4" />Confirm Booking</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}