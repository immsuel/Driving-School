"use server"

// ---------------------------------------------------------------------------
// getAvailableSlots
//
// Determines instructor availability by querying two Airtable tables:
//
//   1. Instructors — to find active instructors who cover the requested
//      license type and work on the requested day of the week.
//
//   2. Sessions — to find which time slots are already booked for each
//      matching instructor on the requested date.
//
// A time slot is BUSY only when every matching instructor already has a
// confirmed session covering it. As long as one instructor is free, the
// slot is shown as available on the booking form.
//
// This replaces the previous iCal-based approach. The Sessions table is
// the authoritative source of truth — no external calendar fetches, no
// caching lag, no silent URL failures.
// ---------------------------------------------------------------------------

const AIRTABLE_BASE_ID        = process.env.AIRTABLE_BASE_ID!
const AIRTABLE_API_KEY        = process.env.AIRTABLE_API_KEY!
const INSTRUCTORS_TABLE       = process.env.AIRTABLE_INSTRUCTORS_TABLE_ID!
const SESSIONS_TABLE          = process.env.AIRTABLE_SESSIONS_TABLE_ID!   // ← new env var

const WORKING_HOURS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00",
]

// Map the package code from booking-form to the label stored in Airtable
const LICENSE_TYPE_MAP: Record<string, string> = {
  "8M":   "Code 8 Manual",
  "8A":   "Code 8 Auto",
  "10":   "Code 10",
  "Spec": "Code 8 Manual", // Test Day Prep — widest instructor pool
}

// JS getDay() index → short label matching Airtable "Working Days" multi-select
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
// Airtable helpers
// ---------------------------------------------------------------------------

/** Fetch active instructors that cover the requested license type. */
async function fetchInstructors(licenseType: string): Promise<Instructor[]> {
  const formula = encodeURIComponent(
    `AND({Active} = 1, FIND("${licenseType}", ARRAYJOIN({License Types}, ",")) > 0)`
  )
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${INSTRUCTORS_TABLE}?filterByFormula=${formula}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: "no-store",
  })

  if (!res.ok) {
    console.error("Airtable Instructors fetch failed:", res.status)
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

/**
 * Fetch all confirmed Sessions for a given date and instructor name.
 *
 * Returns the set of hour slots the instructor is busy for, expanding
 * multi-hour sessions (e.g. Duration = "2h" starting at "09:00" blocks
 * both "09:00" and "10:00").
 */
async function fetchBusySlotsForInstructor(
  dateStr: string,        // "YYYY-MM-DD"
  instructorName: string  // must match the "Instructor Name" field in Sessions
): Promise<string[]> {
  // Filter: date matches AND instructor matches AND session is confirmed.
  // Keep formula on one line — Airtable's API rejects newlines in encoded formulas (422).
  const formula = encodeURIComponent(`AND({Date}="${dateStr}",{Instructor Name}="${instructorName}",{Confirmed}="checked")`)

  // Each fields[] param must be encoded separately — encoding the whole string at once breaks the [] syntax.
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SESSIONS_TABLE}?filterByFormula=${formula}&fields%5B%5D=Time&fields%5B%5D=Duration`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: "no-store",
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => "(unreadable)")
    console.error(`Airtable Sessions fetch failed for ${instructorName} on ${dateStr}: HTTP ${res.status}`, errBody)
    return []
  }

  const data = await res.json()
  const busySet = new Set<string>()

  for (const record of data.records ?? []) {
    const startTime: string = record.fields["Time"]     ?? ""  // e.g. "09:00"
    const durationRaw: string = record.fields["Duration"] ?? "1h" // e.g. "2h"

    const hours = parseInt(durationRaw.replace(/\D/g, ""), 10) || 1
    const startIndex = WORKING_HOURS.indexOf(startTime)
    if (startIndex === -1) continue

    // Block every working-hour slot the session occupies
    WORKING_HOURS.slice(startIndex, startIndex + hours).forEach((s) => busySet.add(s))
  }

  return Array.from(busySet)
}

// ---------------------------------------------------------------------------
// Public API — same signature as before, no changes needed in booking-form.tsx
// ---------------------------------------------------------------------------

/**
 * Returns busy slots for a date + package combination, plus the assigned
 * instructor (lightest-loaded one that day).
 *
 * @param dateStr     "YYYY-MM-DD"
 * @param packageCode "8M" | "8A" | "10" | "Spec"
 */
export async function getAvailableSlots(
  dateStr: string,
  packageCode: string
): Promise<{
  busySlots: string[]
  hasInstructors: boolean
  availableOnDay: boolean
  assignedInstructor: AssignedInstructor | null
}> {
  const licenseType  = LICENSE_TYPE_MAP[packageCode] ?? "Code 8 Manual"
  const instructors  = await fetchInstructors(licenseType)

  if (instructors.length === 0) {
    console.warn(`No active instructors found for license type: ${licenseType}`)
    return { busySlots: [], hasInstructors: false, availableOnDay: false, assignedInstructor: null }
  }

  // Filter to instructors who work on this day of the week
  const dayLabel = DAY_LABELS[new Date(dateStr + "T00:00:00").getDay()]
  const availableToday = instructors.filter(
    (i) => i.workingDays.length === 0 || i.workingDays.includes(dayLabel)
  )

  if (availableToday.length === 0) {
    return { busySlots: [], hasInstructors: true, availableOnDay: false, assignedInstructor: null }
  }

  // Query Sessions table for each instructor's bookings on this date
  const perInstructor = await Promise.all(
    availableToday.map(async (instructor) => ({
      instructor,
      busy: await fetchBusySlotsForInstructor(dateStr, instructor.name),
    }))
  )

  // A slot is fully blocked only when EVERY instructor is busy for it
  const fullBusySlots = WORKING_HOURS.filter((slot) =>
    perInstructor.every(({ busy }) => busy.includes(slot))
  )

  // Assign the instructor with the fewest sessions booked today
  const sorted = [...perInstructor].sort((a, b) => a.busy.length - b.busy.length)
  const { instructor: assigned } = sorted[0]

  console.log(
    `📅 ${dateStr} | ${licenseType} | ${availableToday.length} instructor(s) | ` +
    `assigned: ${assigned.name} | ${fullBusySlots.length} fully blocked slots`
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