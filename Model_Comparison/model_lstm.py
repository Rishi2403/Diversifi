"""
LSTM Model for Tesla Stock Price Prediction
Implements the architecture from:
  "Advanced Stock Market Prediction Using Long Short-Term Memory Networks"
  (arXiv:2505.05325v1) — Rajneesh Chaudhary, IIITM Gwalior

Architecture  : 64 → Dropout(0.2) → 32 → Dense(1)
Lookback      : 60 trading days
Normalisation : MinMax [0,1]
Optimiser     : Adam (lr=0.001)
Loss          : MSE
Epochs        : 100 (no early stopping — mirrors pure paper spec)
Note          : Paper achieves 2.72% MAPE with NASDAQ data + sentiment.
                Here we use TSLA data only (no sentiment feed), which
                represents the baseline LSTM without augmentation.
"""
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import warnings
warnings.filterwarnings("ignore")

torch.manual_seed(42)
np.random.seed(42)


class LSTMNet(nn.Module):
    """Two-layer LSTM matching the paper's architecture."""

    def __init__(self, input_size: int = 1,
                 hidden1: int = 64, hidden2: int = 32,
                 dropout: float = 0.2):
        super().__init__()
        self.lstm1   = nn.LSTM(input_size, hidden1, batch_first=True)
        self.drop    = nn.Dropout(dropout)
        self.lstm2   = nn.LSTM(hidden1, hidden2, batch_first=True)
        self.fc      = nn.Linear(hidden2, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm1(x)
        out    = self.drop(out)
        out, _ = self.lstm2(out)
        return self.fc(out[:, -1, :])


def _make_sequences(data: np.ndarray, lookback: int):
    X, y = [], []
    for i in range(lookback, len(data)):
        X.append(data[i - lookback:i])
        y.append(data[i])
    return np.array(X), np.array(y)


def run_lstm(data_path: str) -> dict:
    """Train LSTM on the training split, then walk-forward on test."""
    data  = pd.read_csv(data_path)
    stock = data[["Date", "Close"]].copy()
    stock["Date"] = pd.to_datetime(stock["Date"])
    stock = stock.set_index("Date")

    close     = stock["Close"]
    train     = close.iloc[:-60]
    test      = close.iloc[-60:]
    train_len = len(train)

    # MinMax normalisation (paper spec)
    scaler       = MinMaxScaler()
    close_np     = np.array(close.values, dtype=np.float64)
    close_scaled = scaler.fit_transform(close_np.reshape(-1, 1)).flatten()

    LOOKBACK = 60  # paper spec

    # Training sequences
    X_tr, y_tr = _make_sequences(close_scaled[:train_len], LOOKBACK)
    X_tr = torch.FloatTensor(X_tr).unsqueeze(-1)   # (N, 60, 1)
    y_tr = torch.FloatTensor(y_tr).unsqueeze(-1)   # (N, 1)

    # Build model
    device = torch.device("cpu")
    model  = LSTMNet(input_size=1, hidden1=64, hidden2=32, dropout=0.2).to(device)
    opt    = torch.optim.Adam(model.parameters(), lr=0.001)
    crit   = nn.MSELoss()

    # 100 epochs — paper spec, no early stopping
    # (without sentiment augmentation the model tends to overfit
    #  the training regime, hurting generalisation on regime shifts)
    model.train()
    for _ in range(100):
        opt.zero_grad()
        loss = crit(model(X_tr.to(device)), y_tr.to(device))
        loss.backward()
        opt.step()

    # Walk-forward inference on test set
    model.eval()
    predictions = []

    for t in range(len(test)):
        start = train_len + t - LOOKBACK
        seq   = close_scaled[start: train_len + t]
        seq_t = torch.FloatTensor(seq).unsqueeze(0).unsqueeze(-1).to(device)
        with torch.no_grad():
            predictions.append(model(seq_t).item())

    predictions = scaler.inverse_transform(
        np.array(predictions).reshape(-1, 1)
    ).flatten()
    actuals = test.values

    rmse    = float(np.sqrt(mean_squared_error(actuals, predictions)))
    mae     = float(mean_absolute_error(actuals, predictions))
    mape    = float(np.mean(np.abs((actuals - predictions) / actuals)) * 100)
    dir_acc = float(np.mean(
        np.sign(np.diff(actuals)) == np.sign(np.diff(predictions))
    ) * 100)

    return {
        "model_name":           "LSTM (PDF Paper)",
        "model_label":          "lstm",
        "predictions":          predictions,
        "actuals":              actuals,
        "test_dates":           test.index,
        "train":                train,
        "test":                 test,
        "rmse":                 rmse,
        "mae":                  mae,
        "mape":                 mape,
        "directional_accuracy": dir_acc,
        "architecture":         "64→32→Dense(1), LOOKBACK=60, MinMax, Adam",
    }


if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    csv  = os.path.join(here, "..", "Tesla-Stock-Prediction", "TSLA.CSV")
    r = run_lstm(csv)
    print(f"LSTM   RMSE={r['rmse']:.3f}  MAE={r['mae']:.3f}  MAPE={r['mape']:.2f}%  DirAcc={r['directional_accuracy']:.1f}%")
