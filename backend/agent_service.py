"""
agent_service.py - Autonomous Portfolio Agent.

Background loop (every 5 min) per active user:
  1. Fetches live stock prices via yfinance
  2. Fetches news + TextBlob sentiment for top 5 holdings by value
  3. Computes per-holding 1D change + rolling trend (3-run window)
  4. Identifies IMMEDIATE_ACTION / CAUTION / GOOD alerts
  5. Synthesises verdict via Claude
  6. Appends to activityLog (capped at 50 entries)
  7. Pushes SSE events to connected frontend clients
  8. Auto-sends email report at market close (15:35 IST)
"""

import json
import os
import queue
import threading
import datetime
import time
import math
import concurrent.futures
from typing import Optional

import yfinance as yf
from textblob import TextBlob

HOLDINGS_FILE = os.path.join(os.path.dirname(__file__), "holdings.json")
DATA_DIR      = os.path.dirname(__file__)
ANALYSIS_INTERVAL = 120          # seconds between runs (2 min)
MAX_ACTIVITY_LOG  = 50
MARKET_CLOSE_HOUR = 15           # 3 PM IST
MARKET_CLOSE_MIN  = 35           # 3:35 PM IST

_timer:      Optional[threading.Timer] = None
_lock        = threading.Lock()
_running     = False

# email -> list of queue.Queue (one per SSE connection)
_sse_queues: dict[str, list[queue.Queue]] = {}


# ─────────────────────────────────────────────────────────────────────────────
# File helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_index() -> dict:
    with open(HOLDINGS_FILE) as f:
        return json.load(f)


