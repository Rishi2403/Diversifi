import time
from growwapi import GrowwAPI

groww = GrowwAPI("YOUR_GROWW_API_TOKEN")

def place_entry_exit(symbol, ltp, qty):
    sl = round(ltp * 0.99, 2)
    target = round(ltp * 1.02, 2)

    groww.create_smart_order(
        smart_order_type="GTT",
        reference_id=f"{symbol}-BUY-{int(time.time())}",
        segment="CASH",
        trading_symbol=symbol,
        exchange="NSE",
        quantity=qty,
        product_type="CNC",
        trigger_price=str(ltp),
        trigger_direction="DOWN",
        order={
            "transaction_type": "BUY",
            "order_type": "LIMIT",
            "price": str(ltp)
        }
    )

    groww.create_smart_order(
        smart_order_type="OCO",
        reference_id=f"{symbol}-SELL-{int(time.time())}",
        segment="CASH",
        trading_symbol=symbol,
        exchange="NSE",
        quantity=qty,
        product_type=groww.PRODUCT_CNC,
        stop_loss_price=str(sl),
        target_price=str(target),
        transaction_type="SELL"
    )
