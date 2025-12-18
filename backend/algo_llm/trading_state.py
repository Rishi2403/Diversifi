# trading_state.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional


@dataclass
class Position:
    symbol: str
    quantity: int
    entry_price: float
    entry_order_id: str
    oco_order_id: Optional[str] = None
    status: str = "OPEN"  # OPEN / CLOSED


@dataclass
class TradingState:
    # ---- CONFIG (LOCKED) ----
    max_trades_per_day: int = 6
    max_capital_per_day: float = 5000
    capital_per_trade: float = 2000

    # ---- RUNTIME STATE ----
    trades_today: int = 0
    used_capital_today: float = 0.0
    positions: Dict[str, Position] = field(default_factory=dict)
    traded_symbols_today: set = field(default_factory=set)
    trading_day: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

    # ---- HELPERS ----
    def can_take_trade(self, symbol: str, now: datetime) -> bool:
        if self.trades_today >= self.max_trades_per_day:
            return False

        if self.used_capital_today + self.capital_per_trade > self.max_capital_per_day:
            return False

        if symbol in self.traded_symbols_today:
            return False

        if now.hour >= 15:  # 3:00 PM cutoff
            return False

        return True

    def register_entry(self, symbol: str, quantity: int, price: float, order_id: str):
        self.trades_today += 1
        self.used_capital_today += price * quantity
        self.traded_symbols_today.add(symbol)

        self.positions[symbol] = Position(
            symbol=symbol,
            quantity=quantity,
            entry_price=price,
            entry_order_id=order_id
        )

    def register_exit_oco(self, symbol: str, oco_order_id: str):
        if symbol in self.positions:
            self.positions[symbol].oco_order_id = oco_order_id

    def close_position(self, symbol: str):
        if symbol in self.positions:
            self.positions[symbol].status = "CLOSED"