def _save_index(data: dict) -> None:
    with open(HOLDINGS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _load_user(data_file: str) -> Optional[dict]:
    path = os.path.join(DATA_DIR, data_file)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def _save_user(data_file: str, data: dict) -> None:
    path = os.path.join(DATA_DIR, data_file)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ─────────────────────────────────────────────────────────────────────────────
# SSE helpers
# ─────────────────────────────────────────────────────────────────────────────

def subscribe_sse(email: str) -> "queue.Queue":
    q: queue.Queue = queue.Queue()
    with _lock:
        _sse_queues.setdefault(email, []).append(q)
    return q


def unsubscribe_sse(email: str, q: "queue.Queue") -> None:
    with _lock:
        if email in _sse_queues:
            _sse_queues[email] = [x for x in _sse_queues[email] if x is not q]


def _push(email: str, event: dict) -> None:
    with _lock:
        queues = list(_sse_queues.get(email, []))
    for q in queues:
        try:
            q.put_nowait(event)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Live price fetch
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_prices(symbols: list[str]) -> dict[str, dict]:
    """Returns {symbol: {price, prev_close, change_pct}} for .NS stocks."""
    result = {}

    def _one(sym: str):
        ns = sym.strip().upper() + ".NS"
        try:
            t   = yf.Ticker(ns)
            fi  = t.fast_info
            price = fi.last_price
            prev  = fi.previous_close
            if not price:
                h = t.history(period="2d", interval="1d")
                if not h.empty:
                    price = float(h["Close"].iloc[-1])
                    prev  = float(h["Close"].iloc[-2]) if len(h) >= 2 else price
            price = float(price or 0)
            prev  = float(prev or price)
            chg   = round((price - prev) / prev * 100, 2) if prev else 0.0
            return sym, {"price": round(price, 2), "prev_close": round(prev, 2), "change_pct": chg}
        except Exception:
            return sym, None

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        for sym, data in ex.map(_one, symbols):
            if data:
                result[sym] = data
    return result


# ─────────────────────────────────────────────────────────────────────────────
# News + sentiment
# ─────────────────────────────────────────────────────────────────────────────

def _news_sentiment(symbol: str) -> dict:
    """Returns {label, score, headlines[]} for a stock symbol."""
    try:
        ns   = symbol.strip().upper() + ".NS"
        news = yf.Ticker(ns).news or []
        headlines = [n.get("content", {}).get("title", "") or n.get("title", "") for n in news[:8]]
        headlines = [h for h in headlines if h]
        if not headlines:
            return {"label": "Neutral", "score": 0.0, "headlines": []}
        scores = [TextBlob(h).sentiment.polarity for h in headlines]
        avg    = sum(scores) / len(scores)
        label  = "Bullish" if avg > 0.1 else ("Bearish" if avg < -0.1 else "Neutral")
        return {"label": label, "score": round(avg, 3), "headlines": headlines[:3]}
    except Exception:
        return {"label": "Neutral", "score": 0.0, "headlines": []}


# ─────────────────────────────────────────────────────────────────────────────
# Alert logic
# ─────────────────────────────────────────────────────────────────────────────

def _compute_alerts(holdings_with_prices: list[dict], prev_alerts: list[dict],
                    profile: dict | None = None) -> tuple[list[dict], list[dict]]:
    """Returns (immediate_alerts, caution_alerts) using horizon-aware thresholds.

    Long-term investors (horizon contains 'long', 'retire', or ≥10-year keywords):
      - Caution:   single-day ≤ -8%  OR  ≥5 consecutive down days
      - Immediate: single-day ≤ -15% OR  ≥10 consecutive down days
    Short/medium-term:
      - Caution:   single-day ≤ -3%  OR  ≥2 consecutive down days
      - Immediate: single-day ≤ -8%  OR  ≥4 consecutive down days
    """
    import re as _re
    immediate, caution = [], []
    horizon = str((profile or {}).get("horizon") or "")
    m = _re.search(r"(\d+)", horizon)
    horizon_years = int(m.group(1)) if m else (10 if "long" in horizon.lower() else 5)
    long_term = horizon_years >= 7

    if long_term:
        imm_day, imm_trend = -15, 10
        cau_day, cau_trend = -8,  5
    else:
        imm_day, imm_trend = -8,  4
        cau_day, cau_trend = -3,  2

    for h in holdings_with_prices:
        sym   = h.get("symbol", "")
        chg   = h.get("change_pct")
        if chg is None:
            continue
        trend = h.get("trend_down_count", 0)

        base = {"symbol": sym, "name": h.get("name", sym), "is_mf": h.get("is_mf", False),
                "change_pct": chg, "current_value": h.get("current_value", 0)}

        if chg <= imm_day or (trend >= imm_trend and chg < 0):
            if chg <= imm_day:
                issue = f"Down {abs(chg):.1f}% today - sharp single-day decline"
            else:
                issue = f"{trend} consecutive down days - sustained decline trend"
            immediate.append({**base, "issue": issue,
                               "action": f"Review {sym} position. Consider stop-loss or partial exit."})
        elif chg <= cau_day or (trend >= cau_trend and chg < 0):
            if chg <= cau_day:
                issue = f"Down {abs(chg):.1f}% today"
            else:
                issue = f"{trend} consecutive down days - watch for continued weakness"
            caution.append({**base, "issue": issue,
                            "action": f"Monitor {sym} closely and check for adverse news."})

    return immediate, caution


# ─────────────────────────────────────────────────────────────────────────────
# Claude verdict
# ─────────────────────────────────────────────────────────────────────────────

def _claude_verdict(user_data: dict, immediate: list, caution: list, prices: dict,
                    emit_fn=None) -> dict:
    """Returns {verdict, verdictReason, topAlerts, overallSummary}. SDK timeout 45 s."""
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv())
    import anthropic, os

    api_key  = os.getenv("ANTHROPIC_API_KEY", "")
    resource = os.getenv("ANTHROPIC_FOUNDRY_RESOURCE", "")
    # Pass timeout at SDK level - this is the correct way to cap wall-clock time.
    # ThreadPoolExecutor.as_context_manager waits for threads on exit, defeating timeouts.
    if resource:
        client = anthropic.AnthropicFoundry(api_key=api_key, resource=resource, timeout=45.0)
    else:
        client = anthropic.Anthropic(api_key=api_key, timeout=45.0)

    import re as _re

    profile  = user_data.get("profile", {})
    holdings = user_data.get("holdings", {})
    stocks   = holdings.get("stocks", [])
    mfs      = holdings.get("mutualFunds", [])
    total_cv = sum(float(s.get("currentValue") or 0) for s in stocks) + \
               sum(float(m.get("currentValue") or 0) for m in mfs)

    # ── All onboarding fields, with safe fallbacks ───────────────────────────
    horizon       = profile.get("horizon") or "long term"
    risk_appetite = profile.get("riskAppetite") or "Moderate"
    goals         = profile.get("goals") or ["wealth creation"]
    inv_style     = profile.get("investmentStyle") or "SIP"
    monthly_inv   = profile.get("monthlyInvestment") or 0
    focus_sectors = profile.get("focusSectors") or []
    avoid_sectors = profile.get("avoidSectors") or []

    # Parse horizon into years for calibrated advice
    m = _re.search(r"(\d+)", horizon)
    horizon_years = int(m.group(1)) if m else (10 if "long" in horizon.lower() else 5)
    is_long_term  = horizon_years >= 7

    price_lines = "\n".join(
        f"  {sym}: ₹{d['price']} ({'+' if d['change_pct']>=0 else ''}{d['change_pct']}%)"
        for sym, d in list(prices.items())[:10]
    ) or "  (no live prices available)"

    # Sector preference notes
    sector_lines = ""
    if focus_sectors:
        sector_lines += f"\n- Preferred sectors: {', '.join(focus_sectors)}"
    if avoid_sectors:
        sector_lines += f"\n- Sectors to avoid: {', '.join(avoid_sectors)}"
        avoid_lower = {s.lower() for s in avoid_sectors}
        avoid_hits  = [s["symbol"] for s in stocks
                       if any(av in (s.get("sector") or "").lower() for av in avoid_lower)]
        if avoid_hits:
            sector_lines += f" (holdings possibly in avoided sectors: {', '.join(avoid_hits)})"

    sip_gap = (
        "\n  ⚠ Investment style is SIP but no monthly amount is recorded."
        if "sip" in inv_style.lower() and monthly_inv == 0 else ""
    )

    # Horizon-calibrated instruction
    if is_long_term:
        patience_note = (
            f"\nIMPORTANT - LONG-TERM INVESTOR ({horizon_years}-year horizon for {', '.join(goals)}): "
            "Daily price moves < 10% are market noise. Do NOT use 'Immediate Action' for them. "
            f"Reserve 'Immediate Action' for: single-day drops > 15%, or {max(8, horizon_years//2)}+ "
            "consecutive down days. Frame every recommendation around the long-term goal."
        )
    else:
        patience_note = (
            f"\nHorizon is {horizon_years} years. Use standard thresholds: "
            "flag > 8% drops as Immediate Action, > 3% or 2+ down days as Caution."
        )

    prompt = f"""You are a concise Indian portfolio advisor AI acting autonomously on behalf of the investor. Analyse this portfolio and respond with JSON only.{patience_note}

TONE RULE: Write as the agent reporting what it observes or is doing - never instruct the investor. Use declarative language ("is being monitored", "has been flagged", "the agent will escalate if...") not imperative ("monitor this", "consider selling", "check the news", "review position"). The investor is not expected to take any action.

Investor profile (captured at onboarding):
- Risk appetite: {risk_appetite}
- Goal(s): {', '.join(goals)}
- Horizon: {horizon} ({horizon_years} years)
- Investment style: {inv_style} - monthly: ₹{monthly_inv:,}{sip_gap}{sector_lines}

Portfolio:
- {len(stocks)} equity holdings, {len(mfs)} mutual funds
- Total value: ₹{total_cv:,.0f}
- Live prices today:
{price_lines}

Rule-based alerts (review in context of the investor's profile):
  Immediate ({len(immediate)}): {[a['symbol'] + ': ' + a['issue'] for a in immediate] or 'none'}
  Caution   ({len(caution)}):   {[a['symbol'] + ': ' + a['issue'] for a in caution] or 'none'}

Respond with ONLY this JSON (no markdown):
{{
  "verdict": "All Good" | "Caution" | "Immediate Action",
  "verdictReason": "one sentence - reference the specific goal and horizon",
  "overallSummary": "2-3 sentences: today's portfolio moves, overall health, one forward-looking insight tied to the goal",
  "topAlerts": [
    {{"holding": "symbol or 'Portfolio'", "issue": "specific issue", "action": "what the agent is doing or will do - e.g. 'Being monitored for further weakness', 'Will escalate if decline continues past X days'"}}
  ]
}}"""

    def _fallback():
        if immediate:
            v, r = "Immediate Action", f"{len(immediate)} holding(s) showing significant decline."
        elif caution:
            v, r = "Caution", f"{len(caution)} holding(s) worth monitoring closely."
        else:
            v, r = "All Good", "All holdings within normal range for this market session."
        return {"verdict": v, "verdictReason": r, "overallSummary": r,
                "topAlerts": (immediate + caution)[:3]}

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        err_msg = f"{type(e).__name__}: {str(e)[:120]}"
        print(f"[agent] claude_verdict error: {err_msg}")
        if emit_fn:
            emit_fn("⚠️", f"AI error: {err_msg}", "warn")
        return _fallback()


