"""
research_service.py - Scoring engine for Market Pulse, Suggest and Analyse.

Signal Score (0-100):
  Technical   35 pts  RSI + DMA crossover + MACD
  Momentum    25 pts  5-day & 30-day returns + volume surge
  Fundamental 20 pts  PE ratio quality + EPS sign
  Sentiment   20 pts  News headline polarity
"""

import time
import concurrent.futures
import os
from typing import Optional

from helper_func import analyze_sentiment

# ── Watchlist ──────────────────────────────────────────────────────────────────

WATCHLIST = [
    # ── Nifty 50 ──────────────────────────────────────────────────────────────
    {"symbol": "RELIANCE.NS",   "name": "Reliance Industries",   "sector": "Energy"},
    {"symbol": "TCS.NS",        "name": "TCS",                   "sector": "IT"},
    {"symbol": "HDFCBANK.NS",   "name": "HDFC Bank",             "sector": "Banking"},
    {"symbol": "INFY.NS",       "name": "Infosys",               "sector": "IT"},
    {"symbol": "ICICIBANK.NS",  "name": "ICICI Bank",            "sector": "Banking"},
    {"symbol": "HINDUNILVR.NS", "name": "HUL",                   "sector": "FMCG"},
    {"symbol": "ITC.NS",        "name": "ITC",                   "sector": "FMCG"},
    {"symbol": "SBIN.NS",       "name": "SBI",                   "sector": "Banking"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel",         "sector": "Telecom"},
    {"symbol": "KOTAKBANK.NS",  "name": "Kotak Mahindra Bank",   "sector": "Banking"},
    {"symbol": "WIPRO.NS",      "name": "Wipro",                 "sector": "IT"},
    {"symbol": "HCLTECH.NS",    "name": "HCL Tech",              "sector": "IT"},
    {"symbol": "AXISBANK.NS",   "name": "Axis Bank",             "sector": "Banking"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance",         "sector": "Finance"},
    {"symbol": "MARUTI.NS",     "name": "Maruti Suzuki",         "sector": "Auto"},
    {"symbol": "TITAN.NS",      "name": "Titan",                 "sector": "Consumer"},
    {"symbol": "SUNPHARMA.NS",  "name": "Sun Pharma",            "sector": "Pharma"},
    {"symbol": "ONGC.NS",       "name": "ONGC",                  "sector": "Energy"},
    {"symbol": "NTPC.NS",       "name": "NTPC",                  "sector": "Power"},
    {"symbol": "EICHERMOT.NS",  "name": "Eicher Motors",         "sector": "Auto"},
    {"symbol": "DRREDDY.NS",    "name": "Dr Reddy's",            "sector": "Pharma"},
    {"symbol": "NESTLEIND.NS",  "name": "Nestle India",          "sector": "FMCG"},
    {"symbol": "ADANIPORTS.NS", "name": "Adani Ports",           "sector": "Infrastructure"},
    {"symbol": "BAJAJFINSV.NS", "name": "Bajaj Finserv",         "sector": "Finance"},
    {"symbol": "TECHM.NS",      "name": "Tech Mahindra",         "sector": "IT"},
    {"symbol": "HINDALCO.NS",   "name": "Hindalco",              "sector": "Metals"},
    {"symbol": "COALINDIA.NS",  "name": "Coal India",            "sector": "Energy"},
    {"symbol": "JSWSTEEL.NS",   "name": "JSW Steel",             "sector": "Metals"},
    {"symbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto",            "sector": "Auto"},
    {"symbol": "POWERGRID.NS",  "name": "Power Grid",            "sector": "Power"},
    {"symbol": "LT.NS",         "name": "Larsen & Toubro",       "sector": "Infrastructure"},
    {"symbol": "M&M.NS",        "name": "Mahindra & Mahindra",   "sector": "Auto"},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement",      "sector": "Cement"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints",          "sector": "Consumer"},
    {"symbol": "TMPV.NS", "name": "Tata Motors",           "sector": "Auto"},
    {"symbol": "INDUSINDBK.NS", "name": "IndusInd Bank",         "sector": "Banking"},
    {"symbol": "TATACONSUM.NS", "name": "Tata Consumer",         "sector": "FMCG"},
    {"symbol": "BPCL.NS",       "name": "BPCL",                  "sector": "Energy"},
    {"symbol": "CIPLA.NS",      "name": "Cipla",                 "sector": "Pharma"},
    {"symbol": "GRASIM.NS",     "name": "Grasim Industries",     "sector": "Cement"},
    {"symbol": "ADANIENT.NS",   "name": "Adani Enterprises",     "sector": "Infrastructure"},
    {"symbol": "TATASTEEL.NS",  "name": "Tata Steel",            "sector": "Metals"},
    {"symbol": "TRENT.NS",      "name": "Trent",                 "sector": "Consumer"},
    {"symbol": "BRITANNIA.NS",  "name": "Britannia Industries",  "sector": "FMCG"},
    {"symbol": "APOLLOHOSP.NS", "name": "Apollo Hospitals",      "sector": "Healthcare"},
    {"symbol": "BEL.NS",        "name": "Bharat Electronics",    "sector": "Defense"},
    {"symbol": "HEROMOTOCO.NS", "name": "Hero MotoCorp",         "sector": "Auto"},
    {"symbol": "SBILIFE.NS",    "name": "SBI Life Insurance",    "sector": "Insurance"},
    {"symbol": "HDFCLIFE.NS",   "name": "HDFC Life Insurance",   "sector": "Insurance"},
    {"symbol": "SHRIRAMFIN.NS", "name": "Shriram Finance",       "sector": "Finance"},
    # ── Nifty Next 50 ─────────────────────────────────────────────────────────
    {"symbol": "HAVELLS.NS",    "name": "Havells India",         "sector": "Consumer"},
    {"symbol": "SIEMENS.NS",    "name": "Siemens India",         "sector": "Industrial"},
    {"symbol": "DLF.NS",        "name": "DLF",                   "sector": "Realty"},
    {"symbol": "ZOMATO.NS",     "name": "Zomato",                "sector": "Consumer"},
    {"symbol": "PIDILITIND.NS", "name": "Pidilite Industries",   "sector": "Chemicals"},
    {"symbol": "MARICO.NS",     "name": "Marico",                "sector": "FMCG"},
    {"symbol": "COLPAL.NS",     "name": "Colgate-Palmolive",     "sector": "FMCG"},
    {"symbol": "DABUR.NS",      "name": "Dabur India",           "sector": "FMCG"},
    {"symbol": "GODREJCP.NS",   "name": "Godrej Consumer",       "sector": "FMCG"},
    {"symbol": "TORNTPHARM.NS", "name": "Torrent Pharma",        "sector": "Pharma"},
    {"symbol": "LUPIN.NS",      "name": "Lupin",                 "sector": "Pharma"},
    {"symbol": "ZYDUSLIFE.NS",  "name": "Zydus Lifesciences",    "sector": "Pharma"},
    {"symbol": "ALKEM.NS",      "name": "Alkem Laboratories",    "sector": "Pharma"},
    {"symbol": "PERSISTENT.NS", "name": "Persistent Systems",    "sector": "IT"},
    {"symbol": "MPHASIS.NS",    "name": "Mphasis",               "sector": "IT"},
    {"symbol": "COFORGE.NS",    "name": "Coforge",               "sector": "IT"},
    {"symbol": "LTTS.NS",       "name": "L&T Technology",        "sector": "IT"},
    {"symbol": "NAUKRI.NS",     "name": "Info Edge (Naukri)",    "sector": "IT"},
    {"symbol": "HAL.NS",        "name": "HAL",                   "sector": "Defense"},
    {"symbol": "IRCTC.NS",      "name": "IRCTC",                 "sector": "Consumer"},
    {"symbol": "CHOLAFIN.NS",   "name": "Cholamandalam Finance", "sector": "Finance"},
    {"symbol": "MUTHOOTFIN.NS", "name": "Muthoot Finance",       "sector": "Finance"},
    {"symbol": "DMART.NS",      "name": "Avenue Supermarts",     "sector": "Consumer"},
    {"symbol": "PAGEIND.NS",    "name": "Page Industries",       "sector": "Consumer"},
    {"symbol": "OBEROIRLTY.NS", "name": "Oberoi Realty",         "sector": "Realty"},
    # ── Small / Mid Cap additions ──────────────────────────────────────────────
    {"symbol": "FEDERALBNK.NS", "name": "Federal Bank",           "sector": "Banking"},
    {"symbol": "IDFCFIRSTB.NS", "name": "IDFC First Bank",        "sector": "Banking"},
    {"symbol": "CANBK.NS",      "name": "Canara Bank",            "sector": "Banking"},
    {"symbol": "BANKBARODA.NS", "name": "Bank of Baroda",         "sector": "Banking"},
    {"symbol": "TATAELXSI.NS",  "name": "Tata Elxsi",            "sector": "IT"},
    {"symbol": "KPITTECH.NS",   "name": "KPIT Technologies",      "sector": "IT"},
    {"symbol": "POLYCAB.NS",    "name": "Polycab India",          "sector": "Consumer"},
    {"symbol": "DIXON.NS",      "name": "Dixon Technologies",     "sector": "Consumer"},
    {"symbol": "BERGEPAINT.NS", "name": "Berger Paints",          "sector": "Consumer"},
    {"symbol": "VOLTAS.NS",     "name": "Voltas",                 "sector": "Consumer"},
    {"symbol": "JUBLFOOD.NS",   "name": "Jubilant FoodWorks",     "sector": "Consumer"},
    {"symbol": "BATAINDIA.NS",  "name": "Bata India",             "sector": "Consumer"},
    {"symbol": "INDIGO.NS",     "name": "IndiGo",                 "sector": "Consumer"},
    {"symbol": "ANGELONE.NS",   "name": "Angel One",              "sector": "Finance"},
    {"symbol": "SBICARD.NS",    "name": "SBI Cards",              "sector": "Finance"},
    {"symbol": "ICICIGI.NS",    "name": "ICICI Lombard",          "sector": "Insurance"},
    {"symbol": "LALPATHLAB.NS", "name": "Dr Lal PathLabs",        "sector": "Healthcare"},
    {"symbol": "METROPOLIS.NS", "name": "Metropolis Healthcare",  "sector": "Healthcare"},
    {"symbol": "ASTRAL.NS",     "name": "Astral Ltd",             "sector": "Chemicals"},
    {"symbol": "AARTIIND.NS",   "name": "Aarti Industries",       "sector": "Chemicals"},
    {"symbol": "BOSCHLTD.NS",   "name": "Bosch India",            "sector": "Industrial"},
    {"symbol": "ESCORTS.NS",    "name": "Escorts Kubota",         "sector": "Auto"},
    {"symbol": "MOTHERSON.NS",  "name": "Samvardhana Motherson",  "sector": "Auto"},
    {"symbol": "CUMMINSIND.NS", "name": "Cummins India",          "sector": "Industrial"},
    {"symbol": "LODHA.NS",      "name": "Macrotech Developers",   "sector": "Realty"},
]

SECTOR_SYMBOLS = {
    "Banking":        "^NSEBANK",
    "IT":             "^CNXIT",
    "Pharma":         "^CNXPHARMA",
    "Auto":           "^CNXAUTO",
    "FMCG":           "^CNXFMCG",
    "Energy":         "^CNXENERGY",
    "Metals":         "^CNXMETAL",
    "Realty":         "^CNXREALTY",
}

RISK_SECTORS = {
    "Conservative": ["Banking", "FMCG", "Pharma", "Power", "Healthcare", "Insurance"],
    "Moderate":     ["Banking", "IT", "FMCG", "Auto", "Pharma", "Finance", "Healthcare", "Cement", "Defense", "Chemicals"],
    "Aggressive":   ["IT", "Auto", "Metals", "Finance", "Telecom", "Infrastructure", "Consumer", "Realty", "Industrial"],
}

_pulse_cache: dict = {}
_CACHE_TTL = 900  # 15 minutes


# ── Indicator helpers ──────────────────────────────────────────────────────────

def _rsi(closes, period=14) -> float:
    if len(closes) < period + 1:
        return 50.0
    delta = closes.diff().dropna()
    gain = delta.clip(lower=0).rolling(period).mean().iloc[-1]
    loss = (-delta.clip(upper=0)).rolling(period).mean().iloc[-1]
    if loss == 0:
        return 100.0
    return round(100 - 100 / (1 + gain / loss), 2)


# ── Per-stock scorer ───────────────────────────────────────────────────────────

def _score_stock(item: dict) -> Optional[dict]:
    import yfinance as yf
    try:
        ticker = yf.Ticker(item["symbol"])
        hist   = ticker.history(period="3mo", interval="1d")
        if hist.empty or len(hist) < 20:
            return None

        closes  = hist["Close"]
        volumes = hist["Volume"]
        price   = float(closes.iloc[-1])

        # ── Technical (max 35) ───────────────────────────────────────────────
        rsi   = _rsi(closes)
        d20   = float(closes.rolling(20).mean().iloc[-1])
        d50   = float(closes.rolling(min(50, len(closes))).mean().iloc[-1])
        macd  = closes.ewm(span=12, adjust=False).mean() - closes.ewm(span=26, adjust=False).mean()
        mbull = bool(macd.iloc[-1] > macd.ewm(span=9, adjust=False).mean().iloc[-1])

        rsi_s = 15 if rsi >= 60 else (10 if rsi >= 50 else (6 if rsi >= 40 else 2))
        dma_s = 12 if (price > d20 and d20 > d50) else (8 if price > d20 else (4 if price > d50 else 1))
        mac_s = 8 if mbull else 2
        tech  = rsi_s + dma_s + mac_s  # max 35

        # ── Momentum (max 25) ────────────────────────────────────────────────
        p5  = float(closes.iloc[-6])  if len(closes) >= 6  else price
        p30 = float(closes.iloc[-31]) if len(closes) >= 31 else float(closes.iloc[0])
        r5  = (price - p5)  / p5  * 100
        r30 = (price - p30) / p30 * 100
        avg_vol  = float(volumes.iloc[-30:].mean()) or 1
        vrat     = float(volumes.iloc[-5:].mean()) / avg_vol

        r5_s  = 10 if r5  > 3 else (7 if r5  > 1 else (5 if r5  > 0 else 2))
        r30_s = 12 if r30 > 8 else (9 if r30 > 3 else (6 if r30 > 0 else 2))
        mom   = min(25, r5_s + r30_s + min(3, int(vrat)))

        # ── Fundamental (max 20) ─────────────────────────────────────────────
        info = ticker.info
        pe   = info.get("trailingPE") or info.get("forwardPE")
        eps  = info.get("trailingEps") or 0
        pe_s = 8 if pe is None else (3 if pe < 0 else (12 if pe <= 20 else (9 if pe <= 35 else (6 if pe <= 50 else 4))))
        fund = pe_s + (8 if eps > 0 else 3)  # max 20

        # ── Sentiment (max 20) ───────────────────────────────────────────────
        try:
            raw = ticker.news or []
            hdls = [n["content"]["title"] for n in raw[:5] if n.get("content", {}).get("title")]
        except Exception:
            hdls = []
        if hdls:
            s    = analyze_sentiment(hdls)
            tot  = s["total"] or 1
            pr   = s["positive"] / tot
            nr   = s["negative"] / tot
            sent = 20 if pr > 0.6 else (14 if pr > 0.4 else (4 if nr > 0.6 else (8 if nr > 0.4 else 11)))
        else:
            sent = 10

        score = tech + mom + fund + sent  # max 100

        return {
            "symbol":       item["symbol"].replace(".NS", ""),
            "name":         item["name"],
            "sector":       item["sector"],
            "price":        round(price, 2),
            "change_pct":   round(r5, 2),
            "signal_score": score,
            "signal":       "HOT" if score >= 65 else ("COLD" if score <= 40 else "NEUTRAL"),
            "breakdown":    {"technical": tech, "momentum": mom, "fundamental": fund, "sentiment": sent},
            "metrics": {
                "rsi":              round(rsi, 1),
                "macd_bullish":     mbull,
                "above_20dma":      price > d20,
                "above_50dma":      price > d50,
                "ret_5d":           round(r5, 2),
                "ret_30d":          round(r30, 2),
                "pe":               round(pe, 1) if pe else None,
                "eps":              round(eps, 2),
                "vol_vs_avg":       round(vrat, 2),
                "recent_headlines": hdls[:3],
            },
        }
    except Exception as e:
        print(f"[research] score error {item['symbol']}: {e}")
        return None


# ── Sector performance ─────────────────────────────────────────────────────────

def _sector_perf() -> list:
    import yfinance as yf
    out = []
    for name, sym in SECTOR_SYMBOLS.items():
        try:
            h = yf.Ticker(sym).history(period="5d", interval="1d")
            if len(h) >= 2:
                prev = float(h["Close"].iloc[-2])
                curr = float(h["Close"].iloc[-1])
                out.append({"sector": name, "price": round(curr, 2),
                             "change_pct": round((curr - prev) / prev * 100, 2)})
        except Exception:
            pass
    return out


# ── Public API ─────────────────────────────────────────────────────────────────

def get_pulse_data() -> dict:
    global _pulse_cache
    now = time.time()
    if _pulse_cache.get("data") and (now - _pulse_cache.get("ts", 0)) < _CACHE_TTL:
        return _pulse_cache["data"]

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        scored = [r for r in ex.map(_score_stock, WATCHLIST) if r]

    scored.sort(key=lambda x: x["signal_score"], reverse=True)
    payload = {
        "success": True,
        "hot":     scored[:3],
        "cold":    list(reversed(scored[-3:])),
        "all":     scored,
        "sectors": _sector_perf(),
    }
    _pulse_cache["data"] = payload
    _pulse_cache["ts"]   = now
    return payload


def analyse_stock(symbol: str) -> dict:
    import yfinance as yf
    try:
        ns     = symbol.upper() + ".NS" if not symbol.upper().endswith(".NS") else symbol.upper()
        info   = yf.Ticker(ns).info
        name   = info.get("longName") or info.get("shortName") or symbol.upper()
        sector = info.get("sector", "Unknown")

        result = _score_stock({"symbol": ns, "name": name, "sector": sector})
        if not result:
            return {"success": False, "error": "Insufficient market data for this symbol."}

        s = result["signal_score"]
        if   s >= 85: action, conf = "Strong Buy", "High"
        elif s >= 65: action, conf = "Buy",         "Medium-High"
        elif s >= 55: action, conf = "Hold",        "Medium"
        elif s >= 40: action, conf = "Caution",     "Medium-Low"
        else:         action, conf = "Avoid",       "High"

        return {
            "success": True,
            **result,
            "action":     action,
            "confidence": conf,
            "company_info": {
                "sector":      info.get("sector", ""),
                "industry":    info.get("industry", ""),
                "market_cap":  info.get("marketCap"),
                "week52_high": info.get("fiftyTwoWeekHigh"),
                "week52_low":  info.get("fiftyTwoWeekLow"),
                "avg_volume":  info.get("averageVolume"),
                "beta":        info.get("beta"),
                "description": (info.get("longBusinessSummary") or "")[:280],
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def suggest_stocks(amount: int, horizon: str, risk: str, sector: str | None,
                   investment_type: str = "lumpsum", duration_years: int = 0) -> list:
    """Return top-3 ranked stocks matching the profile, each with LLM-generated reasons."""
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv())
    import anthropic

    pulse = get_pulse_data()
    all_stocks = pulse.get("all", [])

    if sector and sector.lower() not in ("any", ""):
        candidates = [s for s in all_stocks if s["sector"].lower() == sector.lower()]
        if not candidates:
            candidates = all_stocks
    else:
        preferred  = RISK_SECTORS.get(risk, list(SECTOR_SYMBOLS.keys()))
        candidates = [s for s in all_stocks if s["sector"] in preferred] or all_stocks

    top3 = sorted(candidates, key=lambda x: x["signal_score"], reverse=True)[:3]

    api_key  = os.getenv("ANTHROPIC_API_KEY", "")
    resource = os.getenv("ANTHROPIC_FOUNDRY_RESOURCE", "")
    client   = anthropic.AnthropicFoundry(api_key=api_key, resource=resource) if resource else anthropic.Anthropic(api_key=api_key)

    if investment_type == "sip":
        invest_ctx = f"₹{amount:,}/month SIP for {duration_years} year{'s' if duration_years != 1 else ''}"
    else:
        invest_ctx = f"₹{amount:,} lumpsum"

    suggestions = []
    for i, stock in enumerate(top3):
        m = stock["metrics"]
        prompt = (
            f"You are a concise Indian stock analyst. Write exactly 2 short bullet points (each starting with •) "
            f"explaining why {stock['name']} ({stock['symbol']}) suits a {risk} investor "
            f"with a {horizon}-term horizon investing {invest_ctx}. "
            f"Data: Signal {stock['signal_score']}/100 | RSI {m['rsi']} | "
            f"5d: {m['ret_5d']}% | 30d: {m['ret_30d']}% | MACD: {'Bullish' if m['macd_bullish'] else 'Bearish'} | "
            f"PE: {m['pe'] or 'N/A'} | Above 20DMA: {m['above_20dma']}. "
            f"Write only the 2 bullets, nothing else."
        )
        try:
            msg     = client.messages.create(model="claude-sonnet-4-6", max_tokens=256,
                                             messages=[{"role": "user", "content": prompt}])
            reasons = msg.content[0].text.strip()
        except Exception:
            reasons = (
                f"• Signal score of {stock['signal_score']}/100 with "
                f"{'bullish' if m['macd_bullish'] else 'neutral'} MACD momentum.\n"
                f"• RSI at {m['rsi']} suggests {'a healthy entry point' if m['rsi'] < 65 else 'strong trend continuation'}."
            )
        suggestions.append({**stock, "rank": i + 1, "reasons": reasons})

    return suggestions
