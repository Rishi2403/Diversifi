from groww_data import fetch_live_data

from risk import RiskManager


risk = RiskManager()


print("\n⏳ Running market scan")
NIFTY_50 = [
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
    "LT", "SBIN", "AXISBANK", "ITC"
]
for i in NIFTY_50:
    print(fetch_live_data(i))


