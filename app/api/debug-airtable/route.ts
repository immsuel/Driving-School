import { NextResponse } from "next/server"

export async function GET() {
  const BASE  = process.env.TABLE_BASE_ID
  const TOKEN = process.env.AIRTABLE_API_KEY
  const S_TBL = process.env.AIRTABLE_STUDENTS_TABLE_ID ?? "Students"
  const SE_TBL = process.env.AIRTABLE_SESSIONS_TABLE_ID ?? "Sessions"

  const results: Record<string, unknown> = {
    env: {
      TABLE_BASE_ID: BASE ?? "(missing)",
      AIRTABLE_API_KEY: TOKEN ? `${TOKEN.slice(0, 8)}…` : "(missing)",
      AIRTABLE_STUDENTS_TABLE_ID: S_TBL,
      AIRTABLE_SESSIONS_TABLE_ID: SE_TBL,
    },
  }

  if (!BASE || !TOKEN) {
    return NextResponse.json({ error: "Missing env vars", ...results })
  }

  // Test 1: list bases (to confirm token works)
  try {
    const r = await fetch("https://api.airtable.com/v0/meta/bases", {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    const d = await r.json()
    results.meta_bases_status = r.status
    results.meta_bases = r.ok
      ? (d.bases ?? []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))
      : d
  } catch (e) {
    results.meta_bases_error = String(e)
  }

  // Test 2: fetch Students table
  try {
    const r = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(S_TBL)}?maxRecords=1`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    )
    const d = await r.json()
    results.students_status = r.status
    results.students_response = d
  } catch (e) {
    results.students_error = String(e)
  }

  // Test 3: fetch Sessions table
  try {
    const r = await fetch(
      `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(SE_TBL)}?maxRecords=1`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    )
    const d = await r.json()
    results.sessions_status = r.status
    results.sessions_response = d
  } catch (e) {
    results.sessions_error = String(e)
  }

  return NextResponse.json(results, { status: 200 })
}