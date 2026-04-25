"use server"

// ---------------------------------------------------------------------------
// getAvailableSlots
//
// Determines instructor availability by querying two Airtable tables:
//
//   1. Instructors — finds active instructors covering the requested license
//      type who work on the requested day of the week.
//
//   2. Sessions — finds which time slots are already booked for each matching
//      instructor on the requested date.
//
// Field types in Sessions:
//   - Date            → single line text  ("YYYY-MM-DD")
//   - Time            → single line text  ("HH:MM")
//   - Duration        → single line text  ("1h", "2h", etc.)
//   - Instructor Name → single line text
//   - Confirmed       → checkbox          (boolean, TRUE/FALSE)
//   - Phone           → phone number field
// ---------------------------------------------------------------------------

const AIRTABLE_BASE_ID  = process.env.AIRTABLE_BASE_ID!
const AIRTABLE_API_KEY  = process.env.AIRTABLE_API_KEY!
const INSTRUCTORS_TABLE = process.env.AIRTABLE_INSTRUCTORS_TABLE_ID!
const SESSIONS_TABLE    = process.env.AIRTABLE_SESSIONS_TABLE_ID!

const WORKING_HOURS = [
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
  id: string
  name: string
  firstName: string
  lastName: string
  phone: string
  email: string
  licenseTypes: string[]
  workingDays: string[]
}

export interface AssignedInstructor {
  firstName: string
  lastName: string
  phone: string
  email: string
}

// ---------------------------------------------------------------------------
// Fetch active instructors for a license type
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

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    console.error(`Instructors fetch failed: HTTP ${res.status}`, body)
    return []
  }

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

// ---------------------------------------------------------------------------
// Fetch busy slots for one instructor on one date
//
// Date and Instructor Name are plain text → string equality.
// Confirmed is a checkbox → TRUE() not "checked".
// ---------------------------------------------------------------------------

async function fetchBusySlotsForInstructor(
  dateStr: string,
  instructorName: string
): Promise<string[]> {
  const formula = encodeURIComponent(
    `AND({Date}="${dateStr}",{Instructor Name}="${instructorName}",{Confirmed}=TRUE())`
  )

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SESSIONS_TABLE}?filterByFormula=${formula}&fields%5B%5D=Time&fields%5B%5D=Duration`

  console.log(`📡 Sessions query [${instructorName} / ${dateStr}]:`, url)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)")
    console.error(`❌ Sessions fetch failed for "${instructorName}" on ${dateStr}: HTTP ${res.status} — ${body}`)
    return []
  }

  const data = await res.json()
  const busySet = new Set<string>()

  for (const record of data.records ?? []) {
    const startTime   = String(record.fields["Time"]     ?? "")
    const durationRaw = String(record.fields["Duration"] ?? "1h")
    const hours       = parseInt(durationRaw.replace(/\D/g, ""), 10) || 1
    const startIndex  = WORKING_HOURS.indexOf(startTime)
    if (startIndex === -1) continue
    WORKING_HOURS.slice(startIndex, startIndex + hours).forEach((s) => busySet.add(s))
  }

  console.log(
    `✅ Sessions [${instructorName}] ${dateStr}: ${busySet.size} busy slot(s) —`,
    Array.from(busySet).join(", ") || "none"
  )

  return Array.from(busySet)
}

// ---------------------------------------------------------------------------
// Public API — same signature as before, no changes needed in booking-form.tsx
// ---------------------------------------------------------------------------

export async function getAvailableSlots(
  dateStr: string,
  packageCode: string
): Promise<{
  busySlots: string[]
  hasInstructors: boolean
  availableOnDay: boolean
  assignedInstructor: AssignedInstructor | null
}> {
  const licenseType = LICENSE_TYPE_MAP[packageCode] ?? "Code 8 Manual"
  const instructors = await fetchInstructors(licenseType)

  if (instructors.length === 0) {
    console.warn(`No active instructors for: ${licenseType}`)
    return { busySlots: [], hasInstructors: false, availableOnDay: false, assignedInstructor: null }
  }

  const dayLabel       = DAY_LABELS[new Date(dateStr + "T00:00:00").getDay()]
  const availableToday = instructors.filter(
    (i) => i.workingDays.length === 0 || i.workingDays.includes(dayLabel)
  )

  if (availableToday.length === 0) {
    return { busySlots: [], hasInstructors: true, availableOnDay: false, assignedInstructor: null }
  }

  const perInstructor = await Promise.all(
    availableToday.map(async (instructor) => ({
      instructor,
      busy: await fetchBusySlotsForInstructor(dateStr, instructor.name),
    }))
  )

  // A slot is fully blocked only when ALL instructors are busy for it
  const fullBusySlots = WORKING_HOURS.filter((slot) =>
    perInstructor.every(({ busy }) => busy.includes(slot))
  )

  // Assign the instructor with the fewest sessions today (lightest load)
  const sorted = [...perInstructor].sort((a, b) => a.busy.length - b.busy.length)
  const { instructor: assigned } = sorted[0]

  console.log(
    `📅 ${dateStr} | ${licenseType} | ${availableToday.length} instructor(s) | ` +
    `assigned: ${assigned.name} | ${fullBusySlots.length} fully blocked slot(s)`
  )

  return {
    busySlots: fullBusySlots,
    hasInstructors: true,
    availableOnDay: true,
    assignedInstructor: {
      firstName: assigned.firstName,
      lastName:  assigned.lastName,
      phone:     assigned.phone,
      email:     assigned.email,
    },
  }
}