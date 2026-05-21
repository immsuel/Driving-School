"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, ChevronRight, X, Loader2, CheckCircle2,
  AlertCircle, User, Phone, Mail, MapPin, Package,
  CalendarDays, Clock, Edit3, Save, Plus, Trash2,
  ArrowLeft, BookOpen, BadgeCheck, RefreshCw,
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
// Airtable helpers
// ---------------------------------------------------------------------------

const BASE   = process.env.NEXT_PUBLIC_TABLE_BASE_ID      ?? process.env.TABLE_BASE_ID      ?? ""
const TOKEN  = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY   ?? process.env.AIRTABLE_API_KEY   ?? ""
const S_TBL  = process.env.NEXT_PUBLIC_AIRTABLE_STUDENTS_TABLE_ID  ?? process.env.AIRTABLE_STUDENTS_TABLE_ID  ?? "Students"
const SE_TBL = process.env.NEXT_PUBLIC_AIRTABLE_SESSIONS_TABLE_ID  ?? process.env.AIRTABLE_SESSIONS_TABLE_ID  ?? "Sessions"

async function atFetch(table: string, params = "") {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${table}${params}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  )
  if (!res.ok) throw new Error(`Airtable ${res.status}`)
  return res.json()
}

async function atPatch(table: string, id: string, fields: Record<string, unknown>) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${table}/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`Airtable PATCH ${res.status}`)
  return res.json()
}

async function atCreate(table: string, fields: Record<string, unknown>) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`Airtable POST ${res.status}`)
  return res.json()
}

async function atDelete(table: string, id: string) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${table}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!res.ok) throw new Error(`Airtable DELETE ${res.status}`)
  return res.json()
}

function mapStudent(r: { id: string; fields: Record<string, unknown> }): Student {
  const f = r.fields
  return {
    id: r.id,
    firstName:      String(f["First Name"]  ?? ""),
    lastName:       String(f["Last Name"]   ?? ""),
    email:          String(f["Email"]        ?? ""),
    phone:          String(f["Phone"]        ?? ""),
    pickupAddress:  String(f["Pickup Address"] ?? ""),
    package:        String(f["Package"]     ?? ""),
    paid:           f["Paid"] === "checked" || f["Paid"] === true,
    lessons:        Number(f["Lessons"]     ?? 0),
    lessonsDone:    Number(f["Lessons Done"] ?? 0),
    instructorPhone: String(f["Instructor Phone"] ?? ""),
    sessionIds:     (f["Sessions"] as string[]) ?? [],
  }
}

