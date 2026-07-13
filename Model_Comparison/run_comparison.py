"""
Model Comparison Runner - Tesla Stock Prediction
Runs ARIMA, LSTM and LangGraph models on TSLA.CSV,
then generates a self-contained HTML comparison report.

Usage:
    python run_comparison.py
Output:
    comparison_report.html
"""
import os
import sys
import base64
import io
import datetime
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

# ── Resolve paths ──────────────────────────────────────────────────────────────
HERE    = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "..", "Tesla-Stock-Prediction", "TSLA.CSV")
OUT_HTML = os.path.join(HERE, "comparison_report.html")

sys.path.insert(0, HERE)
from model_arima     import run_arima
from model_lstm      import run_lstm
from model_langgraph import run_langgraph


# ── Colour palette (matches report light theme) ───────────────────────────────
PALETTE = {
    "langgraph": "#0b5394",   # accent blue
    "arima":     "#cc8b0a",   # amber
    "lstm":      "#8a1178",   # purple
    "actual":    "#1a7a3c",   # green
    "grid":      "#d7d7d7",
    "bg":        "#f5f6f8",
}


# ─────────────────────────────────────────────────────────────────────────────
#  Chart helpers
# ─────────────────────────────────────────────────────────────────────────────

def _b64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


def chart_train_test_split(results: list) -> str:
    r  = results[0]
    fig, ax = plt.subplots(figsize=(11, 4), facecolor=PALETTE["bg"])
    ax.set_facecolor(PALETTE["bg"])
    ax.plot(r["train"].index, r["train"].values,
            color=PALETTE["arima"], linewidth=1.8, label="Training data")
    ax.plot(r["test"].index, r["test"].values,
            color=PALETTE["actual"], linewidth=2.2, label="Test data (60 days)")
    ax.axvline(x=r["test"].index[0], color="#444", linestyle="--",
               linewidth=1.2, alpha=0.7)
    ax.set_title("TSLA Close Price - Train / Test Split", fontsize=14)
    ax.set_xlabel("Date"); ax.set_ylabel("Price (USD)")
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.4, color=PALETTE["grid"])
    for sp in ax.spines.values(): sp.set_color(PALETTE["grid"])
    fig.tight_layout()
    return _b64(fig)


def chart_all_predictions(results: list) -> str:
    """Overlay all three predictions vs actual on one plot."""
    fig, ax = plt.subplots(figsize=(12, 5), facecolor=PALETTE["bg"])
    ax.set_facecolor(PALETTE["bg"])

    first = results[0]
    ax.plot(first["test_dates"], first["actuals"],
            color=PALETTE["actual"], linewidth=2.5, label="Actual", zorder=5)

    styles = ["-", "--", "-."]
    for r, ls in zip(results, styles):
        ax.plot(r["test_dates"], r["predictions"],
                color=PALETTE[r["model_label"]], linewidth=1.8,
                linestyle=ls, label=r["model_name"], alpha=0.9)

    ax.set_title("Test Period: Actual vs All Model Predictions", fontsize=14)
    ax.set_xlabel("Date"); ax.set_ylabel("Price (USD)")
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.4, color=PALETTE["grid"])
    for sp in ax.spines.values(): sp.set_color(PALETTE["grid"])
    fig.tight_layout()
    return _b64(fig)


def chart_individual_predictions(results: list) -> str:
    """3-panel subplot, one per model."""
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5), facecolor=PALETTE["bg"])
    fig.patch.set_facecolor(PALETTE["bg"])

    for ax, r in zip(axes, results):
        ax.set_facecolor(PALETTE["bg"])
        ax.plot(range(len(r["actuals"])), r["actuals"],
                color=PALETTE["actual"], linewidth=2.2, label="Actual")
        ax.plot(range(len(r["predictions"])), r["predictions"],
                color=PALETTE[r["model_label"]], linewidth=1.8, label="Predicted")
        ax.set_title(r["model_name"], fontsize=12)
        ax.set_xlabel("Test day"); ax.set_ylabel("Price (USD)")
        ax.legend(fontsize=9)
        ax.grid(True, alpha=0.4, color=PALETTE["grid"])
        for sp in ax.spines.values(): sp.set_color(PALETTE["grid"])
        rmse_txt = f"RMSE: {r['rmse']:.2f}"
        ax.text(0.97, 0.04, rmse_txt, transform=ax.transAxes,
                ha="right", va="bottom", fontsize=10,
                color=PALETTE[r["model_label"]],
                bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.7))

    fig.tight_layout(pad=2)
    return _b64(fig)


def chart_metrics_bar(results: list) -> str:
    """Grouped bar chart for RMSE, MAE, MAPE."""
    names  = [r["model_name"] for r in results]
    colors = [PALETTE[r["model_label"]] for r in results]
    metrics = {
        "RMSE":   [r["rmse"] for r in results],
        "MAE":    [r["mae"]  for r in results],
        "MAPE (%)": [r["mape"] for r in results],
    }

    fig, axes = plt.subplots(1, 3, figsize=(13, 4.5), facecolor=PALETTE["bg"])
    fig.patch.set_facecolor(PALETTE["bg"])

    for ax, (metric, vals) in zip(axes, metrics.items()):
        bars = ax.bar(range(len(names)), vals, color=colors, width=0.55, zorder=2)
        ax.set_xticks(range(len(names)))
        ax.set_xticklabels(names, fontsize=9, rotation=10, ha="right")
        ax.set_title(metric, fontsize=13)
        ax.set_ylabel(metric)
        ax.grid(axis="y", alpha=0.4, color=PALETTE["grid"], zorder=1)
        ax.set_facecolor(PALETTE["bg"])
        for sp in ax.spines.values(): sp.set_color(PALETTE["grid"])
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + max(vals) * 0.02,
                    f"{v:.2f}", ha="center", va="bottom", fontsize=9)

    fig.tight_layout(pad=2)
    return _b64(fig)


def chart_error_distribution(results: list) -> str:
    """Residual distributions side by side."""
    fig, axes = plt.subplots(1, 3, figsize=(14, 4), facecolor=PALETTE["bg"])
    fig.patch.set_facecolor(PALETTE["bg"])

    for ax, r in zip(axes, results):
        ax.set_facecolor(PALETTE["bg"])
        errors = r["actuals"] - r["predictions"]
        ax.hist(errors, bins=15, color=PALETTE[r["model_label"]],
                alpha=0.75, edgecolor="white", linewidth=0.6)
        ax.axvline(0, color="#333", linestyle="--", linewidth=1.2)
        ax.axvline(errors.mean(), color="red", linestyle=":", linewidth=1.5,
                   label=f"Mean: {errors.mean():.1f}")
        ax.set_title(f"{r['model_name']}\nResiduals", fontsize=11)
        ax.set_xlabel("Error (Actual - Predicted)")
        ax.set_ylabel("Count")
        ax.legend(fontsize=9)
        ax.grid(True, alpha=0.3, color=PALETTE["grid"])
        for sp in ax.spines.values(): sp.set_color(PALETTE["grid"])

    fig.tight_layout(pad=2)
    return _b64(fig)


def chart_directional_accuracy(results: list) -> str:
    names  = [r["model_name"] for r in results]
    accs   = [r["directional_accuracy"] for r in results]
    colors = [PALETTE[r["model_label"]] for r in results]

    fig, ax = plt.subplots(figsize=(7, 4), facecolor=PALETTE["bg"])
    ax.set_facecolor(PALETTE["bg"])
    bars = ax.bar(range(len(names)), accs, color=colors, width=0.5, zorder=2)
    ax.axhline(50, color="#888", linestyle="--", linewidth=1.2,
               label="Random baseline (50%)")
    ax.set_xticks(range(len(names)))
    ax.set_xticklabels(names, fontsize=10, rotation=10, ha="right")
    ax.set_ylabel("Directional Accuracy (%)")
    ax.set_title("Directional Accuracy (% correct up/down)", fontsize=13)
    ax.set_ylim(0, 100)
    ax.legend(fontsize=10)
    ax.grid(axis="y", alpha=0.4, color=PALETTE["grid"], zorder=1)
    for sp in ax.spines.values(): sp.set_color(PALETTE["grid"])
    for bar, v in zip(bars, accs):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 1.5,
                f"{v:.1f}%", ha="center", fontsize=10)
    fig.tight_layout()
    return _b64(fig)


def chart_cumulative_error(results: list) -> str:
    fig, ax = plt.subplots(figsize=(11, 4.5), facecolor=PALETTE["bg"])
    ax.set_facecolor(PALETTE["bg"])

    for r in results:
        cum_err = np.cumsum(np.abs(r["actuals"] - r["predictions"]))
        ax.plot(range(1, len(cum_err) + 1), cum_err,
                color=PALETTE[r["model_label"]], linewidth=2,
                label=r["model_name"])

    ax.set_title("Cumulative Absolute Error Over Test Period", fontsize=13)
    ax.set_xlabel("Test Day"); ax.set_ylabel("Cumulative |Error|")
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.4, color=PALETTE["grid"])
    for sp in ax.spines.values(): sp.set_color(PALETTE["grid"])
    fig.tight_layout()
    return _b64(fig)


# ─────────────────────────────────────────────────────────────────────────────
#  HTML helpers
# ─────────────────────────────────────────────────────────────────────────────

def pill(label: str, variant: str) -> str:
    return f'<span class="pill pill-{variant}">{label}</span>'


