"""
agent_email.py - Generates and sends the daily portfolio report email.

Uses SMTP (Gmail app password) via environment variables:
  AGENT_SMTP_EMAIL    - sender Gmail address
  AGENT_SMTP_PASSWORD - Gmail app password (not account password)
"""

import os
import smtplib
import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

SMTP_EMAIL    = os.getenv("AGENT_SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("AGENT_SMTP_PASSWORD", "")
SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 587
APP_URL       = os.getenv("APP_URL", "http://localhost:5173")


def _color_pnl(val: float) -> str:
    return "#16a34a" if val >= 0 else "#dc2626"


def _sign(val: float) -> str:
    return f"+{val:.1f}" if val >= 0 else f"{val:.1f}"


def _build_html(email: str, user: dict) -> str:
    name       = user.get("name", email.split("@")[0])
    profile    = user.get("profile", {})
    agent_st   = user.get("agentState", {})
    holdings   = user.get("holdings", {})
    stocks     = holdings.get("stocks", [])
    mfs        = holdings.get("mutualFunds", [])
    prices     = agent_st.get("lastPrices", {})

    verdict        = agent_st.get("verdict", "All Good")
    verdict_reason = agent_st.get("verdictReason", "")
    summary        = agent_st.get("overallSummary", "")
    top_alerts     = agent_st.get("topAlerts", [])
    last_checked   = agent_st.get("lastChecked", "")

    verdict_colors = {
        "All Good":        ("#166534", "#dcfce7"),
        "Caution":         ("#92400e", "#fef3c7"),
        "Immediate Action":("#991b1b", "#fee2e2"),
    }
    txt_c, bg_c = verdict_colors.get(verdict, ("#166534", "#dcfce7"))

    total_invested = sum(float(s.get("avgBuyPrice", 0)) * float(s.get("qty", 0)) for s in stocks) + \
                     sum(float(m.get("investedAmount", 0)) for m in mfs)
    total_current  = sum(float(s.get("currentValue", 0)) for s in stocks) + \
                     sum(float(m.get("currentValue", 0)) for m in mfs)
    pnl            = total_current - total_invested
    pnl_pct        = (pnl / total_invested * 100) if total_invested > 0 else 0

    # Holdings rows
    stock_rows = ""
    for s in stocks[:8]:
        sym  = s.get("symbol", "")
        nm   = s.get("name", sym)
        cv   = float(s.get("currentValue", 0))
        cost = float(s.get("avgBuyPrice", 0)) * float(s.get("qty", 0))
        chg  = prices.get(sym, {}).get("change_pct")
        spnl = cv - cost
        stock_rows += f"""
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">
            <span style="background:#eff6ff;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">EQ</span>
            &nbsp;{nm[:28]}
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹{cv:,.0f}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:{_color_pnl(spnl)};">{_sign(spnl)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:{_color_pnl(chg or 0)};">{_sign(chg or 0)}%</td>
        </tr>"""

    mf_rows = ""
    for m in mfs[:5]:
        nm      = m.get("fundName", m.get("name", "MF"))
        cv      = float(m.get("currentValue", 0))
        invested = float(m.get("investedAmount", 0))
        mpnl    = cv - invested
        mf_rows += f"""
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">
            <span style="background:#f0fdf4;color:#15803d;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">MF</span>
            &nbsp;{nm[:28]}
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹{cv:,.0f}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:{_color_pnl(mpnl)};">{_sign(mpnl)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">—</td>
        </tr>"""

    # Alert rows
    alert_rows = ""
    for a in top_alerts[:3]:
        alert_rows += f"""
        <tr>
          <td style="padding:8px;border-left:3px solid #f59e0b;background:#fffbeb;margin-bottom:4px;">
            <strong>{a.get('holding', '')}</strong>: {a.get('issue', '')}<br>
            <span style="color:#6b7280;font-size:12px;">→ {a.get('action', '')}</span>
          </td>
        </tr>"""

    today = datetime.date.today().strftime("%d %B %Y")

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px 32px;">
    <div style="color:#94a3b8;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Diversifi Portfolio Agent</div>
    <div style="color:#fff;font-size:22px;font-weight:700;margin-top:4px;">Daily Portfolio Report</div>
    <div style="color:#64748b;font-size:13px;margin-top:4px;">{today}</div>
  </div>

  <!-- Greeting -->
  <div style="padding:24px 32px 0;">
    <p style="color:#374151;font-size:15px;margin:0;">Hi {name},</p>
    <p style="color:#6b7280;font-size:14px;margin:8px 0 0;">
      Your portfolio agent ran its end-of-day analysis. Here's the summary.
    </p>
  </div>

  <!-- Verdict -->
  <div style="padding:16px 32px;">
    <div style="background:{bg_c};border-radius:8px;padding:16px;">
      <div style="font-size:18px;font-weight:700;color:{txt_c};">{verdict}</div>
      <div style="font-size:13px;color:{txt_c};margin-top:4px;opacity:0.85;">{verdict_reason}</div>
      {"<p style='font-size:13px;color:#374151;margin:8px 0 0;'>" + summary + "</p>" if summary else ""}
    </div>
  </div>

  <!-- Portfolio snapshot -->
  <div style="padding:0 32px 16px;">
    <div style="display:flex;gap:12px;">
      <div style="flex:1;background:#f8fafc;border-radius:8px;padding:14px;">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Portfolio Value</div>
        <div style="font-size:20px;font-weight:700;color:#0f172a;margin-top:4px;">₹{total_current:,.0f}</div>
      </div>
      <div style="flex:1;background:#f8fafc;border-radius:8px;padding:14px;">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Total P&amp;L</div>
        <div style="font-size:20px;font-weight:700;color:{_color_pnl(pnl)};margin-top:4px;">{_sign(pnl)} ({_sign(pnl_pct)}%)</div>
      </div>
    </div>
  </div>

  <!-- Alerts -->
  {"<div style='padding:0 32px 16px;'><div style='font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;'>⚠️ Today's Alerts</div><table style='width:100%;border-collapse:collapse;'>" + alert_rows + "</table></div>" if alert_rows else ""}

  <!-- Holdings table -->
  <div style="padding:0 32px 24px;">
    <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">Holdings Performance</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px;text-align:left;color:#6b7280;font-weight:600;">Holding</th>
          <th style="padding:8px;text-align:right;color:#6b7280;font-weight:600;">Value</th>
          <th style="padding:8px;text-align:right;color:#6b7280;font-weight:600;">P&amp;L</th>
          <th style="padding:8px;text-align:right;color:#6b7280;font-weight:600;">1D</th>
        </tr>
      </thead>
      <tbody>
        {stock_rows}
        {mf_rows}
      </tbody>
    </table>
  </div>

  <!-- CTA -->
  <div style="padding:0 32px 32px;text-align:center;">
    <a href="{APP_URL}/agent" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">View Live Dashboard →</a>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">
      Diversifi Portfolio Agent • Auto-generated at market close<br>
      Last analysed: {last_checked[:19] if last_checked else 'N/A'}
    </p>
  </div>
</div>
</body>
</html>"""


def send_report(to_email: str, user: dict) -> None:
    """Send the daily report email to `to_email`."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise RuntimeError("AGENT_SMTP_EMAIL / AGENT_SMTP_PASSWORD not set in .env")

    html = _build_html(to_email, user)
    today = datetime.date.today().strftime("%d %b %Y")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📊 Your Portfolio Report - {today}"
    msg["From"]    = f"Diversifi Agent <{SMTP_EMAIL}>"
    msg["To"]      = to_email

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

    # record send time
    import json, os
    from agent_service import _load_index, _load_user, _save_user, DATA_DIR
    index = _load_index()
    if to_email in index and index[to_email].get("isDataPresent"):
        df   = index[to_email]["dataFile"]
        udat = _load_user(df)
        if udat:
            import datetime as dt
            udat.setdefault("agentState", {})["lastReportSentAt"] = dt.datetime.now().isoformat()
            _save_user(df, udat)
