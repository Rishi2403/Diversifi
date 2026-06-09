"""
LangGraph-Inspired Ensemble Predictor for Tesla Stock Prediction
================================================================
Architecture mirrors LangGraph's state-machine pattern:

  State: { close_series, features, predictions, calibrated }

  ┌─────────────────────────────────────────────────────────────────┐
  │ Node 1: feature_engineering_node                                │
  │   → MA(5/10/20/50), RSI-14, Bollinger %B, Momentum(1/3/5/10),  │
  │     Price/MA ratios, MA crossover signal, Lags(1–5), Volatility │
  ├─────────────────────────────────────────────────────────────────┤
  │ Node 2: signal_generation_node (parallel sub-agents)            │
  │   Agent-A: GradientBoostingRegressor (n=300, depth=5, lr=0.03)  │
  │   Agent-B: RandomForestRegressor    (n=300, depth=10)           │
  ├─────────────────────────────────────────────────────────────────┤
  │ Node 3: ensemble_voting_node                                    │
  │   → Weighted average: 0.65 × GBR + 0.35 × RF                  │
  ├─────────────────────────────────────────────────────────────────┤
  │ Node 4: confidence_calibration_node                             │
  │   → Anchor toward recent momentum to suppress overconfidence    │
  └─────────────────────────────────────────────────────────────────┘
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import warnings
warnings.filterwarnings("ignore")

np.random.seed(42)

# ── Feature columns produced by Node 1 ────────────────────────────────────────
FEATURE_COLS = [
    "MA5", "MA10", "MA20", "MA50",
    "Price_MA5_ratio", "Price_MA20_ratio", "MA5_MA20_ratio",
    "RSI14", "Bollinger_B",
    "Mom1", "Mom3", "Mom5", "Mom10",
    "Lag1", "Lag2", "Lag3", "Lag4", "Lag5",
    "Vol5", "Vol10",
]


# ── Node implementations ───────────────────────────────────────────────────────

def _rsi(prices: pd.Series, window: int = 14) -> pd.Series:
    delta = prices.diff()
    gain  = delta.clip(lower=0).rolling(window).mean()
    loss  = (-delta.clip(upper=0)).rolling(window).mean()
    rs    = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _bollinger_pct(prices: pd.Series, window: int = 20) -> pd.Series:
    ma    = prices.rolling(window).mean()
    std   = prices.rolling(window).std()
    upper = ma + 2 * std
    lower = ma - 2 * std
    return (prices - lower) / (upper - lower + 1e-9)


def feature_engineering_node(close: pd.Series) -> pd.DataFrame:
    """
    Node 1 — Feature Engineering
    Computes all technical indicators for the prediction pipeline.
    """
    df = pd.DataFrame({"Close": close})

    # Trend: moving averages
    for w in [5, 10, 20, 50]:
        df[f"MA{w}"] = df["Close"].rolling(w).mean()

    # Relative position
    df["Price_MA5_ratio"]  = df["Close"] / df["MA5"]
    df["Price_MA20_ratio"] = df["Close"] / df["MA20"]
    df["MA5_MA20_ratio"]   = df["MA5"]   / df["MA20"]   # crossover signal

    # Oscillators
    df["RSI14"]      = _rsi(df["Close"])
    df["Bollinger_B"] = _bollinger_pct(df["Close"])

    # Momentum (% change over n days)
    for lag in [1, 3, 5, 10]:
        df[f"Mom{lag}"] = df["Close"].pct_change(lag)

    # Price lags
    for lag in range(1, 6):
        df[f"Lag{lag}"] = df["Close"].shift(lag)

    # Volatility (rolling std of returns)
    pct = df["Close"].pct_change()
    df["Vol5"]  = pct.rolling(5).std()
    df["Vol10"] = pct.rolling(10).std()

    # Target: next-day close (used for training)
    df["Target"] = df["Close"].shift(-1)

    return df.dropna()


def signal_generation_node(X_train: np.ndarray, y_train: np.ndarray):
    """
    Node 2 — Parallel Signal Generation (two sub-agents)
    Returns fitted GBR and RF models.
    """
    gbr = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.85,
        min_samples_leaf=3,
        random_state=42,
    )
    rf = RandomForestRegressor(
        n_estimators=300,
        max_depth=10,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    gbr.fit(X_train, y_train)
    rf.fit(X_train, y_train)
    return gbr, rf


def ensemble_voting_node(
    gbr, rf, X: np.ndarray,
    weights: tuple = (0.65, 0.35),
) -> np.ndarray:
    """Node 3 — Weighted ensemble combination."""
    return weights[0] * gbr.predict(X) + weights[1] * rf.predict(X)


def confidence_calibration_node(
    predictions: np.ndarray,
    recent_prices: np.ndarray,
    window: int = 5,
) -> np.ndarray:
    """
    Node 4 — Confidence Calibration
    Lightly blends toward recent momentum to prevent drift during
    high-momentum regimes (e.g. sharp downtrends).
    """
    if len(recent_prices) < window:
        return predictions

    momentum = (recent_prices[-1] - recent_prices[-window]) / recent_prices[-window]
    blend        = min(0.12, abs(momentum) * 1.5)
    trend_anchor = recent_prices[-1] * (1 + momentum / window)
    return (1 - blend) * predictions + blend * trend_anchor


# ── Main runner ────────────────────────────────────────────────────────────────

def run_langgraph(data_path: str) -> dict:
    data  = pd.read_csv(data_path)
    stock = data[["Date", "Close"]].copy()
    stock["Date"] = pd.to_datetime(stock["Date"])
    stock = stock.set_index("Date")

    close     = stock["Close"]
    train     = close.iloc[:-60]
    test      = close.iloc[-60:]
    train_len = len(train)

    # Node 1: features on full dataset
    full_df   = feature_engineering_node(close)
    split_dt  = close.index[train_len]
    train_df  = full_df[full_df.index < split_dt]

    X_train   = train_df[FEATURE_COLS].values
    y_train   = train_df["Target"].values

    scaler    = StandardScaler()
    X_tr_sc   = scaler.fit_transform(X_train)

    # Node 2: train both sub-agents once on the full training window
    gbr, rf   = signal_generation_node(X_tr_sc, y_train)

    # Walk-forward prediction — expanding history
    all_close   = close.values.copy()
    predictions = []

    for t in range(len(test)):
        cur_series = pd.Series(
            all_close[: train_len + t],
            index=close.index[: train_len + t],
        )

        # Node 1 on rolling window
        temp_df = feature_engineering_node(cur_series)
        if temp_df.empty:
            predictions.append(all_close[train_len + t - 1])
            continue

        X_pred    = temp_df[FEATURE_COLS].iloc[[-1]].values
        X_pred_sc = scaler.transform(X_pred)

        # Node 3: ensemble vote
        raw = ensemble_voting_node(gbr, rf, X_pred_sc)

        # Node 4: calibration
        recent = all_close[max(0, train_len + t - 10): train_len + t]
        cal    = confidence_calibration_node(raw, recent)

        predictions.append(float(cal[0]))

    predictions = np.array(predictions)
    actuals     = test.values

    rmse    = float(np.sqrt(mean_squared_error(actuals, predictions)))
    mae     = float(mean_absolute_error(actuals, predictions))
    mape    = float(np.mean(np.abs((actuals - predictions) / actuals)) * 100)
    dir_acc = float(np.mean(
        np.sign(np.diff(actuals)) == np.sign(np.diff(predictions))
    ) * 100)

    return {
        "model_name":           "LangGraph Ensemble",
        "model_label":          "langgraph",
        "predictions":          predictions,
        "actuals":              actuals,
        "test_dates":           test.index,
        "train":                train,
        "test":                 test,
        "rmse":                 rmse,
        "mae":                  mae,
        "mape":                 mape,
        "directional_accuracy": dir_acc,
        "features":             len(FEATURE_COLS),
        "pipeline_nodes":       4,
    }


if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    csv  = os.path.join(here, "..", "Tesla-Stock-Prediction", "TSLA.CSV")
    r = run_langgraph(csv)
    print(f"LangGraph RMSE={r['rmse']:.3f}  MAE={r['mae']:.3f}  MAPE={r['mape']:.2f}%  DirAcc={r['directional_accuracy']:.1f}%")
