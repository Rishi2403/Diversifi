"""
portfolio_analysis.py - Deep portfolio analytics: CAGR, Alpha, Beta, Sharpe, tax harvesting.

All metrics use yfinance historical data (no mocked values).
Risk-free rate: 6.5% (India 91-day T-bill proxy, FY2025-26)
Tax rates (equity, FY2025-26): LTCG 12.5% (above ₹1.25L exemption), STCG 20%
"""

import math
import datetime
import numpy as np
import yfinance as yf

RISK_FREE_RATE = 0.065  # 6.5% India 91-day T-bill proxy
LTCG_RATE = 0.125       # 12.5%
STCG_RATE = 0.20        # 20%
LTCG_THRESHOLD_DAYS = 365
MAX_STOCKS = 15         # limit yfinance calls to avoid timeout

BENCHMARK_SYMBOLS = {
    "nifty50": "^NSEI",
    "nifty500": "^CRSLDX",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> datetime.date | None:
    """Parse ISO date string; return None on failure."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def _holding_days(buy_date: datetime.date) -> int:
    return (datetime.date.today() - buy_date).days


def _cagr(cost: float, current: float, days: int) -> float | None:
    """Return CAGR as a percentage, or None if inputs are invalid."""
    if cost <= 0 or days <= 0 or current <= 0:
        return None
    return round(((current / cost) ** (365 / days) - 1) * 100, 2)


# ---------------------------------------------------------------------------
# Per-holding analytics
# ---------------------------------------------------------------------------

def _build_holdings(stocks: list[dict], mutual_funds: list[dict]) -> list[dict]:
    """Return a flat list of enriched holding dicts."""
    holdings = []

    for s in stocks:
        buy_date = _parse_date(s.get("buyDate", ""))
        avg_buy  = float(s.get("avgBuyPrice", 0) or 0)
        qty      = float(s.get("qty", 0) or 0)
        cost     = avg_buy * qty
        cv       = float(s.get("currentValue", 0) or 0)

        days    = _holding_days(buy_date) if buy_date else None
        is_ltcg = (days is not None and days > LTCG_THRESHOLD_DAYS)
        upnl    = cv - cost if cost > 0 else None
        cagr_val = _cagr(cost, cv, days) if (days and days > 0) else None

        holdings.append({
            "symbol":        s.get("symbol", ""),
            "name":          s.get("name", s.get("symbol", "")),
            "cagr":          cagr_val,
            "unrealized_pnl": round(upnl, 2) if upnl is not None else None,
            "holding_days":  days,
            "is_ltcg":       is_ltcg,
            "cost":          round(cost, 2),
            "current_value": round(cv, 2),
            "is_mf":         False,
            # keep for tax section
            "_avg_buy_price": avg_buy,
        })

    for mf in mutual_funds:
        buy_date = _parse_date(mf.get("buyDate", ""))
        invested = float(mf.get("investedAmount", 0) or 0)
        cv       = float(mf.get("currentValue", 0) or 0)

        days    = _holding_days(buy_date) if buy_date else None
        is_ltcg = (days is not None and days > LTCG_THRESHOLD_DAYS)
        upnl    = cv - invested if invested > 0 else None
        cagr_val = _cagr(invested, cv, days) if (days and days > 0) else None

        holdings.append({
            "symbol":         mf.get("fundName", ""),
            "name":           mf.get("fundName", ""),
            "category":       mf.get("category", ""),
            "cagr":           cagr_val,
            "unrealized_pnl": round(upnl, 2) if upnl is not None else None,
            "holding_days":   days,
            "is_ltcg":        is_ltcg,
            "cost":           round(invested, 2),
            "current_value":  round(cv, 2),
            "is_mf":          True,
            "_avg_buy_price": invested / max(1, float(mf.get("qty", 1) or 1)),
        })

    return holdings


# ---------------------------------------------------------------------------
# Risk metrics (Alpha, Beta, Sharpe) + chart data
# ---------------------------------------------------------------------------

def _compute_risk_and_chart(
    stocks: list[dict],
    benchmark_sym: str,
) -> tuple[dict | None, list[dict]]:
    """
    Returns (risk_metrics_dict_or_None, chart_data_list).
    Fetches 180 days of daily closes for up to MAX_STOCKS stocks.
    """
    stock_pool = [s for s in stocks if s.get("symbol") and s.get("currentValue")]
    stock_pool = stock_pool[:MAX_STOCKS]

    if not stock_pool:
        return None, []

    total_stock_value = sum(float(s.get("currentValue", 0)) for s in stock_pool)
    if total_stock_value <= 0:
        return None, []

    # Fetch benchmark
    try:
        bench_hist = yf.Ticker(benchmark_sym).history(period="6mo", interval="1d")
        if bench_hist.empty:
            return None, []
        bench_closes = bench_hist["Close"].dropna()
    except Exception:
        return None, []

    # Fetch each stock; weight by current value
    stock_series = {}
    weights = {}
    for s in stock_pool:
        sym = s["symbol"].strip().upper() + ".NS"
        weight = float(s.get("currentValue", 0)) / total_stock_value
        try:
            hist = yf.Ticker(sym).history(period="6mo", interval="1d")
            if hist.empty:
                continue
            closes = hist["Close"].dropna()
            if len(closes) < 20:
                continue
            stock_series[s["symbol"]] = closes
            weights[s["symbol"]] = weight
        except Exception:
            continue

    if len(stock_series) < 5:
        return None, []

    # Re-normalise weights for stocks that have data
    w_total = sum(weights.values())
    if w_total <= 0:
        return None, []
    weights = {k: v / w_total for k, v in weights.items()}

    # Align all series to common dates
    import pandas as pd

    all_series = {"_bench": bench_closes}
    for sym, s in stock_series.items():
        all_series[sym] = s

    df = pd.DataFrame(all_series).dropna()
    if len(df) < 20:
        return None, []

    bench_ret = df["_bench"].pct_change().dropna()

    # Weighted portfolio daily returns
    port_ret = pd.Series(0.0, index=bench_ret.index)
    for sym, w in weights.items():
        if sym in df.columns:
            r = df[sym].pct_change().dropna()
            r = r.reindex(bench_ret.index, fill_value=0.0)
            port_ret += w * r

    if len(port_ret) < 10:
        return None, []

    # Annualised stats
    port_annual  = float(port_ret.mean() * 252)
    bench_annual = float(bench_ret.mean() * 252)
    port_std     = float(port_ret.std())

    cov_matrix = np.cov(port_ret.values, bench_ret.values)
    beta = float(cov_matrix[0, 1] / cov_matrix[1, 1]) if cov_matrix[1, 1] != 0 else None

    alpha  = None
    sharpe = None
    if beta is not None:
        alpha  = round((port_annual - (RISK_FREE_RATE + beta * (bench_annual - RISK_FREE_RATE))) * 100, 2)
        sharpe = round((port_annual - RISK_FREE_RATE) / (port_std * math.sqrt(252)), 2) if port_std > 0 else None

    risk_metrics = {
        "beta":        round(beta, 4) if beta is not None else None,
        "alpha":       alpha,
        "sharpe":      sharpe,
        "port_annual": round(port_annual * 100, 2),
        "bench_annual": round(bench_annual * 100, 2),
    }

    # Chart data - cumulative returns, downsampled every 5 trading days
    port_cum   = (1 + port_ret).cumprod() * 100
    bench_cum  = (1 + bench_ret).cumprod() * 100

    risk_metrics["port_6m_return"]  = round(float(port_cum.iloc[-1] - 100), 2)
    risk_metrics["bench_6m_return"] = round(float(bench_cum.iloc[-1] - 100), 2)

    combined = pd.DataFrame({"portfolio": port_cum, "benchmark": bench_cum}).dropna()
    sampled  = combined.iloc[::5]

    chart_data = [
        {
            "date":      str(idx.date()),
            "portfolio": round(float(row["portfolio"]), 2),
            "benchmark": round(float(row["benchmark"]), 2),
        }
        for idx, row in sampled.iterrows()
    ]

    return risk_metrics, chart_data


# ---------------------------------------------------------------------------
# Tax analysis
# ---------------------------------------------------------------------------

def _compute_tax(holdings: list[dict]) -> dict:
    ltcg_holdings = []
    stcg_holdings = []
    harvest_opportunities = []

    total_ltcg_gain = 0.0
    total_stcg_gain = 0.0
    total_harvestable_loss = 0.0

    for h in holdings:
        # Skip if no buy date or no valid avg price
        if h.get("holding_days") is None:
            continue
        if h.get("_avg_buy_price", 0) <= 0 and not h.get("is_mf"):
            continue
        if h.get("cost", 0) <= 0:
            continue

        upnl = h.get("unrealized_pnl")
        if upnl is None:
            continue

        record = {
            "symbol":         h["symbol"],
            "name":           h["name"],
            "is_mf":          h["is_mf"],
            "holding_days":   h["holding_days"],
            "is_ltcg":        h["is_ltcg"],
            "unrealized_pnl": upnl,
            "cost":           h["cost"],
            "current_value":  h["current_value"],
        }

        if upnl >= 0:
            if h["is_ltcg"]:
                # Simplified per-holding tax estimate (portfolio-level ₹1.25L exemption noted)
                estimated_tax = round(upnl * LTCG_RATE, 2)
                record["estimated_ltcg_tax"] = estimated_tax
                ltcg_holdings.append(record)
                total_ltcg_gain += upnl
            else:
                estimated_tax = round(upnl * STCG_RATE, 2)
                record["estimated_stcg_tax"] = estimated_tax
                stcg_holdings.append(record)
                total_stcg_gain += upnl
        else:
            # Loss - harvest opportunity
            loss_abs = abs(upnl)
            applicable_rate = LTCG_RATE if h["is_ltcg"] else STCG_RATE
            potential_saving = round(loss_abs * applicable_rate, 2)
            harvest_opportunities.append({
                **record,
                "potential_saving": potential_saving,
            })
            total_harvestable_loss += loss_abs

    # Estimated LTCG tax: exemption of ₹1,25,000 at portfolio level
    ltcg_taxable = max(0.0, total_ltcg_gain - 125000)
    estimated_ltcg_tax  = round(ltcg_taxable * LTCG_RATE, 2)
    estimated_stcg_tax  = round(total_stcg_gain * STCG_RATE, 2)

    return {
        "ltcg_holdings":          ltcg_holdings,
        "stcg_holdings":          stcg_holdings,
        "harvest_opportunities":  harvest_opportunities,
        "total_ltcg_gain":        round(total_ltcg_gain, 2),
        "total_stcg_gain":        round(total_stcg_gain, 2),
        "estimated_ltcg_tax":     estimated_ltcg_tax,
        "estimated_stcg_tax":     estimated_stcg_tax,
        "total_tax_liability":    round(estimated_ltcg_tax + estimated_stcg_tax, 2),
        "total_harvestable_loss": round(total_harvestable_loss, 2),
        "note": (
            "LTCG ₹1.25L exemption applied at portfolio level. "
            "Per-holding LTCG tax figures use 12.5% flat (pre-exemption). "
            "Consult a tax advisor for exact liability."
        ),
    }


# ---------------------------------------------------------------------------
# Total portfolio CAGR
# ---------------------------------------------------------------------------

def _portfolio_cagr(holdings: list[dict]) -> float | None:
    """Cost-weighted average holding period, then portfolio-level CAGR."""
    total_cost = 0.0
    total_cv   = 0.0
    weighted_days = 0.0

    for h in holdings:
        cost = h.get("cost", 0) or 0
        cv   = h.get("current_value", 0) or 0
        days = h.get("holding_days")

        if cost <= 0 or days is None or days <= 0:
            continue

        total_cost    += cost
        total_cv      += cv
        weighted_days += cost * days

    if total_cost <= 0 or weighted_days <= 0:
        return None

    avg_days = weighted_days / total_cost
    return _cagr(total_cost, total_cv, avg_days)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def compute_portfolio_metrics(
    stocks: list[dict],
    mutual_funds: list[dict],
    benchmark: str = "nifty50",
) -> dict:
    """
    Main function called by the Flask route.
    Returns a dict with keys: success, performance, holdings, chart_data, tax.
    """
    try:
        benchmark_sym = BENCHMARK_SYMBOLS.get(benchmark, BENCHMARK_SYMBOLS["nifty50"])

        # 1. Per-holding enrichment
        holdings = _build_holdings(stocks, mutual_funds)

        # 2. Portfolio-level totals
        total_invested = sum(h["cost"] for h in holdings if h["cost"] > 0)
        total_current  = sum(h["current_value"] for h in holdings)
        total_pnl      = total_current - total_invested
        port_cagr      = _portfolio_cagr(holdings)

        # 3. Risk metrics + chart (stocks only)
        risk_metrics, chart_data = _compute_risk_and_chart(stocks, benchmark_sym)

        bench_cagr      = None
        alpha           = None
        beta            = None
        sharpe          = None
        port_6m_return  = None
        bench_6m_return = None

        if risk_metrics:
            bench_cagr       = risk_metrics.get("bench_annual")
            alpha            = risk_metrics.get("alpha")
            beta             = risk_metrics.get("beta")
            sharpe           = risk_metrics.get("sharpe")
            port_6m_return   = risk_metrics.get("port_6m_return")
            bench_6m_return  = risk_metrics.get("bench_6m_return")

        # 4. Tax analysis
        tax = _compute_tax(holdings)

        # Strip internal keys from public holdings output
        public_holdings = [
            {k: v for k, v in h.items() if not k.startswith("_")}
            for h in holdings
        ]

        return {
            "success": True,
            "performance": {
                "portfolio_cagr":   port_cagr,
                "benchmark_cagr":   bench_cagr,
                "port_6m_return":   port_6m_return,
                "bench_6m_return":  bench_6m_return,
                "alpha":            alpha,
                "beta":             beta,
                "sharpe":           sharpe,
                "total_invested":   round(total_invested, 2),
                "total_current":    round(total_current, 2),
                "total_pnl":        round(total_pnl, 2),
            },
            "holdings":   public_holdings,
            "chart_data": chart_data,
            "tax":        tax,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}
