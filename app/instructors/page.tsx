"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Printer, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  User, Phone, Clock, Calendar, AlertCircle, Users,
  CheckCircle2, XCircle, BookOpen,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Instructor {
  id: string
  fields: {
    "First Name"?: string
    "Last Name"?: string
    "Phone"?: string
    "Email"?: string
    "Vehicle Codes"?: string[]   // e.g. ["8M","8A","10"]
    "Active"?: boolean
    [key: string]: unknown
  }
}

interface SessionRecord {
  id: string
  fields: {
    "Student Name"?: string
    "Date"?: string              // ISO date string
    "Start Time"?: string
    "Duration"?: number
    "Vehicle Code"?: string
    "Instructor Name"?: string
    "Status"?: string
    [key: string]: unknown
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"]

function getWeekStart(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  // Week starts Monday
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function fmtShort(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`
}

function fmtWeekRange(start: Date): string {
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
  }
  return `${fmtShort(start)} – ${fmtShort(end)} ${end.getFullYear()}`
}

function instructorFullName(i: Instructor): string {
  return `${i.fields["First Name"] ?? ""} ${i.fields["Last Name"] ?? ""}`.trim()
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
]
function instructorColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

// ---------------------------------------------------------------------------
// Print schedule
// ---------------------------------------------------------------------------

function printWeekSchedule(
  instructor: Instructor,
  weekDates: Date[],
  sessions: SessionRecord[],
) {
  const name = instructorFullName(instructor)
  const weekLabel = fmtWeekRange(weekDates[0])

  // Build day → sessions map
  const byDay: Record<string, SessionRecord[]> = {}
  for (const d of weekDates) {
    byDay[toDateStr(d)] = []
  }
  for (const s of sessions) {
    const key = s.fields["Date"]?.slice(0, 10) ?? ""
    if (byDay[key]) byDay[key].push(s)
  }
  // Sort within each day by start time
  for (const key of Object.keys(byDay)) {
    byDay[key].sort((a, b) => (a.fields["Start Time"] ?? "").localeCompare(b.fields["Start Time"] ?? ""))
  }

  const totalSessions = sessions.length
  const totalHours = sessions.reduce((sum, s) => sum + (s.fields["Duration"] ?? 0), 0)

  const dayRows = weekDates.map(d => {
    const key = toDateStr(d)
    const daySessions = byDay[key]
    const isWeekend = d.getDay() === 0 || d.getDay() === 6

    const sessionRows = daySessions.length === 0
      ? `<tr><td colspan="4" style="color:#bbb;font-size:11px;padding:8px 0;font-style:italic">No sessions scheduled</td></tr>`
      : daySessions.map(s => `
          <tr>
            <td>${s.fields["Start Time"] ?? "—"}</td>
            <td>${s.fields["Duration"] ? `${s.fields["Duration"]}h` : "—"}</td>
            <td style="font-weight:600">${s.fields["Student Name"] ?? "—"}</td>
            <td>${s.fields["Vehicle Code"] ?? "—"}</td>
          </tr>`).join("")

    return `
      <div class="day-block${isWeekend ? " weekend" : ""}">
        <div class="day-header">
          <span class="day-name">${FULL_DAY_NAMES[d.getDay()]}</span>
          <span class="day-date">${fmtShort(d)}</span>
          ${daySessions.length > 0 ? `<span class="day-count">${daySessions.length} session${daySessions.length !== 1 ? "s" : ""} · ${daySessions.reduce((h, s) => h + (s.fields["Duration"] ?? 0), 0)}h</span>` : ""}
        </div>
        <table>
          <thead><tr><th>Time</th><th>Dur.</th><th>Student</th><th>Course</th></tr></thead>
          <tbody>${sessionRows}</tbody>
        </table>
      </div>`
  }).join("")

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Week Schedule — ${name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12px;
    color: #111;
    background: #fff;
    padding: 32px 40px;
    max-width: 780px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 2px solid #111;
    margin-bottom: 28px;
  }
  .logo-block h1 {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.5px;
    text-transform: uppercase;
  }
  .logo-block p { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
  .meta { text-align: right; }
  .meta .instructor-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    color: #111;
  }
  .meta .week-label { font-size: 11px; color: #888; margin-top: 4px; }
  .meta .stats { font-size: 10px; color: #aaa; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
  .meta .phone { font-size: 10px; color: #888; margin-top: 3px; }
  .days-grid { display: flex; flex-direction: column; gap: 20px; }
  .day-block { border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; }
  .day-block.weekend { opacity: 0.6; }
  .day-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    background: #f8f8f8;
    padding: 8px 14px;
    border-bottom: 1px solid #e5e5e5;
  }
  .day-name { font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; }
  .day-date { font-size: 11px; color: #666; }
  .day-count { margin-left: auto; font-size: 10px; color: #dc2626; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table th {
    text-align: left;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #aaa;
    padding: 6px 14px 4px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
  }
  table td { padding: 7px 14px; border-bottom: 1px solid #f5f5f5; color: #222; }
  table tr:last-child td { border-bottom: none; }
  .footer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #e5e5e5;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  @media print {
    body { padding: 16px 20px; }
    .day-block { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="logo-block">
    <h1>Dees Driver Training</h1>
    <p>Instructor Week Schedule</p>
  </div>
  <div class="meta">
    <div class="instructor-name">${name}</div>
    <div class="week-label">${weekLabel}</div>
    ${instructor.fields["Phone"] ? `<div class="phone">${instructor.fields["Phone"]}</div>` : ""}
    <div class="stats">${totalSessions} session${totalSessions !== 1 ? "s" : ""} · ${totalHours}h total</div>
  </div>
</div>
<div class="days-grid">
  ${dayRows}
</div>
<div class="footer">
  <span>Dees Driver Training · Durban</span>
  <span>Printed ${new Date().toLocaleString("en-ZA")}</span>
  <span>${name}</span>
</div>
</body>
</html>`

  const win = window.open("", "_blank", "width=860,height=1000")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}

// ---------------------------------------------------------------------------
// Avatar chip
// ---------------------------------------------------------------------------

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const color = instructorColor(name)
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs"
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-black text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session pill
// ---------------------------------------------------------------------------

function SessionPill({ session }: { session: SessionRecord }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
      <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-700 truncate">{session.fields["Student Name"] ?? "—"}</p>
        <p className="text-[10px] text-slate-400 font-bold">
          {session.fields["Start Time"]} · {session.fields["Duration"]}h · {session.fields["Vehicle Code"]}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Day column
// ---------------------------------------------------------------------------

function DayColumn({
  date,
  sessions,
  isToday,
}: {
  date: Date
  sessions: SessionRecord[]
  isToday: boolean
}) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const totalHours = sessions.reduce((h, s) => h + (s.fields["Duration"] ?? 0), 0)

  return (
    <div className={`flex-1 min-w-0 rounded-xl border transition-all ${
      isToday
        ? "border-red-200 bg-red-50/30"
        : isWeekend
        ? "border-slate-100 bg-slate-50/40 opacity-60"
        : "border-slate-200 bg-white"
    }`}>
      {/* Day header */}
      <div className={`px-2 py-2.5 border-b ${isToday ? "border-red-100" : "border-slate-100"}`}>
        <p className={`text-[9px] font-black uppercase tracking-widest ${isToday ? "text-red-500" : "text-slate-400"}`}>
          {DAY_NAMES[date.getDay()]}
        </p>
        <p className={`text-lg font-black ${isToday ? "text-red-600" : "text-slate-700"}`}>
          {date.getDate()}
        </p>
        {sessions.length > 0 && (
          <p className="text-[9px] font-bold text-slate-400 mt-0.5">
            {sessions.length}s · {totalHours}h
          </p>
        )}
      </div>

      {/* Sessions */}
      <div className="p-1.5 space-y-1.5 min-h-[80px]">
        {sessions.length === 0 ? (
          <p className="text-[9px] text-slate-300 font-bold uppercase text-center py-3">Free</p>
        ) : (
          sessions
            .sort((a, b) => (a.fields["Start Time"] ?? "").localeCompare(b.fields["Start Time"] ?? ""))
            .map(s => <SessionPill key={s.id} session={s} />)
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InstructorsPage() {
  const [instructors, setInstructors]       = useState<Instructor[]>([])
  const [loadingInst, setLoadingInst]       = useState(true)
  const [instError, setInstError]           = useState("")

  const [selected, setSelected]             = useState<Instructor | null>(null)
  const [weekStart, setWeekStart]           = useState<Date>(() => getWeekStart(new Date()))

  const [sessions, setSessions]             = useState<SessionRecord[]>([])
  const [loadingSess, setLoadingSess]       = useState(false)
  const [sessError, setSessError]           = useState("")

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayStr  = toDateStr(new Date())

  // ── Load instructors ──
  const loadInstructors = useCallback(async () => {
    setLoadingInst(true)
    setInstError("")
    try {
      const res = await fetch("/api/instructors")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list: Instructor[] = (data.records ?? []).filter(
        (r: Instructor) => r.fields["Active"] !== false
      )
      setInstructors(list)
    } catch (e) {
      setInstError(String(e))
    } finally {
      setLoadingInst(false)
    }
  }, [])

  useEffect(() => { loadInstructors() }, [loadInstructors])

  // ── Load sessions for selected instructor + week ──
  useEffect(() => {
    if (!selected) { setSessions([]); return }
    const name = instructorFullName(selected)
    setSessions([])
    setLoadingSess(true)
    setSessError("")

    // Fetch all sessions for this instructor and filter client-side by week
    fetch(`/api/sessions?instructorName=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(data => {
        const weekKeys = new Set(weekDates.map(toDateStr))
        const filtered: SessionRecord[] = (data.records ?? []).filter((s: SessionRecord) => {
          const dateKey = s.fields["Date"]?.slice(0, 10)
          return dateKey && weekKeys.has(dateKey)
        })
        setSessions(filtered)
      })
      .catch(e => setSessError(String(e)))
      .finally(() => setLoadingSess(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, weekStart])

  // ── Sessions by day ──
  const sessionsByDay: Record<string, SessionRecord[]> = {}
  for (const d of weekDates) {
    sessionsByDay[toDateStr(d)] = []
  }
  for (const s of sessions) {
    const key = s.fields["Date"]?.slice(0, 10) ?? ""
    if (sessionsByDay[key]) sessionsByDay[key].push(s)
  }

  const totalWeekSessions = sessions.length
  const totalWeekHours    = sessions.reduce((h, s) => h + (s.fields["Duration"] ?? 0), 0)

  // ── Jump to current week ──
  const goToday = () => setWeekStart(getWeekStart(new Date()))
  const prevWeek = () => setWeekStart(w => addDays(w, -7))
  const nextWeek = () => setWeekStart(w => addDays(w, 7))
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getWeekStart(new Date()))

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Dees Driver Training</p>
            <h1 className="text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
              <Users className="h-5 w-5 text-red-500" />
              Instructors
            </h1>
          </div>
          <button
            onClick={loadInstructors}
            disabled={loadingInst}
            className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingInst ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">

          {/* ── Left: Instructor list ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Active Instructors
                {!loadingInst && (
                  <span className="ml-2 text-slate-400 font-bold">{instructors.length}</span>
                )}
              </p>
            </div>

            {loadingInst ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-red-400" />
              </div>
            ) : instError ? (
              <div className="p-4 flex items-start gap-2 text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold">{instError}</p>
              </div>
            ) : instructors.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase">No instructors found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {instructors.map(inst => {
                  const name = instructorFullName(inst)
                  const isSelected = selected?.id === inst.id
                  return (
                    <button
                      key={inst.id}
                      onClick={() => setSelected(isSelected ? null : inst)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 ${
                        isSelected ? "bg-red-50 hover:bg-red-50" : ""
                      }`}
                    >
                      <Avatar name={name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[12px] font-black truncate ${isSelected ? "text-red-700" : "text-slate-800"}`}>
                          {name}
                        </p>
                        {inst.fields["Phone"] && (
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            {inst.fields["Phone"]}
                          </p>
                        )}
                        {inst.fields["Vehicle Codes"] && inst.fields["Vehicle Codes"].length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(inst.fields["Vehicle Codes"] as string[]).map(code => (
                              <span
                                key={code}
                                className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wide"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <ChevronRight className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right: Schedule ── */}
          <div className="space-y-4">
            {!selected ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center py-24 text-center">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Calendar className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Select an instructor</p>
                <p className="text-[10px] text-slate-300 font-bold mt-1">to view their weekly schedule</p>
              </div>
            ) : (
              <>
                {/* Week header bar */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    {/* Instructor info */}
                    <Avatar name={instructorFullName(selected)} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{instructorFullName(selected)}</p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {loadingSess
                          ? "Loading…"
                          : `${totalWeekSessions} session${totalWeekSessions !== 1 ? "s" : ""} · ${totalWeekHours}h this week`}
                      </p>
                    </div>

                    {/* Week nav */}
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={prevWeek}
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={goToday}
                        disabled={isCurrentWeek}
                        className="h-8 px-3 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:border-slate-300 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
                      >
                        Today
                      </button>
                      <button
                        onClick={nextWeek}
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Print */}
                    <button
                      onClick={() => printWeekSchedule(selected, weekDates, sessions)}
                      disabled={loadingSess}
                      className="flex items-center gap-2 h-9 px-4 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm shadow-red-200 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Print Week</span>
                    </button>
                  </div>

                  {/* Week label */}
                  <div className="px-5 pb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {fmtWeekRange(weekStart)}
                    </p>
                  </div>
                </div>

                {/* Error */}
                {sessError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{sessError}
                  </div>
                )}

                {/* Day columns */}
                <div className="relative">
                  {loadingSess && (
                    <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-10">
                      <Loader2 className="h-5 w-5 animate-spin text-red-400" />
                    </div>
                  )}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {weekDates.map(d => (
                      <DayColumn
                        key={toDateStr(d)}
                        date={d}
                        sessions={sessionsByDay[toDateStr(d)] ?? []}
                        isToday={toDateStr(d) === todayStr}
                      />
                    ))}
                  </div>
                </div>

                {/* Week summary footer */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3">
                    Week Summary
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Total Sessions", value: totalWeekSessions, icon: BookOpen },
                      { label: "Total Hours",    value: `${totalWeekHours}h`, icon: Clock },
                      { label: "Busiest Day",    value: (() => {
                          const max = Math.max(...weekDates.map(d => (sessionsByDay[toDateStr(d)] ?? []).length))
                          if (max === 0) return "—"
                          const day = weekDates.find(d => (sessionsByDay[toDateStr(d)] ?? []).length === max)
                          return day ? DAY_NAMES[day.getDay()] : "—"
                        })(), icon: Calendar },
                      { label: "Free Days",      value: weekDates.filter(d => (sessionsByDay[toDateStr(d)] ?? []).length === 0 && d.getDay() !== 0).length, icon: CheckCircle2 },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <div className="h-6 w-6 rounded-lg bg-red-50 flex items-center justify-center mb-2">
                          <Icon className="h-3 w-3 text-red-500" />
                        </div>
                        <p className="text-lg font-black text-slate-800">{loadingSess ? "—" : value}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}