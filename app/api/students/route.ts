import { NextRequest, NextResponse } from "next/server"

const BASE  = process.env.AIRTABLE_BASE_ID!
const TOKEN = process.env.AIRTABLE_API_KEY!
const TABLE = process.env.AIRTABLE_STUDENTS_TABLE_ID ?? "Students"

const headers = () => ({
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
})

export async function GET() {
  try {
    const records: unknown[] = []
    let offset: string | undefined

    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE}/${TABLE}`)
      url.searchParams.set("pageSize", "100")
      if (offset) url.searchParams.set("offset", offset)

      const res = await fetch(url.toString(), { headers: headers() })
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
      headers: headers(),
      body: JSON.stringify({ fields }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}/${id}`, {
      method: "DELETE",
      headers: headers(),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}