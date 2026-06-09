"""
ARIMA Model for Tesla Stock Price Prediction
Based on Time_Series.ipynb notebook — ARIMA(2,0,0) walk-forward validation
"""
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error, mean_absolute_error
import warnings
warnings.filterwarnings("ignore")


def run_arima(data_path: str) -> dict:
    """Walk-forward ARIMA(2,0,0) — optimal order found via grid search in notebook."""
    data = pd.read_csv(data_path)
    stock = data[["Date", "Close"]].copy()
    stock["Date"] = pd.to_datetime(stock["Date"])
    stock = stock.set_index("Date")

    close = stock["Close"]
    train = close.iloc[:-60]
    test  = close.iloc[-60:]

    history     = list(train.values)
    predictions = []

    for t in range(len(test)):
        model = ARIMA(history, order=(2, 0, 0))
        fit   = model.fit()
        yhat  = float(fit.forecast()[0])
        predictions.append(yhat)
        history.append(float(test.iloc[t]))

    predictions = np.array(predictions)
    actuals     = test.values

    rmse     = float(np.sqrt(mean_squared_error(actuals, predictions)))
    mae      = float(mean_absolute_error(actuals, predictions))
    mape     = float(np.mean(np.abs((actuals - predictions) / actuals)) * 100)
    dir_acc  = float(np.mean(
        np.sign(np.diff(actuals)) == np.sign(np.diff(predictions))
    ) * 100)

    return {
        "model_name":          "ARIMA (Notebook)",
        "model_label":         "arima",
        "predictions":         predictions,
        "actuals":             actuals,
        "test_dates":          test.index,
        "train":               train,
        "test":                test,
        "rmse":                rmse,
        "mae":                 mae,
        "mape":                mape,
        "directional_accuracy": dir_acc,
        "order":               "(2,0,0)",
    }


if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    csv  = os.path.join(here, "..", "Tesla-Stock-Prediction", "TSLA.CSV")
    r = run_arima(csv)
    print(f"ARIMA  RMSE={r['rmse']:.3f}  MAE={r['mae']:.3f}  MAPE={r['mape']:.2f}%  DirAcc={r['directional_accuracy']:.1f}%")
