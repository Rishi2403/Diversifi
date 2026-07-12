"""
mf_service.py — Scoring engine for MF Market Pulse, Suggest, and Analyse.

Score (0–100):
  1Y Returns   40 pts  long-term performance
  3M Returns   20 pts  recent trend
  1M Momentum  15 pts  short-term momentum
  Consistency  25 pts  positive across 1M/3M/6M/1Y horizons
"""

import time
import concurrent.futures
import requests
import os
from typing import Optional

MF_API_BASE = "https://api.mfapi.in/mf"
_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

MF_WATCHLIST = [
    # ── Large Cap ─────────────────────────────────────────────────────────────
    {"code": 118825, "name": "Mirae Asset Large Cap Fund",           "category": "Large Cap",  "amc": "Mirae"},
    {"code": 119598, "name": "SBI Blue Chip Fund",                   "category": "Large Cap",  "amc": "SBI"},
    {"code": 120465, "name": "Axis Large Cap Fund",                  "category": "Large Cap",  "amc": "Axis"},
    {"code": 147704, "name": "Motilal Oswal Large & Midcap Fund",    "category": "Large Cap",  "amc": "Motilal"},
    {"code": 119721, "name": "SBI Large & Midcap Fund",              "category": "Large Cap",  "amc": "SBI"},
    # ── Flexi Cap ─────────────────────────────────────────────────────────────
    {"code": 122639, "name": "Parag Parikh Flexi Cap Fund",          "category": "Flexi Cap",  "amc": "PPFAS"},
    {"code": 118955, "name": "HDFC Flexi Cap Fund",                  "category": "Flexi Cap",  "amc": "HDFC"},
    {"code": 120166, "name": "Kotak Flexicap Fund",                  "category": "Flexi Cap",  "amc": "Kotak"},
    {"code": 120662, "name": "UTI Flexi Cap Fund",                   "category": "Flexi Cap",  "amc": "UTI"},
    {"code": 118535, "name": "Franklin India Flexi Cap Fund",        "category": "Flexi Cap",  "amc": "Franklin"},
    {"code": 149094, "name": "Nippon India Flexi Cap Fund",          "category": "Flexi Cap",  "amc": "Nippon"},
    {"code": 120843, "name": "Quant Flexi Cap Fund",                 "category": "Flexi Cap",  "amc": "Quant"},
    {"code": 119718, "name": "SBI Flexicap Fund",                    "category": "Flexi Cap",  "amc": "SBI"},
    {"code": 120468, "name": "Axis Focused Fund",                    "category": "Flexi Cap",  "amc": "Axis"},
    # ── Mid Cap ───────────────────────────────────────────────────────────────
    {"code": 119071, "name": "DSP Midcap Fund",                      "category": "Mid Cap",    "amc": "DSP"},
    {"code": 120505, "name": "Axis Midcap Fund",                     "category": "Mid Cap",    "amc": "Axis"},
    {"code": 120381, "name": "ICICI Pru Midcap Fund",                "category": "Mid Cap",    "amc": "ICICI"},
    {"code": 120841, "name": "Quant Mid Cap Fund",                   "category": "Mid Cap",    "amc": "Quant"},
    {"code": 119716, "name": "SBI Midcap Fund",                      "category": "Mid Cap",    "amc": "SBI"},
    # ── Small Cap ─────────────────────────────────────────────────────────────
    {"code": 118778, "name": "Nippon India Small Cap Fund",          "category": "Small Cap",  "amc": "Nippon"},
    {"code": 125497, "name": "SBI Small Cap Fund",                   "category": "Small Cap",  "amc": "SBI"},
    {"code": 120828, "name": "Quant Small Cap Fund",                 "category": "Small Cap",  "amc": "Quant"},
    {"code": 130503, "name": "HDFC Small Cap Fund",                  "category": "Small Cap",  "amc": "HDFC"},
    {"code": 125354, "name": "Axis Small Cap Fund",                  "category": "Small Cap",  "amc": "Axis"},
    {"code": 120164, "name": "Kotak Small Cap Fund",                 "category": "Small Cap",  "amc": "Kotak"},
    # ── ELSS ──────────────────────────────────────────────────────────────────
    {"code": 120503, "name": "Axis ELSS Tax Saver Fund",             "category": "ELSS",       "amc": "Axis"},
    {"code": 119242, "name": "DSP ELSS Tax Saver Fund",              "category": "ELSS",       "amc": "DSP"},
    {"code": 120847, "name": "Quant ELSS Tax Saver Fund",            "category": "ELSS",       "amc": "Quant"},
    {"code": 135781, "name": "Mirae Asset ELSS Tax Saver Fund",      "category": "ELSS",       "amc": "Mirae"},
    {"code": 119723, "name": "SBI ELSS Tax Saver Fund",              "category": "ELSS",       "amc": "SBI"},
    {"code": 119060, "name": "HDFC ELSS Tax Saver Fund",             "category": "ELSS",       "amc": "HDFC"},
    # ── Index ─────────────────────────────────────────────────────────────────
    {"code": 120716, "name": "UTI Nifty 50 Index Fund",              "category": "Index",      "amc": "UTI"},
    {"code": 119063, "name": "HDFC Nifty 50 Index Fund",             "category": "Index",      "amc": "HDFC"},
    {"code": 118745, "name": "Nippon India Nifty 50 Index Fund",     "category": "Index",      "amc": "Nippon"},
    {"code": 119827, "name": "SBI Nifty Index Fund",                 "category": "Index",      "amc": "SBI"},
    {"code": 143341, "name": "UTI Nifty Next 50 Index Fund",         "category": "Index",      "amc": "UTI"},
    {"code": 147622, "name": "Motilal Oswal Nifty Midcap 150 Fund",  "category": "Index",      "amc": "Motilal"},
    # ── Sectoral ──────────────────────────────────────────────────────────────
    {"code": 120594, "name": "ICICI Pru Technology Fund",            "category": "Sectoral",   "amc": "ICICI"},
    {"code": 118759, "name": "Nippon India Pharma Fund",             "category": "Sectoral",   "amc": "Nippon"},
    {"code": 120833, "name": "Quant Infrastructure Fund",            "category": "Sectoral",   "amc": "Quant"},
    {"code": 120621, "name": "ICICI Pru Infrastructure Fund",        "category": "Sectoral",   "amc": "ICICI"},
    # ── Value ─────────────────────────────────────────────────────────────────
    {"code": 120323, "name": "ICICI Pru Value Discovery Fund",       "category": "Value",      "amc": "ICICI"},
    {"code": 118494, "name": "Templeton India Value Fund",           "category": "Value",      "amc": "Franklin"},
    {"code": 149335, "name": "Quant Value Fund",                     "category": "Value",      "amc": "Quant"},
    {"code": 119724, "name": "SBI Contra Fund",                      "category": "Value",      "amc": "SBI"},
    # ── Hybrid ────────────────────────────────────────────────────────────────
    {"code": 119609, "name": "SBI Equity Hybrid Fund",               "category": "Hybrid",     "amc": "SBI"},
    {"code": 119062, "name": "HDFC Hybrid Equity Fund",              "category": "Hybrid",     "amc": "HDFC"},
    {"code": 120251, "name": "ICICI Pru Equity & Debt Fund",         "category": "Hybrid",     "amc": "ICICI"},
    {"code": 118968, "name": "HDFC Balanced Advantage Fund",         "category": "Hybrid",     "amc": "HDFC"},
    {"code": 119727, "name": "SBI Focused Equity Fund",              "category": "Hybrid",     "amc": "SBI"},
]

