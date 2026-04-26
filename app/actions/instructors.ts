"use server"

// ---------------------------------------------------------------------------
// Instructor availability server actions
//
// Tables:
//   Instructors — active instructors with license types and working days
//   Sessions    — booked sessions (Date: text "YYYY-MM-DD", Time: text "HH:MM",
//                 Duration: text "1h"/"2h"/…, Instructor Name: text)
// ---------------------------------------------------------------------------

const AIRTABLE_BASE_ID  = process.env.AIRTABLE_BASE_ID!
const AIRTABLE_API_KEY  = process.env.AIRTABLE_API_KEY!
const INSTRUCTORS_TABLE = process.env.AIRTABLE_INSTRUCTORS_TABLE_ID!
const SESSIONS_TABLE    = process.env.AIRTABLE_SESSIONS_TABLE_ID!

export const WORKING_HOURS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00",
]

const LICENSE_TYPE_MAP: Record<string, string> = {
  "8M":   "Code 8 Manual",
  "8A":   "Code 8 Auto",
  "10":   "Code 10",
  "Spec": "Code 8 Manual",
}

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Instructor {
  id:           string
  name:         string
  firstName:    string
  lastName:     string
  phone:        string
  email:        string
  licenseTypes: string[]
  workingDays:  string[]
}

export interface AssignedInstructor {
  firstName: string
  lastName:  string
  phone:     string
  email:     string
}

export interface DayAvailability {
  date:               string          // "YYYY-MM-DD"
  busySlots:          string[]        // slots fully blocked across all instructors
  hasInstructors:     boolean
  availableOnDay:     boolean
  assignedInstructor: AssignedInstructor | null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchInstructors(licenseType: string): Promise<Instructor[]> {
  const formula = encodeURIComponent(
    `AND({Active}=1,FIND("${licenseType}",ARRAYJOIN({License Types},","))>0)`
  )
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${INSTRUCTORS_TABLE}?filterByFormula=${formula}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: "no-store",
  })
  if (!res.ok) return []

  const data = await res.json()
  return (data.records ?? []).map((r: any) => {
    const firstName = r.fields["First Name"] ?? ""
    const lastName  = r.fields["Last Name"]  ?? ""
    return {
      id:           r.id,
      name:         `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      phone:        String(r.fields["Phone"] ?? ""),
      email:        r.fields["Email"] ?? "",
      licenseTypes: r.fields["License Types"] ?? [],
      workingDays:  r.fields["Working Days"]  ?? [],
    }
  })
}

async function fetchBusySlotsForInstructor(
  dateStr: string,
  instructorName: string
): Promise<string[]> {
  const formula = encodeURIComponent(
    `AND({Date}="${dateStr}",{Instructor Name}="${instructorName}")`
  )
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SESSIONS_TABLE}?filterByFormula=${formula}&fields%5B%5D=Time&fields%5B%5D=Duration`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: "no-store",
  })
  if (!res.ok) return []

  const data  = await res.json()
  const busy  = new Set<string>()

  for (const record of data.records ?? []) {
    const startTime   = String(record.fields["Time"]     ?? "")
    const durationRaw = String(record.fields["Duration"] ?? "1h")
    const hours       = parseInt(durationRaw.replace(/\D/g, ""), 10) || 1
    const startIndex  = WORKING_HOURS.indexOf(startTime)
    if (startIndex === -1) continue
    WORKING_HOURS.slice(startIndex, startIndex + hours).forEach((s) => busy.add(s))
  }

  return Array.from(busy)
}

/** Core logic shared between single-date and batch queries */
async function resolveDayAvailability(
  dateStr: string,
  instructors: Instructor[]
): Promise<DayAvailability> {
  if (instructors.length === 0) {
    return { date: dateStr, busySlots: [], hasInstructors: false, availableOnDay: false, assignedInstructor: null }
  }

  const dayLabel       = DAY_LABELS[new Date(dateStr + "T00:00:00").getDay()]
  const availableToday = instructors.filter(
    (i) => i.workingDays.length === 0 || i.workingDays.includes(dayLabel)
  )

  if (availableToday.length === 0) {
    return { date: dateStr, busySlots: [], hasInstructors: true, availableOnDay: false, assignedInstructor: null }
  }

  const perInstructor = await Promise.all(
    availableToday.map(async (instructor) => ({
      instructor,
      busy: await fetchBusySlotsForInstructor(dateStr, instructor.name),
    }))
  )

  // A slot is globally busy only when ALL instructors are booked for it
  const busySlots = WORKING_HOURS.filter((slot) =>
    perInstructor.every(({ busy }) => busy.includes(slot))
  )

  // Assign the instructor with the lightest load on this date
  const sorted = [...perInstructor].sort((a, b) => a.busy.length - b.busy.length)
  const { instructor: assigned } = sorted[0]

  return {
    date: dateStr,
    busySlots,
    hasInstructors:     true,
    availableOnDay:     true,
    assignedInstructor: {
      firstName: assigned.firstName,
      lastName:  assigned.lastName,
      phone:     assigned.phone,
      email:     assigned.email,
    },
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Single-date availability — used when the user picks a date on the calendar.
 */
export async function getAvailableSlots(
  dateStr: string,
  packageCode: string
): Promise<DayAvailability> {
  const licenseType = LICENSE_TYPE_MAP[packageCode] ?? "Code 8 Manual"
  const instructors = await fetchInstructors(licenseType)
  return resolveDayAvailability(dateStr, instructors)
}

/**
 * Batch availability — used by the auto-fill feature.
 *
 * Fetches instructors once, then resolves each date in parallel.
 * Returns one DayAvailability per requested date, in the same order.
 */
export async function getBatchAvailability(
  dates: string[],   // "YYYY-MM-DD"[]
  packageCode: string
): Promise<DayAvailability[]> {
  if (dates.length === 0) return []

  const licenseType = LICENSE_TYPE_MAP[packageCode] ?? "Code 8 Manual"
  const instructors = await fetchInstructors(licenseType)   // single fetch for all dates

  // Resolve all dates concurrently
  const results = await Promise.all(
    dates.map((dateStr) => resolveDayAvailability(dateStr, instructors))
  )

  return results
}