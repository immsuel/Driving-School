"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, ChevronRight, X, Loader2, CheckCircle2,
  AlertCircle, User, Phone, Mail, MapPin, Package,
  CalendarDays, Clock, Edit3, Save, Plus, Trash2,
  ArrowLeft, BookOpen, BadgeCheck, RefreshCw, ScrollText,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  pickupAddress: string
  package: string
  paid: boolean
  lessons: number
  lessonsDone: number
  instructorPhone: string
  sessionIds: string[]
}

interface Session {
  id: string
  studentName: string
  date: string
  time: string
  duration: string
  formattedSlot: string
  phone: string
  instructorName: string
  instructorPhone: string
  confirmed: boolean
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiFetch(path: string) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function apiMutate(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${await res.text()}`)
  return res.json()
}

const api = {
  students: {
    list: () => apiFetch("/api/students").then(d => d.records ?? []),
    patch: (id: string, fields: Record<string, unknown>) =>
      apiMutate("/api/students", "PATCH", { id, fields }),
  },
  sessions: {
    listFor: (studentName: string) =>
      apiFetch(`/api/sessions?studentName=${encodeURIComponent(studentName)}`).then(d => d.records ?? []),
    patch: (id: string, fields: Record<string, unknown>) =>
      apiMutate("/api/sessions", "PATCH", { id, fields }),
    create: (fields: Record<string, unknown>) =>
      apiMutate("/api/sessions", "POST", { fields }),
    delete: (id: string) =>
      apiMutate(`/api/sessions?id=${id}`, "DELETE"),
  },
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapStudent(r: { id: string; fields: Record<string, unknown> }): Student {
  const f = r.fields
  const firstNameKey = Object.keys(f).find(k => k.includes("First Name")) ?? "First Name"
  return {
    id: r.id,
    firstName:       String(f[firstNameKey]        ?? ""),
    lastName:        String(f["Last Name"]          ?? ""),
    email:           String(f["Email"]              ?? ""),
    phone:           String(f["Phone"]              ?? ""),
    pickupAddress:   String(f["Pickup Address"]     ?? ""),
    package:         String(f["Package"]            ?? ""),
    paid:            f["Paid"] === "checked" || f["Paid"] === true,
    lessons:         Number(f["Lessons"]            ?? 0),
    lessonsDone:     Number(f["Lessons Done"]       ?? 0),
    instructorPhone: String(f["Instructor Phone"]   ?? ""),
    sessionIds:      (f["Sessions"] as string[])    ?? [],
  }
}

function mapSession(r: { id: string; fields: Record<string, unknown> }): Session {
  const f = r.fields
  const studentNameKey = Object.keys(f).find(k => k.includes("Student Name")) ?? "Student Name"
  return {
    id: r.id,
    studentName:     String(f[studentNameKey]       ?? ""),
    date:            String(f["Date"]               ?? ""),
    time:            String(f["Time"]               ?? ""),
    duration:        String(f["Duration"]           ?? ""),
    formattedSlot:   String(f["Formatted Slot"]     ?? ""),
    phone:           String(f["Phone"]              ?? ""),
    instructorName:  String(f["Instructor Name"]    ?? ""),
    instructorPhone: String(f["Instructor Phone"]   ?? ""),
    confirmed:       f["Confirmed"] === "checked" || f["Confirmed"] === true,
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

const inputCls =
  "w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      {children}
    </div>
  )
}

function InfoRow({
  icon, label, value, valueClass = "text-slate-700",
}: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-400 [&>svg]:h-3 [&>svg]:w-3">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  )
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
  const sz = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" }
  const palette = [
    "bg-indigo-100 text-indigo-600", "bg-emerald-100 text-emerald-600",
    "bg-amber-100 text-amber-700",   "bg-rose-100 text-rose-600",
    "bg-violet-100 text-violet-600", "bg-cyan-100 text-cyan-700",
  ]
  const color = palette[(name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % palette.length]
  return (
    <div className={`${sz[size]} ${color} rounded-xl flex items-center justify-center font-black shrink-0`}>
      {initials || <User className="h-4 w-4" />}
    </div>
  )
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-black text-slate-400 tabular-nums">{done}/{total}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StudentsPage() {
  const [students, setStudents]   = useState<Student[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState("")
  const [selected, setSelected]   = useState<Student | null>(null)
  const [sessions, setSessions]   = useState<Session[]>([])
  const [sessLoading, setSessLoading] = useState(false)

  // student edit
  const [editStudent, setEditStudent]   = useState(false)
  const [studentDraft, setStudentDraft] = useState<Partial<Student>>({})
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [saveOk, setSaveOk]             = useState(false)

  // session edit / add
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [sessionDraft, setSessionDraft]     = useState<Partial<Session>>({})
  const [sessioning, setSessioning]         = useState(false)
  const [addingSession, setAddingSession]   = useState(false)
  const [newSession, setNewSession]         = useState<Partial<Session>>({})

  // ── Load students ──
  const loadStudents = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const records = await api.students.list()
      setStudents(records.map(mapStudent))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStudents() }, [loadStudents])

  // ── Select student ──
  function selectStudent(s: Student) {
    setSelected(s)
    setStudentDraft({})
    setEditStudent(false)
    setSaveOk(false)
    setSaveError(null)
    setEditingSession(null)
    setAddingSession(false)
    setSessions([])
    setSessLoading(true)
    const name = `${s.firstName} ${s.lastName}`.trim()
    api.sessions.listFor(name)
      .then(recs => setSessions(recs.map(mapSession)))
      .catch(() => setSessions([]))
      .finally(() => setSessLoading(false))
  }

  function goBack() {
    setSelected(null)
    setSessions([])
  }

  // ── Save student ──
  async function saveStudent() {
    if (!selected) return
    setSaving(true); setSaveError(null)
    try {
      const fields: Record<string, unknown> = {}
      if (studentDraft.firstName     !== undefined) fields["First Name"]     = studentDraft.firstName
      if (studentDraft.lastName      !== undefined) fields["Last Name"]      = studentDraft.lastName
      if (studentDraft.email         !== undefined) fields["Email"]          = studentDraft.email
      if (studentDraft.phone         !== undefined) fields["Phone"]          = studentDraft.phone
      if (studentDraft.pickupAddress !== undefined) fields["Pickup Address"] = studentDraft.pickupAddress
      if (studentDraft.package       !== undefined) fields["Package"]        = studentDraft.package
      if (studentDraft.lessons       !== undefined) fields["Lessons"]        = studentDraft.lessons
      if (studentDraft.paid          !== undefined) fields["Paid"]           = studentDraft.paid ? true : false
      await api.students.patch(selected.id, fields)
      const updated = { ...selected, ...studentDraft } as Student
      setSelected(updated)
      setStudents(prev => prev.map(s => s.id === selected.id ? updated : s))
      setEditStudent(false)
      setStudentDraft({})
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Save session ──
  async function saveSession(id: string) {
    setSessioning(true)
    try {
      const fields: Record<string, unknown> = {}
      if (sessionDraft.date           !== undefined) fields["Date"]            = sessionDraft.date
      if (sessionDraft.time           !== undefined) fields["Time"]            = sessionDraft.time
      if (sessionDraft.duration       !== undefined) fields["Duration"]        = sessionDraft.duration
      if (sessionDraft.confirmed      !== undefined) fields["Confirmed"]       = sessionDraft.confirmed ? "checked" : ""
      if (sessionDraft.instructorName !== undefined) fields["Instructor Name"] = sessionDraft.instructorName
      await api.sessions.patch(id, fields)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...sessionDraft } as Session : s))
      setEditingSession(null)
      setSessionDraft({})
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSessioning(false)
    }
  }

  // ── Delete session ──
  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return
    try {
      await api.sessions.delete(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      alert(String(e))
    }
  }

  // ── Add session ──
  async function addSession() {
    if (!selected) return
    setSessioning(true)
    try {
      const fields: Record<string, unknown> = {
        "Student Name":    `${selected.firstName} ${selected.lastName}`.trim(),
        "Phone":           selected.phone,
        "Date":            newSession.date            ?? "",
        "Time":            newSession.time            ?? "",
        "Duration":        newSession.duration        ?? "",
        "Instructor Name": newSession.instructorName  ?? "",
        "Confirmed":       newSession.confirmed ? "checked" : "",
      }
      const rec = await api.sessions.create(fields)
      setSessions(prev => [...prev, mapSession(rec)])
      setAddingSession(false)
      setNewSession({})
    } catch (e) {
      alert(String(e))
    } finally {
      setSessioning(false)
    }
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q)  ||
      s.email.toLowerCase().includes(q)     ||
      s.phone.includes(q)                   ||
      s.package.toLowerCase().includes(q)
    )
  })

  // ── Detail panel (shared between mobile full-screen and desktop side panel) ──
  const detailPanel = selected ? (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">

        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Student Profile</p>
            <h2 className="text-lg font-black text-slate-800 leading-tight truncate">{selected.firstName} {selected.lastName}</h2>
          </div>
          <button
            onClick={() => {
              const params = new URLSearchParams({
                firstName: selected.firstName,
                lastName:  selected.lastName,
                package:   selected.package,
                lessons:   String(selected.lessonsDone),
                date:      new Date().toISOString().split("T")[0],
              })
              window.open(`/api/certificate?${params}`, "_blank")
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all shrink-0"
          >
            <ScrollText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Certificate</span>
          </button>
          <Avatar name={`${selected.firstName} ${selected.lastName}`} size="lg" />
        </div>

        {/* Student info card */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Student Info</p>
            <button
              onClick={() => {
                if (editStudent) { setEditStudent(false); setStudentDraft({}) }
                else { setEditStudent(true); setStudentDraft({ ...selected }) }
              }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {editStudent ? <X className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
              {editStudent ? "Cancel" : "Edit"}
            </button>
          </div>

          <div className="p-5 space-y-4">
            {editStudent ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name">
                    <input value={studentDraft.firstName ?? ""} onChange={e => setStudentDraft(d => ({ ...d, firstName: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Last Name">
                    <input value={studentDraft.lastName ?? ""} onChange={e => setStudentDraft(d => ({ ...d, lastName: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
                <Field label="Email">
                  <input type="email" value={studentDraft.email ?? ""} onChange={e => setStudentDraft(d => ({ ...d, email: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input value={studentDraft.phone ?? ""} onChange={e => setStudentDraft(d => ({ ...d, phone: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Pickup Address">
                  <input value={studentDraft.pickupAddress ?? ""} onChange={e => setStudentDraft(d => ({ ...d, pickupAddress: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Package">
                  <input value={studentDraft.package ?? ""} onChange={e => setStudentDraft(d => ({ ...d, package: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Total Lessons">
                  <input type="number" min={0} value={studentDraft.lessons ?? 0} onChange={e => setStudentDraft(d => ({ ...d, lessons: Number(e.target.value) }))} className={inputCls} />
                </Field>
                <Field label="Paid">
                  <button
                    type="button"
                    onClick={() => setStudentDraft(d => ({ ...d, paid: !d.paid }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${
                      studentDraft.paid
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all ${studentDraft.paid ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                      {studentDraft.paid && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    {studentDraft.paid ? "Paid" : "Not paid"}
                  </button>
                </Field>
                {saveError && (
                  <div className="flex gap-2 text-xs font-bold text-red-600 p-2 rounded-lg bg-red-50">
                    <AlertCircle className="h-4 w-4 shrink-0" />{saveError}
                  </div>
                )}
                <button
                  onClick={saveStudent}
                  disabled={saving}
                  className="w-full h-10 rounded-xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={<Mail />}       label="Email"   value={selected.email         || "—"} />
                <InfoRow icon={<Phone />}      label="Phone"   value={selected.phone         || "—"} />
                <InfoRow icon={<MapPin />}     label="Pickup"  value={selected.pickupAddress || "—"} />
                <InfoRow icon={<Package />}    label="Package" value={selected.package       || "—"} />
                <InfoRow icon={<BookOpen />}   label="Lessons" value={`${selected.lessonsDone} / ${selected.lessons} done`} />
                <InfoRow icon={<BadgeCheck />} label="Paid"    value={selected.paid ? "Yes" : "No"} valueClass={selected.paid ? "text-emerald-600" : "text-slate-500"} />
              </div>
            )}
            {saveOk && (
              <div className="flex items-center gap-2 text-[11px] font-black text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Saved successfully
              </div>
            )}
          </div>
        </div>

        {/* Sessions card */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              Sessions
              {sessions.length > 0 && (
                <span className="bg-indigo-100 text-indigo-600 rounded-md px-1.5 py-0.5 text-[9px] font-black">{sessions.length}</span>
              )}
            </p>
            <button
              onClick={() => { setAddingSession(v => !v); setNewSession({}) }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {addingSession ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {addingSession ? "Cancel" : "Add"}
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {addingSession && (
              <div className="p-5 bg-indigo-50/50 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">New Session</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <input type="date" value={newSession.date ?? ""} onChange={e => setNewSession(d => ({ ...d, date: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Time">
                    <input type="time" value={newSession.time ?? ""} onChange={e => setNewSession(d => ({ ...d, time: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Duration (h)">
                    <input type="number" min={1} value={newSession.duration ?? ""} onChange={e => setNewSession(d => ({ ...d, duration: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Instructor">
                    <input value={newSession.instructorName ?? ""} onChange={e => setNewSession(d => ({ ...d, instructorName: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!newSession.confirmed} onChange={e => setNewSession(d => ({ ...d, confirmed: e.target.checked }))} className="rounded" />
                  <span className="text-[11px] font-bold text-slate-600">Confirmed</span>
                </label>
                <button
                  onClick={addSession}
                  disabled={sessioning}
                  className="w-full h-9 rounded-xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {sessioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create Session
                </button>
              </div>
            )}

            {sessLoading ? (
              <div className="flex items-center justify-center h-24 gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-bold">Loading sessions…</span>
              </div>
            ) : sessions.length === 0 && !addingSession ? (
              <div className="flex flex-col items-center justify-center h-24 text-slate-300">
                <CalendarDays className="h-7 w-7 mb-1" />
                <p className="text-xs font-bold">No sessions yet</p>
              </div>
            ) : (
              sessions
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(s => (
                  <div key={s.id} className="p-5">
                    {editingSession === s.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Date">
                            <input type="date" value={sessionDraft.date ?? s.date} onChange={e => setSessionDraft(d => ({ ...d, date: e.target.value }))} className={inputCls} />
                          </Field>
                          <Field label="Time">
                            <input type="time" value={sessionDraft.time ?? s.time} onChange={e => setSessionDraft(d => ({ ...d, time: e.target.value }))} className={inputCls} />
                          </Field>
                          <Field label="Duration (h)">
                            <input type="number" min={1} value={sessionDraft.duration ?? s.duration} onChange={e => setSessionDraft(d => ({ ...d, duration: e.target.value }))} className={inputCls} />
                          </Field>
                          <Field label="Instructor">
                            <input value={sessionDraft.instructorName ?? s.instructorName} onChange={e => setSessionDraft(d => ({ ...d, instructorName: e.target.value }))} className={inputCls} />
                          </Field>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sessionDraft.confirmed ?? s.confirmed}
                            onChange={e => setSessionDraft(d => ({ ...d, confirmed: e.target.checked }))}
                            className="rounded"
                          />
                          <span className="text-[11px] font-bold text-slate-600">Confirmed</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveSession(s.id)}
                            disabled={sessioning}
                            className="flex-1 h-8 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-all disabled:opacity-50"
                          >
                            {sessioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingSession(null); setSessionDraft({}) }}
                            className="h-8 px-3 rounded-xl border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <CalendarDays className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-slate-800">
                              {s.date
                                ? new Date(s.date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
                                : "No date"}
                            </p>
                            <span className={`text-[9px] font-black uppercase tracking-wide rounded-md px-1.5 py-0.5 ${s.confirmed ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}>
                              {s.confirmed ? "Confirmed" : "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {s.time && <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500"><Clock className="h-3 w-3" />{s.time}</span>}
                            {s.duration && <span className="text-[11px] font-bold text-slate-500">{s.duration}h</span>}
                            {s.instructorName && <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400"><User className="h-3 w-3" />{s.instructorName.trim()}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingSession(s.id); setSessionDraft({}) }}
                            className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteSession(s.id)}
                            className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

      </div>
    </div>
  ) : null

