# execution_engine.py
from datetime import datetime
from growwapi import GrowwAPI
from .groww_data import fetch_live_data
from .trading_state import TradingState


class ExecutionEngine:
    def __init__(self, groww: GrowwAPI, state: TradingState):
        self.groww = groww
        self.state = state

    # ---------------- ENTRY ----------------
    def place_entry_order(self, symbol: str) -> dict:
        quote = fetch_live_data(symbol)
        ltp = quote["last_price"]

        try: 
            quantity = int(self.state.capital_per_trade // ltp)
            if quantity <= 0:
                raise ValueError("Quantity computed as zero")
                

            response = self.groww.place_order(
                trading_symbol=symbol,
                quantity=quantity,
                validity=self.groww.VALIDITY_DAY,
                exchange=self.groww.EXCHANGE_NSE,
                segment=self.groww.SEGMENT_CASH,
                product=self.groww.PRODUCT_CNC,
                order_type=self.groww.ORDER_TYPE_MARKET,
                transaction_type=self.groww.TRANSACTION_TYPE_BUY
            )

            return {
                "order_id": response["groww_order_id"],
                "quantity": quantity,
                "ltp": ltp
            }
        except Exception as e:
            print(f"[ORDER ERROR] Failed to place entry order for {symbol}: {e}")
            return {
                "order_id": "",
                "quantity": 0,
                "ltp": ltp
            }

    def confirm_entry(self, order_id: str) -> dict:
        status = self.groww.get_order_status(
            groww_order_id=order_id,
            segment=self.groww.SEGMENT_CASH
        )

        if status["order_status"] in ["EXECUTED", "COMPLETED"]:
            return {
                "filled": True,
                "filled_quantity": status["filled_quantity"]
            }

        if status["order_status"] in ["REJECTED", "FAILED", "CANCELLED"]:
            return {"filled": False}

        return {"filled": None}  # still pending

    # ---------------- EXIT (OCO) ----------------
    def place_exit_oco(
        self,
        symbol: str,
        quantity: int,
        target_price: float,
        stop_price: float
    ) -> dict:
        response = self.groww.create_smart_order(
            smart_order_type=self.groww.SMART_ORDER_TYPE_OCO,
            reference_id=f"oco-{symbol}-{int(datetime.now().timestamp())}",
            segment=self.groww.SEGMENT_CASH,
            trading_symbol=symbol,
            quantity=quantity,
            product_type=self.groww.PRODUCT_MIS,
            exchange=self.groww.EXCHANGE_NSE,
            duration=self.groww.VALIDITY_DAY,
            net_position_quantity=quantity,
            transaction_type=self.groww.TRANSACTION_TYPE_SELL,
            target={
                "trigger_price": str(target_price),
                "order_type": self.groww.ORDER_TYPE_LIMIT,
                "price": str(target_price)
            },
            stop_loss={
                "trigger_price": str(stop_price),
                "order_type": self.groww.ORDER_TYPE_STOP_LOSS_MARKET,
                "price": None
            }
        )

        return response
