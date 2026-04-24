// app/api/booking/route.ts
// Proxies booking payloads to Make so the webhook URL is never exposed client-side.
// Set MAKE_WEBHOOK_URL in your .env.local — it is only ever read server-side.

import { NextRequest, NextResponse } from "next/server"

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL

export async function POST(req: NextRequest) {
  if (!MAKE_WEBHOOK_URL) {
    console.error("MAKE_WEBHOOK_URL is not set")
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    // FIX: await the fetch so the webhook actually fires before the serverless
    // function freezes. Without await, the request is dropped on Vercel/Edge
    // even though it works fine on localhost (long-lived process).
    await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    // FIX: removed duplicate `return NextResponse.json({ ok: true })` which
    // was dead code and caused a TypeScript error in strict mode.
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      return NextResponse.json({ error: "Webhook timed out" }, { status: 504 })
    }
    console.error("Failed to reach Make webhook", err)
    return NextResponse.json({ error: "Network error" }, { status: 503 })
  }
}