  // ── Render ──
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur px-4 md:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Driving School</p>
          <h1 className="text-xl font-black text-slate-800 leading-tight">Students</h1>
        </div>
        <button
          onClick={loadStudents}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── MOBILE: full-screen list OR full-screen detail ── */}
      <div className="md:hidden">
        {selected ? (
          // Full-screen detail on mobile
          <div className="min-h-[calc(100vh-65px)]">
            {detailPanel}
          </div>
        ) : (
          // Full-screen list on mobile
          <div className="flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all"
                />
              </div>
            </div>
            <div className="px-4 py-2 bg-white border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {filtered.length} student{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex-1 bg-white">
              {loading ? (
                <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-bold">Loading…</span>
                </div>
              ) : error ? (
                <div className="m-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{error}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                  <User className="h-8 w-8 mb-2" />
                  <p className="text-sm font-bold">No students found</p>
                </div>
              ) : (
                filtered.map(s => {
                  const fullName = `${s.firstName} ${s.lastName}`.trim() || "Unnamed"
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectStudent(s)}
                      className="w-full text-left px-4 py-3.5 border-b border-slate-100 transition-all hover:bg-slate-50 active:bg-indigo-50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate text-slate-800">{fullName}</p>
                          <p className="text-[11px] text-slate-400 font-bold truncate">{s.package || "No package"}</p>
                          {s.lessons > 0 && <div className="mt-1"><ProgressBar done={s.lessonsDone} total={s.lessons} /></div>}
                        </div>
                        {s.paid && <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />}
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── DESKTOP: side-by-side layout ── */}
      <div className="hidden md:flex h-[calc(100vh-65px)]">

        {/* Left: student list */}
        <div className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${selected ? "w-80 shrink-0" : "flex-1"}`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all"
              />
            </div>
          </div>
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {filtered.length} student{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-bold">Loading…</span>
              </div>
            ) : error ? (
              <div className="m-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                <User className="h-8 w-8 mb-2" />
                <p className="text-sm font-bold">No students found</p>
              </div>
            ) : (
              filtered.map(s => {
                const isSelected = selected?.id === s.id
                const fullName = `${s.firstName} ${s.lastName}`.trim() || "Unnamed"
                return (
                  <button
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    className={`w-full text-left px-4 py-3.5 border-b border-slate-50 transition-all hover:bg-slate-50 ${isSelected ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black truncate ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>{fullName}</p>
                        <p className="text-[11px] text-slate-400 font-bold truncate">{s.package || "No package"}</p>
                        {s.lessons > 0 && <div className="mt-1"><ProgressBar done={s.lessonsDone} total={s.lessons} /></div>}
                      </div>
                      {s.paid && <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />}
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-indigo-400" : "text-slate-300"}`} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        {selected ? detailPanel : (
          !loading && students.length > 0 && (
            <div className="flex flex-1 items-center justify-center flex-col gap-3 text-slate-300">
              <User className="h-12 w-12" />
              <p className="text-sm font-black uppercase tracking-widest">Select a student</p>
            </div>
          )
        )}
      </div>

    </div>
  )
}