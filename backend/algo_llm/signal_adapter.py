# signal_adapter.py
from datetime import datetime
from .trading_state import TradingState
from .execution_engine import ExecutionEngine
from .trading_lang import build_graph


class SignalAdapter:
    def __init__(
        self,
        execution_engine: ExecutionEngine,
        state: TradingState,
        confidence_threshold: float = 0.75
    ):
        self.execution_engine = execution_engine
        self.state = state
        self.confidence_threshold = confidence_threshold
        self.graph = build_graph()

    def process_symbol(self, symbol: str):
        now = datetime.now()

        # ---------- RISK GATE ----------
        if not self.state.can_take_trade(symbol, now):
            print(f"[SKIP] Risk gate blocked trade for {symbol}")
            return

        # ---------- AI ANALYSIS ----------
        question = f"Intraday analysis for {symbol}. Decide Buy or Hold."
        initial_state = {
            "question": question,
            "category": "",
            "missing_info": None,
            "confidence": 0.0,
            "reasoning": "",
            "clarification_used": False,
            "answer": "",
            "trade_signal": None,   # IMPORTANT
            "status": "RUNNING",
            "events": [],
            "symbol": None,
            "stock_sentiment": None,
            "bull_analysis": None,
            "bear_analysis": None,
            "mf_matches": None,
            "mf_categories": None,
            "mf_scraped_data": None,
            "should_scrape": False
        }

        result = self.graph.invoke(initial_state)

        signal = result.get("trade_signal")
        if not signal:
            print(f"[HOLD] No trade signal for {symbol}")
            return

        print("Received response:", result)
        action = signal.get("action")
        confidence = signal.get("confidence", 0.0)

        # ---------- DECISION GATE ----------
        if action != "BUY":
            print(f"[HOLD] Signal={action} for {symbol}")
            return

        if confidence < self.confidence_threshold:
            print(f"[HOLD] Confidence {confidence} < threshold for {symbol}")
            return

        # ---------- EXECUTION ----------
        print(f"[BUY] {symbol} | Confidence={confidence}")

        entry = self.execution_engine.place_entry_order(symbol)
        entry_order_id = entry["order_id"]
        quantity = entry["quantity"]
        ltp = entry["ltp"]

        confirm = self.execution_engine.confirm_entry(entry_order_id)
        if not confirm["filled"]:
            print(f"[FAIL] Entry failed for {symbol}")
            return

        self.state.register_entry(
            symbol=symbol,
            quantity=quantity,
            price=ltp,
            order_id=entry_order_id
        )

        # ---------- EXIT (OCO) ----------
        target_price = round(ltp * 1.01, 2)   # +1%
        stop_price = round(ltp * 0.995, 2)    # -0.5%

        oco = self.execution_engine.place_exit_oco(
            symbol=symbol,
            quantity=quantity,
            target_price=target_price,
            stop_price=stop_price
        )

        self.state.register_exit_oco(
            symbol=symbol,
            oco_order_id=oco.get("smart_order_id")
        )

        print(f"[ACTIVE] {symbol} trade live with OCO attached")
