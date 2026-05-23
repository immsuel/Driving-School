import { NextRequest, NextResponse } from "next/server"

const LOGO_B64 = "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"

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams

  const firstName    = sp.get("firstName")    ?? ""
  const lastName     = sp.get("lastName")     ?? ""
  const idNumber     = sp.get("idNumber")     ?? sp.get("phone") ?? "000000 0000 000"
  const vehicleType  = sp.get("vehicleType")  ?? "LIGHT MOTOR VEHICLE"
  const categoryCode = sp.get("categoryCode") ?? "08 (B) Auto"
  const certNumber   = sp.get("certNumber")   ?? "—"
  const director     = sp.get("director")     ?? "N PILLAY"
  const rawDate      = sp.get("date")         ?? new Date().toISOString().split("T")[0]

  const fullName  = `${firstName} ${lastName}`.trim() || "STUDENT NAME"
  const issueDate = formatDate(rawDate)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Certificate of Competence — ${esc(fullName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #c8c8c8; }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-height: 100vh;
      padding: 32px 16px 48px;
      font-family: 'Montserrat', sans-serif;
      gap: 20px;
    }

    .print-btn {
      background: #1a2d6b;
      color: #fff;
      border: none;
      padding: 11px 28px;
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 3px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.28);
      align-self: flex-end;
      margin-right: calc((100vw - 210mm) / 2 + 0px);
    }
    .print-btn:hover { background: #243d8e; }

    /* A4 portrait */
    .page {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 12mm;
      box-shadow: 0 4px 32px rgba(0,0,0,0.22);
    }

    /* Outer border */
    .cert-outer {
      width: 100%;
      border: 3.5px solid #1a2d6b;
      padding: 3px;
      display: flex;
      flex-direction: column;
    }

    /* Inner border */
    .cert-inner {
      flex: 1;
      border: 1px solid #1a2d6b;
      padding: 9mm 13mm 8mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      overflow: hidden;
    }

    /* Watermark diagonal lines */
    .cert-inner::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: repeating-linear-gradient(
        52deg,
        transparent,
        transparent 22px,
        rgba(26,45,107,0.055) 22px,
        rgba(26,45,107,0.055) 23px
      );
      pointer-events: none;
    }

    /* ── Logo ── */
    .logo {
      display: block;
      height: 68px;
      object-fit: contain;
      margin-bottom: 6mm;
      position: relative;
      z-index: 1;
    }

    /* ── Decorative rule ── */
    .rule {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 6mm;
      position: relative;
      z-index: 1;
    }
    .rule-line { flex: 1; height: 1.5px; background: #1a2d6b; }
    .rule-diamond {
      width: 8px; height: 8px;
      background: #1a2d6b;
      transform: rotate(45deg);
      margin: 0 6px;
      flex-shrink: 0;
    }

    /* ── Title ── */
    .cert-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 19.5pt;
      font-weight: 700;
      color: #1a2d6b;
      text-transform: uppercase;
      letter-spacing: 3px;
      text-align: center;
      margin-bottom: 7mm;
      position: relative;
      z-index: 1;
    }

    /* ── Intro ── */
    .cert-intro {
      font-family: 'EB Garamond', serif;
      font-size: 13pt;
      font-style: italic;
      color: #333;
      text-align: center;
      margin-bottom: 4.5mm;
      position: relative;
      z-index: 1;
    }

    /* ── Name ── */
    .cert-name {
      font-family: 'Montserrat', sans-serif;
      font-size: 20pt;
      font-weight: 700;
      color: #1a2d6b;
      text-align: center;
      letter-spacing: 1px;
      margin-bottom: 2.5mm;
      position: relative;
      z-index: 1;
    }

    /* ── ID ── */
    .cert-id {
      font-family: 'Montserrat', sans-serif;
      font-size: 17pt;
      font-weight: 700;
      color: #1a2d6b;
      text-align: center;
      letter-spacing: 2px;
      margin-bottom: 9mm;
      position: relative;
      z-index: 1;
    }

    /* ── Body ── */
    .cert-body {
      font-family: 'EB Garamond', serif;
      font-size: 13pt;
      font-style: italic;
      color: #222;
      text-align: center;
      line-height: 1.85;
      position: relative;
      z-index: 1;
      flex: 1;
    }
    .cert-body b {
      font-style: normal;
      font-weight: 600;
      font-size: 14.5pt;
      color: #1a2d6b;
      letter-spacing: 0.5px;
    }

    /* ── Second rule ── */
    .rule-2 {
      margin-top: 9mm;
      margin-bottom: 7mm;
    }

    /* ── Signatures ── */
    .sig-row {
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 0 8mm;
      position: relative;
      z-index: 1;
      margin-bottom: 7mm;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 110px;
    }
    .sig-line {
      width: 120px;
      height: 1px;
      background: #444;
      margin-bottom: 5px;
    }
    .sig-value {
      font-family: 'Montserrat', sans-serif;
      font-size: 8.5pt;
      font-weight: 700;
      color: #1a2d6b;
      text-align: center;
      margin-bottom: 2px;
    }
    .sig-caption {
      font-family: 'Montserrat', sans-serif;
      font-size: 7.5pt;
      font-weight: 500;
      color: #555;
      text-align: center;
      line-height: 1.4;
    }

    /* ── Footer ── */
    .cert-footer {
      width: 100%;
      border-top: 1px solid #bbb;
      padding-top: 3mm;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
      font-size: 6.5pt;
      color: #555;
      line-height: 1.85;
      position: relative;
      z-index: 1;
      letter-spacing: 0.02em;
    }

    @media print {
      html, body { background: #fff; padding: 0; gap: 0; }
      .print-btn { display: none; }
      .page { width: 100%; min-height: 100vh; padding: 10mm; box-shadow: none; }
      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">&#x238E; Print / Save PDF</button>

  <div class="page">
    <div class="cert-outer">
      <div class="cert-inner">

        <img class="logo" src="data:image/jpeg;base64,${LOGO_B64}" alt="DEES Driver Training Centre"/>

        <div class="rule">
          <div class="rule-line"></div>
          <div class="rule-diamond"></div>
          <div class="rule-line"></div>
        </div>

        <div class="cert-title">Certificate of Competence</div>

        <div class="cert-intro">This is to certify that</div>

        <div class="cert-name">${esc(fullName)}</div>
        <div class="cert-id">${esc(idNumber)}</div>

        <div class="cert-body">
          Has been assessed on a<br/>
          <b>${esc(vehicleType)}</b><br/>
          Category Code: ${esc(categoryCode)}
        </div>

        <div class="rule rule-2">
          <div class="rule-line"></div>
          <div class="rule-diamond"></div>
          <div class="rule-line"></div>
        </div>

        <div class="sig-row">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-value">${esc(certNumber)}</div>
            <div class="sig-caption">Certificate<br/>Number</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-value">${esc(director)}</div>
            <div class="sig-caption">Director</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-value">${esc(issueDate)}</div>
            <div class="sig-caption">Date</div>
          </div>
        </div>

        <div class="cert-footer">
          62 Botanic Gardens Road, Musgrave, Durban, 4001<br/>
          Telephone: (031) 2020202 &bull; Fax: (031) 2024818 &bull; Reg. No. 2002/078704/23<br/>
          Email: admin@deesdrivertraining.co.za &bull; Website: www.deesdrivertraining.co.za<br/>
          TETA Accreditation No. TETA06-126 &bull; Department of Transport Approval No. PrDP (D)2009/44
        </div>

      </div>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  })
}

function esc(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
}

function formatDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number)
    const months = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST",
                    "SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"]
    return `${d} ${months[m - 1]} ${y}`
  }
  return raw.toUpperCase()
}