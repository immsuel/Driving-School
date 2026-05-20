"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  CheckCircle2, ArrowRight, ArrowLeft, Loader2,
  AlertCircle, Banknote, X, Info, Shield,
} from "lucide-react"

// Server action — make sure "LD" is in LICENSE_TYPE_MAP in instructors.ts:
//   "LD": "Lifestyle Driving"
// And that Airtable Instructors records have "Lifestyle Driving" as a licence type.
import { getBatchAvailability } from "@/app/actions/instructors"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOOKING_API = "/api/booking"

const LD_PACKAGES = [
  {
    id:    "ld-1",
    days:  1,
    label: "Lifestyle Driving 1-Day",
    sub:   "Core defensive techniques — one full training day",
    price: 1500,
    badge: null,
  },
  {
    id:    "ld-5",
    days:  5,
    label: "Lifestyle Driving 5-Day Programme",
    sub:   "Progressive skill development over five sessions",
    price: 5500,
    badge: "Popular",
  },
  {
    id:    "ld-10",
    days:  10,
    label: "Lifestyle Driving 10-Day Programme",
    sub:   "Full advanced certification — ten sessions",
    price: 9500,
    badge: "Best value",
  },
] as const

type LDPackage = (typeof LD_PACKAGES)[number]

const MIN_ADVANCE_DAYS = 3

const LD_PAYMENT_METHODS = [
  {
    id:          "eft",
    label:       "EFT",
    icon:        Banknote,
    description: "Direct bank transfer — send proof to 061 271 3583",
  },
  {
    id:          "cash",
    label:       "Cash",
    icon:        Shield,
    description: "Pay in person; sessions not paid will be cancelled after 48h",
  },
]

const STEP_LABELS = ["Agreement", "Package", "Days", "Your details", "Payment"]
const TOTAL_STEPS = STEP_LABELS.length

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

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short" })
}

function addBusinessDay(from: Date): Date {
  const d = new Date(from.getTime() + 86_400_000)
  if (d.getDay() === 0) return new Date(d.getTime() + 86_400_000)
  return d
}

function minBookableDate(): Date {
  let d = new Date()
  d.setHours(0, 0, 0, 0)
  for (let i = 0; i < MIN_ADVANCE_DAYS; i++) d = addBusinessDay(d)
  return d
}

