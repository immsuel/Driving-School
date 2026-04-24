"use server"

// ---------------------------------------------------------------------------
// getBusySlots — no Google API, no service account, no OAuth.
//
// Each instructor shares their Google Calendar "Secret iCal URL"
// (Calendar Settings → "Secret address in iCal format").
// That URL is stored in Airtable on their Instructor record.
// ---------------------------------------------------------------------------

const WORKING_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
const TZ = "Africa/Johannesburg"

// Parse an iCal datetime string into a JS Date.
// Handles: 20250614T080000Z  /  20250614T100000  /  20250614 (all-day)
function parseICalDate(raw: string): Date {
  // All-day event: YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    return new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00`)
  }
  // UTC: ends in Z
  if (raw.endsWith("Z")) {
    return new Date(raw.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z"))
  }
  // Floating local time — assume SA timezone (UTC+2)
  const iso = raw.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6")
  const offset = 2 * 60 * 60 * 1000
  return new Date(new Date(iso).getTime() - offset)
}

// Expand a start→end range into all WORKING_HOURS slots it covers
function expandToSlots(start: Date, end: Date): string[] {
  const slots: string[] = []
  for (const slot of WORKING_HOURS) {
    const [h, m] = slot.split(":").map(Number)
    const slotDate = new Date(start)
    slotDate.setHours(h, m, 0, 0)
    if (slotDate >= start && slotDate < end) {
      slots.push(slot)
    }
  }
  return slots
}

interface ICalEvent {
  start: Date
  end: Date
}

// Minimal iCal parser — handles VEVENT blocks with DTSTART/DTEND
function parseICal(text: string): ICalEvent[] {
  const events: ICalEvent[] = []
  const lines = text.replace(/\r\n[ \t]/g, "").split(/\r\n|\n/)

  let inEvent = false
  let dtstart = ""
  let dtend = ""

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true
      dtstart = ""
      dtend = ""
      continue
    }
    if (line === "END:VEVENT") {
      inEvent = false
      if (dtstart) {
        const start = parseICalDate(dtstart)
        const end = dtend ? parseICalDate(dtend) : new Date(start.getTime() + 3600 * 1000)
        events.push({ start, end })
      }
      continue
    }
    if (!inEvent) continue

    const startMatch = line.match(/^DTSTART(?:;TZID=[^:]+)?:(.+)/)
    if (startMatch) { dtstart = startMatch[1].trim(); continue }

    const endMatch = line.match(/^DTEND(?:;TZID=[^:]+)?:(.+)/)
    if (endMatch) { dtend = endMatch[1].trim() }
  }

  return events
}

/**
 * Returns busy hour-slots for a given date by fetching iCal feed URLs.
 *
 * @param dateStr   "YYYY-MM-DD"
 * @param icalUrls  One or more Google Calendar secret iCal URLs
 */
export async function getBusySlots(dateStr: string, icalUrls: string[]): Promise<string[]> {
  const busySet = new Set<string>()

  await Promise.all(
    icalUrls.map(async (url) => {
      try {
        const res = await fetch(url, {
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(8_000), // fail after 8 seconds
        })
        const text = await res.text()
        const events = parseICal(text)

        for (const { start, end } of events) {
          const saDate = new Intl.DateTimeFormat("en-CA", {
            year: "numeric", month: "2-digit", day: "2-digit",
            timeZone: TZ,
          }).format(start)

          if (saDate !== dateStr) continue

          expandToSlots(start, end).forEach((s) => busySet.add(s))
        }
      } catch (err: any) {
        console.error(`❌ iCal error for ${url}:`, err.message)
      }
    })
  )

  return Array.from(busySet)
}