# ─────────────────────────────────────────────────────────────────────────────
# Activity log helpers
# ─────────────────────────────────────────────────────────────────────────────

def _ts() -> str:
    return datetime.datetime.now().strftime("%H:%M:%S")


def _log_entry(icon: str, message: str, level: str = "info") -> dict:
    return {"timestamp": _ts(), "icon": icon, "message": message, "level": level}


# ─────────────────────────────────────────────────────────────────────────────
# Core analysis run for one user
# ─────────────────────────────────────────────────────────────────────────────

def _analyse_user(email: str, data_file: str) -> None:
    user = _load_user(data_file)
    if not user:
        return

    holdings  = user.get("holdings", {})
    stocks    = holdings.get("stocks", [])
    mfs       = holdings.get("mutualFunds", [])
    agent_st  = user.setdefault("agentState", {})
    act_log   = agent_st.setdefault("activityLog", [])

    # Initialise all outputs - always persisted even on partial failure
    activity:    list[dict] = []
    prices:      dict       = {}
    news_map:    dict       = {}
    trend_state: dict       = agent_st.get("trendState", {})
    immediate:   list       = []
    caution:     list       = []
    verdict      = agent_st.get("verdict", "All Good")
    verdict_data: dict = {
        "verdict": verdict,
        "verdictReason": agent_st.get("verdictReason", ""),
        "overallSummary": agent_st.get("overallSummary", ""),
        "topAlerts": agent_st.get("topAlerts", []),
    }

    def _emit(icon, msg, level="info"):
        entry = _log_entry(icon, msg, level)
        activity.append(entry)
        _push(email, {"type": "activity_log", "entry": entry})

    _push(email, {"type": "analysis_start"})
    _emit("🔄", "Starting portfolio analysis…")

    try:
        # ── 1. Live prices ──────────────────────────────────────────────────
        stock_syms = [s["symbol"] for s in stocks if s.get("symbol")]
        if stock_syms:
            _emit("📡", f"Fetching live prices for {len(stock_syms)} stocks…")
            prices = _fetch_prices(stock_syms)
            for sym, d in prices.items():
                chg = d["change_pct"]
                icon = "📈" if chg >= 0 else "📉"
                level = "warn" if chg <= -3 else ("success" if chg >= 2 else "info")
                _emit(icon, f"{sym} ₹{d['price']} ({'+' if chg>=0 else ''}{chg}%)", level)
                _push(email, {"type": "price_update", "symbol": sym,
                              "price": d["price"], "change1d": chg})

        # ── 2. News sentiment for top 5 by value ────────────────────────────
        sorted_stocks = sorted(stocks, key=lambda s: float(s.get("currentValue") or 0), reverse=True)
        top5 = [s["symbol"] for s in sorted_stocks[:5] if s.get("symbol")]
        if top5:
            _emit("🔍", f"Scanning news for top holdings: {', '.join(top5)}")
            for sym in top5:
                sent = _news_sentiment(sym)
                news_map[sym] = sent
                icon = "🟢" if sent["label"] == "Bullish" else ("🔴" if sent["label"] == "Bearish" else "⚪")
                _emit(icon, f"{sym} news sentiment: {sent['label']} ({len(sent['headlines'])} articles)")
                _push(email, {"type": "sentiment_update", "symbol": sym, "sentiment": sent})

        # ── 3. Trend tracking - ONE update per trading day per symbol ──────────
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        enriched = []
        for s in stocks:
            sym   = s.get("symbol", "")
            cv    = float(s.get("currentValue") or 0)
            pdata = prices.get(sym)
            chg   = pdata["change_pct"] if pdata else None

            t = trend_state.get(sym, {"down_count": 0, "last_date": ""})
            # Guard: reset stale counters that have no last_date (old format)
            if "last_date" not in t:
                t = {"down_count": 0, "last_date": ""}

            # Only increment/reset once per calendar day
            if chg is not None and t.get("last_date") != today_str:
                if chg < 0:
                    t["down_count"] = t.get("down_count", 0) + 1
                else:
                    t["down_count"] = 0
                t["last_date"] = today_str
            trend_state[sym] = t

            enriched.append({**s, "change_pct": chg, "trend_down_count": t["down_count"],
                             "current_value": cv, "is_mf": False})

        for mf in mfs:
            enriched.append({**mf, "change_pct": None, "trend_down_count": 0,
                             "current_value": float(mf.get("currentValue") or 0), "is_mf": True})

        # ── 4. Alerts ────────────────────────────────────────────────────────
        profile = user.get("profile", {})
        _emit("🧮", "Computing portfolio alerts…")
        prev_alerts = agent_st.get("alerts", [])
        immediate, caution = _compute_alerts(enriched, prev_alerts, profile)

        if immediate:
            for a in immediate:
                _emit("🚨", f"ALERT: {a['symbol']} - {a['issue']}", "error")
                _push(email, {"type": "alert_added", "alert": {**a, "tier": "immediate"}})
        if caution:
            for a in caution:
                _emit("⚠️", f"CAUTION: {a['symbol']} - {a['issue']}", "warn")
                _push(email, {"type": "alert_added", "alert": {**a, "tier": "caution"}})
        if not immediate and not caution:
            _emit("✅", "All holdings within normal range", "success")

        # ── 5. Claude verdict (45-second timeout enforced inside) ────────────
        _emit("🤖", "Synthesising portfolio verdict with AI…")
        verdict_data = _claude_verdict(user, immediate, caution, prices, emit_fn=_emit)
        verdict      = verdict_data.get("verdict", "All Good")

        icon_map  = {"All Good": "✅", "Caution": "⚠️", "Immediate Action": "🚨"}
        level_map = {"All Good": "success", "Caution": "warn", "Immediate Action": "error"}
        _emit(icon_map.get(verdict, "✅"),
              f"Analysis complete - Verdict: {verdict}. {verdict_data.get('verdictReason', '')}",
              level_map.get(verdict, "info"))

        _push(email, {"type": "verdict_update",
                      "verdict": verdict,
                      "reason": verdict_data.get("verdictReason", ""),
                      "summary": verdict_data.get("overallSummary", ""),
                      "llmVerdictContent": verdict_data.get("overallSummary", ""),
                      "topAlerts": verdict_data.get("topAlerts", [])})

    except Exception as err:
        print(f"[agent] _analyse_user error for {email}: {err}")
        _emit("⚠️", f"Analysis warning: {str(err)[:60]}", "warn")
        # Compute a rule-based fallback verdict from whatever alerts were gathered
        if immediate:
            verdict = "Immediate Action"
            verdict_data = {
                "verdict": "Immediate Action",
                "verdictReason": f"{len(immediate)} holding(s) showing significant decline.",
                "overallSummary": f"{len(immediate)} holding(s) require attention.",
                "topAlerts": immediate[:3],
            }
        elif caution:
            verdict = "Caution"
            verdict_data = {
                "verdict": "Caution",
                "verdictReason": f"{len(caution)} holding(s) worth monitoring closely.",
                "overallSummary": f"{len(caution)} holding(s) showing signs of weakness.",
                "topAlerts": caution[:3],
            }
        else:
            verdict = "All Good"
            verdict_data = {
                "verdict": "All Good",
                "verdictReason": "All holdings within normal range.",
                "overallSummary": "No significant issues detected this cycle.",
                "topAlerts": [],
            }

    # ── 6. Persist - always runs, even on partial failure ────────────────────
    now_iso = datetime.datetime.now().isoformat()
    act_log = (activity + act_log)[:MAX_ACTIVITY_LOG]

    agent_st.update({
        "lastChecked":       now_iso,
        "verdict":           verdict,
        "verdictReason":     verdict_data.get("verdictReason", ""),
        "overallSummary":    verdict_data.get("overallSummary", ""),
        "llmVerdictContent": verdict_data.get("overallSummary", ""),
        "topAlerts":         verdict_data.get("topAlerts", []),
        "alerts":         [{**a, "tier": "immediate"} for a in immediate] +
                          [{**a, "tier": "caution"}   for a in caution],
        "watchlist":      [{**a, "tier": "caution"}   for a in caution],
        "activityLog":    act_log,
        "lastPrices":     prices if prices else agent_st.get("lastPrices", {}),
        "trendState":     trend_state,
        "newsSentiment":  news_map if news_map else agent_st.get("newsSentiment", {}),
    })
    user["agentState"] = agent_st
    try:
        _save_user(data_file, user)
    except Exception as save_err:
        print(f"[agent] save error for {email}: {save_err}")

    _push(email, {"type": "analysis_complete", "lastChecked": now_iso})

    # Mark first analysis complete in the index
    try:
        idx = _load_index()
        if email in idx and not idx[email].get("isAnalysisPresent"):
            idx[email]["isAnalysisPresent"] = True
            _save_index(idx)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Background scheduler
