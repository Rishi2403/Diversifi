# pre_market_scanner.py
from groww_data import fetch_live_data


def pre_market_scan(
    symbols,
    min_gap_pct=0.5,
    min_volume=1_000_000,
    max_candidates=5
):
    """
    Scans pre-market / early market data and returns top candidates.
    FUNCTIONAL ONLY — no LLM.
    """

    candidates = []

    for symbol in symbols:
        try:
            data = fetch_live_data(symbol)

            ohlc = data.get("ohlc", {})
            prev_close = ohlc.get("close")
            open_price = ohlc.get("open")
            volume = data.get("volume", 0)
            day_change_pct = data.get("day_change_perc", 0)

            if not prev_close or not open_price:
                continue

            gap_pct = ((open_price - prev_close) / prev_close) * 100

            if abs(gap_pct) >= min_gap_pct and volume >= min_volume:
                candidates.append({
                    "symbol": symbol,
                    "gap_pct": round(gap_pct, 2),
                    "volume": volume,
                    "day_change_pct": round(day_change_pct, 2)
                })

        except Exception as e:
            print(f"[SCAN ERROR] {symbol}: {e}")

    # Sort by absolute gap (most active first)
    candidates.sort(key=lambda x: abs(x["gap_pct"]), reverse=True)

    return candidates[:max_candidates]
