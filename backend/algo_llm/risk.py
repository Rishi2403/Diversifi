from config import DAILY_CAPITAL, BASE_RISK

class RiskManager:
    def __init__(self):
        self.losses = 0

    def risk_percent(self):
        if self.losses == 0:
            return BASE_RISK
        elif self.losses == 1:
            return 0.0075
        elif self.losses == 2:
            return 0.005
        else:
            return 0

    def capital_at_risk(self):
        return DAILY_CAPITAL * self.risk_percent()

    def update(self, pnl):
        if pnl < 0:
            self.losses += 1
        else:
            self.losses = 0
