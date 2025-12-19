# trader.py
import time
from growwapi import GrowwAPI
from .trading_state import TradingState
from .execution_engine import ExecutionEngine
from .signal_adapter import SignalAdapter
from .pre_market_scanner import pre_market_scan
import os
from dotenv import load_dotenv, find_dotenv
from datetime import datetime

load_dotenv(find_dotenv())

api_key =os.getenv("GROWW_API_KEY")
secret = os.getenv("GROWW_SECRET")
 
access_token = GrowwAPI.get_access_token(api_key=api_key, secret=secret)
groww = GrowwAPI(access_token)

NIFTY_50 = [
    "INDIGO", "TCS", "MAXHEALTH", "TECHM",
    "INFY", "WIPRO", "ADANIPORTS", "HINDALCO",
    "DRREDDY", "HDFCLIFE", "HCLTECH", "AXISBANK",
    "ICICIBANK", "SBILIFE", "TITAN", "ITC",
    "BAJAJFINSV", "SHRIRAMFIN", "JSWSTEEL", "ETERNAL",
    "BAJFINANCE", "APOLLOHOSP", "COALINDIA", "SBIN",
    "CIPLA", "TMPV", "RELIANCE", "GRASIM",
    "ADANIENT", "JIOFIN", "TRENT", "HINDUNILVR",
    "KOTAKBANK", "NESTLEIND", "HDFCBANK", "BHARTIARTL",
    "ONGC", "MARUTI", "EICHERMOT", "ULTRACEMCO",
    "BEL", "BAJAJ-AUTO", "M&M", "NTPC",
    "LT", "TATACONSUM", "ASIANPAINT", "POWERGRID",
    "TATASTEEL", "SUNPHARMA"
]

NIFTY_NEXT_50 = [
    "HINDZINC", "VEDL", "DIVISLAB", "INDHOTEL", "RECLTD", "GODREJCP",
    "BAJAJHFL", "CHOLAFIN", "HAL", "LICI", "VBL", "LODHA",
    "HAVELLS", "BANKBARODA", "ICICIGI", "HYUNDAI", "LTIM", "PIDILITIND",
    "ADANIENSOL", "PFC", "MAZDOCK", "SOLARINDS", "TORNTPHARM", "CANBK",
    "IRFC", "NAUKRI", "PNB", "BOSCHLTD", "ZYDUSLIFE", "IOC",
    "GAIL", "ADANIGREEN", "DLF", "TVSMOTOR", "JSWENERGY", "TATAPOWER",
    "BRITANNIA", "AMBUJACEM", "SHREECEM", "CGPOWER", "BPCL", "ADANIPOWER",
    "ABB", "BAJAJHLDNG", "JINDALSTEL", "DMART", "SIEMENS", "MOTHERSON",
    "UNITDSPR", "ENRIN"
]

nse_tickers = [
    "BEL",
    "COALINDIA",
    "ITC",
    "JIOFIN",
    "NTPC",
    "ONGC",
    "POWERGRID",
    "TATASTEEL",
    "WIPRO"
]


state = TradingState()
engine = ExecutionEngine(groww, state)
adapter = SignalAdapter(engine, state, confidence_threshold=0.65)

# print("Running pre-market scan...")
# candidates = pre_market_scan(NIFTY_50)
# print([i["symbol"] for i in candidates])


while True:
    now = datetime.now()
    if now.hour >= 15:
        print("[STOP] Market closed. Shutting down trader.")
        break

    if state.trades_today >= state.max_trades_per_day:
        print("[STOP] Max trades reached. Shutting down trader.")
        break
    print("\n=== New Scan Cycle ===")
    for item in nse_tickers:
        symbol = item
        adapter.process_symbol(symbol)
        time.sleep(1)  # avoid rate limit

    print("Cycle complete. Sleeping for 5 minutes...")
    time.sleep(300)  # 5-minute cycle
