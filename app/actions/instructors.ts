"use server"

// ---------------------------------------------------------------------------
// getAvailableSlots
//
// 1. Queries your Airtable Instructors table for active instructors
//    who cover the requested license type.
// 2. Collects all their iCal URLs.
// 3. Returns the union of busy slots across all of them for the given date.
//
// A time slot shows as AVAILABLE on the booking form only if at least one
// matching instructor is free for the full session duration.
// ---------------------------------------------------------------------------

import { getBusySlots } from "./calendar"

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!        // e.g. app9TOnCZwORZxDQ7
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!         // your Airtable personal access token
const INSTRUCTORS_TABLE = process.env.AIRTABLE_INSTRUCTORS_TABLE_ID! // table ID or name

interface Instructor {
  id: string
  name: string
  phone: string
  email: string
  icalUrl: string
  licenseTypes: string[]  // e.g. ["Code 8 Manual", "Code 8 Auto"]
  workingDays: string[]   // e.g. ["Mon", "Tue", "Wed", "Thu", "Fri"]
  maxDailyHours: number
}

// Map the package code used in booking-form to the label stored in Airtable
const LICENSE_TYPE_MAP: Record<string, string> = {
  "8M": "Code 8 Manual",
  "8A": "Code 8 Auto",
  "10": "Code 10",
  "Spec": "Code 8 Manual", // Test Day Prep — any instructor can do it, default to widest pool
}

// Day index (0=Sun) → short label matching your Airtable Working Days multi-select
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

async function fetchInstructors(licenseType: string): Promise<Instructor[]> {
  console.log("ENV CHECK:", {
    base: process.env.AIRTABLE_BASE_ID,
    key: process.env.AIRTABLE_API_KEY ? "set" : "MISSING",
    table: process.env.AIRTABLE_INSTRUCTORS_TABLE_ID,
  })
  // Airtable formula: instructor must be Active AND cover the requested license type
  const formula = encodeURIComponent(
    `AND({Active} = 1, FIND("${licenseType}", ARRAYJOIN({License Types}, ",")) > 0)`
  )

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${INSTRUCTORS_TABLE}?filterByFormula=${formula}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    // FIX: Added cache: "no-store" so Next.js / Vercel's fetch extension does
    // not block or incorrectly cache this request on the Edge runtime.
    // next.revalidate still controls ISR behaviour when supported.
    cache: "no-store",
    next: { revalidate: 60 },
  })

  console.log("Airtable status:", res.status)
const rawData = await res.json()
console.log("Airtable response:", JSON.stringify(rawData, null, 2))
return [] 

  if (!res.ok) {
    console.error("Airtable fetch failed:", res.status, await res.text())
    return []
  }

  const data = await res.json()

  return (data.records ?? [])
    .filter((r: any) => !!r.fields["iCal URL"]) // skip instructors with no iCal URL set
    .map((r: any) => ({
      id: r.id,
      name: `${r.fields["First Name"] ?? ""} ${r.fields["Last Name"] ?? ""}`.trim(),
      phone: r.fields["Phone"] ?? "",
      email: r.fields["Email"] ?? "",
      icalUrl: r.fields["iCal URL"],
      licenseTypes: r.fields["License Types"] ?? [],
      workingDays: r.fields["Working Days"] ?? [],
      maxDailyHours: r.fields["Max Daily Hours"] ?? 8,
    }))


    
}

export interface AssignedInstructor {
  firstName: string
  lastName: string
  phone: string
  email: string
}

/**
 * Returns busy slots for a date + license type combination, plus the
 * assigned instructor (the one with the fewest bookings that day).
 *
 * @param dateStr     "YYYY-MM-DD"
 * @param packageCode The package code from booking-form: "8M" | "8A" | "10" | "Spec"
 *
 * @returns Object with:
 *   - busySlots: string[]            — slots where ALL matching instructors are busy
 *   - hasInstructors: boolean        — false if no instructors cover this license type
 *   - availableOnDay: boolean        — false if no instructor works on this day
 *   - assignedInstructor: AssignedInstructor | null — lightest-loaded instructor for the day
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
  const licenseType = LICENSE_TYPE_MAP[packageCode] ?? "Code 8 Manual"
  const instructors = await fetchInstructors(licenseType)

  if (instructors.length === 0) {
    console.warn(`No active instructors found for license type: ${licenseType}`)
    return { busySlots: [], hasInstructors: false, availableOnDay: false, assignedInstructor: null }
  }

  const date = new Date(dateStr + "T00:00:00")
  const dayLabel = DAY_LABELS[date.getDay()]
  const instructorsAvailableToday = instructors.filter(
    (i) => i.workingDays.length === 0 || i.workingDays.includes(dayLabel)
  )

  if (instructorsAvailableToday.length === 0) {
    return { busySlots: [], hasInstructors: true, availableOnDay: false, assignedInstructor: null }
  }

  // get busy slots individually
  const perInstructorBusy = await Promise.all(
    instructorsAvailableToday.map(async (instructor) => ({
      instructor,
      busy: await getBusySlots(dateStr, [instructor.icalUrl]),
    }))
  )

  // A slot is unavailable only when NO instructor is free for it
  const WORKING_HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"]
  const fullBusySlots = WORKING_HOURS.filter((slot) =>
    perInstructorBusy.every(({ busy }) => busy.includes(slot))
  )

  // Assign the instructor with the fewest busy slots today (lightest load)
  const sorted = [...perInstructorBusy].sort((a, b) => a.busy.length - b.busy.length)
  const { instructor: assigned } = sorted[0]

  const assignedInstructor: AssignedInstructor = {
    firstName: assigned.name.split(" ")[0] ?? assigned.name,
    lastName: assigned.name.split(" ").slice(1).join(" ") ?? "",
    phone: assigned.phone,
    email: assigned.email,
  }

  console.log(
    `📅 ${dateStr} | ${licenseType} | ${instructorsAvailableToday.length} instructor(s) | assigned: ${assigned.name} | ${fullBusySlots.length} fully blocked slots`
  )

  return {
    busySlots: fullBusySlots,
    hasInstructors: true,
    availableOnDay: true,
    assignedInstructor,
  }
}