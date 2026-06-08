import { NextRequest, NextResponse } from "next/server"

const BASE  = process.env.AIRTABLE_BASE_ID!
const TOKEN = process.env.AIRTABLE_API_KEY!
const TABLE = process.env.AIRTABLE_INSTRUCTORS_TABLE_ID ?? "Instructors"

const atHeaders = () => ({
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
})

// GET /api/instructors            → all instructors
// GET /api/instructors?id=recXXX  → single instructor

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")

    // Single record fetch
    if (id) {
      const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}/${id}`, {
        headers: atHeaders(),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json(data, { status: res.status })
      return NextResponse.json(data)
    }

    // Full table fetch (paginated)
    const records: unknown[] = []
    let offset: string | undefined

    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE}/${TABLE}`)
      url.searchParams.set("pageSize", "100")
      if (offset) url.searchParams.set("offset", offset)

      const res = await fetch(url.toString(), { headers: atHeaders() })
      if (!res.ok) {
        const body = await res.text()
        return NextResponse.json({ error: body }, { status: res.status })
      }
      const data = await res.json()
      records.push(...(data.records ?? []))
      offset = data.offset
    } while (offset)

    return NextResponse.json({ records })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, fields } = await req.json()
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}/${id}`, {
      method: "PATCH",
      headers: atHeaders(),
      body: JSON.stringify({ fields }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}