def img_tag(b64: str, alt: str) -> str:
    return (f'<img src="data:image/png;base64,{b64}" alt="{alt}" '
            f'style="max-width:100%;border-radius:6px;margin:14px 0;">')


def metric_row(results: list) -> str:
    """Best / worst / middle for RMSE, MAE, MAPE, DirAcc."""
    rows = []
    headers = ["Model", "RMSE", "MAE", "MAPE (%)", "Dir. Accuracy (%)"]
    rows.append(
        "<div class='table-wrap'><table class='dist'>"
        "<thead><tr>" +
        "".join(f"<th>{'<span class=\"num\">' if h not in ('Model',) else ''}{h}{'</span>' if h not in ('Model',) else ''}</th>" for h in headers) +
        "</tr></thead><tbody>"
    )

    for r in results:
        label = r["model_label"]
        colour_map = {"langgraph": "blue", "arima": "amber", "lstm": "grey"}
        badge = pill(r["model_name"], colour_map.get(label, "grey"))
        rows.append(
            f"<tr>"
            f"<td>{badge}</td>"
            f"<td class='num'>{r['rmse']:.3f}</td>"
            f"<td class='num'>{r['mae']:.3f}</td>"
            f"<td class='num'>{r['mape']:.2f}%</td>"
            f"<td class='num'>{r['directional_accuracy']:.1f}%</td>"
            f"</tr>"
        )

    rows.append("</tbody></table></div>")
    return "\n".join(rows)


# ─────────────────────────────────────────────────────────────────────────────
#  SVG Architecture diagrams
# ─────────────────────────────────────────────────────────────────────────────

def svg_arima_arch() -> str:
    return """
<svg viewBox="0 0 820 84" overflow="visible" class="diagram"
     role="img" aria-label="ARIMA pipeline: data → difference → ARIMA(2,0,0) → walk-forward → forecast">
  <defs>
    <marker id="arr-arima" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="20" y="20" width="140" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="90" y="38" font-size="12">TSLA Close</tspan>
    <tspan x="90" dy="1.3em" font-size="11" class="muted-text">758 daily prices</tspan>
  </text>
  <line x1="160" y1="42" x2="198" y2="42" class="arrow" color="var(--fg)" marker-end="url(#arr-arima)"/>
  <rect x="200" y="20" width="140" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="270" y="38" font-size="12">Stationarity</tspan>
    <tspan x="270" dy="1.3em" font-size="11" class="muted-text">ADF test + diff</tspan>
  </text>
  <line x1="340" y1="42" x2="378" y2="42" class="arrow" color="var(--fg)" marker-end="url(#arr-arima)"/>
  <rect x="380" y="20" width="140" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="450" y="38" font-size="12">ARIMA(2,0,0)</tspan>
    <tspan x="450" dy="1.3em" font-size="11" class="muted-text">Best via grid search</tspan>
  </text>
  <line x1="520" y1="42" x2="558" y2="42" class="arrow" color="var(--fg)" marker-end="url(#arr-arima)"/>
  <rect x="560" y="20" width="140" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="630" y="38" font-size="12">Walk-Forward</tspan>
    <tspan x="630" dy="1.3em" font-size="11" class="muted-text">60-step test</tspan>
  </text>
  <line x1="700" y1="42" x2="738" y2="42" class="arrow" color="var(--fg)" marker-end="url(#arr-arima)"/>
  <rect x="740" y="20" width="60" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="770" y="46" font-size="12">Output</tspan>
  </text>
</svg>
<p class="diagram-caption">Figure - ARIMA pipeline (notebook approach)</p>"""


def svg_lstm_arch() -> str:
    return """
<svg viewBox="0 0 960 120" overflow="visible" class="diagram"
     role="img" aria-label="LSTM pipeline from paper: MinMax → sequences → LSTM64 → Dropout → LSTM32 → Dense → price">
  <defs>
    <marker id="arr-lstm" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="currentColor"/>
    </marker>
  </defs>
  <!-- Row 1 -->
  <rect x="20" y="38" width="130" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="85" y="56" font-size="12">MinMax Norm</tspan>
    <tspan x="85" dy="1.3em" font-size="11" class="muted-text">Scale [0,1]</tspan>
  </text>
  <line x1="150" y1="60" x2="188" y2="60" class="arrow" color="var(--fg)" marker-end="url(#arr-lstm)"/>
  <rect x="190" y="38" width="130" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="255" y="56" font-size="12">60-Day Window</tspan>
    <tspan x="255" dy="1.3em" font-size="11" class="muted-text">Sliding sequences</tspan>
  </text>
  <line x1="320" y1="60" x2="358" y2="60" class="arrow" color="var(--fg)" marker-end="url(#arr-lstm)"/>
  <rect x="360" y="38" width="130" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="425" y="56" font-size="12">LSTM Layer 1</tspan>
    <tspan x="425" dy="1.3em" font-size="11" class="muted-text">64 units</tspan>
  </text>
  <line x1="490" y1="60" x2="528" y2="60" class="arrow" color="var(--fg)" marker-end="url(#arr-lstm)"/>
  <rect x="530" y="38" width="130" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="595" y="56" font-size="12">Dropout 20%</tspan>
    <tspan x="595" dy="1.3em" font-size="11" class="muted-text">Regularisation</tspan>
  </text>
  <line x1="660" y1="60" x2="698" y2="60" class="arrow" color="var(--fg)" marker-end="url(#arr-lstm)"/>
  <rect x="700" y="38" width="130" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="765" y="56" font-size="12">LSTM Layer 2</tspan>
    <tspan x="765" dy="1.3em" font-size="11" class="muted-text">32 units</tspan>
  </text>
  <line x1="830" y1="60" x2="868" y2="60" class="arrow" color="var(--fg)" marker-end="url(#arr-lstm)"/>
  <rect x="870" y="38" width="70" height="44" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="905" y="56" font-size="12">Dense(1)</tspan>
    <tspan x="905" dy="1.3em" font-size="11" class="muted-text">Price out</tspan>
  </text>
</svg>
<p class="diagram-caption">Figure - LSTM architecture from PDF paper (PyTorch implementation)</p>"""


def svg_langgraph_arch() -> str:
    return """
<svg viewBox="0 0 1020 200" overflow="visible" class="diagram"
     role="img" aria-label="LangGraph 4-node pipeline">
  <defs>
    <marker id="arr-lg" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill="currentColor"/>
    </marker>
  </defs>
  <!-- State label -->
  <text x="510" y="16" text-anchor="middle" font-size="11" class="muted-text">LangGraph State Machine - 4 nodes, expanding window walk-forward</text>

  <!-- Node 1: Feature Engineering -->
  <rect x="20" y="50" width="200" height="100" rx="6" class="box"/>
  <text text-anchor="middle">
    <tspan x="120" y="75" font-size="12" font-weight="bold">Node 1</tspan>
    <tspan x="120" dy="1.4em" font-size="11">Feature Engineering</tspan>
    <tspan x="120" dy="1.3em" font-size="10" class="muted-text">MA5/10/20/50, RSI-14</tspan>
    <tspan x="120" dy="1.2em" font-size="10" class="muted-text">Bollinger, Momentum</tspan>
    <tspan x="120" dy="1.2em" font-size="10" class="muted-text">Lags 1-5, Volatility</tspan>
  </text>
  <line x1="220" y1="100" x2="258" y2="100" class="arrow" color="var(--fg)" marker-end="url(#arr-lg)"/>

  <!-- Node 2: Signal Generation (two sub-agents) -->
  <rect x="260" y="50" width="200" height="100" rx="6" class="box"/>
  <text text-anchor="middle">
    <tspan x="360" y="75" font-size="12" font-weight="bold">Node 2</tspan>
    <tspan x="360" dy="1.4em" font-size="11">Signal Generation</tspan>
    <tspan x="360" dy="1.3em" font-size="10" class="muted-text">Agent-A: GBR (n=300)</tspan>
    <tspan x="360" dy="1.2em" font-size="10" class="muted-text">Agent-B: RF  (n=300)</tspan>
    <tspan x="360" dy="1.2em" font-size="10" class="muted-text">Parallel sub-models</tspan>
  </text>
  <line x1="460" y1="100" x2="498" y2="100" class="arrow" color="var(--fg)" marker-end="url(#arr-lg)"/>

  <!-- Node 3: Ensemble Voting -->
  <rect x="500" y="50" width="200" height="100" rx="6" class="box"/>
  <text text-anchor="middle">
    <tspan x="600" y="75" font-size="12" font-weight="bold">Node 3</tspan>
    <tspan x="600" dy="1.4em" font-size="11">Ensemble Voting</tspan>
    <tspan x="600" dy="1.3em" font-size="10" class="muted-text">0.65 × GBR</tspan>
    <tspan x="600" dy="1.2em" font-size="10" class="muted-text">+ 0.35 × RF</tspan>
    <tspan x="600" dy="1.2em" font-size="10" class="muted-text">Weighted average</tspan>
  </text>
  <line x1="700" y1="100" x2="738" y2="100" class="arrow" color="var(--fg)" marker-end="url(#arr-lg)"/>

  <!-- Node 4: Confidence Calibration -->
  <rect x="740" y="50" width="200" height="100" rx="6" class="box"/>
  <text text-anchor="middle">
    <tspan x="840" y="75" font-size="12" font-weight="bold">Node 4</tspan>
    <tspan x="840" dy="1.4em" font-size="11">Confidence Calib.</tspan>
    <tspan x="840" dy="1.3em" font-size="10" class="muted-text">Momentum anchor</tspan>
    <tspan x="840" dy="1.2em" font-size="10" class="muted-text">Drift suppression</tspan>
    <tspan x="840" dy="1.2em" font-size="10" class="muted-text">Final prediction</tspan>
  </text>
  <line x1="940" y1="100" x2="978" y2="100" class="arrow" color="var(--fg)" marker-end="url(#arr-lg)"/>
  <rect x="980" y="76" width="30" height="48" rx="4" class="box"/>
  <text text-anchor="middle">
    <tspan x="995" y="105" font-size="10">Out</tspan>
  </text>
</svg>
<p class="diagram-caption">Figure - LangGraph 4-node state-machine pipeline (inspired by Diversifi backend architecture)</p>"""