# ─────────────────────────────────────────────────────────────────────────────

def _is_market_hours() -> bool:
    """Returns True if current IST time is within NSE market hours (Mon-Fri 9:15-15:30)."""
    try:
        import pytz
        now_ist = datetime.datetime.now(pytz.timezone("Asia/Kolkata"))
        if now_ist.weekday() >= 5:         # Saturday or Sunday
            return False
        t = now_ist.hour * 60 + now_ist.minute
        return (9 * 60 + 15) <= t <= (15 * 60 + 30)
    except Exception:
        return True                        # assume open on any pytz error


def _run_all_users() -> None:
    global _timer
    try:
        index = _load_index()
    except Exception:
        index = {}

    market_open = _is_market_hours()

    for email, meta in index.items():
        if meta.get("isDataPresent"):
            if market_open:
                try:
                    _analyse_user(email, meta["dataFile"])
                except Exception as e:
                    print(f"[agent] error analysing {email}: {e}")
            else:
                # Outside market hours: just push a minimal heartbeat, no price fetching
                _push(email, {"type": "market_closed"})
                _push(email, {"type": "activity_log",
                              "entry": _log_entry("🌙", "Market closed. Monitoring paused until 9:15 AM IST.", "info")})

    # Auto email at market close
    try:
        import pytz
        now_ist = datetime.datetime.now(pytz.timezone("Asia/Kolkata"))
        if now_ist.hour == MARKET_CLOSE_HOUR and MARKET_CLOSE_MIN <= now_ist.minute < MARKET_CLOSE_MIN + 6:
            from agent_email import send_report
            for email, meta in index.items():
                if meta.get("isDataPresent"):
                    user = _load_user(meta["dataFile"])
                    if user:
                        try:
                            send_report(email, user)
                            print(f"[agent] auto email sent to {email}")
                        except Exception as e:
                            print(f"[agent] email error {email}: {e}")
    except Exception as e:
        print(f"[agent] market close email check error: {e}")

    if _running:
        _timer = threading.Timer(ANALYSIS_INTERVAL, _run_all_users)
        _timer.daemon = True
        _timer.start()


