# trader.py
import time
from growwapi import GrowwAPI
from .trading_state import TradingState
from .execution_engine import ExecutionEngine
from .signal_adapter import SignalAdapter
from .pre_market_scanner import pre_market_scan
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

groww = GrowwAPI(os.getenv("GROWW_API_KEY"))

NIFTY_50 = [
    "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK", 
    "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV", "BEL", "BHARTIARTL", 
    "BPCL", "BRITANNIA", "CIPLA", "COALINDIA", "DRREDDY", 
    "EICHERMOT", "GRASIM", "HCLTECH", "HDFCBANK", "HDFCLIFE", 
    "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK", "INDUSINDBK", 
    "INFY", "ITC", "JIOFIN", "JSWSTEEL", "KOTAKBANK", 
    "LT", "M&M", "MARUTI", "NESTLEIND", "NTPC", 
    "ONGC", "POWERGRID", "RELIANCE", "SBILIFE", "SBIN", 
    "SHRIRAMFIN", "SUNPHARMA", "TATACONSUM", "TATAMOTORS", "TATASTEEL", 
    "TCS", "TECHM", "TITAN", "TRENT", "ULTRACEMCO", "WIPRO"
]


state = TradingState()
engine = ExecutionEngine(groww, state)
adapter = SignalAdapter(engine, state, confidence_threshold=0.75)

print("Running pre-market scan...")
candidates = pre_market_scan(NIFTY_50)
print([i["symbol"] for i in candidates])


while True:
    now = datetime.now()
    if now.hour >= 15:
        print("[STOP] Market closed. Shutting down trader.")
        break

    if state.trades_today >= state.max_trades_per_day:
        print("[STOP] Max trades reached. Shutting down trader.")
        break
    print("\n=== New Scan Cycle ===")
    for item in candidates:
        symbol = item["symbol"]
        adapter.process_symbol(symbol)
        time.sleep(1)  # avoid rate limit

    print("Cycle complete. Sleeping for 5 minutes...")
    time.sleep(300)  # 5-minute cycle
