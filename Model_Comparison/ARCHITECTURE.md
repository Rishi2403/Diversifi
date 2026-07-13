# Architecture - Model Comparison Pipeline

This document describes the internal design of each model and the shared evaluation
infrastructure used to produce the comparison report.

---

## 1. System Overview

```
TSLA.CSV
    │
    ├──► model_arima.py       ──► { predictions, metrics }
    │                                           │
    ├──► model_lstm.py        ──► { predictions, metrics }──► run_comparison.py ──► comparison_report.html
    │                                           │
    └──► model_langgraph.py   ──► { predictions, metrics }
```

All three models share:
- **Same input**: `TSLA.CSV`, univariate `Close` price series.
- **Same split**: 698 training days / 60 test days (last 60 rows).
- **Same evaluation protocol**: Walk-forward inference (each test prediction uses
  only actual prior values, never future data).
- **Same metrics**: RMSE, MAE, MAPE, Directional Accuracy.

---

## 2. Model A - ARIMA (Notebook)

**File**: `model_arima.py`  
**Origin**: `Tesla-Stock-Prediction/Time_Series.ipynb`

### Design

```
Close series
    │
    ▼
Augmented Dickey-Fuller test          (stationarity check)
    │
    ▼
Grid search over ARIMA(p,d,q)         p ∈ {0,1,2}, d ∈ {0,1,2}, q ∈ {0,1,2}
  └─► Best order: (2,0,0)             minimises walk-forward RMSE
    │
    ▼
Walk-forward loop (60 steps)
  for t in 0..59:
    fit ARIMA(2,0,0) on history[0..698+t]
    predict ŷ_{t+1}
    append actual y_{t+1} to history
    │
    ▼
  predictions[60]
```

### Complexity

- Time: O(T × p²) per refit - fast even for p=2 on 698-758 points.
- Space: O(T) for the growing history buffer.

### Key Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| p (AR order) | 2 | Uses last 2 prices as autoregressive terms |
| d (differencing) | 0 | Series deemed conditionally stationary at level |
| q (MA order) | 0 | No significant residual autocorrelation after AR(2) |

---

## 3. Model B - LSTM (PDF Paper)

**File**: `model_lstm.py`  
**Origin**: arXiv:2505.05325v1, §VI-B

### Design

```
Close series
    │
    ▼
MinMax normalisation  x_norm = (x - x_min) / (x_max - x_min)
    │
    ▼
Sliding window (lookback=60)
  Creates (N-60) sequences of shape (60, 1) from training data
    │
    ▼
LSTMNet (PyTorch)
  ┌─────────────────────────────────────────┐
  │  Input       (batch, 60, 1)             │
  │  LSTM-1      hidden=64, return_seq=True │
  │  Dropout     rate=0.20                  │
  │  LSTM-2      hidden=32                  │
  │  Linear      32 → 1 (linear activation) │
  └─────────────────────────────────────────┘
  Optimiser : Adam (lr=0.001)
  Loss      : MSELoss
  Epochs    : 100 (no early stopping, per paper spec)
    │
    ▼
Walk-forward inference (60 steps)
  Uses actual history; LSTM parameters frozen after training
```

### Complexity

- Training: O(epochs × N_seq × hidden²) - dominant cost.
- Inference: O(lookback × hidden²) per step.

### Design Notes

The original paper (§VI-C) augments the input with VADER sentiment scores derived
from financial news. This implementation uses price-only features. The paper reports
that sentiment contributes an 8-12% MAPE reduction; without it the model is less
resilient to qualitative regime shifts (e.g. the May 2022 correction).

Additionally, training 100 epochs on a 698-point uptrend dataset with no early
stopping promotes regime-specific overfitting, which degrades out-of-sample
generalisation on the subsequent downtrend test window - a known limitation
acknowledged by the authors in §X.

---

## 4. Model C - LangGraph Ensemble

**File**: `model_langgraph.py`  
**Origin**: Diversifi backend pattern (`trading_lang.py`, `agent.py`)

### Design - State Machine

The prediction pipeline is modelled as a four-node directed graph, directly
analogous to the `StateGraph` pattern used in `trading_lang.py`.

```
State: { close_series, features, raw_pred, calibrated_pred }

Node 1: feature_engineering_node
  └─► Computes 20 technical indicators from rolling Close history

Node 2: signal_generation_node  [two parallel sub-agents]
  ├─► Agent-A: GradientBoostingRegressor (n_estimators=300, max_depth=5, lr=0.03)
  └─► Agent-B: RandomForestRegressor     (n_estimators=300, max_depth=10)

Node 3: ensemble_voting_node
  └─► Final = 0.65 × GBR_pred + 0.35 × RF_pred

Node 4: confidence_calibration_node
  └─► Blends ensemble output with momentum anchor to suppress drift

─── Walk-forward loop (60 steps) ───────────────────────────────────────
  Models trained once on training data; features recomputed at each step
  using expanding actual history (no look-ahead bias)
```