CATEGORY_REPS = {
    "Large Cap": 118825,   # Mirae Asset Large Cap
    "Mid Cap":   120505,   # Axis Midcap
    "Small Cap": 118778,   # Nippon India Small Cap
    "Flexi Cap": 122639,   # Parag Parikh Flexi Cap
    "ELSS":      135781,   # Mirae Asset ELSS
    "Index":     120716,   # UTI Nifty 50
    "Sectoral":  120594,   # ICICI Technology
    "Hybrid":    119609,   # SBI Equity Hybrid
    "Value":     120323,   # ICICI Value Discovery
}

MF_RISK_CATEGORIES = {
    "Conservative": ["Large Cap", "Index", "Hybrid"],
    "Moderate":     ["Large Cap", "Flexi Cap", "Mid Cap", "ELSS", "Hybrid"],
    "Aggressive":   ["Mid Cap", "Small Cap", "Sectoral", "Flexi Cap", "Value", "ELSS"],
}

_mf_pulse_cache: dict = {}
_CACHE_TTL = 900  # 15 minutes


def _nav(data: list, idx: int) -> float:
    return float(data[min(idx, len(data) - 1)]["nav"].replace(",", ""))


def _score_mf(item: dict) -> Optional[dict]:
    try:
        resp = None
        for attempt in range(3):
            try:
                resp = requests.get(f"{MF_API_BASE}/{item['code']}", headers=_HEADERS, timeout=20)
                break
            except requests.exceptions.Timeout:
                if attempt == 2:
                    raise
                import time as _t; _t.sleep(2 ** attempt)
        if resp is None or resp.status_code != 200:
            return None
        d = resp.json()
        if d.get("status") != "SUCCESS":
            return None

        navs = d["data"]   # newest-first
        meta = d["meta"]

        if len(navs) < 30:
            return None

        latest = _nav(navs, 0)
        n1d    = _nav(navs, 1)
        n1m    = _nav(navs, min(21,  len(navs) - 1))
        n3m    = _nav(navs, min(63,  len(navs) - 1))
        n6m    = _nav(navs, min(126, len(navs) - 1))
        has1y  = len(navs) >= 252

        ret_1d = (latest - n1d) / n1d * 100
        ret_1m = (latest - n1m) / n1m * 100
        ret_3m = (latest - n3m) / n3m * 100
        ret_6m = (latest - n6m) / n6m * 100
        ret_1y = (latest - _nav(navs, 252)) / _nav(navs, 252) * 100 if has1y else None

        # ── 1Y returns (40 pts) ──────────────────────────────────────────────
        if ret_1y is None:
            r1y_s = 16
        elif ret_1y > 30: r1y_s = 40
        elif ret_1y > 20: r1y_s = 32
        elif ret_1y > 12: r1y_s = 24
        elif ret_1y > 6:  r1y_s = 16
        elif ret_1y > 0:  r1y_s = 8
        else:             r1y_s = 3

        # ── 3M returns (20 pts) ──────────────────────────────────────────────
        r3m_s = (20 if ret_3m > 10 else 15 if ret_3m > 6 else 10 if ret_3m > 3 else 6 if ret_3m > 0 else 2)

        # ── 1M momentum (15 pts) ─────────────────────────────────────────────
        r1m_s = (15 if ret_1m > 4 else 12 if ret_1m > 2 else 8 if ret_1m > 0 else 4)

        # ── Consistency (25 pts) ─────────────────────────────────────────────
        positives = sum([ret_1m > 0, ret_3m > 0, ret_6m > 0, (ret_1y or 0) > 0])
        cons_s = (25 if positives == 4 else 18 if positives == 3 else 11 if positives == 2 else 5)

        score = r1y_s + r3m_s + r1m_s + cons_s

        return {
            "code":         item["code"],
            "name":         item["name"],
            "category":     item.get("category", ""),
            "amc":          item.get("amc", meta.get("fund_house", "")),
            "nav":          round(latest, 4),
            "change_pct":   round(ret_1d, 2),
            "ret_1m":       round(ret_1m, 2),
            "ret_3m":       round(ret_3m, 2),
            "ret_6m":       round(ret_6m, 2),
            "ret_1y":       round(ret_1y, 2) if ret_1y is not None else None,
            "signal_score": score,
            "signal":       "HOT" if score >= 65 else ("COLD" if score <= 40 else "NEUTRAL"),
            "breakdown": {
                "returns_1y":  r1y_s,
                "returns_3m":  r3m_s,
                "momentum_1m": r1m_s,
                "consistency": cons_s,
            },
            "scheme_name": meta.get("scheme_name", item["name"]),
        }
    except Exception as e:
        print(f"[mf] score error {item['code']}: {e}")
        return None