def start_agent_loop() -> None:
    global _running, _timer
    if _running:
        return
    _running = True
    # initial run after 10 seconds so Flask startup completes first
    _timer = threading.Timer(10, _run_all_users)
    _timer.daemon = True
    _timer.start()
    print("[agent] background loop started (interval=5 min)")


def stop_agent_loop() -> None:
    global _running, _timer
    _running = False
    if _timer:
        _timer.cancel()


# ─────────────────────────────────────────────────────────────────────────────
# Public API helpers (called from app.py routes)
# ─────────────────────────────────────────────────────────────────────────────

def get_agent_status(email: str) -> dict:
    """Returns {status: 'unknown_user'|'needs_onboarding'|'active', dataFile?}."""
    try:
        index = _load_index()
    except Exception:
        return {"status": "error", "detail": "holdings.json missing"}

    if email not in index:
        return {"status": "unknown_user"}
    meta = index[email]
    if not meta.get("isDataPresent"):
        return {"status": "needs_onboarding"}
    return {
        "status": "active",
        "dataFile": meta["dataFile"],
        "isAnalysisPresent": meta.get("isAnalysisPresent", False),
    }


def onboard_user(email: str, holdings: dict, profile: dict) -> dict:
    """Saves holdings + profile, sets isDataPresent=true, triggers first analysis."""
    index     = _load_index()
    if email not in index:
        return {"success": False, "error": "Email not in allowed list"}

    data_file = index[email]["dataFile"]
    name      = profile.get("name") or email.split("@")[0]

    user_data = {
        "email":       email,
        "name":        name,
        "onboardedAt": datetime.datetime.now().isoformat(),
        "profile":     profile,
        "holdings":    holdings,
        "agentState": {
            "lastChecked":    None,
            "verdict":        "Analysing…",
            "verdictReason":  "First analysis in progress.",
            "overallSummary": "",
            "topAlerts":      [],
            "alerts":         [],
            "watchlist":      [],
            "activityLog":    [_log_entry("🎉", "Welcome! Your portfolio is being set up…", "success")],
            "lastPrices":     {},
            "trendState":     {},
            "newsSentiment":  {},
            "lastReportSentAt": None,
        }
    }
    _save_user(data_file, user_data)

    index[email]["isDataPresent"]    = True
    index[email]["isAnalysisPresent"] = False   # set True after first run completes
    _save_index(index)

    # trigger analysis in background immediately
    t = threading.Thread(target=_analyse_user, args=(email, data_file), daemon=True)
    t.start()

    return {"success": True}