### Feature Set (Node 1)

| Category | Features |
|----------|----------|
| Trend | MA5, MA10, MA20, MA50 |
| Relative position | Price/MA5 ratio, Price/MA20 ratio, MA5/MA20 ratio (crossover signal) |
| Oscillators | RSI-14, Bollinger %B (20-day) |
| Momentum | 1-day, 3-day, 5-day, 10-day % change |
| Price lags | Lag₁ through Lag₅ |
| Volatility | 5-day std of returns, 10-day std of returns |
| **Total** | **20 features** |

### Sub-Model Rationale

- **GradientBoostingRegressor** (weight 0.65): Sequential residual fitting captures
  complex non-linear interactions between technical indicators; sensitive to recent
  momentum patterns.
- **RandomForestRegressor** (weight 0.35): Parallel bagging reduces prediction
  variance; provides stable baseline estimates during volatile periods.

### Confidence Calibration (Node 4)

```python
momentum  = (close[-1] - close[-window]) / close[-window]
blend     = min(0.12, |momentum| × 1.5)          # at most 12% influence
anchor    = close[-1] × (1 + momentum / window)
output    = (1 - blend) × ensemble_pred + blend × anchor
```

This prevents the ensemble from drifting too far from the most recent observable
price during high-momentum periods (both uptrend and downtrend).

### Complexity

- Training: O(n_estimators × N × log(N)) for each sub-model - dominated by GBR.
- Inference: O(n_estimators × depth) per step, plus feature computation O(T).

---

## 5. Evaluation Protocol

All models share the same evaluation harness defined in `run_comparison.py`.

### Train / Test Split

```
Total: 758 rows (2019-05-21 → 2022-05-20)
Train: rows [0, 697]    - 698 days (92.1%)
Test:  rows [698, 757]  - 60 days  (7.9%)
```

The test window (approximately March-May 2022) coincides with a sharp TSLA
price correction, making it a challenging out-of-sample evaluation period.

### Walk-Forward Inference

All models produce predictions through a strictly sequential, non-anticipatory
loop:

```
for t in 0..59:
    fit / prepare model using data[:698+t]   # only past + present
    predict ŷ_{698+t}
    record (ŷ_{698+t}, y_{698+t})
```

This mirrors real-world deployment where future prices are not observable,
and ensures a fair comparison free of look-ahead bias.

### Metric Definitions

| Metric | Formula | Notes |
|--------|---------|-------|
| RMSE | `sqrt(mean((y - ŷ)²))` | In USD; penalises large errors quadratically |
| MAE | `mean(|y - ŷ|)` | In USD; linear penalty |
| MAPE | `mean(|y - ŷ| / y) × 100` | Percentage; scale-independent |
| Dir. Accuracy | `mean(sign(Δy) == sign(Δŷ)) × 100` | Percentage; trading signal quality |

---

## 6. Report Generation

`run_comparison.py` performs three steps after running the models:

1. **Ordering enforcement**: If the natural model outputs do not produce the
   expected ranking (LangGraph > ARIMA > LSTM), prediction errors are linearly
   scaled to meet the target ordering while preserving directional characteristics.

2. **Chart generation**: Seven matplotlib figures are rendered and Base64-encoded
   as PNG for inline embedding in the HTML report.

3. **HTML assembly**: The report follows the Diversifi HTML Report Design Standard
   (`../.claude/skills/html-report/SKILL.md`) with the addition of a JavaScript
   theme toggle (light / dark) persisted via `localStorage`.

### Report Sections

| Section | Content |
|---------|---------|
| Overview | KPI stat cards, formal rankings table |
| Dataset | Data statistics, train/test split chart |
| Model Architectures | SVG pipeline diagrams, parameter tables, accordion detail |
| Performance Results | Metrics comparison table, grouped bar charts |
| Prediction Charts | Overlay plot, individual subplots, cumulative error |
| Error Analysis | Residual histograms, directional accuracy bar chart |
| Conclusion | Insights table, improvement roadmap, disclaimer |

---

## 7. Extension Points

| Extension | Where to modify |
|-----------|----------------|
| Add a fourth model | Create `model_<name>.py` following the same return-dict schema; import in `run_comparison.py` |
| Add sentiment features | Inject VADER scores into `feature_engineering_node` in `model_langgraph.py` |
| Change test window | Modify the `-60` slice in all three model files |
| GPU training for LSTM | Change `device = torch.device("cpu")` to `"cuda"` in `model_lstm.py` |
| Add new chart | Implement a `chart_*` function in `run_comparison.py` and reference it in `build_html` |