def _category_perf() -> list:
    out = []
    for cat, code in CATEGORY_REPS.items():
        try:
            resp = requests.get(f"{MF_API_BASE}/{code}", headers=_HEADERS, timeout=10)
            d = resp.json()
            navs = d.get("data", [])
            if len(navs) >= 2:
                n0 = _nav(navs, 0)
                n1 = _nav(navs, 1)
                out.append({
                    "category":   cat,
                    "nav":        round(n0, 2),
                    "change_pct": round((n0 - n1) / n1 * 100, 2),
                })
        except Exception:
            pass
    return out


def get_mf_pulse_data() -> dict:
    global _mf_pulse_cache
    now = time.time()
    if _mf_pulse_cache.get("data") and (now - _mf_pulse_cache.get("ts", 0)) < _CACHE_TTL:
        return _mf_pulse_cache["data"]

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        scored = [r for r in ex.map(_score_mf, MF_WATCHLIST) if r]

    scored.sort(key=lambda x: x["signal_score"], reverse=True)
    payload = {
        "success":    True,
        "hot":        scored[:3],
        "cold":       list(reversed(scored[-3:])),
        "all":        scored,
        "categories": _category_perf(),
    }
    _mf_pulse_cache["data"] = payload
    _mf_pulse_cache["ts"]   = now
    return payload


