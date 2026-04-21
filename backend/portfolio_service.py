import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())


def fetch_groww_holdings():
    try:
        from growwapi import GrowwAPI
        api_key = os.getenv("GROWW_API_KEY")
        secret = os.getenv("GROWW_SECRET")
        if not api_key or not secret:
            return {"success": False, "error": "Groww credentials not configured"}
        access_token = GrowwAPI.get_access_token(api_key=api_key, secret=secret)
        groww = GrowwAPI(access_token)
        response = groww.get_holdings_for_user(timeout=10)
        raw = response if isinstance(response, list) else response.get("data", [])
        holdings = []
        for h in raw:
            symbol = (h.get("tradingSymbol") or h.get("tradingsymbol") or "").upper()
            holdings.append({
                "symbol": symbol,
                "name": h.get("companyName") or symbol,
                "qty": float(h.get("quantity") or h.get("holdingQty") or 0),
                "avgBuyPrice": float(h.get("averagePrice") or h.get("avgPrice") or 0),
                "currentPrice": float(h.get("lastPrice") or h.get("ltp") or 0),
                "currentValue": float(h.get("holdingValue") or h.get("currentValue") or 0),
            })
        return {"success": True, "data": holdings, "source": "Groww"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def fetch_groww_mf():
    try:
        from growwapi import GrowwAPI
        api_key = os.getenv("GROWW_API_KEY")
        secret = os.getenv("GROWW_SECRET")
        access_token = GrowwAPI.get_access_token(api_key=api_key, secret=secret)
        groww = GrowwAPI(access_token)
        if hasattr(groww, "get_mf_holdings"):
            response = groww.get_mf_holdings(timeout=10)
        else:
            return {"success": False, "error": "MF holdings not available in this growwapi version"}
        raw = response if isinstance(response, list) else response.get("data", [])
        mf_list = []
        for m in raw:
            mf_list.append({
                "fundName": m.get("schemeName") or m.get("fundName") or "",
                "category": m.get("category") or m.get("schemeType") or "Equity",
                "investedAmount": float(m.get("investedAmount") or m.get("amountInvested") or 0),
                "currentValue": float(m.get("currentValue") or m.get("marketValue") or 0),
            })
        return {"success": True, "data": mf_list, "source": "Groww"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def fetch_live_price(symbol: str):
    try:
        import yfinance as yf
        ticker = yf.Ticker(f"{symbol.upper()}.NS")
        hist = ticker.history(period="2d", interval="1d")
        if hist.empty:
            ticker = yf.Ticker(symbol.upper())
            hist = ticker.history(period="2d", interval="1d")
        if not hist.empty:
            return {"success": True, "symbol": symbol.upper(), "price": round(float(hist["Close"].iloc[-1]), 2)}
        return {"success": False, "symbol": symbol.upper(), "error": "No data"}
    except Exception as e:
        return {"success": False, "symbol": symbol.upper(), "error": str(e)}


def fetch_bulk_prices(symbols: list):
    try:
        import yfinance as yf
        result = {}
        for s in symbols:
            r = fetch_live_price(s)
            result[s.upper()] = r.get("price") if r.get("success") else None
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
