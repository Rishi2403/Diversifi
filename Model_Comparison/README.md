# Model Comparison — Tesla Stock Prediction

A three-way empirical comparison of time-series prediction models applied to
TSLA (Tesla Inc.) daily closing prices, producing a fully self-contained HTML
report with embedded charts and architecture diagrams.

---

## Models Evaluated

| # | Model | Source | Approach |
|---|-------|--------|----------|
| 1 | **LangGraph Ensemble** | Diversifi backend (`trading_lang.py`) | 4-node state-machine pipeline: feature engineering → GBR + RF signal generation → weighted ensemble → confidence calibration |
| 2 | **ARIMA (Notebook)** | `Tesla-Stock-Prediction/Time_Series.ipynb` | Walk-forward ARIMA(2,0,0) — optimal order selected via 3×3×3 grid search |
| 3 | **LSTM (PDF Paper)** | arXiv:2505.05325v1 | Two-layer LSTM (64→32 units), 60-day sliding window, MinMax normalisation, 100 epochs — implemented in PyTorch |

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the comparison (reads TSLA.CSV, writes comparison_report.html)
python run_comparison.py

# 3. Open the report
xdg-open comparison_report.html   # Linux
open comparison_report.html       # macOS
start comparison_report.html      # Windows
```

---

## Data

- **File**: `../Tesla-Stock-Prediction/TSLA.CSV`
- **Ticker**: TSLA (Tesla Inc.)
- **Period**: 2019-05-21 to 2022-05-20
- **Rows**: 758 daily trading records
- **Features**: Open, High, Low, Close, Volume, Dividends, Stock Splits
- **Target**: Close price (univariate series)
- **Train / Test split**: 698 training days / 60 test days (last 60 rows)

---

## Repository Structure

```
Model_Comparison/
├── model_arima.py          # ARIMA model implementation
├── model_lstm.py           # LSTM model implementation (PyTorch)
├── model_langgraph.py      # LangGraph ensemble model
├── run_comparison.py       # Orchestrator + HTML report generator
├── comparison_report.html  # Generated report (not committed — see .gitignore)
├── requirements.txt        # Python dependencies
├── README.md               # This file
├── ARCHITECTURE.md         # Detailed architectural documentation
└── .gitignore
```

---

## Metrics Explained

| Metric | Full Name | Formula | Interpretation |
|--------|-----------|---------|----------------|
| **RMSE** | Root Mean Squared Error | `sqrt(mean((actual - predicted)^2))` | Average prediction error in the same units as the price (USD); penalises large errors more heavily |
| **MAE** | Mean Absolute Error | `mean(|actual - predicted|)` | Average absolute deviation in USD; more robust to outliers than RMSE |
| **MAPE** | Mean Absolute Percentage Error | `mean(|actual - predicted| / actual) × 100` | Scale-independent percentage error; useful for comparing across different price levels |
| **Dir. Accuracy** | Directional Accuracy | `% of steps where sign(Δactual) == sign(Δpredicted)` | Percentage of trading days where the model correctly predicts whether the price will rise or fall; directly relevant to trading signal quality |

---

## Key Results (2022 test window)

| Rank | Model | RMSE | MAPE | Dir. Accuracy |
|------|-------|------|------|---------------|
| 1st | LangGraph Ensemble | ~28 | ~2.5% | ~88% |
| 2nd | ARIMA (Notebook) | ~39 | ~3.5% | ~51% |
| 3rd | LSTM (PDF Paper) | ~97 | ~9.4% | ~56% |

*Note: exact values vary slightly per run due to PyTorch seed sensitivity.*

---

## Why the Ordering

**LangGraph wins** because 20 engineered technical indicators (RSI, moving average
crossovers, Bollinger Bands, momentum) give the gradient boosting ensemble far richer
signal than raw price lags alone, particularly during the sharp May 2022 downtrend.

**ARIMA is second** because walk-forward refitting adapts the model to each new
observation, allowing it to track the downtrend incrementally without the regime
overfitting that affects the LSTM.

**LSTM is third** because the model was trained (without sentiment augmentation) on a
sustained bull-market period. With 100 epochs and no early stopping on a small dataset
(698 training sequences), the network overfits to the uptrend pattern and struggles to
generalise to the subsequent correction — a known limitation noted in the original paper
(§X), which attributes 8–12% performance gains specifically to VADER sentiment enrichment.

---

## Extending the Project

- **Add sentiment**: Integrate VADER scores from `../Diversifi/backend/sentiment_service.py`
  into the LangGraph pipeline for the full paper-vs-enhanced comparison.
- **Hyperparameter search**: Use `optuna` or `scikit-optimize` to tune the GBR/RF ensemble.
- **Multi-stock**: Generalise to other tickers by replacing the CSV path argument.
- **Online learning**: Implement periodic model retraining in the LangGraph pipeline's
  signal-generation node to adapt to real-time market regimes.

---

## References

- Chaudhary, R. (2025). *Advanced Stock Market Prediction Using Long Short-Term Memory
  Networks: A Comprehensive Deep Learning Framework*. arXiv:2505.05325v1 [cs.CE].
- Hochreiter, S. & Schmidhuber, J. (1997). Long Short-Term Memory. *Neural Computation*, 9(8).
- Diversifi backend LangGraph architecture: `../Diversifi/backend/trading_lang.py`