def get_dashboard(email: str) -> dict:
    """Returns full agentState + holdings snapshot for the dashboard."""
    index = _load_index()
    if email not in index or not index[email].get("isDataPresent"):
        return {"success": False, "error": "Not onboarded"}

    user = _load_user(index[email]["dataFile"])
    if not user:
        return {"success": False, "error": "Data file missing"}

    holdings = user.get("holdings", {})
    stocks   = holdings.get("stocks", [])
    mfs      = holdings.get("mutualFunds", [])
    prices   = user.get("agentState", {}).get("lastPrices", {})

    total_invested = sum(float(s.get("avgBuyPrice", 0)) * float(s.get("qty", 0)) for s in stocks) + \
                     sum(float(m.get("investedAmount", 0)) for m in mfs)
    total_current  = sum(float(s.get("currentValue", 0)) for s in stocks) + \
                     sum(float(m.get("currentValue", 0)) for m in mfs)

    # attach live price to each stock for the holdings grid
    enriched_stocks = []
    for s in stocks:
        sym = s.get("symbol", "")
        pd  = prices.get(sym, {})
        enriched_stocks.append({**s, "livePrice": pd.get("price"), "change1d": pd.get("change_pct")})

    return {
        "success":       True,
        "email":         email,
        "name":          user.get("name", ""),
        "profile":       user.get("profile", {}),
        "agentState":    user.get("agentState", {}),
        "holdings": {
            "stocks":       enriched_stocks,
            "mutualFunds":  mfs,
        },
        "summary": {
            "totalInvested": round(total_invested, 2),
            "totalCurrent":  round(total_current,  2),
            "totalPnL":      round(total_current - total_invested, 2),
            "pnlPct":        round((total_current - total_invested) / total_invested * 100, 2)
                             if total_invested > 0 else 0,
            "stockCount":    len(stocks),
            "mfCount":       len(mfs),
        },
        "newsSentiment": user.get("agentState", {}).get("newsSentiment", {}),
    }


