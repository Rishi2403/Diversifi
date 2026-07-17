"""
mcp_service.py - MCP (Model Context Protocol) server for Diversifi.

Exposes every finance data source used by the platform as MCP tools:

  Stocks & Market
  ─────────────────────────────────────────────────────────────────────────────
  get_stock_price         : live price + 1-day change via yfinance
  get_stock_analysis      : full signal score (technical/momentum/fundamental/sentiment)
  suggest_stocks          : ranked buy suggestions by amount, horizon, risk, sector
  get_market_pulse        : sector heatmap + top movers (NSE)
  get_global_market_data  : commodities, forex, global indices via yfinance
  get_fii_dii_data        : FII / DII institutional flow data

  Mutual Funds
  ─────────────────────────────────────────────────────────────────────────────
  get_mf_summary          : NAV, returns, score for a single fund (by name)
  get_mf_pulse            : category-wise MF heatmap + top performers
  suggest_mfs             : ranked MF suggestions by amount, horizon, risk, category
  analyse_mf              : full analysis report for a named mutual fund

  Portfolio
  ─────────────────────────────────────────────────────────────────────────────
  get_portfolio_summary   : holdings breakdown + allocation weights for a user
  get_portfolio_metrics   : CAGR, XIRR, risk, tax, and chart data for a user

  Sentiment
  ─────────────────────────────────────────────────────────────────────────────
  get_sentiment           : TextBlob + keyword sentiment over a list of texts
  get_market_news         : top headlines scraped for a stock symbol

  Knowledge Base (RAG)
  ─────────────────────────────────────────────────────────────────────────────
  query_finance_kb        : RAG answer from the NSDL Finance PDF

Run standalone (SSE on port 8001):
    python mcp_service.py
"""

import json
import math
import os
from typing import Any

import yfinance as yf
from dotenv import load_dotenv
from fastmcp import FastMCP

load_dotenv()

mcp = FastMCP(
    name="diversifi-finance",
    instructions=(
        "You are a financial assistant for Diversifi. "
        "Use the tools to fetch live prices, portfolio metrics, mutual fund data, "
        "market news, sentiment scores, global market data, and answers from the "
        "NSDL Finance knowledge base. Always prefer tool output over prior knowledge "
        "for live or user-specific data."
    ),
)


# ── internal helpers ───────────────────────────────────────────────────────────

def _safe_float(v: Any) -> float | None:
    try:
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None


def _load_user_data(email: str) -> dict | str:
    """Load a user's portfolio JSON; return dict or an error string."""
    holdings_path = os.path.join(os.path.dirname(__file__), "holdings.json")
    if not os.path.exists(holdings_path):
        return "Holdings store not found."
    with open(holdings_path) as f:
        index = json.load(f)
    data_file = index.get("users", {}).get(email)
    if not data_file:
        return f"No portfolio found for {email}"
    user_path = os.path.join(os.path.dirname(__file__), data_file)
    if not os.path.exists(user_path):
        return "User portfolio file missing."
    with open(user_path) as f:
        return json.load(f)


# ══════════════════════════════════════════════════════════════════════════════
# STOCKS & MARKET
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def get_stock_price(symbol: str) -> dict:
    """
    Return the latest price, previous close, and 1-day % change for a stock.
    Example: symbol='RELIANCE.NS'
    """
    info = yf.Ticker(symbol).info
    price = _safe_float(info.get("currentPrice") or info.get("regularMarketPrice"))
    prev = _safe_float(info.get("previousClose"))
    return {
        "symbol": symbol,
        "price": price,
        "previous_close": prev,
        "change_pct": round((price - prev) / prev * 100, 2) if price and prev else None,
        "currency": info.get("currency", "INR"),
    }