function generateRef(): string {
  return `DR-LD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
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
    if (d.getDay() === 0) continue // Sunday already blocked by calendar
    result.push(toDateStr(d))
  }
  return result
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormData = {
  firstName: string
  lastName:  string
  email:     string
  phone:     string
  location:  string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-start gap-0 mb-8 lg:mb-12">
      {STEP_LABELS.map((label, i) => {
        const isDone   = i < step
        const isActive = i === step
        return (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${
                  isDone
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : isActive
                    ? "border-indigo-600 bg-white text-indigo-600"
                    : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <p
                className={`text-[9px] font-black uppercase tracking-widest mt-1.5 text-center hidden sm:block ${
                  isActive ? "text-indigo-600" : isDone ? "text-slate-400" : "text-slate-300"
                }`}
              >
                {label}
              </p>
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div
                className={`flex-1 h-[2px] mx-1 mt-[-14px] sm:mt-[-20px] transition-colors ${
                  isDone ? "bg-indigo-600" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SectionHeader({ step, title, sub }: { step: number; title: string; sub?: string }) {
  return (
    <div className="space-y-1 mb-6 lg:mb-10">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Step {step + 1} of {TOTAL_STEPS}
      </p>
      <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{title}</h2>
      {sub && <p className="text-sm text-slate-400 font-medium mt-1">{sub}</p>}
    </div>
  )
}

function StatusBanner({
  variant, children,
}: { variant: "error" | "warning" | "neutral" | "success"; children: React.ReactNode }) {
  const styles = {
    error:   "bg-red-50 border-red-100 text-red-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
    neutral: "bg-slate-50 border-slate-100 text-slate-500",
    success: "bg-emerald-50 border-emerald-100 text-emerald-700",
  }
  const icons = {
    error:   <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />,
    warning: <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />,
    neutral: <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />,
  }
  return (
    <div className={`p-4 lg:p-5 rounded-2xl border flex items-start gap-3 ${styles[variant]}`}>
      {icons[variant]}
      <p className="text-[11px] font-bold uppercase tracking-wide leading-relaxed">{children}</p>
    </div>
  )
}

// ─── Step 0: POPIA ──────────────────────────────────────────────────────────

function PopiaStep({ agreed, onAgree }: { agreed: boolean; onAgree: (v: boolean) => void }) {
  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <SectionHeader
        step={0}
        title="Privacy Agreement"
        sub="Please read the POPIA notice and give consent before continuing."
      />

      <div className="max-h-56 overflow-y-auto rounded-2xl bg-slate-50 border border-slate-200 p-5 lg:p-6 text-[12px] text-slate-600 leading-relaxed space-y-3 font-medium">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Protection of Personal Information Act (POPIA) — Notice
        </p>
        <p>
          Dee's Driver Training South Africa (Pty) Ltd collects and processes your personal information — including
          your name, contact details, and booking history — for the purposes of scheduling driving lessons,
          communicating with you about your bookings, and fulfilling our obligations as a driving school.
        </p>
        <p>
          Your information will be handled with care and stored securely. We will not share, sell, or
          disclose your personal data to third parties except where required by law or necessary to provide
          the services you have booked (e.g. your assigned instructor or a NaTIS testing facility).
        </p>
        <p>
          You have the right to access, correct, or request deletion of your personal information at any
          time by contacting us at{" "}
          <span className="text-indigo-600 font-black">admin@deesdrivertraining.co.za</span> or calling{" "}
          <span className="text-indigo-600 font-black">031 202 0202</span>.
        </p>
        <p>
          Withdrawal of consent may affect your ability to use our services. By proceeding you confirm
          that you have read and understood this notice.
        </p>
      </div>

      <button
        onClick={() => onAgree(!agreed)}
        className={`w-full flex items-start gap-4 p-5 lg:p-6 rounded-2xl border text-left transition-all active:scale-[0.99] ${
          agreed
            ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
            : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"
        }`}
      >
        <div
          className={`h-5 w-5 rounded flex items-center justify-center border-2 shrink-0 mt-0.5 transition-colors ${
            agreed ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
          }`}
        >
          {agreed && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </div>
        <div>
          <p className={`text-sm font-black uppercase tracking-widest ${agreed ? "text-indigo-600" : "text-slate-900"}`}>
            I have read and agree to the POPIA privacy notice
          </p>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
            Required to proceed with your booking
          </p>
        </div>
      </button>
    </div>
  )
}

// ─── Step 1: Package selection ───────────────────────────────────────────────

function PackageStep({
  selected, onSelect,
}: { selected: LDPackage | null; onSelect: (p: LDPackage) => void }) {
  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <SectionHeader
        step={1}
        title="Choose your package"
        sub="Lifestyle Driving — defensive and advanced techniques for everyday drivers."
      />

      <div className="space-y-3">
        {LD_PACKAGES.map((pkg) => {
          const isSelected = selected?.id === pkg.id
          return (
            <button
              key={pkg.id}
              onClick={() => onSelect(pkg)}
              className={`w-full rounded-2xl border text-left transition-all active:scale-[0.99] overflow-hidden ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600"
                  : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between gap-4 p-5 lg:p-6">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-black uppercase tracking-widest ${isSelected ? "text-indigo-600" : "text-slate-900"}`}>
                        {pkg.label}
                      </p>
                      {pkg.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest shrink-0">
                          {pkg.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">{pkg.sub}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-black ${isSelected ? "text-indigo-600" : "text-slate-800"}`}>
                    R{pkg.price.toLocaleString("en-ZA")}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">
                    {pkg.days} {pkg.days === 1 ? "day" : "days"}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="p-4 lg:p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Selected</p>
            <p className="text-[11px] font-bold text-indigo-700 mt-0.5 uppercase">
              {selected.label} — {selected.days} {selected.days === 1 ? "day" : "days"}
            </p>
          </div>
          <p className="text-2xl font-black text-indigo-600">R{selected.price.toLocaleString("en-ZA")}</p>
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Day selection + availability ────────────────────────────────────

function DaySelectionStep({
  pkg,
  selectedDays,
  onToggle,
  onDeselect,
}: {
  pkg:        LDPackage
  selectedDays: Date[]
  onToggle:   (d: Date) => void
  onDeselect: (d: Date) => void
}) {
  const earliest = minBookableDate()

  // Which year/month is the calendar currently showing
  const [calMonth, setCalMonth] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  // Set of "YYYY-MM-DD" strings that Airtable says have no available instructor
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set())
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState(false)

  // Abort controller so navigating months quickly doesn't pile up stale fetches
  const fetchController = useRef<AbortController | null>(null)

  // Fetch availability for every bookable weekday in the visible month
  useEffect(() => {
    if (fetchController.current) fetchController.current.abort()
    const controller = new AbortController()
    fetchController.current = controller

    const dates = weekdaysInMonth(calMonth.getFullYear(), calMonth.getMonth(), earliest)
    if (dates.length === 0) return

    setIsLoadingAvailability(true)
    setAvailabilityError(false)

    getBatchAvailability(dates, "LD")
      .then((results) => {
        if (controller.signal.aborted) return

        const blocked = new Set<string>()
        results.forEach((r) => {
          if (!r.hasInstructors || !r.availableOnDay) blocked.add(r.date)
        })
        setUnavailableDates(blocked)

        // If any already-selected days just became unavailable, deselect them
        selectedDays.forEach((d) => {
          if (blocked.has(toDateStr(d))) onDeselect(d)
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailabilityError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingAvailability(false)
      })

    return () => { controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calMonth])

  const remaining = pkg.days - selectedDays.length
  const done      = remaining === 0

  const isUnavailable = (d: Date) => unavailableDates.has(toDateStr(d))

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <SectionHeader
        step={2}
        title="Select your days"
        sub={`Pick ${pkg.days} ${pkg.days === 1 ? "day" : "days"} — at least ${MIN_ADVANCE_DAYS} days in advance. Sundays and unavailable days are blocked.`}
      />

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${(selectedDays.length / pkg.days) * 100}%` }}
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
          {selectedDays.length}/{pkg.days}
        </p>
      </div>

      {/* Calendar */}
      <div className="relative">
        {/* Loading overlay */}
        {isLoadingAvailability && (
          <div className="absolute inset-0 z-10 rounded-2xl bg-white/70 flex items-center justify-center gap-2 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
              Checking availability…
            </p>
          </div>
        )}

        <div className={`bg-white p-4 border border-slate-100 rounded-2xl shadow-inner flex justify-center transition-opacity ${isLoadingAvailability ? "opacity-40 pointer-events-none" : ""}`}>
          <Calendar
            mode="multiple"
            selected={selectedDays}
            onSelect={(days) => {
              if (!days) return
              const added   = days.find((d) => !selectedDays.some((s) => s.toDateString() === d.toDateString()))
              const removed = selectedDays.find((s) => !days.some((d) => d.toDateString() === s.toDateString()))
              if (added)   onToggle(added)
              if (removed) onToggle(removed)
            }}
            onMonthChange={(month) => {
              const d = new Date(month)
              d.setDate(1)
              d.setHours(0, 0, 0, 0)
              setCalMonth(d)
            }}
            disabled={(date) => {
              const d = new Date(date)
              d.setHours(0, 0, 0, 0)
              if (d < earliest)    return true
              if (d.getDay() === 0) return true  // Sunday (calendar.tsx also blocks Saturday)
              if (isUnavailable(d)) return true
              // Already at limit — disable unselected dates
              if (!selectedDays.some((s) => s.toDateString() === d.toDateString()) && selectedDays.length >= pkg.days) return true
              return false
            }}
            className="rounded-md border-none"
          />
        </div>
      </div>

      {/* Availability fetch error */}
      {availabilityError && (
        <StatusBanner variant="warning">
          Couldn't load availability — please try again or contact us directly.
        </StatusBanner>
      )}

      {/* Selected day chips */}
      {selectedDays.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-in fade-in">
          {[...selectedDays]
            .sort((a, b) => a.getTime() - b.getTime())
            .map((d) => (
              <div
                key={d.toISOString()}
                className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 pl-3 pr-1.5 py-1"
              >
                <span className="text-[10px] font-black text-indigo-700 uppercase">
                  {formatShortDate(d)}
                </span>
                <button
                  onClick={() => onToggle(d)}
                  className="h-4 w-4 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center hover:bg-red-200 hover:text-red-600 transition-colors"
                  aria-label={`Remove ${formatShortDate(d)}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Status message */}
      {done ? (
        <StatusBanner variant="success">
          All {pkg.days} {pkg.days === 1 ? "day" : "days"} selected — tap Continue.
        </StatusBanner>
      ) : selectedDays.length > 0 ? (
        <StatusBanner variant="neutral">
          {selectedDays.length} of {pkg.days} selected — pick {remaining} more.
        </StatusBanner>
      ) : (
        <StatusBanner variant="neutral">
          Tap dates on the calendar to select your {pkg.days} training {pkg.days === 1 ? "day" : "days"}.
          Greyed-out dates have no instructor available.
        </StatusBanner>
      )}
    </div>
  )
}

// ─── Step 3: Personal details ────────────────────────────────────────────────

function PersonalDetailsStep({
  formData, setFormData, phoneError, onPhoneBlur,
}: {
  formData:    FormData
  setFormData: (d: FormData) => void
  phoneError:  string
  onPhoneBlur: () => void
}) {
  const field = (
    label: string,
    key: keyof FormData,
    placeholder: string,
    type = "text",
    error?: string,
  ) => (
    <div className="space-y-2 lg:space-y-3">
      <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">
        {label}
      </Label>
      <Input
        type={type}
        placeholder={placeholder}
        value={formData[key]}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        onBlur={key === "phone" ? onPhoneBlur : undefined}
        className={`h-14 rounded-xl bg-slate-50/50 text-slate-900 focus:bg-white focus:ring-indigo-600 ${
          error ? "border-red-400 focus:ring-red-400" : "border-slate-200"
        }`}
      />
      {error && (
        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide flex items-center gap-1 ml-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <SectionHeader step={3} title="Your details" />
      <div className="grid gap-5 lg:gap-8 sm:grid-cols-2">
        {field("First name", "firstName", "Jane")}
        {field("Last name",  "lastName",  "Doe")}
      </div>
      <div className="grid gap-5 lg:gap-8 sm:grid-cols-2">
        {field("Email address", "email", "jane@example.com", "email")}
        {field("Cell number",   "phone", "081 000 0000",     "tel",  phoneError)}
      </div>
      {field("Pickup address", "location", "123 Street Name, Suburb, City")}
    </div>
  )
}

// ─── Step 4: Payment ─────────────────────────────────────────────────────────

function PaymentStep({
  selected, onSelect, total,
}: { selected: string | null; onSelect: (id: string) => void; total: string }) {
  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <SectionHeader step={4} title="Payment method" sub={`How would you like to settle ${total}?`} />

      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        {LD_PAYMENT_METHODS.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`p-5 lg:p-8 rounded-2xl border text-left transition-all group active:scale-[0.97] ${
              selected === id
                ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600"
                : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white hover:shadow-md"
            }`}
          >
            <div
              className={`h-10 w-10 lg:h-12 lg:w-12 rounded-xl flex items-center justify-center mb-3 lg:mb-4 transition-colors ${
                selected === id
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-400 group-hover:text-indigo-600 border border-slate-100"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className={`text-sm font-black uppercase tracking-widest ${selected === id ? "text-indigo-600" : "text-slate-900"}`}>
              {label}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{description}</p>
          </button>
        ))}
      </div>

      {selected === "eft" && (
        <StatusBanner variant="neutral">
          You'll receive our banking details on the next screen. Your booking is only confirmed once
          proof of payment is received.
        </StatusBanner>
      )}
      {selected === "cash" && (
        <StatusBanner variant="success">
          Cash payment is due on your first session. Your booking will be confirmed immediately.
        </StatusBanner>
      )}
    </div>
  )
}

// ─── Proof of payment screen ──────────────────────────────────────────────────

function ProofScreen({ bookingRef, total, email }: { bookingRef: string; total: string; email: string }) {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 max-w-lg mx-auto text-center">
      <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto">
        <Banknote className="h-9 w-9 text-indigo-600" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">EFT Payment</p>
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Send Proof of Payment</h3>
        <p className="text-slate-500 mt-3 text-sm font-medium leading-relaxed">
          Once you've made your EFT of{" "}
          <span className="font-black text-slate-900">{total}</span>, WhatsApp your proof to:
        </p>
      </div>
      <div className="p-8 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp</p>
        <p className="text-3xl font-black tracking-tight text-indigo-600">061 271 3583</p>
      </div>
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Booking Reference</p>
        <p className="text-xl font-black tracking-widest text-slate-900">{bookingRef}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">Include this with your proof of payment</p>
      </div>
      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-left space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">What happens next</p>
        <ul className="text-[11px] text-emerald-800 font-bold uppercase space-y-1.5 leading-relaxed">
          <li>→ WhatsApp your proof to 061 271 3583</li>
          <li>→ Include reference <span className="text-emerald-600">{bookingRef}</span></li>
          <li>→ We'll confirm your sessions within 2 business hours</li>
          <li>→ Confirmation will be sent to <span className="text-emerald-600">{email}</span></li>
        </ul>
      </div>
    </div>
  )
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  bookingRef, total, email, isCash,
}: { bookingRef: string; total: string; email: string; isCash: boolean }) {
  return (
    <div className="rounded-[3rem] bg-indigo-600 p-12 lg:p-16 text-center shadow-2xl shadow-indigo-200 animate-in zoom-in duration-500">
      <div className="mx-auto h-24 w-24 bg-white rounded-full flex items-center justify-center mb-10 shadow-xl">
        <CheckCircle2 className="h-12 w-12 text-indigo-600" />
      </div>
      <h3 className="text-4xl lg:text-5xl font-[950] uppercase tracking-tighter text-white">
        Booking Confirmed.
      </h3>
      <p className="text-indigo-100 mt-6 uppercase text-[11px] tracking-[0.2em] font-bold max-w-sm mx-auto leading-relaxed">
        Your Lifestyle Driving sessions have been logged.{" "}
        {isCash
          ? "Cash payment is due on your first session."
          : "Our coordinator will confirm once proof of payment is received."}
      </p>
      <div className="mt-6 inline-block px-6 py-2 rounded-xl bg-white/10 border border-white/20">
        <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest">Total: {total}</p>
      </div>
      <div className="mt-4 inline-block px-8 py-4 rounded-2xl bg-white/10 border border-white/20">
        <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest mb-1">Booking Reference</p>
        <p className="text-2xl font-black tracking-widest text-white">{bookingRef}</p>
      </div>
      <p className="mt-6 text-[10px] text-indigo-200 font-bold uppercase tracking-wide">
        A confirmation has been sent to {email}
      </p>
      <div className="mt-8">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="h-14 rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white hover:text-indigo-600 uppercase text-[11px] font-black tracking-widest px-10"
        >
          Book Another Course
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LifestyleBookingForm() {
  const [step, setStep]                   = useState(0)
  const [popiaConsent, setPopiaConsent]   = useState(false)
  const [selectedPkg, setSelectedPkg]     = useState<LDPackage | null>(null)
  const [selectedDays, setSelectedDays]   = useState<Date[]>([])
  const [formData, setFormData]           = useState<FormData>({
    firstName: "", lastName: "", email: "", phone: "", location: "",
  })
  const [phoneError, setPhoneError]       = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [submitted, setSubmitted]         = useState(false)
  const [showProofScreen, setShowProofScreen] = useState(false)
  const [bookingRef, setBookingRef]       = useState("")

  const total = selectedPkg ? `R${selectedPkg.price.toLocaleString("en-ZA")}` : "R0"

  // ── Day toggle ──────────────────────────────────────────────────────────────

  const toggleDay = (d: Date) => {
    setSelectedDays((prev) => {
      const exists = prev.some((s) => s.toDateString() === d.toDateString())
      if (exists) return prev.filter((s) => s.toDateString() !== d.toDateString())
      if (prev.length >= (selectedPkg?.days ?? 0)) return prev
      return [...prev, d]
    })
  }

  // Called by DaySelectionStep when availability check retroactively blocks a selected date
  const deselectDay = (d: Date) => {
    setSelectedDays((prev) => prev.filter((s) => s.toDateString() !== d.toDateString()))
  }

  // Reset selections when package changes
  useEffect(() => { setSelectedDays([]) }, [selectedPkg?.id])

  // ── Validation ──────────────────────────────────────────────────────────────

  const handlePhoneBlur = () => {
    if (formData.phone && !isValidSAPhone(formData.phone))
      setPhoneError("Enter a valid SA number: 081 000 0000 or +27 81 000 0000")
    else setPhoneError("")
  }

  const canProceed = (): boolean => {
    if (step === 0) return popiaConsent
    if (step === 1) return !!selectedPkg
    if (step === 2) return selectedDays.length === (selectedPkg?.days ?? -1)
    if (step === 3) return (
      !!formData.firstName && !!formData.lastName &&
      !!formData.email && isValidSAPhone(formData.phone) &&
      !!formData.location
    )
    if (step === 4) return !!paymentMethod
    return true
  }

  // ── Submission ──────────────────────────────────────────────────────────────

  const handleSubmit = async (method: string) => {
    if (!selectedPkg) return
    setIsSubmitting(true)
    const isCash          = method === "cash"
    const ref             = generateRef()
    setBookingRef(ref)
    const normalisedPhone = normaliseSAPhone(formData.phone) ?? formData.phone

    const payload = {
      bookingCategory:  "lifestyle",
      vehicle:          "Light Motor Vehicle — Lifestyle Driving",
      vehicleCode:      "LD",
      package:          selectedPkg.label,
      daysBooked:       selectedPkg.days,
      totalPrice:       total,
      firstName:        formData.firstName,
      lastName:         formData.lastName,
      email:            formData.email,
      phone:            normalisedPhone,
      pickupAddress:    formData.location,
      paymentMethod:    method,
      paid:             isCash ? 1 : 0,
      popiaConsent:     true,
      sessions: selectedDays
      .sort((a, b) => a.getTime() - b.getTime())
      .map((d) => ({
        date:          toDateStr(d),
        formattedDate: d.toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "short" }),
        time:          "08:00",      // start of day
        duration:      "10h",        // covers all 10 working slots (08:00–17:00)
      })),
      bookingRef:       ref,
      timestamp:        new Date().toISOString(),
    }

    try {
      const res = await fetch(BOOKING_API, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })
      if (res.ok) {
        if (isCash) setSubmitted(true)
        else        setShowProofScreen(true)
      } else {
        alert("Booking failed. Please try again.")
      }
    } catch {
      alert("Booking failed. Please check your connection.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (step === TOTAL_STEPS - 1) handleSubmit(paymentMethod!)
    else setStep((s) => s + 1)
  }

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (submitted) return (
    <SuccessScreen
      bookingRef={bookingRef} total={total}
      email={formData.email} isCash={paymentMethod === "cash"}
    />
  )

  if (showProofScreen) return (
    <div className="flex flex-col gap-10">
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 p-6 lg:p-12">
        <ProofScreen bookingRef={bookingRef} total={total} email={formData.email} />
      </div>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-10">
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 p-5 lg:p-12">

        <StepBar step={step} />

        {step === 0 && (
          <PopiaStep agreed={popiaConsent} onAgree={setPopiaConsent} />
        )}

        {step === 1 && (
          <PackageStep selected={selectedPkg} onSelect={setSelectedPkg} />
        )}

        {step === 2 && selectedPkg && (
          <DaySelectionStep
            pkg={selectedPkg}
            selectedDays={selectedDays}
            onToggle={toggleDay}
            onDeselect={deselectDay}
          />
        )}

        {step === 3 && (
          <PersonalDetailsStep
            formData={formData}
            setFormData={setFormData}
            phoneError={phoneError}
            onPhoneBlur={handlePhoneBlur}
          />
        )}

        {step === 4 && (
          <PaymentStep
            selected={paymentMethod}
            onSelect={setPaymentMethod}
            total={total}
          />
        )}

        {/* ── Navigation ── */}
        <div className="mt-8 lg:mt-16 flex items-center justify-between border-t border-slate-100 pt-6 lg:pt-10">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0 || isSubmitting}
            className="text-slate-400 hover:text-slate-900 uppercase text-[10px] font-black tracking-widest"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="h-16 rounded-2xl bg-indigo-600 px-12 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-20 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {step === TOTAL_STEPS - 1
                  ? paymentMethod === "cash" ? "Confirm Booking" : "Proceed to Payment"
                  : "Next Step"}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      {selectedPkg && step >= 1 && (
        <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-5 lg:p-8 flex flex-wrap gap-6 justify-between animate-in fade-in">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Package</p>
            <p className="text-sm font-black uppercase text-slate-900">{selectedPkg.label}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Days booked</p>
            <p className="text-sm font-black uppercase text-slate-900">
              {selectedDays.length}/{selectedPkg.days}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total</p>
            <p className="text-sm font-black uppercase text-indigo-600">{total}</p>
          </div>
          {paymentMethod && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment</p>
              <p className="text-sm font-black uppercase text-slate-900">
                {LD_PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}