def trigger_analyse(email: str) -> dict:
    """Manually trigger an analysis run for the given user."""
    index = _load_index()
    if email not in index or not index[email].get("isDataPresent"):
        return {"success": False, "error": "Not onboarded"}
    data_file = index[email]["dataFile"]
    t = threading.Thread(target=_analyse_user, args=(email, data_file), daemon=True)
    t.start()
    return {"success": True}


def reset_user(email: str) -> dict:
    """Set isDataPresent=false for demo onboarding showcase."""
    index = _load_index()
    if email not in index:
        return {"success": False, "error": "Unknown email"}
    index[email]["isDataPresent"] = False
    _save_index(index)
    return {"success": True}


def extract_profile_with_llm(chat_transcript: str) -> dict:
    """
    Given the raw chat transcript (Q&A), extract structured investment profile via Claude.
    Returns {name, investmentStyle, monthlyInvestment, goals, horizon, riskAppetite,
             focusSectors, avoidSectors}.
    """
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv())
    import anthropic, os

    api_key  = os.getenv("ANTHROPIC_API_KEY", "")
    resource = os.getenv("ANTHROPIC_FOUNDRY_RESOURCE", "")
    client   = anthropic.AnthropicFoundry(api_key=api_key, resource=resource) if resource else anthropic.Anthropic(api_key=api_key)

    prompt = f"""Extract a structured investment profile from this onboarding conversation. Respond ONLY with valid JSON, no markdown.

Conversation:
{chat_transcript}

JSON schema (all fields required, use null if not mentioned):
{{
  "name": "string or null",
  "investmentStyle": "SIP" | "Lumpsum" | "SIP + Lumpsum",
  "monthlyInvestment": number or null,
  "goals": ["string"],
  "horizon": "string (e.g. '10 years', 'long term')",
  "riskAppetite": "Conservative" | "Moderate" | "Moderate-Aggressive" | "Aggressive",
  "focusSectors": ["string"],
  "avoidSectors": ["string"]
}}"""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception:
        return {
            "name": None, "investmentStyle": "SIP", "monthlyInvestment": None,
            "goals": ["wealth creation"], "horizon": "long term",
            "riskAppetite": "Moderate", "focusSectors": [], "avoidSectors": []
        }
