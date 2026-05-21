import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const sp           = req.nextUrl.searchParams
  const firstName    = sp.get("firstName")    ?? ""
  const lastName     = sp.get("lastName")     ?? ""
  const packageName  = sp.get("package")      ?? "Driving Course"
  const lessons      = sp.get("lessons")      ?? ""
  const date         = sp.get("date")         ?? new Date().toISOString().split("T")[0]

  const fullName    = `${firstName} ${lastName}`.trim()
  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "numeric", month: "long", year: "numeric",
  })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Completion — ${fullName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;600&family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 297mm;
      height: 210mm;
      background: #fff;
    }

    body {
      font-family: 'Montserrat', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page {
      width: 297mm;
      height: 210mm;
      position: relative;
      background: #fff;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Decorative corner borders */
    .corner {
      position: absolute;
      width: 48px;
      height: 48px;
    }
    .corner--tl { top: 18mm; left: 18mm; border-top: 2px solid #1a1a2e; border-left: 2px solid #1a1a2e; }
    .corner--tr { top: 18mm; right: 18mm; border-top: 2px solid #1a1a2e; border-right: 2px solid #1a1a2e; }
    .corner--bl { bottom: 18mm; left: 18mm; border-bottom: 2px solid #1a1a2e; border-left: 2px solid #1a1a2e; }
    .corner--br { bottom: 18mm; right: 18mm; border-bottom: 2px solid #1a1a2e; border-right: 2px solid #1a1a2e; }

    /* Outer border */
    .border-outer {
      position: absolute;
      inset: 14mm;
      border: 1px solid #c9a84c;
    }
    .border-inner {
      position: absolute;
      inset: 16mm;
      border: 0.5px solid #c9a84c44;
    }

    /* Gold accent bar top */
    .accent-top {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 6px;
      background: linear-gradient(90deg, #c9a84c, #f0d080, #c9a84c);
    }
    .accent-bottom {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 6px;
      background: linear-gradient(90deg, #c9a84c, #f0d080, #c9a84c);
    }

    /* Subtle background pattern */
    .bg-pattern {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle at 1px 1px, #1a1a2e08 1px, transparent 0);
      background-size: 24px 24px;
    }

    /* Content */
    .content {
      position: relative;
      z-index: 10;
      text-align: center;
      padding: 0 28mm;
      width: 100%;
    }

    .school-name {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #c9a84c;
      margin-bottom: 6px;
    }

    .cert-label {
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #1a1a2e99;
      margin-bottom: 8px;
    }

    .divider {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .divider-line {
      height: 1px;
      width: 60px;
      background: linear-gradient(90deg, transparent, #c9a84c, transparent);
    }
    .divider-diamond {
      width: 6px;
      height: 6px;
      background: #c9a84c;
      transform: rotate(45deg);
    }

    .presented-to {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      font-weight: 300;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #1a1a2e88;
      margin-bottom: 8px;
    }

    .student-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 44px;
      font-weight: 600;
      font-style: italic;
      color: #1a1a2e;
      line-height: 1.1;
      margin-bottom: 10px;
      letter-spacing: -0.5px;
    }

    .body-text {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      font-weight: 300;
      color: #1a1a2e99;
      letter-spacing: 0.05em;
      line-height: 1.7;
      margin-bottom: 6px;
    }

    .course-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: 0.02em;
      margin-bottom: 4px;
    }

    .lessons-text {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 8px;
      color: #c9a84c;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    /* Footer */
    .footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 14px;
      padding: 0 4mm;
    }

    .sig-block {
      text-align: center;
      min-width: 120px;
    }
    .sig-line {
      height: 1px;
      background: #1a1a2e33;
      margin-bottom: 5px;
    }
    .sig-label {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 7px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #1a1a2e66;
    }

    .seal {
      width: 52px;
      height: 52px;
      border: 2px solid #c9a84c;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .seal::before {
      content: '';
      position: absolute;
      inset: 4px;
      border: 1px solid #c9a84c88;
      border-radius: 50%;
    }
    .seal-text {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 5.5px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #c9a84c;
      text-align: center;
      line-height: 1.4;
      position: relative;
      z-index: 1;
    }

    @media print {
      html, body { width: 297mm; height: 210mm; }
      .no-print { display: none !important; }
      @page { size: A4 landscape; margin: 0; }
    }

    /* Print button */
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1a1a2e;
      color: #c9a84c;
      border: none;
      padding: 12px 24px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 4px;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .print-btn:hover { background: #2a2a4e; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">⎙ Print / Save PDF</button>

  <div class="page">
    <div class="bg-pattern"></div>
    <div class="accent-top"></div>
    <div class="accent-bottom"></div>
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <div class="corner corner--tl"></div>
    <div class="corner corner--tr"></div>
    <div class="corner corner--bl"></div>
    <div class="corner corner--br"></div>

    <div class="content">
      <p class="school-name">Dees Driver Training</p>
      <p class="cert-label">Certificate of Completion</p>

      <div class="divider">
        <div class="divider-line"></div>
        <div class="divider-diamond"></div>
        <div class="divider-line"></div>
      </div>

      <p class="presented-to">This is to certify that</p>
      <h1 class="student-name">${fullName}</h1>

      <p class="body-text">has successfully completed all required training hours and demonstrated competence in</p>
      <p class="course-name">${packageName}</p>
      ${lessons ? `<p class="lessons-text">${lessons} lesson${Number(lessons) !== 1 ? "s" : ""} completed</p>` : '<div style="margin-bottom:16px"></div>'}

      <div class="footer">
        <div class="sig-block" style="min-width:140px">
          <div class="sig-line"></div>
          <div class="sig-label">Instructor Signature</div>
        </div>

        <div class="seal">
          <div class="seal-text">DEES<br/>DRIVER<br/>TRAINING</div>
        </div>

        <div class="sig-block" style="min-width:140px">
          <div class="sig-line" style="height:1px;background:#1a1a2e33;margin-bottom:5px"></div>
          <div class="sig-label">${displayDate}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}