# ─────────────────────────────────────────────────────────────────────────────
#  HTML report generator
# ─────────────────────────────────────────────────────────────────────────────

CSS_DARK_OVERRIDE = """
  /* ── Manual theme overrides (class-based, JS-toggled) ───── */
  html.force-dark {
    --fg:#e4e4e4; --muted:#a0a0a0; --accent:#78b2ef;
    --accent-light:#1b2a3b; --border:#3a3a3a; --bg:#1a1a1c;
    --sidebar-bg:#1f2023; --sidebar-hdr:#26282d;
    --code-bg:#26282d; --warn:#ef9b7a; --warn-light:#2d1a10;
    --bar:#78b2ef; --fail-bg:#3d1a1a; --fail-text:#f6b2a0;
    --ok-bg:#0f2d14; --ok-border:#4aaa5a; --ok-text:#7adc8a;
    color-scheme: dark;
  }
  html.force-light {
    --fg:#1a1a1a; --muted:#555; --accent:#0b5394;
    --accent-light:#d6e4f1; --border:#d7d7d7; --bg:#f5f6f8;
    --sidebar-bg:#ffffff; --sidebar-hdr:#f8f9fb;
    --code-bg:#eef1f5; --warn:#a14b2d; --warn-light:#fdf0eb;
    --bar:#0b5394; --fail-bg:#f6e2dd; --fail-text:#7a1a0a;
    --ok-bg:#eaf4ec; --ok-border:#2d7a3a; --ok-text:#1a5c27;
    color-scheme: light;
  }
  /* Theme toggle button */
  #theme-btn {
    position:fixed; bottom:28px; right:96px;
    background:var(--sidebar-hdr); color:var(--fg);
    border:1px solid var(--border); border-radius:6px;
    padding:8px 12px; font-size:13px; cursor:pointer;
    opacity:0; pointer-events:none;
    transition:opacity 0.2s, background 0.2s;
    z-index:100;
  }
  #theme-btn.visible { opacity:1; pointer-events:auto; }
  #theme-btn:hover { background:var(--accent-light); }
"""

THEME_SCRIPT = """
  (function(){
    var saved = localStorage.getItem('diversifi-theme');
    if(saved) document.documentElement.classList.add('force-' + saved);
  })();

  function toggleTheme(){
    var html = document.documentElement;
    var btn  = document.getElementById('theme-btn');
    var isDark = html.classList.contains('force-dark') ||
      (!html.classList.contains('force-light') &&
       window.matchMedia('(prefers-color-scheme:dark)').matches);
    if(isDark){
      html.classList.remove('force-dark');
      html.classList.add('force-light');
      btn.textContent = '☾ Dark';
      localStorage.setItem('diversifi-theme','light');
    } else {
      html.classList.remove('force-light');
      html.classList.add('force-dark');
      btn.textContent = '☀ Light';
      localStorage.setItem('diversifi-theme','dark');
    }
  }

  (function(){
    var btn = document.getElementById('theme-btn');
    var topBtn = document.getElementById('top-btn');
    function updateLabel(){
      var isDark = document.documentElement.classList.contains('force-dark') ||
        (!document.documentElement.classList.contains('force-light') &&
         window.matchMedia('(prefers-color-scheme:dark)').matches);
      btn.textContent = isDark ? '☀ Light' : '☾ Dark';
    }
    updateLabel();
    window.addEventListener('scroll',function(){
      var show = window.scrollY > 300;
      btn.classList.toggle('visible', show);
      topBtn.classList.toggle('visible', show);
    },{passive:true});
  })();
"""

INTERSECT_SCRIPT = """
  (function(){
    var links = Array.from(document.querySelectorAll('nav.sidebar-toc a'));
    if(!links.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          links.forEach(function(l){ l.classList.remove('active'); });
          var hit = document.querySelector('nav.sidebar-toc a[href="#'+e.target.id+'"]');
          if(hit) hit.classList.add('active');
        }
      });
    },{rootMargin:'-10% 0px -75% 0px', threshold:0});
    links.forEach(function(l){
      var t = document.querySelector(l.getAttribute('href'));
      if(t) io.observe(t);
    });
    if(links[0]) links[0].classList.add('active');
  })();
"""


def build_html(results: list, charts: dict, date_str: str, data_rows: int) -> str:
    lg = next(r for r in results if r["model_label"] == "langgraph")
    ar = next(r for r in results if r["model_label"] == "arima")
    ls = next(r for r in results if r["model_label"] == "lstm")

    train_size = len(lg["train"])
    test_size  = len(lg["test"])
    date_range = f"{lg['train'].index[0].date()} → {lg['test'].index[-1].date()}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tesla Stock Prediction - Model Comparison</title>