def analyse_mf(query: str) -> dict:
    try:
        if query.strip().isdigit():
            code = int(query.strip())
            item = next((x for x in MF_WATCHLIST if x["code"] == code),
                        {"code": code, "name": query, "category": "Unknown", "amc": "Unknown"})
        else:
            resp = requests.get(f"{MF_API_BASE}/search?q={query}", headers=_HEADERS, timeout=10)
            results = resp.json()
            if not results:
                return {"success": False, "error": "No fund found matching your query."}
            top  = results[0]
            code = top["schemeCode"]
            item = next((x for x in MF_WATCHLIST if x["code"] == code),
                        {"code": code, "name": top.get("schemeName", query),
                         "category": "Unknown", "amc": "Unknown"})

        result = _score_mf(item)
        if not result:
            return {"success": False, "error": "Insufficient NAV data for this fund."}

        s = result["signal_score"]
        if   s >= 85: action, conf = "Strong Buy", "High"
        elif s >= 65: action, conf = "Buy",         "Medium-High"
        elif s >= 55: action, conf = "Hold",        "Medium"
        elif s >= 40: action, conf = "Caution",     "Medium-Low"
        else:         action, conf = "Avoid",       "High"

        return {"success": True, **result, "action": action, "confidence": conf}
    except Exception as e:
        return {"success": False, "error": str(e)}


def suggest_mfs(amount: int, horizon: str, risk: str, category: str | None,
                investment_type: str = "lumpsum", duration_years: int = 0) -> list:
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv())
    import anthropic

    pulse   = get_mf_pulse_data()
    all_mfs = pulse.get("all", [])

    if category and category.lower() not in ("any", ""):
        candidates = [m for m in all_mfs if m["category"].lower() == category.lower()]
        if not candidates:
            candidates = all_mfs
    else:
        preferred  = MF_RISK_CATEGORIES.get(risk, [])
        candidates = [m for m in all_mfs if m["category"] in preferred] or all_mfs

    top3 = sorted(candidates, key=lambda x: x["signal_score"], reverse=True)[:3]

    api_key  = os.getenv("ANTHROPIC_API_KEY", "")
    resource = os.getenv("ANTHROPIC_FOUNDRY_RESOURCE", "")
    client   = anthropic.AnthropicFoundry(api_key=api_key, resource=resource) if resource else anthropic.Anthropic(api_key=api_key)

    if investment_type == "sip":
        invest_ctx = f"₹{amount:,}/month SIP for {duration_years} year{'s' if duration_years != 1 else ''}"
    else:
        invest_ctx = f"₹{amount:,} lumpsum"

    suggestions = []
    for i, mf in enumerate(top3):
        ret1y = mf.get("ret_1y")
        prompt = (
            f"You are a concise Indian mutual fund analyst. Write exactly 2 short bullet points (each starting with •) "
            f"explaining why {mf['name']} ({mf['category']} fund by {mf['amc']}) suits a {risk} investor "
            f"with a {horizon}-term horizon investing {invest_ctx}. "
            f"Data: Signal {mf['signal_score']}/100 | 1M: {mf['ret_1m']}% | 3M: {mf['ret_3m']}% | "
            f"6M: {mf['ret_6m']}%" + (f" | 1Y: {ret1y}%" if ret1y is not None else "") + ". "
            f"Write only the 2 bullets, nothing else."
        )
        try:
            msg     = client.messages.create(model="claude-sonnet-4-6", max_tokens=256,
                                             messages=[{"role": "user", "content": prompt}])
            reasons = msg.content[0].text.strip()
        except Exception:
            reasons = (
                f"• Signal score of {mf['signal_score']}/100 with "
                f"{'strong' if mf['signal_score'] >= 65 else 'steady'} return consistency.\n"
                f"• 3-month return of {mf['ret_3m']}%"
                + (f" and 1-year return of {ret1y}% reflect solid long-term performance." if ret1y else ".")
            )
        suggestions.append({**mf, "rank": i + 1, "reasons": reasons})

    return suggestions
