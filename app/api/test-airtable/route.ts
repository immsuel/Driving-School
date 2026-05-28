export async function GET() {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_INSTRUCTORS_TABLE_ID}`
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    cache: "no-store",
  })

  const data = await res.json()
  return Response.json({ status: res.status, data, env: {
    base: process.env.AIRTABLE_BASE_ID,
    table: process.env.AIRTABLE_INSTRUCTORS_TABLE_ID,
    keyPrefix: process.env.AIRTABLE_API_KEY?.slice(0, 10),
  }})
}