function mapSession(r: { id: string; fields: Record<string, unknown> }): Session {
  const f = r.fields
  return {
    id: r.id,
    studentName:    String(f["Student Name"]    ?? ""),
    date:           String(f["Date"]            ?? ""),
    time:           String(f["Time"]            ?? ""),
    duration:       String(f["Duration"]        ?? ""),
    formattedSlot:  String(f["Formatted Slot"]  ?? ""),
    phone:          String(f["Phone"]           ?? ""),
    instructorName: String(f["Instructor Name"] ?? ""),
    instructorPhone: String(f["Instructor Phone"] ?? ""),
    confirmed:      f["Confirmed"] === "checked" || f["Confirmed"] === true,
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" }
  const colors = [
    "bg-indigo-100 text-indigo-600",
    "bg-emerald-100 text-emerald-600",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-600",
    "bg-violet-100 text-violet-600",
    "bg-cyan-100 text-cyan-700",
  ]
  const color = colors[(name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)) % colors.length]
  return (
    <div className={`${sizes[size]} ${color} rounded-xl flex items-center justify-center font-black shrink-0`}>
      {initials || <User className="h-4 w-4" />}
    </div>
  )
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-black text-slate-400 tabular-nums">{done}/{total}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function StudentsPage() {
  const [students, setStudents]         = useState<Student[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [search, setSearch]             = useState("")
  const [selected, setSelected]         = useState<Student | null>(null)
  const [sessions, setSessions]         = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // edit state
  const [editStudent, setEditStudent]   = useState(false)
  const [studentDraft, setStudentDraft] = useState<Partial<Student>>({})
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [saveOk, setSaveOk]             = useState(false)

  // session edit
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [sessionDraft, setSessionDraft]     = useState<Partial<Session>>({})
  const [sessionSaving, setSessionSaving]   = useState(false)
  const [addingSession, setAddingSession]   = useState(false)
  const [newSession, setNewSession]         = useState<Partial<Session>>({})

  // Load students
  const loadStudents = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await atFetch(S_TBL, "?pageSize=100")
      setStudents((data.records ?? []).map(mapStudent))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStudents() }, [loadStudents])

  // Load sessions for selected student
  const loadSessions = useCallback(async (student: Student) => {
    setSessionsLoading(true)
    try {
      const fullName = `${student.firstName} ${student.lastName}`.trim()
      const formula  = encodeURIComponent(`{Student Name} = "${fullName}"`)
      const data     = await atFetch(SE_TBL, `?filterByFormula=${formula}&pageSize=100`)
      setSessions((data.records ?? []).map(mapSession))
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  function selectStudent(s: Student) {
    setSelected(s)
    setStudentDraft({})
    setEditStudent(false)
    setSaveOk(false)
    setSaveError(null)
    setEditingSession(null)
    setAddingSession(false)
    loadSessions(s)
  }

  // Save student edits
  async function saveStudent() {
    if (!selected) return
    setSaving(true); setSaveError(null)
    try {
      const fields: Record<string, unknown> = {}
      if (studentDraft.firstName !== undefined)     fields["First Name"]      = studentDraft.firstName
      if (studentDraft.lastName  !== undefined)     fields["Last Name"]       = studentDraft.lastName
      if (studentDraft.email     !== undefined)     fields["Email"]           = studentDraft.email
      if (studentDraft.phone     !== undefined)     fields["Phone"]           = studentDraft.phone
      if (studentDraft.pickupAddress !== undefined) fields["Pickup Address"]  = studentDraft.pickupAddress
      if (studentDraft.package   !== undefined)     fields["Package"]         = studentDraft.package
      if (studentDraft.lessons   !== undefined)     fields["Lessons"]         = studentDraft.lessons
      await atPatch(S_TBL, selected.id, fields)
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

  // Save session edits
  async function saveSession(id: string) {
    setSessionSaving(true)
    try {
      const fields: Record<string, unknown> = {}
      if (sessionDraft.date          !== undefined) fields["Date"]           = sessionDraft.date
      if (sessionDraft.time          !== undefined) fields["Time"]           = sessionDraft.time
      if (sessionDraft.duration      !== undefined) fields["Duration"]       = sessionDraft.duration
      if (sessionDraft.confirmed     !== undefined) fields["Confirmed"]      = sessionDraft.confirmed ? "checked" : ""
      if (sessionDraft.instructorName !== undefined) fields["Instructor Name"] = sessionDraft.instructorName
      await atPatch(SE_TBL, id, fields)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...sessionDraft } as Session : s))
      setEditingSession(null)
      setSessionDraft({})
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSessionSaving(false)
    }
  }

  // Delete session
  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return
    try {
      await atDelete(SE_TBL, id)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      alert(String(e))
    }
  }

  // Add session
  async function addSession() {
    if (!selected) return
    setSessionSaving(true)
    try {
      const fullName = `${selected.firstName} ${selected.lastName}`.trim()
      const fields: Record<string, unknown> = {
        "Student Name": fullName,
        "Phone":        selected.phone,
        "Date":         newSession.date         ?? "",
        "Time":         newSession.time         ?? "",
        "Duration":     newSession.duration     ?? "",
        "Instructor Name": newSession.instructorName ?? "",
        "Confirmed":    newSession.confirmed ? "checked" : "",
      }
      const rec = await atCreate(SE_TBL, fields)
      setSessions(prev => [...prev, mapSession(rec)])
      setAddingSession(false)
      setNewSession({})
    } catch (e) {
      alert(String(e))
    } finally {
      setSessionSaving(false)
    }
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.package.toLowerCase().includes(q)
    )
  })

  // ---- Render ----
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Driving School</p>
          <h1 className="text-xl font-black text-slate-800 leading-tight">Students</h1>
        </div>
        <button
          onClick={loadStudents}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
      </div>

      <div className="flex h-[calc(100vh-65px)]">

        {/* ── LEFT: Student list ── */}
        <div className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${selected ? "w-80 shrink-0" : "flex-1"}`}>
          {/* Search */}
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

          {/* Count */}
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {filtered.length} student{filtered.length !== 1 ? "s" : ""}
            </p>
            {!selected && (
              <p className="text-[10px] text-slate-300 font-bold uppercase">Click to view</p>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-bold">Loading…</span>
              </div>
            ) : error ? (
              <div className="m-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
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
                    className={`w-full text-left px-4 py-3.5 border-b border-slate-50 transition-all hover:bg-slate-50 ${
                      isSelected ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black truncate ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                          {fullName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-bold truncate">{s.package || "No package"}</p>
                        {s.lessons > 0 && (
                          <div className="mt-1">
                            <ProgressBar done={s.lessonsDone} total={s.lessons} />
                          </div>
                        )}
                      </div>
                      {s.paid && (
                        <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${isSelected ? "text-indigo-400" : "text-slate-300"}`} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Detail panel ── */}
        {selected && (
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-2xl mx-auto p-6 space-y-6">

              {/* Back + title */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelected(null); setSessions([]) }}
                  className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Student Profile</p>
                  <h2 className="text-lg font-black text-slate-800 leading-tight">
                    {selected.firstName} {selected.lastName}
                  </h2>
                </div>
                <div className="ml-auto">
                  <Avatar name={`${selected.firstName} ${selected.lastName}`} size="lg" />
                </div>
              </div>

              {/* ── Student info card ── */}
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
                          <input
                            value={studentDraft.firstName ?? ""}
                            onChange={e => setStudentDraft(d => ({ ...d, firstName: e.target.value }))}
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Last Name">
                          <input
                            value={studentDraft.lastName ?? ""}
                            onChange={e => setStudentDraft(d => ({ ...d, lastName: e.target.value }))}
                            className={inputCls}
                          />
                        </Field>
                      </div>
                      <Field label="Email">
                        <input
                          type="email"
                          value={studentDraft.email ?? ""}
                          onChange={e => setStudentDraft(d => ({ ...d, email: e.target.value }))}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Phone">
                        <input
                          value={studentDraft.phone ?? ""}
                          onChange={e => setStudentDraft(d => ({ ...d, phone: e.target.value }))}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Pickup Address">
                        <input
                          value={studentDraft.pickupAddress ?? ""}
                          onChange={e => setStudentDraft(d => ({ ...d, pickupAddress: e.target.value }))}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Package">
                        <input
                          value={studentDraft.package ?? ""}
                          onChange={e => setStudentDraft(d => ({ ...d, package: e.target.value }))}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Total Lessons">
                        <input
                          type="number"
                          value={studentDraft.lessons ?? 0}
                          onChange={e => setStudentDraft(d => ({ ...d, lessons: Number(e.target.value) }))}
                          className={inputCls}
                        />
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
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow icon={<Mail />} label="Email" value={selected.email || "—"} />
                      <InfoRow icon={<Phone />} label="Phone" value={selected.phone || "—"} />
                      <InfoRow icon={<MapPin />} label="Pickup" value={selected.pickupAddress || "—"} />
                      <InfoRow icon={<Package />} label="Package" value={selected.package || "—"} />
                      <InfoRow icon={<BookOpen />} label="Lessons" value={`${selected.lessonsDone} / ${selected.lessons} done`} />
                      <InfoRow
                        icon={<BadgeCheck />}
                        label="Paid"
                        value={selected.paid ? "Yes" : "No"}
                        valueClass={selected.paid ? "text-emerald-600" : "text-slate-500"}
                      />
                    </div>
                  )}

                  {saveOk && (
                    <div className="flex items-center gap-2 text-[11px] font-black text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />Saved successfully
                    </div>
                  )}
                </div>
              </div>

              {/* ── Sessions card ── */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Sessions
                    {sessions.length > 0 && (
                      <span className="bg-indigo-100 text-indigo-600 rounded-md px-1.5 py-0.5 text-[9px] font-black">
                        {sessions.length}
                      </span>
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
                  {/* Add session form */}
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
                        disabled={sessionSaving}
                        className="w-full h-9 rounded-xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {sessionSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Create Session
                      </button>
                    </div>
                  )}

                  {/* Session list */}
                  {sessionsLoading ? (
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
                                  disabled={sessionSaving}
                                  className="flex-1 h-8 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-all disabled:opacity-50"
                                >
                                  {sessionSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
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
                                    {s.date ? new Date(s.date + "T00:00:00").toLocaleDateString("en-ZA", {
                                      weekday: "short", day: "2-digit", month: "short", year: "numeric",
                                    }) : "No date"}
                                  </p>
                                  {s.confirmed ? (
                                    <span className="text-[9px] font-black uppercase tracking-wide text-emerald-600 bg-emerald-50 rounded-md px-1.5 py-0.5">
                                      Confirmed
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase tracking-wide text-amber-600 bg-amber-50 rounded-md px-1.5 py-0.5">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  {s.time && (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                      <Clock className="h-3 w-3" />{s.time}
                                    </span>
                                  )}
                                  {s.duration && (
                                    <span className="text-[11px] font-bold text-slate-500">{s.duration}h</span>
                                  )}
                                  {s.instructorName && (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                      <User className="h-3 w-3" />{s.instructorName.trim()}
                                    </span>
                                  )}
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
        )}

        {/* Empty state when no student is selected */}
        {!selected && !loading && students.length > 0 && (
          <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3 text-slate-300">
            <User className="h-12 w-12" />
            <p className="text-sm font-black uppercase tracking-widest">Select a student</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small helpers
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
      <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-400">
        {icon && <span className="[&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  )
}