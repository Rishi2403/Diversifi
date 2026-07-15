# DiversiFi — Internal Feature Documentation

**Purpose:** End-to-end implementation reference for all platform features. Covers data sources, algorithms, design decisions, and the reasoning behind every major technical choice. Intended for team review and judge presentations.

---

## Table of Contents

1. [Analyse — Portfolio Health Analyser](#1-analyse--portfolio-health-analyser)
2. [Simulate — Advanced Monte Carlo Simulation](#2-simulate--advanced-monte-carlo-simulation)
3. [Research — Three Sub-Features](#3-research--three-sub-features)
   - 3.1 [Market Pulse](#31-market-pulse)
   - 3.2 [Deep Stock / MF Analyse](#32-deep-stock--mf-analyse)
   - 3.3 [AI Stock / MF Suggest](#33-ai-stock--mf-suggest)
4. [News — Global Trade Intelligence](#4-news--global-trade-intelligence)
5. [AlphaMind — Autonomous Portfolio Agent](#5-alphamind--autonomous-portfolio-agent)
6. [AlgoTrading — Algorithmic Trading Engine](#6-algotrading--algorithmic-trading-engine)
7. [Chat — Investment AI Assistant](#7-chat--investment-ai-assistant)

---

## 1. Analyse — Portfolio Health Analyser

### 1.1 What It Does

The Analyse feature takes a user's complete portfolio (manually entered stocks and mutual funds, or auto-imported from Groww) and produces two layers of analysis:

- **Instant analysis (< 1 second):** A frontend-computed health score, diversification score, and set of rebalancing recommendations. No backend call needed — runs entirely in the browser.
- **Deep analysis (async):** A backend call that fetches 6 months of real market data from yfinance, computes performance metrics like Alpha, Beta, and Sharpe Ratio, and produces a tax breakdown.

### 1.2 User Input

The user goes through a 4-step wizard:

1. **Import** — Optional: connect Groww API to auto-import live holdings (symbols, quantities, average buy prices, current prices). Or enter manually.
2. **Profile** — Risk appetite (Conservative / Moderate / Aggressive), benchmark (Nifty 50 or Nifty 500), investment goal (Wealth Growth / Passive Income / Retirement / Short Term), age, monthly SIP amount.
3. **Stocks** — Per holding: Symbol, Quantity, Average Buy Price, Current Price (auto-fetched on blur from `GET /portfolio/price/<symbol>` via yfinance), Buy Date.
4. **Mutual Funds + Cash** — Fund name, category (Large Cap / Mid Cap / Small Cap / Flexi Cap / ELSS / Index / Sectoral / Value / Hybrid), current value, buy date; total cash balance.

Live price fetch on the frontend: when the user types a symbol and moves focus away, the frontend calls `GET /portfolio/price/<symbol>`. The backend calls `yf.Ticker("<symbol>.NS").history(period="2d")` and returns `Close.iloc[-1]`. This eliminates manual price lookups.

### 1.3 Data Sources

| Source | What It Provides |
|--------|-----------------|
| **Groww API** (`growwapi.GrowwAPI`) | Live holdings: symbol, quantity, average price, LTP, current value. Auto-import path. |
| **yfinance** | 6-month daily OHLCV for each stock + benchmark. Used for Beta, Alpha, Sharpe, chart data. |
| **mfapi.in** | NAV history for mutual funds (if MF analysis is needed). |
| **Frontend-only** | Health score, diversification score, sector allocations — computed in-browser from user input. |

### 1.4 Frontend Analysis Engine (`portfolioEngine`)

This runs instantly in the browser from the user's entered data alone.

**Health Score (0–100)** is a weighted sum of six sub-scores:

| Sub-score | Max Points | What It Measures |
|-----------|-----------|-----------------|
| Sector Spread | 25 | How many different sectors the portfolio covers |
| Asset Class Spread | 20 | Balance between stocks, MFs, cash |
| Concentration Safety | 30 | Whether any single holding dominates the portfolio |
| MF Overlap Safety | 15 | Whether MFs in the portfolio hold the same underlying stocks |
| Risk Alignment | 10 | Whether the portfolio's risk level matches the user's stated risk appetite |
| Benchmark Alignment | 10 | Whether the portfolio is likely to track or beat the chosen benchmark |

**Diversification Score** is a separate index focused on how well risk is spread across:
- Number of sectors represented (a portfolio in 8+ sectors scores highest)
- Largest single holding as a percentage of total (the "concentration penalty")
- Presence of both equity and non-equity instruments (MFs, cash)
- MF category spread (Large + Mid + Small Cap counts as better than three Large Cap funds)

**Why these specific weights?**
Modern Portfolio Theory establishes that a well-diversified portfolio reduces unsystematic risk (company-specific risk) without sacrificing expected return. The scoring weights reflect this: Concentration Safety (30 pts) is the largest component because a single over-weighted position is the most common and most dangerous diversification failure in retail Indian portfolios (e.g., 60% in one PSU stock). Sector Spread (25 pts) is second-largest because India's Nifty 50 is itself highly sector-concentrated in Financials and IT — a portfolio that mirrors this without awareness is not truly diversified.

**Alternative approaches considered:**
- **Herfindahl-Hirschman Index (HHI):** Sum of squared weight shares — a pure mathematical concentration metric. We use a simplified version (the concentration safety component) but augmented with sector and MF-overlap checks, because HHI alone doesn't penalise owning five mid-cap IT funds that all hold the same 10 stocks.
- **Correlation-based diversification:** Measure diversification through historical return correlations between holdings. More accurate but requires 6+ months of price data for every fund and stock — too slow for instant feedback. This is what the deep analysis does via Beta and portfolio variance.

### 1.5 Backend Deep Analysis (`portfolio_analysis.py`)

This runs asynchronously after the instant score. It fetches actual market data to compute the following:

**Constants used:**
- Risk-Free Rate: **6.5% per annum** (India 91-day Treasury Bill proxy for FY2025-26)
- LTCG Rate: **12.5%** (post-Budget 2024 rate for equity gains above ₹1.25 lakh held > 1 year)
- STCG Rate: **20.0%** (for equity gains on holdings ≤ 1 year)
- Benchmark symbols: `^NSEI` (Nifty 50), `^CRSLDX` (Nifty 500)

**Step 1 — Per-holding enrichment:**
For each stock holding:
```
cost = avgBuyPrice × quantity
days_held = today - buyDate
is_ltcg = (days_held > 365)
unrealized_pnl = currentValue - cost
cagr = (currentValue / cost) ^ (365 / days_held) - 1
```
CAGR (Compound Annual Growth Rate) normalises returns across holdings with different holding periods so the user can compare a 3-month holding with a 2-year holding on an equal footing.

**Step 2 — Risk metric computation:**
Data: `yf.Ticker(benchmark).history(period="6mo", interval="1d")` plus per-stock histories. Requires at least 20 data points per stock and at least 5 stocks with sufficient data. Weights are proportional to each holding's current value.

- **Beta:** Measures how much the portfolio moves relative to the benchmark. `cov(portfolio_daily_returns, benchmark_daily_returns) / var(benchmark_daily_returns)`. Beta = 1.0 means the portfolio moves exactly with the market; Beta = 0.7 means 30% less volatility; Beta = 1.3 means 30% more.

- **Alpha (Jensen's Alpha):** The return the portfolio generates beyond what Beta alone would predict.
  ```
  alpha = annual_portfolio_return − (risk_free_rate + beta × (annual_benchmark_return − risk_free_rate))
  ```
  A positive alpha means the portfolio is generating genuine skill-based returns on top of market exposure.

- **Sharpe Ratio:** Return per unit of risk taken.
  ```
  sharpe = (annual_portfolio_return − risk_free_rate) / (daily_std × √252)
  ```
  The denominator annualises daily standard deviation (there are ~252 trading days per year). A Sharpe > 1.0 is generally considered good; > 2.0 is excellent.

- **6-Month Chart:** Cumulative returns `(1 + daily_return).cumprod() × 100`, sampled every 5 trading days, for both portfolio and benchmark. This lets the user see visually whether they outperformed or underperformed over the last 6 months.

**Why 6 months of data?**
Shorter (e.g. 1 month) is too noisy to compute a meaningful Beta or Sharpe. Longer (e.g. 3 years) would require historical prices for every holding on the exact buy date — which creates data availability issues for newer IPOs and recently-listed stocks. Six months is the practical sweet spot.

**Step 3 — Tax analysis:**
- LTCG holdings (held > 365 days, positive P&L): `estimated_tax = unrealized_pnl × 12.5%`. Portfolio-level: first ₹1,25,000 of LTCG per year is exempt; only gains above this are taxed.
- STCG holdings (held ≤ 365 days, positive P&L): `estimated_tax = unrealized_pnl × 20.0%`.
- Loss holdings: `potential_saving = |unrealized_pnl| × applicable_rate` — this is the "tax-loss harvesting" opportunity. If a user sells a loss-making holding, that loss offsets taxable gains, reducing the tax bill.

---

## 2. Simulate — Advanced Monte Carlo Simulation

### 2.1 What It Does

The Simulate feature lets users project their portfolio's future value under different economic scenarios — crashes, booms, inflation shocks, geopolitical events — and see a statistical range of possible outcomes, not just a single number.

### 2.2 What Is Monte Carlo Simulation?

Most financial projections give a single number: "Your ₹10 lakh will grow to ₹18 lakh in 5 years at 12% returns." The problem is that markets do not move smoothly at 12% every year. In reality, they go up 25% one year, down 15% the next, up 8% after that. A single projection number hides all of this uncertainty.

Monte Carlo simulation solves this by running the same portfolio thousands of times with randomly varying market conditions. Each "run" or "path" represents one possible future — one of 5,000 different universes where markets behave somewhat differently. At the end, instead of one number, you get a distribution: "In 90% of scenarios your portfolio beats ₹X, and in 10% it beats ₹Y." This gives a realistic picture of range and risk.

### 2.3 Why 5,000 Runs?

**Too few runs (e.g., 100):** The results are unstable — run the simulation twice and you get noticeably different answers because random chance dominates with small sample sizes.

**Too many runs (e.g., 50,000):** Diminishing returns on accuracy, but much slower. The percentile estimates (P10, P90) stabilise well before 10,000 runs.

**5,000 runs:** Standard academic and industry practice (used by Vanguard, BlackRock, and most professional financial planning tools) for individual portfolio projections. Provides stable percentile estimates (the 95th-percentile answer changes by < 1% between runs) while keeping computation time under 30 seconds on a single machine. This is hardcoded in the simulation engine: `simulations: 5000`.

### 2.4 The Distribution Model: Geometric Brownian Motion (GBM)

**What GBM means:** Stock prices are modelled as following a "random walk" where each period's return is drawn from a log-normal distribution. Log-normal means prices can never go below zero (which is correct — a stock cannot have negative price) and large positive moves are more likely than large negative moves of the same magnitude (also correct for equity markets historically).

**The formula:**
```
monthly_return = exp((μ - σ²/2) × Δt + σ × √Δt × Z) − 1
```
Where:
- `μ` = annualised expected return (user-entered, default 12%)
- `σ` = annualised volatility (user-entered, default 18%)
- `Δt` = time step = 1/12 (one month)
- `Z` = standard normal random number (different for each month, each run)

**Why GBM and not alternatives?**
- **Simple random walk (arithmetic):** Can produce negative prices. Mathematically incorrect for equity.
- **Mean reversion (Ornstein-Uhlenbeck):** Good for interest rates and currencies but not equities, which have no natural "mean" they revert to.
- **Regime-switching models:** More accurate (markets do switch between bull/bear regimes) but require calibrating historical regime parameters — too complex for user-entered inputs where we don't have the user's specific holdings history.
- **GBM:** Academically established (Black-Scholes framework, 1973 Nobel Prize-winning), matches the statistical properties of equity returns well over multi-year horizons, and takes only two user-understandable parameters: expected return and volatility. This makes it both technically defensible and explainable to users.

### 2.5 User Inputs

**Step 0 — Portfolio:** Stocks (symbol, quantity, avg price, current price auto-fetched), MFs (fund name, category, current value), cash balance. CSV upload supported.

**Step 1 — Investment Plan:** Per-year configuration: SIP amount (monthly contribution), SWP amount (monthly withdrawal), lumpsum additions, planned new stock purchases. Users set a different plan for each year of their horizon (e.g., SIP ₹20,000/month in Year 1-3, then SWP ₹15,000/month in Year 4-5).

**Step 2 — Scenarios:** Users can add:
- **Industry scenarios** (e.g., "IT sector crash, -35% impact, Year 2, 6-month duration, 40% probability"): simulated as a probability-weighted shock applied to the relevant holdings.
- **Geopolitical scenarios** (e.g., "Russia-Ukraine conflict, affects Russia + Europe + India, -20% impact, Year 1, 3 months"): country-level allocation shocks.
- **Inflation scenarios** (e.g., "India inflation at 8%, Year 1-2"): affects real return assumptions.

**Step 3 — Review & Run:** User sets base expected return (default 12% p.a. nominal) and base volatility (default 18%). Simulation runs 5,000 paths.

### 2.6 Scenario Mapping via Claude

The user-defined scenarios need to be translated into specific percentage impacts on each holding. This is not mechanical — a "US tech sector crash" has different implications for a TCS position versus a Reliance Industries position versus an HDFC Bank holding.

We call `claude-sonnet-4-6` once per (holding, scenario) pair with a prompt that includes the holding's sector, the scenario's description and impact percentage, and asks Claude to:
1. Determine whether this holding is affected by the scenario
2. If yes, estimate the specific impact percentage (as a fraction of the scenario's stated impact)
3. Explain the reasoning

This produces the "AI Impact Analysis" panel in the results — a table of exactly which of the user's holdings are affected by each scenario and why.

### 2.7 Risk Metrics Output

| Metric | Formula | What It Means |
|--------|---------|--------------|
| **Mean Outcome** | Average of all 5,000 end values | The "most likely" outcome |
| **P10 (Worst Case)** | 10th percentile of outcomes | "In 9 out of 10 scenarios you beat this" |
| **P90 (Best Case)** | 90th percentile of outcomes | "Only 1 in 10 scenarios beats this" |
| **Risk of Loss** | % of paths where final value < initial value | Probability of net loss |
| **Sharpe Ratio** | `(mean_annual_return − 6.5%) / annual_volatility` | Return per unit of risk (6.5% = India 10-yr G-sec) |
| **Max Drawdown** | Worst peak-to-trough decline across all paths | Maximum loss from any peak |
| **VaR (95%)** | 5th percentile of annual return distribution | "At worst (5% probability), you lose at least this much in a year" |

The fan chart displays the P10-P90 band (shaded area) with the mean line in the centre, across each year of the horizon. This visually shows how uncertainty grows over time — the band widens because small monthly differences compound into large end-value differences over 10+ years.

---

## 3. Research — Three Sub-Features

### 3.1 Market Pulse

**What It Does:** A live-updating signal dashboard that scores every stock in a 100-stock universe (Nifty 50 + Nifty Next 50 + select mid/small caps) and every mutual fund in a 50-fund universe across major categories, and classifies them as HOT (buy signal), COLD (avoid signal), or NEUTRAL.

**Data Source:** yfinance for stocks (3 months of daily OHLCV + fundamentals from `ticker.info` + news from `ticker.news`). mfapi.in for MF NAV history.

**Cache:** Results cached for 15 minutes. On cache miss, all 100 stocks are scored in parallel using `ThreadPoolExecutor(max_workers=16)`.

---

#### Stock Scoring Formula (max 100 points)

**Technical Analysis Component (max 35 points):**

*RSI — Relative Strength Index (max 15 pts):*
```
gain_avg  = rolling_14d_mean(max(price_change, 0))
loss_avg  = rolling_14d_mean(max(-price_change, 0))
RSI       = 100 − 100 / (1 + gain_avg / loss_avg)
```
- RSI ≥ 60 → 15 pts (strong momentum, not yet overbought)
- RSI ≥ 50 → 10 pts (moderate bullish momentum)
- RSI ≥ 40 → 6 pts (neutral)
- RSI < 40 → 2 pts (weak)

RSI was developed by J. Welles Wilder Jr. (1978) and remains one of the most widely validated momentum oscillators. Threshold 50 (midpoint) separates bullish from bearish momentum; threshold 60 adds a buffer against false signals without waiting for overbought territory (>70).

*Moving Average Crossover (max 12 pts):*
- Price > 20-DMA **AND** 20-DMA > 50-DMA → 12 pts (full bullish alignment: short-term and medium-term trend both up)
- Price > 20-DMA only → 8 pts (short-term bullish)
- Price > 50-DMA only → 4 pts (medium-term bullish, short-term lagging)
- Neither → 1 pt

The "golden cross" pattern (shorter MA crossing above longer MA) is a classic trend-following signal. Using 20/50-DMA instead of the 50/200-DMA makes this responsive to 3-month data windows (we only fetch 3 months of history for speed).

*MACD — Moving Average Convergence Divergence (max 8 pts):*
```
MACD   = EMA(12) − EMA(26)
Signal = EMA(9) of MACD
```
- MACD > Signal → 8 pts (bullish crossover)
- MACD ≤ Signal → 2 pts

MACD captures momentum shifts — it turns bullish slightly before price does, giving a forward-looking edge vs pure MA crossovers. Gerald Appel (1979).

**Momentum Component (max 25 points):**

*5-Day Return (max 10 pts):*
- > 3% → 10 pts; > 1% → 7 pts; > 0% → 5 pts; negative → 2 pts

*30-Day Return (max 12 pts):*
- > 8% → 12 pts; > 3% → 9 pts; > 0% → 6 pts; negative → 2 pts

*Volume Surge (max 3 pts):*
- `volume_ratio = avg_5d_volume / avg_30d_volume`
- `min(3, floor(volume_ratio))` pts — a stock trading at 2× normal volume gets 2 pts, 3× gets the maximum 3 pts.

Volume confirmation is critical: a price rise on low volume is often unsustainable (a single large trader); a price rise on high volume indicates broad participation and is more likely to continue.

**Fundamental Component (max 20 points):**

*Price-to-Earnings Ratio (PE):*
- PE not available → 8 pts (benefit of the doubt — many small caps don't report PE)
- PE ≤ 20 → 12 pts (value territory for Indian markets)
- PE ≤ 35 → 9 pts (fair value)
- PE ≤ 50 → 6 pts (growth premium)
- PE > 50 → 4 pts (expensive)
- PE < 0 (loss-making) → 3 pts

*EPS — Earnings Per Share:*
- EPS > 0 (profitable) → 8 pts
- EPS ≤ 0 → 3 pts

PE = 20 as "value" is calibrated to India: historically Nifty 50 trades at 18-24× earnings, so PE < 20 represents genuine undervaluation. PE > 50 is expensive even for high-growth names by Indian standards.

**Sentiment Component (max 20 points):**

Source: up to 5 news headlines from `yf.Ticker(symbol).news`. Each headline is analysed by TextBlob:
```python
polarity = TextBlob(headline).sentiment.polarity  # range: -1.0 to +1.0
positive_count = sum(1 for p in polarities if p > 0.1)
negative_count = sum(1 for p in polarities if p < -0.1)
```
- Positive ratio > 60% → 20 pts
- Positive ratio > 40% → 14 pts
- Negative ratio > 60% → 4 pts
- Negative ratio > 40% → 8 pts
- Otherwise → 11 pts

TextBlob uses a pre-trained sentiment lexicon (trained on movie reviews and product reviews). It is not financial-domain-specific. However, financial news headlines are typically short, clear, and use direct positive/negative language ("reports record profits" vs "faces regulatory probe") that generalises well. We chose TextBlob over financial-specific models (FinBERT, etc.) for two reasons: (1) zero latency — no API call required, runs in-process; (2) sufficient accuracy for simple headline polarity classification at our volume of 500 stocks × 5 headlines.

**Signal classification:**
- Total ≥ 65 → **HOT** (buy signal)
- Total ≤ 40 → **COLD** (avoid signal)
- Otherwise → **NEUTRAL**

---

#### MF Scoring Formula (max 100 points)

MFs are scored on historical NAV performance from mfapi.in. The index positions used: latest=index 0, 1 day ago=index 1, 1 month ago=index 21, 3 months ago=index 63, 6 months ago=index 126, 1 year ago=index 252.

| Component | Max Points | Scoring |
|-----------|-----------|---------|
| 1-Year Return | 40 | >30%→40, >20%→32, >12%→24, >6%→16, >0%→8, negative→3 |
| 3-Month Return | 20 | >10%→20, >6%→15, >3%→10, >0%→6, negative→2 |
| 1-Month Momentum | 15 | >4%→15, >2%→12, >0%→8, negative→4 |
| Consistency | 25 | Count of {1M, 3M, 6M, 1Y} that are positive: 4→25, 3→18, 2→11, else→5 |

1-Year Return is weighted highest (40%) because MF investing is typically a medium-to-long-horizon activity and annualised performance is the primary evaluation metric used by SEBI, AMFI, and financial advisors. The Consistency component (25%) penalises funds that had one great year but performed poorly in other periods — consistent returns are a mark of fund quality.

---

### 3.2 Deep Stock / MF Analyse

**What It Does:** A user enters any NSE stock symbol or MF name/code, and the system runs the full signal scoring algorithm on that specific instrument and returns a detailed breakdown of every sub-score.

**For stocks:** Returns action recommendation (Strong Buy / Buy / Hold / Caution / Avoid), conviction level (High / Medium-High / Medium / Medium-Low), plus company fundamentals (sector, industry, market cap, 52-week high/low, avg daily volume, beta, business description).

**For MFs:** Returns the full NAV return table (1D/1M/3M/6M/1Y), score breakdown, and category comparison.

**Action mapping (stocks):**
- Score ≥ 85 → "Strong Buy", conviction "High"
- Score ≥ 65 → "Buy", conviction "Medium-High"
- Score ≥ 55 → "Hold", conviction "Medium"
- Score ≥ 40 → "Caution", conviction "Medium-Low"
- Score < 40 → "Avoid", conviction "High"

---

### 3.3 AI Stock / MF Suggest

**What It Does:** User specifies investment context (amount, horizon, risk appetite, sector preference, SIP or lumpsum) and receives the top 3 recommended stocks or MFs with AI-generated reasoning.

**End-to-End Flow:**

1. **Filter by risk-mapped sectors:** The 100-stock universe is filtered based on the user's risk appetite:
   - Conservative → Banking, FMCG, Pharma, Power, Healthcare, Insurance (stable, dividend-paying, low-beta sectors)
   - Moderate → Banking, IT, FMCG, Auto, Pharma, Finance, Healthcare, Cement, Defence, Chemicals
   - Aggressive → IT, Auto, Metals, Finance, Telecom, Infrastructure, Consumer, Realty, Industrial

   If the user specifies a sector, that overrides the risk mapping.

2. **Rank by signal score:** From the cached pulse data, take the top 3 scoring stocks (or MFs) from the filtered universe.

3. **Generate AI reasoning:** For each of the top 3, call `claude-sonnet-4-6` (max 256 tokens) with a prompt containing the signal score, RSI, 5-day and 30-day returns, MACD state, PE ratio, 20-DMA position, and the user's investment context (SIP/lumpsum, amount, duration). Claude returns exactly two bullet points explaining why this stock fits the user's specific context.

**Why two bullets from AI instead of templated text?**
The key insight is that the same stock can be right for completely different reasons for different users. A ₹5,000/month SIP in HDFC Bank for a 25-year-old with a 20-year horizon is a completely different proposition from a ₹5 lakh lumpsum in HDFC Bank for a 55-year-old retiring in 3 years. The template approach cannot capture this nuance. Two focused bullets from Claude can say "For your 20-year SIP horizon, HDFC Bank's consistent dividend history and strong CASA ratio make it..." vs "Given your 3-year window to retirement, HDFC Bank's current valuation at 2.1× book is..." — different reasoning for different contexts.

**SIP Corpus Projection:**
For SIP mode, the frontend calculates the projected corpus at end of duration using the standard SIP Future Value formula:
```
FV = monthly × ((1 + r)^n − 1) / r × (1 + r)
```
Where `r = annual_rate / 12` (monthly rate) and `n = duration_years × 12` (total months). The annual rate used is:
- For stocks: signal score ≥ 80 → 20% p.a.; ≥ 65 → 15%; ≥ 50 → 10%; else → 6%
- For MFs: actual 1-year NAV return if available, otherwise same signal-based mapping

These rates represent reasonable expected returns for the signal strength category and should be treated as illustrative, not guaranteed.

**Why recommend exactly 3 picks?**
Research on decision fatigue (Barry Schwartz, "Paradox of Choice") shows that 3 options is the optimal number for financial recommendation contexts — enough to show diversity without overwhelming the user into inaction. More than 3 and users tend to defer the decision; fewer than 3 reduces perceived choice.

---

## 4. News — Global Trade Intelligence

### 4.1 What It Does

A 3D interactive globe showing live geopolitical alerts, global market data, and real-time news with specific India impact analysis. The user can click on any of the 5 monitored countries (India, USA, Japan, Australia, China) or on specific geopolitical flashpoints (Strait of Hormuz, Eastern Europe conflict, Durand Line) to see how these events affect Indian markets.

### 4.2 Data Sources

| Source | What It Provides | Method |
|--------|-----------------|--------|
| **yfinance** | All commodity prices (Brent crude, gold, silver, natural gas, copper), all currency pairs (USD/INR, EUR/INR, JPY/INR, GBP/INR), all equity indices (Nifty, S&P 500, NASDAQ, Nikkei, Hang Seng, ASX 200, etc.) | `history(period="5d", interval="1d")`, last two rows for change calculation |
| **NSE India API** | FII (Foreign Institutional Investor) and DII (Domestic Institutional Investor) net buy/sell flows | `nseindia.com/api/fiidiiTradeReact`, cookie-authenticated |
| **Country news API** | News headlines per country | `fetchCountryGeopolitics(ISO2, name)` |
| **Globe GeoJSON** | Country polygon data for 3D rendering | Static JSON from `vasturiano/react-globe.gl` GitHub |

All 25+ market instruments (12 equity indices, 5 commodities, 4 currencies, 9 Nifty sector indices) are fetched in parallel using `ThreadPoolExecutor(max_workers=12)`.

### 4.3 Strategic Alerts (Static Intelligence)

Three hardcoded geopolitical flashpoints are displayed as pulsing markers on the globe:

1. **Strait of Hormuz** (26.56°N, 56.25°E) — Critical chokepoint for India's crude oil imports (~85% of crude passes through). Alert type: Chokepoint. Shows India's oil import dependence and sector impacts (Energy: High, Chemicals: High, Aviation: Medium).

2. **Eastern Europe / Ukraine** (50.5°N, 35.0°E) — Conflict affecting wheat prices, fertiliser exports, European demand. Alert type: Conflict. Affected sectors: Fertilisers, FMCG (wheat-dependent), Pharma (API supply chains from Russia).

3. **Durand Line / India-Pakistan** (33.5°N, 69.5°E) — South Asian geopolitical tension. Alert type: Conflict. Defence sector impact flagged.

**India Trade Impact Matrix (static hardcoded analysis):**
For each of the 5 monitored countries, the system has pre-computed trade relationship data:
- Bilateral trade volume (USD billions)
- Key Indian exports to that country
- Key Indian imports from that country
- Sector-level sensitivity (High/Medium/Low) and direction (positive/negative/mixed) for each of India's major sectors

Example: For USA — Technology exports (High sensitivity, mixed direction), Pharma exports (High sensitivity, positive direction if demand rises), IT services (High sensitivity, neutral to positive).

This is static because trade relationship data changes slowly (annual revisions) and computing it dynamically from APIs would require access to Ministry of Commerce data that lacks a reliable public API.

### 4.4 Commodity and Currency Tooltips

When the user hovers over a commodity or currency in the scrolling bottom ticker, they see a one-line India impact note:
- Gold (GC=F): "India is world's 2nd largest gold consumer; rising gold prices boost jewellery sector costs"
- Brent Crude (BZ=F): "India imports ~85% of oil needs; every $10/barrel rise adds ~₹0.6-0.8/litre to fuel costs"
- USD/INR: "Weaker rupee boosts IT/pharma exporters but raises import bills for oil, electronics"

These are pre-written by the team and are not dynamically generated.

### 4.5 FII/DII Data

**What FII/DII means:** Foreign Institutional Investors (FIIs) are overseas funds investing in Indian markets. Domestic Institutional Investors (DIIs) are Indian funds (mutual funds, insurance companies, pension funds). When FIIs are net buyers, it typically signals foreign confidence in India and tends to push markets up; when they are net sellers, it often precedes market corrections. DII flows tend to be counter-cyclical — DIIs often buy when FIIs sell.

The NSE API (`nseindia.com/api/fiidiiTradeReact`) is fetched with browser-like headers and a cookie obtained by first loading the NSE homepage. If this fails, fallback to hardcoded indicative values.

---

## 5. AlphaMind — Autonomous Portfolio Agent

### 5.1 What It Does

AlphaMind is a fully autonomous portfolio monitoring agent that runs continuously during NSE market hours (Mon-Fri, 9:15 AM – 3:30 PM IST). It tracks the user's holdings, fetches live prices every 2 minutes, analyses news sentiment, computes trend patterns, generates alerts when holdings show distress, and sends a daily email summary after market close.

### 5.2 User Setup

The user goes through a one-time onboarding:
1. Adds their holdings (manually or Groww import)
2. Fills out an investment profile (risk appetite, goals, horizon, monthly investment)
3. The agent starts monitoring automatically

Optionally, the user can chat with the agent in natural language to provide their profile (e.g., "I'm 32, moderate risk, want to retire in 20 years, SIP of ₹15,000/month"). The backend calls `claude-sonnet-4-6` (max 400 tokens) to extract structured profile fields from this free-text conversation.

### 5.3 Analysis Cycle (Every 2 Minutes)

**Step 1 — Live Price Fetch:**
For each stock holding: `yf.Ticker(symbol + ".NS").fast_info.last_price` and `.previous_close`. Parallel execution via `ThreadPoolExecutor(max_workers=10)`. Falls back to `history(period="2d")` if `fast_info` returns null.

`change_pct = (current_price − previous_close) / previous_close × 100`

Each price update is streamed to the frontend in real-time via SSE (Server-Sent Events) as `{"type": "price_update", "symbol": ..., "price": ..., "change1d": ...}`.

**Step 2 — News Sentiment Analysis:**
For the top 5 holdings by current value:
```python
headlines = yf.Ticker(symbol + ".NS").news  # up to 8 headlines
scores = [TextBlob(headline["content"]["title"]).sentiment.polarity 
          for headline in headlines]
avg_score = mean(scores)
label = "Bullish" if avg_score > 0.1 else "Bearish" if avg_score < -0.1 else "Neutral"
```
The top 5 (by value) are chosen because they account for the largest portion of portfolio risk — monitoring the bottom 20 holdings equally would waste compute on positions that have minimal impact.

**Step 3 — Trend Tracking:**
Each stock maintains a `down_count` counter: incremented when `change_pct < 0`, reset to 0 on any positive day. This detects sustained downtrends (3+ consecutive negative days) separately from single-day drops.

**Step 4 — Alert Generation (3-Tier System):**

| Tier | Trigger | What It Means |
|------|---------|--------------|
| **Immediate Action** | `change_pct ≤ −8%` OR `(down_count ≥ 3 AND change_pct < 0)` | Severe drop or sustained 3-day decline — warrants review today |
| **Caution** | `change_pct ≤ −3%` OR `(down_count ≥ 2 AND change_pct < 0)` | Moderate concern — worth monitoring closely |
| **Informational** | All other updates | Normal market movement |

The −8% immediate threshold is chosen because a single-day drop of 8%+ almost always indicates company-specific news (earnings miss, fraud allegation, regulatory action) rather than market-wide movement, and warrants user attention regardless of market context. The −3% caution threshold is roughly 2-3× the typical daily volatility of a large-cap NSE stock.

**Step 5 — Claude Verdict:**
After accumulating price data, sentiment data, and alerts, a call is made to `claude-sonnet-4-6` (max 512 tokens) with:
- User profile (risk appetite, goals, horizon)
- Portfolio snapshot (total value, stock count, MF count)
- Live prices and change percentages for up to 10 holdings
- Summary of current alerts (counts + symbols + issues)

Claude returns JSON:
```json
{
  "verdict": "All Good" | "Caution" | "Immediate Action",
  "verdictReason": "...",
  "overallSummary": "...",
  "topAlerts": [{"holding": "...", "issue": "...", "action": "..."}]
}
```

If the Anthropic API is unavailable, a rule-based fallback produces the verdict: ≥1 Immediate Action alert → "Immediate Action"; ≥1 Caution alert → "Caution"; else → "All Good".

**Why use Claude for the verdict instead of more rules?**
The rules can detect *that* something is wrong (e.g., HDFC Bank down 5%), but they cannot reason *about* it in context. Claude can say: "HDFC Bank is down 5% today, but this follows an RBI rate hike announcement and the broader Nifty Bank index is also down 3% — this appears market-driven, not HDFC-specific. Hold your position." A rule-based system cannot make this distinction; Claude can because it has broad financial knowledge.

### 5.4 SSE Real-Time Streaming

The frontend subscribes to `GET /api/agent/stream?email=<email>` via `EventSource`. The backend maintains a per-user queue of events. Events are pushed from the analysis thread to the queue via `q.put_nowait(event)`, and the SSE generator reads from the queue in real-time. A 25-second heartbeat ping keeps the connection alive through proxies and firewalls.

### 5.5 Market Hours Guard

`_is_market_hours()` checks: current IST time (via `pytz.timezone("Asia/Kolkata")`), Monday–Friday, between 9:15 AM and 3:30 PM. Outside these hours, the agent pauses and pushes a `{"type": "market_closed"}` event.

**Auto email at market close:** Every cycle between 3:35–3:40 PM IST, the agent calls `agent_email.send_report(email, user)` to dispatch the daily summary. The 5-minute window avoids duplicate sends if the check fires twice in that window.

---

## 6. AlgoTrading — Algorithmic Trading Engine

### 6.1 What It Does

The AlgoTrading engine is a production-grade algorithmic trading system that generates, evaluates, and executes paper trades (or live trades via Groww API) on Nifty 50 stocks using a multi-agent LangGraph pipeline. The H1 2025 backtest ran 47 trades across 18 Nifty 50 stocks over 126 days, producing +18.4% portfolio return against Nifty 50's +11.2% — an alpha of +7.2%.

### 6.2 Data Sources

| Source | Type | What It Provides |
|--------|------|-----------------|
| **Groww API** | Live Feed | Real-time LTP, OHLC, volume, circuit limits, order placement |
| **yfinance** | Live Feed | Historical OHLCV for technical indicator computation |
| **Finviz.com** | Scraped | Financial news headlines (HTML table scrape) |
| **Seeking Alpha** | Scraped | Stock-specific news (public XML RSS feed) |
| **NSE India API** | Live Feed | FII/DII intraday flow data (15-min refresh in H1 2026 version) |
| **ChromaDB** | Local KB | Embedded financial PDFs for RAG-based market context |
| **TextBlob** | Local NLP | Headline sentiment polarity (in-process, no API) |
| **Claude Sonnet 4.6** | LLM | Trade classification, bull/bear debate, signal decisions |

### 6.3 The 5-Step LangGraph Pipeline

LangGraph is a framework for building multi-agent systems as state machines. Each step (node) in the graph receives the current state, performs analysis, and passes the updated state to the next node. The pipeline is deterministic in structure but probabilistic in output (because Claude's analysis varies).

```
[News Ingest] → [Sentiment Agent] → [Bull/Bear Debate] → [FII/DII Overlay] → [Ensemble Signal]
```

**Step 1 — News Ingest:**
For each candidate symbol (pre-selected by the Pre-Market Scanner), fetch recent news from:
1. Finviz.com — parses `<table class="fullview-news-outer">` HTML structure, extracts up to 3 recent headlines
2. Seeking Alpha public XML RSS — `seekingalpha.com/api/sa/combined/{symbol}.xml`

Scraping is used (rather than a paid API) because financial news APIs (Bloomberg, Refinitiv) cost $15,000+/year. Finviz and Seeking Alpha's public HTML endpoints are scraped with randomised 1-2 second delays to avoid rate limiting.

**Step 2 — Sentiment Agent:**
Headlines are scored by TextBlob polarity (range −1.0 to +1.0). A combined score is computed. The state is updated with a preliminary sentiment label (Bullish/Bearish/Neutral) and polarity score.

**Step 3 — Bull/Bear Debate:**
Two Claude calls are made — one prompted to construct the strongest possible bull case for the trade, one to construct the strongest possible bear case. This is structured adversarial reasoning:

- The **Bull agent** receives: recent price action, technical indicators (RSI, MACD, 20-DMA), positive sentiment signals, FII inflow data, and must argue for buying.
- The **Bear agent** receives the same data and must argue against buying, focusing on downside risks, negative signals, and market context.

The outputs of both are passed to the final ensemble step.

**Why a debate structure instead of one LLM?**
A single LLM asked "should I buy HDFC Bank?" will produce an answer that reflects whatever the most common framing in its training data was — typically a moderate, hedge-everything response. Forcing the model to take a strong one-sided position (bull-only or bear-only) extracts more specific and actionable reasoning. The ensemble then weighs both positions, producing a more balanced and better-reasoned final signal than any single prompt could.

**Step 4 — FII/DII Overlay:**
Foreign Institutional Investor net flows are fetched from the NSE API. Heavy FII buying (net positive > threshold) strengthens bullish signals; heavy FII selling weakens them. This captures institutional momentum — retail sentiment often lags institutional positioning by 1-2 days.

In the H1 2026 version, FII/DII data is refreshed every 15 minutes during market hours (intraday), versus daily-open data in H1 2025. This significantly improved the accuracy of signals in intraday momentum periods.

**Step 5 — Ensemble Signal:**
The final Claude call receives the outputs of all prior steps — sentiment score, bull case, bear case, FII/DII data — and produces:
```json
{
  "trade_signal": "BUY" | "HOLD" | "SELL",
  "confidence": 0.0–1.0,
  "reasoning": "..."
}
```

Only signals with `confidence ≥ 0.75` proceed to execution (configurable threshold). Below this threshold, the trade is skipped regardless of direction. This filters out ambiguous signals where the model is not confident — the H1 2025 backtests showed that high-conviction signals (≥0.85) had an 83.3% win rate, while medium-conviction signals (0.65-0.75) had a 54% win rate (barely above random).

In H1 2026, the final signal required **majority vote from 3 independent Claude runs** on the same data. This "LLM majority vote (N=3)" approach reduced false positives by ~14% at the cost of 3× the API calls per signal.

### 6.4 Pre-Market Scanner

Before the market opens, the Pre-Market Scanner identifies which Nifty 50 stocks to feed into the pipeline that day.

```python
gap_pct = (today_open − yesterday_close) / yesterday_close × 100
```

A stock is a pre-market candidate if: `|gap_pct| ≥ 0.5%` AND `volume ≥ 1,000,000 shares`. The top 5 candidates by absolute gap percentage are selected.

Gap-up stocks are prioritised because:
1. A gap-up indicates overnight news that the market is pricing in at the open
2. Momentum trading on gap-ups (if confirmed by sentiment analysis) has a higher edge than trading in low-gap-percent stocks where there's no clear catalyst
3. High volume confirms institutional participation — the signal is not just from retail noise

### 6.5 Risk Management

**RiskManager** uses a loss-ladder approach:
- 0 consecutive losses → full position size (`BASE_RISK` % of daily capital)
- 1 consecutive loss → 75% of `BASE_RISK`
- 2 consecutive losses → 50% of `BASE_RISK`
- 3+ consecutive losses → **trading halted** (0% risk — no new trades)

This is based on the principle of Optimal f (Ralph Vince) and practical drawdown control: a strategy in a losing streak is either in an unfavourable market regime or has a bug. Halting after 3 consecutive losses protects capital until conditions improve.

**Exit strategy:** OCO (One Cancels Other) orders:
- **Target:** LTP + 1% (take profit at +1%)
- **Stop-loss:** LTP − 0.5% (cut loss at −0.5%)

The asymmetric 2:1 reward-to-risk ratio ensures that even a 40% win rate strategy is profitable in the long run (40% × 1% win − 60% × 0.5% loss = +0.1% expected value per trade).

**ATR-Based Stop-Loss (H1 2026 Enhancement):**
In H1 2026, the fixed −0.5% stop-loss was replaced with `stop_price = LTP − 2 × ATR(14)`, where ATR (Average True Range) is the 14-day average of daily high-low ranges.

Why ATR: Fixed percentage stops fail in high-volatility environments — a stock with normal 0.8% daily swings will hit a 0.5% stop-loss even on random noise, creating unnecessary exits. ATR-based stops scale with the stock's actual volatility, placing stops outside the noise band. This reduced premature stop-outs in the H1 2026 backtest.

### 6.6 ChromaDB Knowledge Base (RAG)

A local vector database is built from financial PDFs (textbooks, SEBI circulars, RBI publications) using:
1. **Loader:** `PyPDFLoader` (LangChain)
2. **Splitter:** `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)`
3. **Embedding model:** `sentence-transformers/all-MiniLM-L6-v2` via `HuggingFaceEmbeddings` — a 22M parameter model, runs locally (no API cost), produces 384-dimension vectors
4. **Vector store:** ChromaDB with persistence at `./finance_db`

During analysis, the LangGraph pipeline can query this knowledge base for contextual financial information (e.g., regulatory context, historical precedents for similar market events). This is "Retrieval-Augmented Generation" (RAG) — grounding the LLM's reasoning in domain-specific local documents rather than relying solely on its training data.

**Why all-MiniLM-L6-v2?**
It is a distilled model (6 layers vs BERT's 12) trained specifically for semantic similarity tasks. At 384 dimensions it is fast and compact while achieving 80%+ of full BERT performance on retrieval benchmarks. Suitable for production RAG pipelines where latency matters.

### 6.7 Three Sub-Strategies (H1 2025 Backtest Results)

| Strategy | Trades | Win Rate | Return | Description |
|----------|--------|----------|--------|-------------|
| Momentum Breakout | 19 | 68.4% | +11.2% | RSI extremes + volume surge; long-biased Nifty 50 large-caps |
| Sentiment Reversal | 13 | 61.5% | +4.8% | LLM-scored news shock + mean reversion; 3-5 day hold period |
| Factor Rotation | 15 | 60.0% | +2.4% | Low-PE / high-ROE fundamental screen; monthly sector rotation |

Momentum Breakout is the highest-performing strategy because it combines a quantitative entry signal (volume-confirmed RSI breakout) with LLM sentiment confirmation — the two most alpha-generating signal types in the overall pipeline.

---

## 7. Chat — Investment AI Assistant

### 7.1 What It Does

An investment-only conversational AI that users can chat with about their portfolio, markets, stocks, MFs, tax planning, and financial strategy. When accessed from the Analyse, Simulate, or Suggest pages, it automatically loads the user's current analysis context so the AI can give specific, personalised advice.

### 7.2 System Prompt & Investment-Only Guard

The backend system prompt (sent with every conversation) establishes:

1. **Role:** "Expert AI investment advisor specializing in Indian equity markets"
2. **Topic restriction:** Only investment-related topics — stocks, MFs, bonds, portfolio analysis, asset allocation, financial planning, market trends, company fundamentals, technical analysis, IPOs, SIPs, SWPs, LTCG/STCG tax, economic indicators, financial instruments.
3. **Off-topic refusal:** Any out-of-scope question receives exactly: *"I'm your dedicated investment assistant. I can only help with investment and finance-related queries. What would you like to know about your portfolio or the markets?"*
4. **Indian market context:** Currency in INR, SEBI regulations, NSE/BSE conventions, tax rates (LTCG 12.5% above ₹1.25 lakh, STCG 20%).
5. **Educational disclaimer:** All responses are for educational purposes only and do not constitute SEBI-registered financial advice.
6. **Context block:** If the user arrived from another feature, their analysis summary is appended verbatim as a "PORTFOLIO CONTEXT" section.

**Why a hard off-topic refusal?**
General-purpose LLMs will happily answer cooking questions, write code, or discuss philosophy if asked. For a product presented as an investment assistant, this breaks user trust and dilutes the brand. The hard refusal also protects against prompt injection attacks that attempt to make the AI behave outside its intended scope.

### 7.3 Context Passing

When the user clicks "Chat with AI" from any analysis page:

1. The source page calls `openChatWithContext({source, label, summary, suggestedPrompts})` which stores the context object in `sessionStorage` under key `"diversifi_chat_context"`.
2. ChatPage reads this on load, displays a context banner ("Continuing from Portfolio Analysis"), pre-loads context-specific suggested prompts, and sends the `summary` string to the backend as part of every API call.

Context passed per source:
- **Analyse:** Health score, diversification score, total portfolio value, top 3 sector concentrations
- **Simulate:** Expected value, P10, P90, Sharpe ratio, max drawdown, key scenario impacts
- **Suggest:** Top 3 recommended stocks/MFs with scores and signal levels

### 7.4 Streaming Architecture

The backend uses Flask's `stream_with_context(generate())` to produce an SSE stream:

```python
with anthropic.messages.stream(model="claude-sonnet-4-6", ...) as stream:
    for text in stream.text_stream:
        yield f"data: {json.dumps({'text': text})}\n\n"
yield "data: [DONE]\n\n"
```

The frontend reads the stream via `ReadableStream` and a `TextDecoder`, parsing SSE lines by splitting on `\n`. Incomplete lines that arrive mid-chunk are buffered:
```javascript
lines = (buffer + chunk).split("\n")
buffer = lines.pop()  // save incomplete last line for next chunk
```

This produces a typewriter effect — each word/token appears as soon as Claude generates it, giving sub-second time-to-first-token even for long responses.

**Why SSE instead of WebSocket?**
SSE (Server-Sent Events) is simpler — it is a one-directional HTTP stream that works through standard HTTP/1.1. WebSockets require a separate protocol upgrade and more complex infrastructure. Since chat responses are always server→client (the client sends one message, the server streams the reply), SSE is the correct and simpler choice.

### 7.5 Model Configuration

- **Model:** `claude-sonnet-4-6`
- **Max tokens:** 1,024 per response
- **Endpoint:** Standard Anthropic API (`anthropic.Anthropic(api_key)`) or Azure-hosted (`AnthropicFoundry(api_key, resource)`) depending on `ANTHROPIC_FOUNDRY_RESOURCE` environment variable.

The 1,024-token limit is deliberately set below the model's maximum capacity. Investment responses should be concise and actionable — a 3,000-token essay on portfolio theory is not useful in a chat context. If more depth is needed, the user can ask follow-up questions.

---

## Appendix: Shared Technical Infrastructure

### Risk-Free Rate: 6.5% p.a.
Used in all Sharpe ratio and Jensen's Alpha calculations. This is the approximate yield of the India 91-day Treasury Bill as of FY2025-26. It represents the return an investor could achieve with zero risk — any portfolio metric must be measured relative to this baseline.

### Concurrency Pattern
All network-bound operations across the backend use `ThreadPoolExecutor`:
- Market data: 10 workers
- Portfolio risk (per-stock yfinance): 16 workers
- Pulse scoring (100 stocks): 16 workers
- MF scoring (50 funds): 16 workers
- AlphaMind price fetch: 10 workers

Python's GIL (Global Interpreter Lock) does not block I/O-bound threads, so `ThreadPoolExecutor` achieves genuine parallelism for network calls. This reduces the pulse scoring time from ~100 seconds (serial) to ~7 seconds (parallel).

### Caching Strategy
| Feature | TTL | Storage |
|---------|-----|---------|
| Market Pulse (stocks) | 15 minutes | In-memory Python dict |
| MF Pulse | 15 minutes | In-memory Python dict |
| Global Market Data | 5 minutes | In-memory Python dict |
| AlphaMind user data | Persistent | JSON files on disk |

On-demand recalculation outside the TTL ensures data freshness without hammering external APIs.

### AnthropicFoundry Pattern
All Claude calls use:
```python
client = AnthropicFoundry(api_key, resource) if ANTHROPIC_FOUNDRY_RESOURCE else Anthropic(api_key)
```
This allows seamless switching between the standard Anthropic API and an Azure-hosted endpoint without code changes — only an environment variable changes.

### TextBlob Sentiment: Why ±0.1 Threshold
TextBlob polarity ranges from −1.0 (maximally negative) to +1.0 (maximally positive). The ±0.1 threshold is used to create a "neutral" zone around zero. Without this zone, a polarity of +0.02 would be classified as positive even though it is practically indistinguishable from neutral. The ±0.1 threshold corresponds to approximately the noise floor of TextBlob's lexicon-based classifier on short financial text.