@mcp.tool()
def get_stock_analysis(symbol: str) -> dict:
    """
    Full signal-score analysis for a stock: technical (RSI, DMA, MACD),
    momentum, fundamental (PE/EPS), and sentiment components.
    Example: symbol='TCS.NS'
    """
    try:
        from research_service import analyse_stock
        return analyse_stock(symbol)
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def suggest_stocks(amount: int, horizon: str, risk: str, sector: str | None = None) -> dict:
    """
    Return ranked stock buy suggestions.
    - amount  : investment amount in INR
    - horizon : 'short' | 'medium' | 'long'
    - risk    : 'low' | 'medium' | 'high'
    - sector  : optional sector filter e.g. 'IT', 'Banking'
    """
    try:
        from research_service import suggest_stocks as _suggest
        return _suggest(amount, horizon, risk, sector)
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def get_market_pulse() -> dict:
    """
    NSE sector heatmap, top gainers, top losers, and overall market mood.
    """
    try:
        from research_service import get_pulse_data
        return get_pulse_data()
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def get_global_market_data() -> dict:
    """
    Live commodities (crude, gold, silver…), forex pairs (USD/INR, EUR/INR…),
    and global indices via yfinance.
    """
    try:
        from global_market_service import fetch_global_market_data
        return fetch_global_market_data()
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def get_fii_dii_data() -> dict:
    """
    Latest FII (Foreign Institutional Investor) and DII (Domestic Institutional
    Investor) net buy/sell flow data.
    """
    try:
        from global_market_service import fetch_fii_dii
        return fetch_fii_dii()
    except Exception as e:
        return {"error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# MUTUAL FUNDS
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def get_mf_summary(fund_name: str) -> dict:
    """
    NAV, 1Y/3Y/5Y returns, risk grade, and signal score for a single mutual fund.
    Example: fund_name='Mirae Asset Large Cap Fund'
    """
    try:
        from mf_service import analyse_mf
        return analyse_mf(fund_name)
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def get_mf_pulse() -> dict:
    """
    Category-wise MF performance heatmap and top-performing funds across categories.
    """
    try:
        from mf_service import get_mf_pulse_data
        return get_mf_pulse_data()
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def suggest_mfs(
    amount: int,
    horizon: str,
    risk: str,
    category: str | None = None,
) -> dict:
    """
    Return ranked mutual fund suggestions.
    - amount   : investment amount in INR
    - horizon  : 'short' | 'medium' | 'long'
    - risk     : 'low' | 'medium' | 'high'
    - category : optional e.g. 'Large Cap', 'ELSS', 'Debt'
    """
    try:
        from mf_service import suggest_mfs as _suggest
        return _suggest(amount, horizon, risk, category)
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def analyse_mf(query: str) -> dict:
    """
    Deep analysis for a mutual fund — NAV trend, category comparison, risk metrics.
    Example: query='Axis Bluechip Fund'
    """
    try:
        from mf_service import analyse_mf as _analyse
        return _analyse(query)
    except Exception as e:
        return {"error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# PORTFOLIO
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def get_portfolio_summary(email: str) -> dict:
    """
    Holdings breakdown for a user: symbols, quantities, avg prices,
    invested amounts, and allocation weights.
    """
    data = _load_user_data(email)
    if isinstance(data, str):
        return {"error": data}

    holdings = data.get("holdings", [])
    total = sum(h.get("avg_price", 0) * h.get("quantity", 0) for h in holdings)
    rows = [
        {
            "symbol": h.get("symbol"),
            "quantity": h.get("quantity"),
            "avg_price": h.get("avg_price"),
            "invested": round(h.get("avg_price", 0) * h.get("quantity", 0), 2),
            "weight_pct": round(
                h.get("avg_price", 0) * h.get("quantity", 0) / total * 100, 2
            ) if total else 0,
        }
        for h in holdings
    ]
    return {"email": email, "total_invested": round(total, 2), "holdings": rows}


@mcp.tool()
def get_portfolio_metrics(email: str) -> dict:
    """
    Full portfolio analytics for a user: CAGR, XIRR, Sharpe ratio,
    tax liability breakdown (STCG/LTCG), and chart-ready time-series data.
    """
    data = _load_user_data(email)
    if isinstance(data, str):
        return {"error": data}

    try:
        from portfolio_analysis import compute_portfolio_metrics
        stocks = data.get("holdings", [])
        mfs = data.get("mutual_funds", [])
        return compute_portfolio_metrics(stocks, mfs)
    except Exception as e:
        return {"error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# SENTIMENT
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def get_sentiment(texts: list[str]) -> dict:
    """
    Run TextBlob + financial-keyword sentiment over a list of text strings.
    Returns overall label ('positive' | 'negative' | 'neutral') and per-item scores.
    """
    try:
        from helper_func import analyze_sentiment
        return analyze_sentiment(texts)
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def get_market_news(symbol: str, limit: int = 5) -> list[dict]:
    """
    Scrape latest news headlines for a stock symbol from Finviz / MarketWatch.
    Example: symbol='INFY', limit=5
    """
    try:
        from news_service import NewsService
        return NewsService().fetch_stock_news(symbol, limit) or []
    except Exception as e:
        return [{"error": str(e)}]


# ══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE BASE (RAG)
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def query_finance_kb(question: str) -> str:
    """
    Answer a question using the NSDL Finance PDF knowledge base (RAG pipeline).
    Example: question='What depository services does NSDL provide?'
    """
    try:
        from rag_service import query_finance_kb as _query
        return _query(question)
    except Exception as e:
        return f"RAG lookup failed: {e}"


# ── entrypoint ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run(transport="sse", host="0.0.0.0", port=8001)
