"""
Generate a clean PDF from comparison_report.html using Playwright/Chromium.
- Removes sidebar, fixes layout for A4 print
- Forces light theme
- Opens all accordion <details> sections
- Properly renders SVG diagrams, tables and embedded charts
"""

import asyncio
import pathlib
from playwright.async_api import async_playwright


PDF_CSS = """
/* ── 1. Force light theme ─────────────────────────────────────────────── */
:root {
  --fg:           #1a1a1a !important;
  --fg2:          #2c2c2c !important;
  --fg3:          #4a4a4a !important;
  --muted:        #666666 !important;
  --bg:           #ffffff !important;
  --bg2:          #f8f9fa !important;
  --bg3:          #eef0f4 !important;
  --border:       #d0d5dd !important;
  --accent:       #1a56db !important;
  --accent2:      #1e3a8a !important;
  --accent-light: #e8f0fe !important;
  --pill-bg:      #e8f0fe !important;
  --pill-fg:      #1a56db !important;
  --green:        #166534 !important;
  --green-bg:     #dcfce7 !important;
  --red:          #991b1b !important;
  --red-bg:       #fee2e2 !important;
  --card-shadow:  0 1px 4px rgba(0,0,0,.10) !important;
  color-scheme:   light !important;
}

/* ── 2. Remove sidebar + fixed UI elements ────────────────────────────── */
nav.sidebar-toc,
#top-btn,
#theme-btn { display: none !important; }

/* ── 3. Main content: full width, no left margin ──────────────────────── */
main {
  margin-left: 0 !important;
  padding: 24px 48px 48px !important;
  max-width: 100% !important;
}

body {
  background: #ffffff !important;
  color: #1a1a1a !important;
  font-family: 'Segoe UI', Arial, sans-serif !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
}

/* ── 4. Page break control ────────────────────────────────────────────── */
section {
  page-break-before: always !important;
  break-before: page !important;
}
section:first-of-type {
  page-break-before: avoid !important;
  break-before: avoid !important;
}
h2 {
  page-break-after: avoid !important;
  break-after: avoid !important;
}
table, figure, .diagram, img, .stat-card {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}

/* ── 5. Open all <details> accordions ────────────────────────────────── */
details.bucket {
  display: block !important;
}
details.bucket > *:not(summary) {
  display: block !important;
}
details.bucket summary::before {
  content: "▾" !important;
}

/* ── 6. Charts / images: constrain to page width ─────────────────────── */
img {
  max-width: 100% !important;
  height: auto !important;
  display: block !important;
  margin: 12px auto !important;
}

/* ── 7. SVG diagrams: full width ─────────────────────────────────────── */
svg.diagram {
  max-width: 100% !important;
  height: auto !important;
  display: block !important;
  margin: 12px auto !important;
  overflow: visible !important;
}

/* ── 8. Tables ────────────────────────────────────────────────────────── */
table {
  width: 100% !important;
  border-collapse: collapse !important;
  font-size: 12px !important;
  margin: 12px 0 !important;
  background: #ffffff !important;
}
th {
  background: #1e3a8a !important;
  color: #ffffff !important;
  padding: 8px 10px !important;
  text-align: left !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
}
td {
  padding: 7px 10px !important;
  border-bottom: 1px solid #d0d5dd !important;
  color: #1a1a1a !important;
  vertical-align: top !important;
}
tr:nth-child(even) td {
  background: #f4f6f9 !important;
}
tr:nth-child(odd) td {
  background: #ffffff !important;
}
.num { text-align: right !important; font-variant-numeric: tabular-nums !important; }

/* ── 9. KPI stat cards ────────────────────────────────────────────────── */
.kpi-grid {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 12px !important;
  margin: 16px 0 !important;
}
.stat-card {
  background: #f8f9fa !important;
  border: 1px solid #d0d5dd !important;
  border-radius: 8px !important;
  padding: 14px 16px !important;
  box-shadow: 0 1px 4px rgba(0,0,0,.08) !important;
}
.stat-value {
  font-size: 22px !important;
  font-weight: 700 !important;
  color: #1a56db !important;
  line-height: 1.2 !important;
}
.stat-label {
  font-size: 11px !important;
  color: #666666 !important;
  margin-top: 4px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
}

/* ── 10. Section headings ─────────────────────────────────────────────── */
h1 {
  font-size: 22px !important;
  font-weight: 700 !important;
  color: #1a1a1a !important;
  margin-bottom: 4px !important;
}
h2 {
  font-size: 17px !important;
  font-weight: 700 !important;
  color: #1a1a1a !important;
  border-bottom: 2px solid #1a56db !important;
  padding-bottom: 6px !important;
  margin: 0 0 16px !important;
}
h3 {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #1e3a8a !important;
  margin: 14px 0 6px !important;
}

/* ── 11. Code blocks ──────────────────────────────────────────────────── */
code, pre {
  font-family: 'Consolas', 'Courier New', monospace !important;
  font-size: 11px !important;
  background: #f1f3f5 !important;
  color: #1e3a8a !important;
  border-radius: 3px !important;
  padding: 1px 4px !important;
}
pre {
  padding: 10px 14px !important;
  overflow: visible !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  border: 1px solid #d0d5dd !important;
}

/* ── 12. Pills / badges ───────────────────────────────────────────────── */
.pill {
  background: #e8f0fe !important;
  color: #1a56db !important;
  font-size: 11px !important;
  padding: 2px 8px !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
}

/* ── 13. Rank badge colors ────────────────────────────────────────────── */
.rank-1 { background: #166534 !important; color: #fff !important; }
.rank-2 { background: #1e3a8a !important; color: #fff !important; }
.rank-3 { background: #991b1b !important; color: #fff !important; }

/* ── 14. Callout / info boxes ─────────────────────────────────────────── */
.callout, .info-box, blockquote {
  background: #e8f0fe !important;
  border-left: 4px solid #1a56db !important;
  color: #1a1a1a !important;
  padding: 10px 14px !important;
  margin: 12px 0 !important;
  border-radius: 0 6px 6px 0 !important;
}

/* ── 15. Inline TOC (keep if present) ────────────────────────────────── */
.inline-toc {
  background: #f8f9fa !important;
  border: 1px solid #d0d5dd !important;
  border-radius: 8px !important;
  padding: 12px 16px !important;
  margin-bottom: 20px !important;
}

/* ── 16. Meta / subtitle text ─────────────────────────────────────────── */
.meta, .subtitle {
  color: #666666 !important;
  font-size: 12px !important;
}

/* ── 17. Accordion details borders ────────────────────────────────────── */
details.bucket {
  border: 1px solid #d0d5dd !important;
  border-radius: 8px !important;
  padding: 12px 16px !important;
  margin: 12px 0 !important;
  background: #ffffff !important;
  page-break-inside: avoid !important;
}
details.bucket summary {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #1a1a1a !important;
  margin-bottom: 10px !important;
  list-style: none !important;
}

/* ── 18. Print-specific overrides ─────────────────────────────────────── */
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
"""