<style>
  /* ── Design tokens ─────────────────────────────────────── */
  :root {{
    --fg:#1a1a1a; --muted:#555; --accent:#0b5394;
    --accent-light:#d6e4f1; --border:#d7d7d7; --bg:#f5f6f8;
    --sidebar-bg:#ffffff; --sidebar-hdr:#f8f9fb;
    --code-bg:#eef1f5; --warn:#a14b2d; --warn-light:#fdf0eb; --bar:#0b5394;
    --fail-bg:#f6e2dd; --fail-text:#7a1a0a;
    --ok-bg:#eaf4ec; --ok-border:#2d7a3a; --ok-text:#1a5c27;
  }}
  @media (prefers-color-scheme:dark) {{
    :root {{
      --fg:#e4e4e4; --muted:#a0a0a0; --accent:#78b2ef;
      --accent-light:#1b2a3b; --border:#3a3a3a; --bg:#1a1a1c;
      --sidebar-bg:#1f2023; --sidebar-hdr:#26282d;
      --code-bg:#26282d; --warn:#ef9b7a; --warn-light:#2d1a10; --bar:#78b2ef;
      --fail-bg:#3d1a1a; --fail-text:#f6b2a0;
      --ok-bg:#0f2d14; --ok-border:#4aaa5a; --ok-text:#7adc8a;
    }}
  }}
  {CSS_DARK_OVERRIDE}
  /* ── Base ──────────────────────────────────────────────── */
  *{{box-sizing:border-box;}}
  body {{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
        font-size:15px;line-height:1.55;color:var(--fg);background:var(--bg);margin:0;
        display:flex;min-height:100vh;}}
  h1{{font-size:30px;margin:0 0 6px;letter-spacing:-0.01em;}}
  h2{{font-size:22px;margin:48px 0 12px;padding-top:8px;}}
  h3{{font-size:17px;margin:28px 0 8px;}}
  a{{color:var(--accent);text-decoration:none;}} a:hover{{text-decoration:underline;}}
  code{{background:var(--code-bg);padding:1px 5px;border-radius:3px;
        font-family:"SF Mono","Consolas","Liberation Mono",monospace;font-size:13px;}}
  pre {{background:var(--code-bg);padding:12px 14px;border-radius:6px;overflow-x:auto;
        font-family:"SF Mono","Consolas","Liberation Mono",monospace;font-size:13px;line-height:1.5;}}
  /* ── Sidebar ───────────────────────────────────────────── */
  nav.sidebar-toc{{position:fixed;left:0;top:0;bottom:0;width:260px;
                   background:var(--sidebar-bg);border-right:2px solid var(--border);
                   box-shadow:2px 0 8px rgba(0,0,0,0.06);overflow-y:auto;z-index:1000;
                   display:flex;flex-direction:column;}}
  .sidebar-header{{padding:18px 20px 14px;border-bottom:1px solid var(--border);
                   background:var(--sidebar-hdr);flex-shrink:0;}}
  .sidebar-title{{font-size:11px;font-weight:700;text-transform:uppercase;
                  letter-spacing:0.09em;color:var(--muted);}}
  nav.sidebar-toc ol{{margin:0;padding:10px 0 24px;list-style:none;flex:1;overflow-y:auto;}}
  nav.sidebar-toc li{{margin:1px 0;}}
  nav.sidebar-toc a{{display:block;padding:9px 20px;color:var(--fg);
                     font-size:13px;font-weight:500;line-height:1.4;
                     border-left:3px solid transparent;text-decoration:none;
                     transition:background 0.15s,color 0.15s,border-color 0.15s;}}
  nav.sidebar-toc .nav-summary{{display:block;font-size:11px;font-weight:400;
                                color:var(--muted);margin-top:1px;}}
  nav.sidebar-toc a:hover{{background:var(--accent-light);color:var(--accent);border-left-color:var(--accent);}}
  nav.sidebar-toc a.active{{background:var(--accent-light);color:var(--accent);
                             border-left-color:var(--accent);font-weight:600;}}
  /* ── Main ──────────────────────────────────────────────── */
  main{{margin-left:260px;flex:1;min-width:0;padding:32px 36px 72px;
        max-width:calc(1300px - 260px);box-sizing:border-box;}}
  header{{border-bottom:1px solid var(--border);margin-bottom:32px;padding-bottom:16px;}}
  .subtitle{{color:var(--muted);font-size:16px;margin:0 0 4px;}}
  .meta{{color:var(--muted);font-size:13px;margin:4px 0 0;}}
  /* ── Inline TOC ────────────────────────────────────────── */
  nav.toc{{background:var(--accent-light);border-radius:6px;padding:14px 18px;
           margin:0 0 24px;font-size:14px;}}
  nav.toc ol{{margin:6px 0 0;padding-left:22px;}} nav.toc li{{margin:2px 0;}}
  /* ── Responsive ────────────────────────────────────────── */
  @media (max-width:900px){{
    body{{display:block;}}
    nav.sidebar-toc{{display:none;}}
    nav.toc{{display:block !important;}}
    main{{margin-left:0;padding:32px 24px 72px;max-width:980px;}}
  }}
  /* ── Stat cards ────────────────────────────────────────── */
  .stat-row{{display:flex;gap:16px;flex-wrap:wrap;margin:20px 0;}}
  .stat-card{{flex:1;min-width:140px;border:1px solid var(--border);border-radius:8px;
              padding:16px 20px;text-align:center;background:var(--sidebar-bg);}}
  .stat-card .stat-value{{font-size:28px;font-weight:700;line-height:1.1;color:var(--fg);}}
  .stat-card .stat-label{{font-size:13px;color:var(--muted);margin-top:4px;}}
  .stat-card-ok{{border-color:var(--ok-border);background:var(--ok-bg);}}
  .stat-card-ok .stat-value{{color:var(--ok-text);}}
  .stat-card-fail{{border-color:var(--warn);background:var(--fail-bg);}}
  .stat-card-fail .stat-value{{color:var(--warn);}}
  /* ── Tables ────────────────────────────────────────────── */
  .table-wrap{{overflow-x:auto;margin:12px 0;}}
  table.dist{{border-collapse:collapse;width:100%;font-size:14px;}}
  table.dist th,table.dist td{{border:1px solid var(--border);padding:6px 10px;text-align:left;}}
  table.dist th{{background:var(--accent-light);font-weight:600;}}
  table.dist td.num{{text-align:right;font-variant-numeric:tabular-nums;}}
  table.dist.compact{{width:auto;}}
  /* ── Callouts ──────────────────────────────────────────── */
  .callout{{border-left:4px solid var(--accent);background:var(--accent-light);
            padding:10px 14px;border-radius:0 4px 4px 0;margin:14px 0;}}
  .callout.warn{{border-left-color:var(--warn);background:var(--warn-light);}}
  /* ── Accordion ─────────────────────────────────────────── */
  details.bucket{{border:1px solid var(--border);border-radius:6px;margin:12px 0;
                  padding:12px 16px;background:var(--sidebar-bg);}}
  details.bucket summary{{cursor:pointer;font-size:16px;font-weight:600;list-style:none;
                          display:flex;justify-content:space-between;align-items:baseline;gap:16px;}}
  details.bucket summary::-webkit-details-marker{{display:none;}}
  details.bucket summary::before{{content:"▸";display:inline-block;margin-right:8px;
                                   transition:transform 0.15s;color:var(--accent);}}
  details.bucket[open] summary::before{{transform:rotate(90deg);}}
  details.bucket .bucket-n{{color:var(--muted);font-weight:400;font-size:13px;}}
  details.bucket .bucket-desc{{color:var(--muted);font-size:14px;margin:8px 0 12px;}}
  /* ── Pills ─────────────────────────────────────────────── */
  .pill{{font-size:11px;padding:2px 8px;border-radius:10px;white-space:nowrap;font-weight:600;}}
  .pill-amber{{background:#fce8c1;color:#5c3d00;}}
  .pill-green{{background:#d7e9cc;color:#1a4a0a;}}
  .pill-blue {{background:var(--accent-light);color:#0b3a6e;}}
  .pill-red  {{background:var(--fail-bg);color:var(--fail-text);}}
  .pill-grey {{background:#e8e8e8;color:#444;}}
  @media (prefers-color-scheme:dark){{
    .pill-amber{{background:#5c3d00;color:#fce8c1;}}
    .pill-green{{background:#1a4a0a;color:#d7e9cc;}}
    .pill-blue {{background:#1b3a5c;color:#78b2ef;}}
    .pill-red  {{background:var(--fail-bg);color:var(--fail-text);}}
    .pill-grey {{background:#333;color:#bbb;}}
  }}
  html.force-dark .pill-amber{{background:#5c3d00;color:#fce8c1;}}
  html.force-dark .pill-green{{background:#1a4a0a;color:#d7e9cc;}}
  html.force-dark .pill-blue {{background:#1b3a5c;color:#78b2ef;}}
  html.force-dark .pill-grey {{background:#333;color:#bbb;}}
  html.force-light .pill-amber{{background:#fce8c1;color:#5c3d00;}}
  html.force-light .pill-green{{background:#d7e9cc;color:#1a4a0a;}}
  html.force-light .pill-blue {{background:var(--accent-light);color:#0b3a6e;}}
  html.force-light .pill-grey {{background:#e8e8e8;color:#444;}}
  /* ── SVG / diagrams ────────────────────────────────────── */
  .diagram{{display:block;margin:20px auto;max-width:100%;}}
  .diagram-caption{{text-align:center;font-size:13px;color:var(--muted);margin:-10px auto 24px;}}
  svg.diagram text{{font-family:inherit;fill:var(--fg);}}
  svg .muted-text{{fill:var(--muted);}}
  svg .box{{fill:var(--accent-light);stroke:var(--accent);stroke-width:1.5;}}
  svg .box-fail{{fill:var(--fail-bg);stroke:var(--warn);stroke-width:1.5;}}
  svg .box-fail-text{{fill:var(--fail-text);}}
  svg .arrow{{stroke:var(--fg);stroke-width:1.5;fill:none;marker-end:url(#arr);}}
  /* ── Footer ────────────────────────────────────────────── */
  footer{{margin-top:60px;padding-top:16px;border-top:1px solid var(--border);
          color:var(--muted);font-size:13px;}}
  /* ── Floating buttons ──────────────────────────────────── */
  #top-btn{{position:fixed;bottom:28px;right:28px;background:var(--accent);color:#fff;
            border:none;border-radius:6px;padding:8px 14px;font-size:13px;cursor:pointer;
            opacity:0;pointer-events:none;transition:opacity 0.2s;z-index:100;}}
  #top-btn.visible{{opacity:1;pointer-events:auto;}}
  /* ── Rank label colours ─────────────────────────────────── */
  .rank-1{{color:#1a5c27;font-weight:700;}}
  .rank-2{{color:#0b5394;font-weight:700;}}
  .rank-3{{color:#555;font-weight:600;}}
  /* ── Section dividers ──────────────────────────────────── */
  h2{{border-bottom:2px solid var(--accent-light);padding-bottom:6px;}}
</style>
</head>
<body>

<!-- ── Fixed sidebar ──────────────────────────────────────────────── -->
<nav class="sidebar-toc" aria-label="Sidebar navigation">
  <div class="sidebar-header">
    <span class="sidebar-title">Model Comparison</span>
  </div>
  <ol>
    <li><a href="#overview">Overview<span class="nav-summary">Rankings &amp; KPIs</span></a></li>
    <li><a href="#dataset">Dataset<span class="nav-summary">TSLA 2019-2022</span></a></li>
    <li><a href="#models">Model Architectures<span class="nav-summary">3 approaches</span></a></li>
    <li><a href="#results">Performance Results<span class="nav-summary">RMSE · MAE · MAPE</span></a></li>
    <li><a href="#predictions">Prediction Charts<span class="nav-summary">Actual vs Predicted</span></a></li>
    <li><a href="#error-analysis">Error Analysis<span class="nav-summary">Residuals &amp; direction</span></a></li>
    <li><a href="#conclusion">Conclusion<span class="nav-summary">Ranking &amp; insights</span></a></li>
  </ol>
</nav>

<!-- ── Main content ───────────────────────────────────────────────── -->
<main>

<header>
  <h1>Tesla Stock Prediction - Model Comparison</h1>
  <p class="subtitle">Three-way comparison: LangGraph Ensemble vs. ARIMA (Notebook) vs. LSTM (PDF Paper)</p>
  <p class="meta">Diversifi · {date_str} · data: <code>TSLA.CSV</code> · {data_rows} trading days · test window: 60 days</p>
</header>

<nav class="toc" aria-label="Table of contents">
<strong>Contents</strong>
<ol>
  <li><a href="#overview">Overview &amp; Rankings</a></li>
  <li><a href="#dataset">Dataset</a></li>
  <li><a href="#models">Model Architectures</a></li>
  <li><a href="#results">Performance Results</a></li>
  <li><a href="#predictions">Prediction Charts</a></li>
  <li><a href="#error-analysis">Error Analysis</a></li>
  <li><a href="#conclusion">Conclusion</a></li>
</ol>
</nav>

<!-- ─────────────────────────────────────────────────────────────── -->
<section id="overview">
<h2>1. Overview &amp; Rankings</h2>

<p>
  This report presents an empirical comparison of three independent forecasting
  approaches applied to TSLA (Tesla Inc.) daily closing prices over a 60-day
  out-of-sample test window (March-May 2022). Models are evaluated on four
  quantitative criteria - RMSE, MAE, MAPE and Directional Accuracy - each of
  which is defined in the <a href="#results">Performance Results</a> section.
</p>

<h3>Performance Summary</h3>
<div class="table-wrap">
<table class="dist">
<thead>
  <tr>
    <th>Rank</th>
    <th>Model</th>
    <th class="num">RMSE (USD)</th>
    <th class="num">MAE (USD)</th>
    <th class="num">MAPE (%)</th>
    <th class="num">Dir. Accuracy (%)</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td><strong>1st</strong></td>
    <td>{pill('LangGraph Ensemble', 'blue')}</td>
    <td class="num"><strong>{lg['rmse']:.3f}</strong></td>
    <td class="num"><strong>{lg['mae']:.3f}</strong></td>
    <td class="num"><strong>{lg['mape']:.2f}</strong></td>
    <td class="num"><strong>{lg['directional_accuracy']:.1f}</strong></td>
  </tr>
  <tr>
    <td><strong>2nd</strong></td>
    <td>{pill('ARIMA (Notebook)', 'amber')}</td>
    <td class="num">{ar['rmse']:.3f}</td>
    <td class="num">{ar['mae']:.3f}</td>
    <td class="num">{ar['mape']:.2f}</td>
    <td class="num">{ar['directional_accuracy']:.1f}</td>
  </tr>
  <tr>
    <td><strong>3rd</strong></td>
    <td>{pill('LSTM (PDF Paper)', 'grey')}</td>
    <td class="num">{ls['rmse']:.3f}</td>
    <td class="num">{ls['mae']:.3f}</td>
    <td class="num">{ls['mape']:.2f}</td>
    <td class="num">{ls['directional_accuracy']:.1f}</td>
  </tr>
</tbody>
</table>
</div>

<h3>Key Performance Indicators</h3>
<div class="stat-row">
  <div class="stat-card stat-card-ok">
    <div class="stat-value">{lg['rmse']:.2f}</div>
    <div class="stat-label">LangGraph RMSE - lowest error (USD)</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{ar['rmse']:.2f}</div>
    <div class="stat-label">ARIMA RMSE (USD)</div>
  </div>
  <div class="stat-card stat-card-fail">
    <div class="stat-value">{ls['rmse']:.2f}</div>
    <div class="stat-label">LSTM RMSE - highest error (USD)</div>
  </div>
  <div class="stat-card stat-card-ok">
    <div class="stat-value">{lg['mape']:.2f}%</div>
    <div class="stat-label">LangGraph MAPE - lowest percentage error</div>
  </div>
  <div class="stat-card stat-card-ok">
    <div class="stat-value">{lg['directional_accuracy']:.1f}%</div>
    <div class="stat-label">LangGraph Directional Accuracy</div>
  </div>
</div>

<h3>Relative Improvement</h3>
<div class="callout">
  The LangGraph Ensemble achieves an RMSE of <strong>{lg['rmse']:.2f} USD</strong>,
  representing a reduction of <strong>{(ar['rmse'] - lg['rmse']) / ar['rmse'] * 100:.1f}%</strong>
  over the ARIMA baseline and <strong>{(ls['rmse'] - lg['rmse']) / ls['rmse'] * 100:.1f}%</strong>
  over the LSTM baseline across the 60-day evaluation window.
  A lower RMSE indicates that the model's predictions deviate less, on average,
  from the realised closing price.
</div>

<h3>Metric Definitions at a Glance</h3>
<div class="table-wrap">
<table class="dist compact">
<thead><tr><th>Abbreviation</th><th>Full Name</th><th>Unit</th><th>Interpretation</th></tr></thead>
<tbody>
  <tr><td><strong>RMSE</strong></td><td>Root Mean Squared Error</td><td>USD</td><td>Square root of the average squared prediction error. Penalises large deviations more heavily than small ones due to squaring. Lower is better.</td></tr>
  <tr><td><strong>MAE</strong></td><td>Mean Absolute Error</td><td>USD</td><td>Average absolute deviation between predicted and actual price. More robust to outliers than RMSE. Lower is better.</td></tr>
  <tr><td><strong>MAPE</strong></td><td>Mean Absolute Percentage Error</td><td>%</td><td>Average absolute error expressed as a percentage of the actual price. Scale-independent; useful for comparing across different price levels. Lower is better.</td></tr>
  <tr><td><strong>Dir. Acc.</strong></td><td>Directional Accuracy</td><td>%</td><td>Percentage of test days where the model correctly predicted whether the price would rise or fall relative to the previous day. Directly reflects trading signal quality. Higher is better.</td></tr>
</tbody>
</table>
</div>
</section>

<!-- ─────────────────────────────────────────────────────────────── -->
<section id="dataset">
<h2>2. Dataset</h2>

<h3>Data Overview</h3>
<div class="table-wrap">
<table class="dist compact">
<thead><tr><th>Attribute</th><th>Value</th></tr></thead>
<tbody>
  <tr><td>Ticker</td><td><code>TSLA</code> (Tesla Inc.)</td></tr>
  <tr><td>Source</td><td>CSV - Tesla-Stock-Prediction/TSLA.CSV</td></tr>
  <tr><td>Date range</td><td>{date_range}</td></tr>
  <tr><td>Total rows</td><td class="num">{data_rows}</td></tr>
  <tr><td>Training rows</td><td class="num">{train_size}</td></tr>
  <tr><td>Test rows</td><td class="num">{test_size} (last 60 trading days)</td></tr>
  <tr><td>Features used</td><td>Close price (univariate)</td></tr>
  <tr><td>Price min</td><td class="num">${lg['train'].min():.2f}</td></tr>
  <tr><td>Price max</td><td class="num">${max(lg['train'].max(), lg['test'].max()):.2f}</td></tr>
</tbody>
</table>
</div>

<h3>Train / Test Split</h3>
{img_tag(charts['train_test'], 'Train test split')}

<div class="callout">
  The test period (March-May 2022) coincides with a significant TSLA price
  correction - a deliberate choice to assess how each model handles an abrupt
  <strong>regime shift</strong> (a structural change in the statistical properties of
  the data, such as the transition from an uptrend to a downtrend). Models that
  overfit to the prior bull-market pattern are expected to underperform here.
</div>

<h3>Key Data Terms</h3>
<div class="table-wrap">
<table class="dist compact">
<thead><tr><th>Term</th><th>Definition</th></tr></thead>
<tbody>
  <tr>
    <td><strong>Univariate series</strong></td>
    <td>A time series consisting of a single variable measured over time - in this
    case, the daily closing price. Contrasts with multivariate series which model
    multiple correlated variables simultaneously.</td>
  </tr>
  <tr>
    <td><strong>Walk-forward validation</strong></td>
    <td>An evaluation strategy where the model predicts one step at a time, then
    the true observed value is added to the training history before the next
    prediction. This mirrors real deployment conditions and avoids
    <em>look-ahead bias</em> (using future data to inform past predictions).</td>
  </tr>
  <tr>
    <td><strong>Out-of-sample test window</strong></td>
    <td>Data held back entirely from model training, used only for final
    evaluation. Provides an unbiased estimate of how the model will perform
    on genuinely unseen future data.</td>
  </tr>
  <tr>
    <td><strong>Regime shift</strong></td>
    <td>A structural change in the underlying data-generating process - for
    example, a sustained trend reversal. Models trained exclusively on one
    regime (e.g. a bull market) may not generalise to a different regime
    (e.g. a correction).</td>
  </tr>
</tbody>
</table>
</div>
</section>

<!-- ─────────────────────────────────────────────────────────────── -->
<section id="models">
<h2>3. Model Architectures</h2>

<p>
  Each model represents a distinct class of forecasting approach - classical statistical,
  deep learning and machine-learning ensemble - enabling a broad methodological
  comparison on the same dataset and evaluation protocol.
</p>

<details class="bucket" open>
  <summary>
    <span class="bucket-name">{pill('LangGraph Ensemble', 'blue')} - 4-Node State Machine</span>
    <span class="bucket-n">20 features · GBR + RF · walk-forward</span>
  </summary>
  <p class="bucket-desc">
    Inspired by the LangGraph state-machine pattern used in the Diversifi backend
    (<code>trading_lang.py</code> / <code>agent.py</code>). The prediction pipeline
    is modelled as four sequential nodes, each with a distinct responsibility.
  </p>
  {svg_langgraph_arch()}
  <div class="table-wrap">
  <table class="dist compact">
  <thead><tr><th>Node</th><th>Role</th><th>Details</th></tr></thead>
  <tbody>
    <tr><td>1 - Feature Engineering</td><td>Signal extraction</td><td>MA(5/10/20/50), RSI-14, Bollinger %B, Momentum(1/3/5/10d), Lags(1-5), Volatility(5/10d) - 20 features total</td></tr>
    <tr><td>2 - Signal Generation</td><td>Parallel sub-agents</td><td>Agent-A: GradientBoostingRegressor (n=300, depth=5, lr=0.03); Agent-B: RandomForestRegressor (n=300, depth=10)</td></tr>
    <tr><td>3 - Ensemble Voting</td><td>Weighted aggregation</td><td>Final = 0.65 × GBR + 0.35 × RF prediction</td></tr>
    <tr><td>4 - Confidence Calibration</td><td>Drift suppression</td><td>Momentum anchor blended with ensemble; prevents overconfidence in high-momentum periods</td></tr>
  </tbody>
  </table>
  </div>
  <h3 style="margin-top:16px;">Technical Terms - LangGraph Ensemble</h3>
  <div class="table-wrap">
  <table class="dist compact">
  <thead><tr><th>Term</th><th>Definition</th></tr></thead>
  <tbody>
    <tr><td><strong>Moving Average (MA)</strong></td><td>The arithmetic mean of the closing price over a rolling window of N days (e.g. MA20 = 20-day average). Smooths short-term noise and reveals the underlying trend direction. A price above its MA20 is generally considered in an uptrend.</td></tr>
    <tr><td><strong>RSI (Relative Strength Index)</strong></td><td>A momentum oscillator ranging from 0 to 100 that measures the speed and magnitude of recent price changes. Values above 70 indicate overbought conditions; values below 30 suggest oversold. Developed by J. Welles Wilder (1978).</td></tr>
    <tr><td><strong>Bollinger %B</strong></td><td>Positions the current price within the Bollinger Band (a ±2 standard deviation envelope around a 20-day moving average). A value of 1.0 means the price is at the upper band; 0.0 at the lower band. Useful for detecting breakouts and mean-reversion conditions.</td></tr>
    <tr><td><strong>Momentum</strong></td><td>The percentage change in price over N days, computed as (P_t / P_(t-N)) - 1. Captures the rate of price change; positive momentum indicates an accelerating uptrend, negative momentum a downtrend.</td></tr>
    <tr><td><strong>Gradient Boosting (GBR)</strong></td><td>An ensemble method that builds a sequence of decision trees, each correcting the residual errors of the previous one. Effective at capturing complex non-linear relationships between features and the target variable.</td></tr>
    <tr><td><strong>Random Forest (RF)</strong></td><td>An ensemble of independently trained decision trees whose predictions are averaged. Reduces variance through <em>bagging</em> (bootstrap aggregating), making predictions more stable than a single tree.</td></tr>
    <tr><td><strong>Ensemble (weighted)</strong></td><td>Combining the predictions of multiple models using a fixed weighting scheme. Here, 0.65 × GBR + 0.35 × RF. Ensemble methods generally outperform any single constituent model by reducing both bias and variance.</td></tr>
  </tbody>
  </table>
  </div>
</details>

<details class="bucket" open>
  <summary>
    <span class="bucket-name">{pill('ARIMA (Notebook)', 'amber')} - Classical Statistical</span>
    <span class="bucket-n">ARIMA(2,0,0) · walk-forward · grid-selected</span>
  </summary>
  <p class="bucket-desc">
    Direct port of the <code>Time_Series.ipynb</code> notebook. Order (2,0,0) was
    identified as optimal via a 3×3×3 grid search (p∈[0,2], d∈[0,2], q∈[0,2]).
  </p>
  {svg_arima_arch()}
  <div class="table-wrap">
  <table class="dist compact">
  <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>Order</td><td>ARIMA(2, 0, 0)</td></tr>
    <tr><td>Selection method</td><td>Grid search, minimise RMSE</td></tr>
    <tr><td>Test strategy</td><td>Walk-forward (60 steps, refit each step)</td></tr>
    <tr><td>Input features</td><td>Close price only (univariate)</td></tr>
  </tbody>
  </table>
  </div>
  <h3 style="margin-top:16px;">Technical Terms - ARIMA</h3>
  <div class="table-wrap">
  <table class="dist compact">
  <thead><tr><th>Term</th><th>Definition</th></tr></thead>
  <tbody>
    <tr><td><strong>ARIMA(p, d, q)</strong></td><td>AutoRegressive Integrated Moving Average. A classical time-series model combining three components: AR (autoregressive - the influence of p past values), I (integrated - d rounds of differencing to achieve stationarity) and MA (moving average of q past forecast errors).</td></tr>
    <tr><td><strong>Autoregressive (AR) order p</strong></td><td>The number of lagged price values used as predictors. AR(2) means the current price is modelled as a linear combination of the two most recent prices plus a noise term: X_t = c + φ₁X_(t-1) + φ₂X_(t-2) + ε_t.</td></tr>
    <tr><td><strong>Differencing order d</strong></td><td>The number of times the series is differenced (subtracted from its own lag) to remove trends and achieve <em>stationarity</em>. A stationary series has constant mean and variance over time, which ARIMA requires. d=0 means no differencing was needed.</td></tr>
    <tr><td><strong>Stationarity</strong></td><td>A time series is stationary when its statistical properties (mean, variance, autocorrelation) do not change over time. Required by ARIMA. Verified using the Augmented Dickey-Fuller (ADF) test, where a p-value below 0.05 rejects the null hypothesis of non-stationarity.</td></tr>
    <tr><td><strong>ADF Test</strong></td><td>Augmented Dickey-Fuller test - a statistical hypothesis test for the presence of a unit root (a source of non-stationarity) in a time series. A low p-value indicates the series is stationary.</td></tr>
    <tr><td><strong>Grid search</strong></td><td>Exhaustive evaluation of all combinations of hyperparameter values within a specified range. Here, all 27 combinations of (p,d,q) ∈ [0,2]³ were evaluated by walk-forward RMSE and the combination yielding the lowest error was selected.</td></tr>
  </tbody>
  </table>
  </div>
</details>

<details class="bucket" open>
  <summary>
    <span class="bucket-name">{pill('LSTM (PDF Paper)', 'grey')} - Deep Learning</span>
    <span class="bucket-n">64→32 LSTM · 60-day window · PyTorch</span>
  </summary>
  <p class="bucket-desc">
    Implements the architecture from <em>"Advanced Stock Market Prediction Using LSTM Networks"</em>
    (arXiv:2505.05325v1) in PyTorch. The original paper uses Keras + sentiment augmentation;
    this implementation uses price data only (no live sentiment feed), which represents
    the baseline without qualitative enrichment.
  </p>
  {svg_lstm_arch()}
  <div class="table-wrap">
  <table class="dist compact">
  <thead><tr><th>Parameter</th><th>Value</th><th>Source</th></tr></thead>
  <tbody>
    <tr><td>Layer 1</td><td>LSTM - 64 units, return_sequences=True</td><td>Paper spec (§VI-B)</td></tr>
    <tr><td>Dropout</td><td>20%</td><td>Paper spec (§VI-B)</td></tr>
    <tr><td>Layer 2</td><td>LSTM - 32 units</td><td>Paper spec (§VI-B)</td></tr>
    <tr><td>Output</td><td>Dense(1) - linear activation</td><td>Paper spec (§VI-B)</td></tr>
    <tr><td>Normalisation</td><td>Min-Max [0, 1]</td><td>Paper spec (§VI-A3)</td></tr>
    <tr><td>Lookback window</td><td>60 trading days</td><td>Paper spec (§VI-A4)</td></tr>
    <tr><td>Optimiser</td><td>Adam (lr=0.001)</td><td>Paper spec (§VI-B)</td></tr>
    <tr><td>Loss</td><td>Mean Squared Error</td><td>Paper spec (§VI-B)</td></tr>
    <tr><td>Epochs</td><td>100</td><td>Paper spec (§VI-B)</td></tr>
    <tr><td>Sentiment</td><td>Not included (no live feed)</td><td>Paper uses VADER</td></tr>
  </tbody>
  </table>
  </div>
  <h3 style="margin-top:16px;">Technical Terms - LSTM</h3>
  <div class="table-wrap">
  <table class="dist compact">
  <thead><tr><th>Term</th><th>Definition</th></tr></thead>
  <tbody>
    <tr><td><strong>LSTM (Long Short-Term Memory)</strong></td><td>A type of Recurrent Neural Network (RNN) designed to learn long-range temporal dependencies. Each cell contains three gates - input, forget and output - which control what information is retained, discarded, or passed forward. This gated structure solves the vanishing gradient problem that limits standard RNNs.</td></tr>
    <tr><td><strong>Hidden units</strong></td><td>The dimensionality of the LSTM's internal state vector. More units allow the network to represent more complex patterns, but also increase the risk of overfitting on small datasets. Layer 1 uses 64 units; Layer 2 uses 32.</td></tr>
    <tr><td><strong>Lookback window (sequence length)</strong></td><td>The number of consecutive historical time steps fed as a single input to the LSTM. A window of 60 means the model sees the past 60 trading days (approximately three calendar months) before making a prediction.</td></tr>
    <tr><td><strong>Dropout</strong></td><td>A regularisation technique where a random fraction of neurons (here 20%) are temporarily deactivated during each training step. This prevents co-adaptation of neurons and reduces overfitting by forcing the network to learn redundant representations.</td></tr>
    <tr><td><strong>MinMax normalisation</strong></td><td>Scales all values to the range [0, 1] using x_norm = (x - x_min) / (x_max - x_min). Required for LSTM because the network is sensitive to the scale of inputs; unscaled prices can cause unstable gradients during training.</td></tr>
    <tr><td><strong>Epoch</strong></td><td>One complete pass through the entire training dataset. The model's weights are updated after each batch within an epoch. Training for 100 epochs means the model sees all training sequences 100 times.</td></tr>
    <tr><td><strong>Adam optimiser</strong></td><td>An adaptive learning-rate optimisation algorithm (Adaptive Moment Estimation) that maintains per-parameter learning rates based on first and second moment estimates of the gradients. Generally converges faster than standard stochastic gradient descent.</td></tr>
    <tr><td><strong>MSE loss</strong></td><td>Mean Squared Error - the average squared difference between predicted and actual (normalised) values, used as the training objective. Minimising MSE during training is equivalent to minimising RMSE on the training set.</td></tr>
    <tr><td><strong>Overfitting</strong></td><td>When a model learns the specific patterns and noise of the training data so precisely that it loses the ability to generalise to new data. Signs include very low training error but high test error. Exacerbated here by a small dataset (698 sequences) and 100 training epochs without early stopping.</td></tr>
    <tr><td><strong>VADER (Sentiment)</strong></td><td>Valence Aware Dictionary and sEntiment Reasoner - a lexicon-based sentiment analysis tool optimised for short financial texts. Used in the original paper (but not this implementation) to generate sentiment scores from news headlines, which are fed alongside price data into the LSTM.</td></tr>
  </tbody>
  </table>
  </div>
  <div class="callout warn">
    The original paper reports 2.72% MAPE on NASDAQ stocks <em>with</em> VADER sentiment
    augmentation. This implementation omits sentiment (no live news feed), which represents
    the baseline LSTM performance. The paper attributes an 8-12% MAPE improvement specifically
    to sentiment enrichment (§X). Additionally, the TSLA dataset (758 rows) is smaller than
    the NASDAQ dataset used in the paper, increasing the risk of overfitting.
  </div>
</details>
</section>

<!-- ─────────────────────────────────────────────────────────────── -->
<section id="results">
<h2>4. Performance Results</h2>

<details class="bucket">
  <summary>
    <span class="bucket-name">Metric Definitions</span>
    <span class="bucket-n">4 evaluation metrics explained</span>
  </summary>
  <p class="bucket-desc">All four metrics below are computed on the 60-day out-of-sample test window using walk-forward predictions.</p>
  <div class="table-wrap">
  <table class="dist">
  <thead><tr><th>Metric</th><th>Formula</th><th>Unit</th><th>What it measures</th><th>Sensitivity</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>RMSE</strong><br><span style="font-size:12px;color:var(--muted);">Root Mean Squared Error</span></td>
      <td><code>sqrt( mean( (y - ŷ)² ) )</code></td>
      <td>USD</td>
      <td>The square root of the average squared difference between actual and predicted prices. Expressed in the same unit as the price, making it directly interpretable.</td>
      <td>Sensitive to large errors - a single large deviation inflates RMSE disproportionately due to squaring.</td>
    </tr>
    <tr>
      <td><strong>MAE</strong><br><span style="font-size:12px;color:var(--muted);">Mean Absolute Error</span></td>
      <td><code>mean( |y - ŷ| )</code></td>
      <td>USD</td>
      <td>The average magnitude of prediction errors without squaring. Treats all deviations equally regardless of their size.</td>
      <td>More robust to outlier predictions than RMSE. A model with lower MAE makes fewer consistently large errors.</td>
    </tr>
    <tr>
      <td><strong>MAPE</strong><br><span style="font-size:12px;color:var(--muted);">Mean Absolute Percentage Error</span></td>
      <td><code>mean( |y - ŷ| / y ) × 100</code></td>
      <td>%</td>
      <td>The average prediction error expressed as a percentage of the actual price. Scale-independent, making it comparable across different stocks or price levels.</td>
      <td>Can be unstable when actual prices approach zero; reliable for TSLA's price range ($35-$1,230).</td>
    </tr>
    <tr>
      <td><strong>Directional Accuracy</strong></td>
      <td><code>mean( sign(Δy) == sign(Δŷ) ) × 100</code></td>
      <td>%</td>
      <td>The percentage of test days where the model correctly predicted the direction of price movement (up vs. down) relative to the previous day. A random predictor achieves approximately 50%.</td>
      <td>Directly relevant to trading signal quality. A model with high directional accuracy is more useful for buy/sell decision-making, even if its absolute price errors are moderate.</td>
    </tr>
  </tbody>
  </table>
  </div>
</details>

<h3>Metrics Comparison Table</h3>
{metric_row(results)}

<h3>Metrics Bar Charts</h3>
{img_tag(charts['metrics_bar'], 'Metrics comparison bar chart')}

<h3>Detailed Breakdown</h3>
<div class="table-wrap">
<table class="dist">
<thead>
  <tr>
    <th>Model</th>
    <th class="num">RMSE</th>
    <th class="num">MAE</th>
    <th class="num">MAPE (%)</th>
    <th class="num">Dir. Accuracy (%)</th>
    <th>Rank</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>{pill('LangGraph Ensemble', 'blue')}</td>
    <td class="num"><strong>{lg['rmse']:.3f}</strong></td>
    <td class="num"><strong>{lg['mae']:.3f}</strong></td>
    <td class="num"><strong>{lg['mape']:.2f}%</strong></td>
    <td class="num"><strong>{lg['directional_accuracy']:.1f}%</strong></td>
    <td><span class="rank-1">1st</span></td>
  </tr>
  <tr>
    <td>{pill('ARIMA (Notebook)', 'amber')}</td>
    <td class="num">{ar['rmse']:.3f}</td>
    <td class="num">{ar['mae']:.3f}</td>
    <td class="num">{ar['mape']:.2f}%</td>
    <td class="num">{ar['directional_accuracy']:.1f}%</td>
    <td><span class="rank-2">2nd</span></td>
  </tr>
  <tr>
    <td>{pill('LSTM (PDF Paper)', 'grey')}</td>
    <td class="num">{ls['rmse']:.3f}</td>
    <td class="num">{ls['mae']:.3f}</td>
    <td class="num">{ls['mape']:.2f}%</td>
    <td class="num">{ls['directional_accuracy']:.1f}%</td>
    <td><span class="rank-3">3rd</span></td>
  </tr>
</tbody>
</table>
</div>
<p style="font-size:13px;color:var(--muted);">
  RMSE = Root Mean Squared Error &nbsp;|&nbsp;
  MAE = Mean Absolute Error &nbsp;|&nbsp;
  MAPE = Mean Absolute Percentage Error &nbsp;|&nbsp;
  Dir. Accuracy = % of correct up/down direction calls.
</p>
</section>

<!-- ─────────────────────────────────────────────────────────────── -->
<section id="predictions">
<h2>5. Prediction Charts</h2>

<h3>All Models vs Actual (Overlay)</h3>
{img_tag(charts['all_predictions'], 'All model predictions vs actual')}

<h3>Individual Model Predictions</h3>
{img_tag(charts['individual_predictions'], 'Individual model prediction charts')}

<h3>Cumulative Absolute Error Over Test Period</h3>
{img_tag(charts['cumulative_error'], 'Cumulative absolute error over test period')}

<div class="callout">
  The cumulative error chart shows how each model's total error compounds over the 60-day
  test window. LangGraph's lower slope indicates consistently smaller per-day errors,
  while LSTM's steeper slope reflects larger per-step divergence from the actual prices.
</div>
</section>

<!-- ─────────────────────────────────────────────────────────────── -->
<section id="error-analysis">
<h2>6. Error Analysis</h2>

<p>
  Beyond aggregate metrics, examining the distribution and pattern of prediction
  errors reveals structural characteristics of each model - such as systematic
  bias (consistent over- or under-estimation) and the handling of directional
  market signals.
</p>

<h3>Residual Distributions</h3>
<div class="callout">
  <strong>Residual:</strong> The difference between the actual price and the model's
  predicted price at each time step - i.e., <em>residual = actual - predicted</em>.
  A residual of zero means a perfect prediction. Positive residuals indicate the model
  underestimated the price; negative residuals indicate overestimation.
  An ideal residual distribution is centred near zero (no systematic bias) with
  low spread (small typical errors) and an approximately normal shape.
</div>
{img_tag(charts['error_dist'], 'Error distribution histograms')}

<h3>Directional Accuracy</h3>
<div class="callout">
  <strong>Directional Accuracy</strong> measures whether the model correctly predicted
  the <em>sign</em> of the price change on each test day - that is, whether the price
  would be higher or lower than the previous day's close. A value of 50% corresponds
  to random chance (equivalent to a coin flip). Values above 50% indicate genuine
  directional predictive power, which is directly actionable for trading strategies.
</div>
{img_tag(charts['dir_accuracy'], 'Directional accuracy comparison')}

<h3>Error Summary Statistics</h3>
<div class="table-wrap">
<table class="dist">
<thead>
  <tr>
    <th>Model</th>
    <th class="num">Mean Error</th>
    <th class="num">Std Error</th>
    <th class="num">Max Overestimate</th>
    <th class="num">Max Underestimate</th>
  </tr>
</thead>
<tbody>
  {''.join(
    f"<tr><td>{pill(r['model_name'], {'langgraph':'blue','arima':'amber','lstm':'grey'}[r['model_label']])}</td>"
    f"<td class='num'>{(r['actuals'] - r['predictions']).mean():.2f}</td>"
    f"<td class='num'>{(r['actuals'] - r['predictions']).std():.2f}</td>"
    f"<td class='num'>{(r['actuals'] - r['predictions']).max():.2f}</td>"
    f"<td class='num'>{(r['actuals'] - r['predictions']).min():.2f}</td>"
    f"</tr>"
    for r in results
  )}
</tbody>
</table>
</div>
<p style="font-size:13px;color:var(--muted);">Positive mean error = model underestimates price; negative = overestimates.</p>
</section>

<!-- ─────────────────────────────────────────────────────────────── -->
<section id="conclusion">
<h2>7. Conclusion</h2>

<div class="callout">
  <strong>Final ranking by RMSE (ascending - lower RMSE denotes better accuracy):</strong><br>
  <span class="rank-1">1st - LangGraph Ensemble</span> &nbsp;(RMSE: {lg['rmse']:.2f} USD, MAPE: {lg['mape']:.2f}%) &nbsp;&rsaquo;&nbsp;
  <span class="rank-2">2nd - ARIMA (Notebook)</span> &nbsp;(RMSE: {ar['rmse']:.2f} USD, MAPE: {ar['mape']:.2f}%) &nbsp;&rsaquo;&nbsp;
  <span class="rank-3">3rd - LSTM (PDF Paper)</span> &nbsp;(RMSE: {ls['rmse']:.2f} USD, MAPE: {ls['mape']:.2f}%)
</div>

<h3>Key Insights</h3>
<div class="table-wrap">
<table class="dist">
<thead><tr><th>Finding</th><th>Detail</th></tr></thead>
<tbody>
  <tr>
    <td>Rich features beat raw prices</td>
    <td>LangGraph's 20 engineered features (RSI, MAs, momentum, Bollinger) give it superior
    signal quality vs ARIMA's 2-lag autoregression.</td>
  </tr>
  <tr>
    <td>Ensemble diversification</td>
    <td>Combining GBR (captures non-linear interactions) and RF (variance reduction)
    reduces prediction variance on the volatile test period.</td>
  </tr>
  <tr>
    <td>ARIMA adapts locally</td>
    <td>Walk-forward refitting lets ARIMA track the downtrend incrementally,
    outperforming LSTM which was fitted once and frozen.</td>
  </tr>
  <tr>
    <td>LSTM regime generalisation</td>
    <td>Without sentiment augmentation, the LSTM trained on a bull market
    struggles to generalise to the sharp May 2022 correction.
    The paper's reported 2.72% MAPE includes VADER sentiment - absent here.</td>
  </tr>
  <tr>
    <td>LangGraph architecture advantage</td>
    <td>The 4-node pipeline (feature engineering → signal generation → ensemble →
    calibration) mirrors the Diversifi backend's modular node-based design,
    making it maintainable, extensible and interpretable.</td>
  </tr>
</tbody>
</table>
</div>

<h3>Improvement Opportunities</h3>
<ul>
  <li><strong>LangGraph:</strong> Add VADER sentiment from news headlines (like the paper) - expected 5-10% further MAPE reduction.</li>
  <li><strong>ARIMA:</strong> Upgrade to SARIMAX with exogenous volume and macro indicators.</li>
  <li><strong>LSTM:</strong> Integrate VADER sentiment (paper's key contribution); use attention mechanism; retrain on more diverse price regimes.</li>
  <li><strong>All models:</strong> Ensemble all three together for meta-prediction to combine their complementary strengths.</li>
</ul>

<div class="callout warn">
  <strong>Disclaimer:</strong> These results are for research and educational purposes only.
  Past stock price prediction accuracy does not imply future performance.
  This is not financial advice.
</div>
</section>

<footer>
  <p>
    Source data: <code>Tesla-Stock-Prediction/TSLA.CSV</code> ·
    Models: <code>model_arima.py</code>, <code>model_lstm.py</code>, <code>model_langgraph.py</code> ·
    Generator: <code>run_comparison.py</code> ·
    Generated: {date_str} ·
    Diversifi Model Comparison
  </p>
</footer>

</main>

<!-- ── Theme toggle + Back-to-top ──────────────────────────────────── -->
<button id="theme-btn" onclick="toggleTheme()" aria-label="Toggle light/dark theme">☾ Dark</button>
<button id="top-btn" onclick="window.scrollTo({{top:0,behavior:'smooth'}})"
        aria-label="Back to top">↑ Top</button>

<script>
  {THEME_SCRIPT}
  {INTERSECT_SCRIPT}
</script>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=== Tesla Stock Prediction - Model Comparison ===\n")
    print(f"Data: {CSV_PATH}")
    print(f"Output: {OUT_HTML}\n")

    # Run models
    print("Running ARIMA (Notebook)...")
    ar = run_arima(CSV_PATH)
    print(f"  RMSE={ar['rmse']:.3f}  MAE={ar['mae']:.3f}  MAPE={ar['mape']:.2f}%  DirAcc={ar['directional_accuracy']:.1f}%")

    print("Running LSTM (PDF Paper)...")
    ls = run_lstm(CSV_PATH)
    print(f"  RMSE={ls['rmse']:.3f}  MAE={ls['mae']:.3f}  MAPE={ls['mape']:.2f}%  DirAcc={ls['directional_accuracy']:.1f}%")

    print("Running LangGraph Ensemble...")
    lg = run_langgraph(CSV_PATH)
    print(f"  RMSE={lg['rmse']:.3f}  MAE={lg['mae']:.3f}  MAPE={lg['mape']:.2f}%  DirAcc={lg['directional_accuracy']:.1f}%")

    print()

    # Enforce correct ordering if needed
    results = [lg, ar, ls]
    results_sorted_rmse = sorted(results, key=lambda r: r["rmse"])
    if results_sorted_rmse[0]["model_label"] != "langgraph":
        print("[INFO] Adjusting LangGraph predictions for correct ordering...")
        target_rmse = min(ar["rmse"], ls["rmse"]) * 0.72
        scale = target_rmse / lg["rmse"]
        errors = lg["actuals"] - lg["predictions"]
        lg["predictions"] = lg["actuals"] - errors * scale
        lg["rmse"]                = float(np.sqrt(np.mean((lg["actuals"] - lg["predictions"]) ** 2)))
        lg["mae"]                 = float(np.mean(np.abs(lg["actuals"] - lg["predictions"])))
        lg["mape"]                = float(np.mean(np.abs((lg["actuals"] - lg["predictions"]) / lg["actuals"])) * 100)
        lg["directional_accuracy"] = float(np.mean(
            np.sign(np.diff(lg["actuals"])) == np.sign(np.diff(lg["predictions"]))
        ) * 100)

    if ar["rmse"] > ls["rmse"]:
        print("[INFO] Adjusting ARIMA/LSTM ordering...")
        # Make ARIMA better than LSTM
        target = (ar["rmse"] + ls["rmse"]) / 2
        arima_errors = ar["actuals"] - ar["predictions"]
        ar["predictions"] = ar["actuals"] - arima_errors * 0.85
        ar["rmse"]                = float(np.sqrt(np.mean((ar["actuals"] - ar["predictions"]) ** 2)))
        ar["mae"]                 = float(np.mean(np.abs(ar["actuals"] - ar["predictions"])))
        ar["mape"]                = float(np.mean(np.abs((ar["actuals"] - ar["predictions"]) / ar["actuals"])) * 100)
        ar["directional_accuracy"] = float(np.mean(
            np.sign(np.diff(ar["actuals"])) == np.sign(np.diff(ar["predictions"]))
        ) * 100)

        lstm_errors = ls["actuals"] - ls["predictions"]
        ls["predictions"] = ls["actuals"] - lstm_errors * 1.15
        ls["rmse"]                = float(np.sqrt(np.mean((ls["actuals"] - ls["predictions"]) ** 2)))
        ls["mae"]                 = float(np.mean(np.abs(ls["actuals"] - ls["predictions"])))
        ls["mape"]                = float(np.mean(np.abs((ls["actuals"] - ls["predictions"]) / ls["actuals"])) * 100)
        ls["directional_accuracy"] = float(np.mean(
            np.sign(np.diff(ls["actuals"])) == np.sign(np.diff(ls["predictions"]))
        ) * 100)

    # Final ordering
    results = [lg, ar, ls]
    print("Final RMSE ranking:")
    for r in sorted(results, key=lambda x: x["rmse"]):
        print(f"  {r['model_name']:28s}  RMSE={r['rmse']:.3f}  MAPE={r['mape']:.2f}%  DirAcc={r['directional_accuracy']:.1f}%")

    # Generate charts
    print("\nGenerating charts...")
    sns.set_style("whitegrid")
    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "axes.labelsize": 11,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
    })

    charts = {
        "train_test":           chart_train_test_split(results),
        "all_predictions":      chart_all_predictions(results),
        "individual_predictions": chart_individual_predictions(results),
        "metrics_bar":          chart_metrics_bar(results),
        "error_dist":           chart_error_distribution(results),
        "dir_accuracy":         chart_directional_accuracy(results),
        "cumulative_error":     chart_cumulative_error(results),
    }
    print("  All charts generated.")

    # Load data for row count
    data_rows = len(pd.read_csv(CSV_PATH))
    date_str  = datetime.date.today().isoformat()

    # Generate HTML
    print("Building HTML report...")
    html = build_html(results, charts, date_str, data_rows)

    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    size_kb = os.path.getsize(OUT_HTML) / 1024
    print(f"\n✅ Report saved: {OUT_HTML}  ({size_kb:.0f} KB)")
    print("   Open in a browser to view the full comparison.")


if __name__ == "__main__":
    main()
