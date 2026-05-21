import { NextRequest, NextResponse } from "next/server"

const BASE  = process.env.TABLE_BASE_ID!
const TOKEN = process.env.AIRTABLE_API_KEY!
const TABLE = process.env.AIRTABLE_SESSIONS_TABLE_ID ?? "Sessions"

const atHeaders = () => ({
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
})

// GET /api/sessions?studentName=John+Doe
// PATCH /api/sessions  { id, fields }
// POST  /api/sessions  { fields }
// DELETE /api/sessions?id=recXXXX

export async function GET(req: NextRequest) {
  try {
    const studentName = req.nextUrl.searchParams.get("studentName")
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${TABLE}`)
    url.searchParams.set("pageSize", "100")
    if (studentName) {
      url.searchParams.set("filterByFormula", `{Student Name} = "${studentName}"`)
    }

    const res = await fetch(url.toString(), { headers: atHeaders() })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fields } = await req.json()
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}`, {
      method: "POST",
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

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}/${id}`, {
      method: "DELETE",
      headers: atHeaders(),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}