async def generate_pdf():
    html_path = pathlib.Path("/home/priydutt/Diversifi/Model_Comparison/comparison_report.html").resolve()
    pdf_path  = pathlib.Path("/home/priydutt/Diversifi/Model_Comparison/comparison_report.pdf").resolve()

    print(f"Source: {html_path}")
    print(f"Output: {pdf_path}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1200, "height": 900})

        await page.goto(f"file://{html_path}", wait_until="networkidle")

        # Inject PDF-optimised CSS
        await page.add_style_tag(content=PDF_CSS)

        # Open ALL <details> accordion elements
        await page.evaluate("""
            document.querySelectorAll('details').forEach(el => {
                el.setAttribute('open', '');
                el.open = true;
            });
        """)

        # Wait for fonts and images to settle
        await page.wait_for_timeout(1500)

        await page.pdf(
            path=str(pdf_path),
            format="A4",
            print_background=True,
            margin={"top": "18mm", "bottom": "18mm", "left": "16mm", "right": "16mm"},
            display_header_footer=True,
            header_template="""
                <div style="font-size:9px;color:#888;width:100%;text-align:center;font-family:Arial,sans-serif;">
                    Tesla Stock Prediction - Model Comparison Report
                </div>""",
            footer_template="""
                <div style="font-size:9px;color:#888;width:100%;text-align:center;font-family:Arial,sans-serif;">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                    &nbsp;·&nbsp; Diversifi · <span class="date"></span>
                </div>""",
        )

        await browser.close()

    size_kb = pdf_path.stat().st_size // 1024
    print(f"\nPDF saved: {pdf_path}  ({size_kb} KB)")


if __name__ == "__main__":
    asyncio.run(generate_pdf())
