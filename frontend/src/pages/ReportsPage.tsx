import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, ChevronRight, BarChart2, FileText,
  Shield, Zap, CheckCircle, ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReportMetric { label: string; value: string; accent: string; }
interface Report {
  id: string; badge: string; badgeColor: string;
  title: string; sub: string; desc: string; href: string;
  metrics: ReportMetric[]; highlights: string[]; methodology: string;
}

// ── Report definitions (all numbers pulled directly from the HTML reports) ────
const STRATEGY_REPORTS: Report[] = [
  {
    id:         "algo-2025",
    badge:      "Strategy Backtest · H1 2025",
    badgeColor: "#00D09C",
    title:      "Algo Trading Engine - H1 2025",
    sub:        "LangGraph Multi-Agent Ensemble · Jan–Jun 2025 · Nifty 50 · 126 days",
    desc:       "126-day paper-trading simulation on all Nifty 50 constituents using a 5-step LangGraph multi-agent pipeline. ₹10L starting capital with realistic brokerage (0.05%), slippage (0.10%) and sell-side STT (0.025%). Long-only, max 8 concurrent positions.",
    href:       "/algo-backtest-report.html",
    metrics: [
      { label: "Portfolio Return",   value: "+18.4%", accent: "#00D09C" },
      { label: "Alpha vs Nifty 50", value: "+7.2%",  accent: "#00b8ff" },
      { label: "Sharpe Ratio",      value: "1.84",   accent: "#a855f7" },
      { label: "Win Rate",          value: "64.2%",  accent: "#f59e0b" },
    ],
    highlights: [
      "47 round-trip trades across 18 Nifty 50 stocks · Final value ₹11.84L",
      "Sortino 2.31 · Calmar 2.22 · Max Drawdown −8.3% (recovered in 18 days)",
      "Strong Buy (conviction ≥0.85): 83.3% win rate, avg return +9.4%",
      "Sentiment lead time 1.8 days ahead of price confirmation",
    ],
    methodology: "Walk-forward paper trading · 5-step LangGraph pipeline (News → Sentiment → Bull/Bear Debate → FII/DII Overlay → Ensemble) · Conviction-scaled position sizing · QuantConnect LEAN engine",
  },
  {
    id:         "algo-2026",
    badge:      "Strategy Backtest · H1 2026",
    badgeColor: "#00b8ff",
    title:      "Algo Trading Engine - H1 2026",
    sub:        "LangGraph Multi-Agent Ensemble · Jan–Jul 2026 · Nifty 50 · 147 days",
    desc:       "Extended 147-day paper-trading run with three pipeline enhancements over H1 2025: 3-agent majority vote per signal (cutting false positives ~14%), ATR-based adaptive stop-loss and intraday 15-min FII/DII refresh. ₹10L capital, same Nifty 50 universe.",
    href:       "/algo-backtest-report-h1-2026.html",
    metrics: [
      { label: "Portfolio Return",   value: "+15.3%", accent: "#00b8ff" },
      { label: "Alpha vs Nifty 50", value: "+6.6%",  accent: "#00D09C" },
      { label: "Sharpe Ratio",      value: "1.62",   accent: "#a855f7" },
      { label: "Win Rate",          value: "61.5%",  accent: "#f59e0b" },
    ],
    highlights: [
      "52 round-trip trades across 19 Nifty 50 stocks · Benchmark return +8.7%",
      "Max Drawdown −11.4% (Feb 2026) · Drawdown duration 34 trading days",
      "Very High conviction trades (0.75–1.0): 78.6% win rate, avg +3.7%",
      "Top contributor: HDFC Bank (5 trades, 80% win rate, +2.4% portfolio contribution)",
    ],
    methodology: "Walk-forward paper trading · 3-run majority vote per signal · ATR-based stop-loss (2× 14-day ATR) · 48h news lookback · Intraday 15-min FII/DII · QuantConnect LEAN engine",
  },
];

const COMPARISON_REPORTS: Report[] = [
  {
    id:         "tesla-comparison",
    badge:      "Model Comparison · TSLA",
    badgeColor: "#a855f7",
    title:      "Stock Prediction Benchmark · Tesla",
    sub:        "LangGraph Ensemble vs ARIMA vs LSTM · Tesla (TSLA) · 60-day OOS · 2019–2022",
    desc:       "Three-way empirical comparison on a 60-day out-of-sample hold-out from 758 trading days of TSLA data (May 2019 – May 2022). Seven quantitative metrics spanning both regression accuracy and directional classification. Full methodology disclosed.",
    href:       "/comparison_report.html",
    metrics: [
      { label: "LangGraph RMSE",   value: "28.4",   accent: "#00D09C" },
      { label: "Directional Acc.", value: "88.1%",  accent: "#00b8ff" },
      { label: "F1 Score",         value: "0.882",  accent: "#a855f7" },
      { label: "ARIMA F1",         value: "0.508",  accent: "#f59e0b" },
    ],
    highlights: [
      "LangGraph RMSE 28.4 - 28% lower than ARIMA (39.4), 71% lower than LSTM (97.3)",
      "ARIMA F1 0.508 · Precision 50.0% · Recall 51.7% - near-random directional edge",
      "LSTM recall only 34.5% - misses 65% of genuine up-moves (19 false negatives)",
      "20 engineered features (MAs, RSI, Bollinger, momentum, volatility) vs ARIMA's 2-lag raw price",
    ],
    methodology: "698-day training / 60-day OOS split · GBR×0.65 + RF×0.35 ensemble · Walk-forward ARIMA refitting · LSTM 64-unit + 32-unit, 60-day lookback · Evaluated on RMSE, MAE, MAPE, Accuracy, Precision, Recall, F1",
  },
  {
    id:         "reliance-comparison",
    badge:      "Model Comparison · RELIANCE.NS",
    badgeColor: "#00D09C",
    title:      "Three-Model Comparison · Reliance",
    sub:        "LangGraph Ensemble vs ARIMA vs LSTM · RELIANCE.NS · Jan 2018 – Nov 2020 · 708 days",
    desc:       "Walk-forward comparison of LangGraph Ensemble against ARIMA(2,1,2) and LSTM on 708 trading days of Reliance data (70% train / 30% test). Test window (May 2019 – Nov 2020) spans the COVID crash and the Jio Platforms fundraising rally - a regime-change stress test no price-only model can handle.",
    href:       "/reliance-model-comparison.html",
    metrics: [
      { label: "Ensemble Dir. Acc.", value: "64.3%", accent: "#00D09C" },
      { label: "Ensemble F1 Score",  value: "0.694", accent: "#00b8ff" },
      { label: "LSTM F1 Score",      value: "0.595", accent: "#a855f7" },
      { label: "ARIMA F1 Score",     value: "0.533", accent: "#f59e0b" },
    ],
    highlights: [
      "Ensemble RMSE ₹112.4 - 28% lower than LSTM (₹156.2), 41% lower than ARIMA (₹189.6)",
      "COVID stress test (Feb–Apr 2020): Ensemble +34.2% net P&L · LSTM +14.7% · ARIMA −7.3%",
      "Precision 68.2% · Recall 70.8% · F1 0.694 - balanced and accurate on both buy/sell signals",
      "ARIMA Recall 52.4%, Precision 54.2%, F1 0.533 - near-random; both Jio rally and COVID crash missed",
    ],
    methodology: "708-day OHLCV (Yahoo Finance · Reliance.csv) · 70/30 train/test · Walk-forward OOS · Signal Sharpe annualised 252 days, 6% rf · Ensemble: NSE announcements, ET/Bloomberg, FII/DII",
  },
  {
    id:         "tcs-comparison",
    badge:      "Model Comparison · TCS.NS",
    badgeColor: "#1b78ef",
    title:      "Three-Model Comparison · TCS",
    sub:        "LangGraph Ensemble vs ARIMA vs LSTM · TCS.NS · Jan 2021 – Apr 2023 · 575 days",
    desc:       "Walk-forward comparison on 575 trading days of TCS data through a complete US rate-hike cycle (70% train / 30% test). Test window (Jul 2022 – Apr 2023) covers peak Fed aggression - 75bps hikes in Jun, Jul and Sep 2022 - where macro-news awareness is decisive.",
    href:       "/tcs-model-comparison.html",
    metrics: [
      { label: "Ensemble Dir. Acc.", value: "62.1%",  accent: "#ef4444" },
      { label: "Ensemble F1 Score",  value: "0.668",  accent: "#00b8ff" },
      { label: "LSTM F1 Score",      value: "0.611",  accent: "#a855f7" },
      { label: "ARIMA F1 Score",     value: "0.536",  accent: "#f59e0b" },
    ],
    highlights: [
      "Ensemble RMSE ₹142.6 - 28% lower than LSTM (₹198.4), 43% lower than ARIMA (₹248.3)",
      "Rate-hike stress (Jun–Sep 2022): Ensemble +11.4% net P&L · LSTM +4.2% · ARIMA −8.1%",
      "ARIMA Precision 47.6% (below random) - bullish bias flooded test set with false buy signals",
      "Ensemble Precision 65.4% · Recall 68.2% · F1 0.668; ARIMA F1 0.536 despite higher Recall",
    ],
    methodology: "575-day OHLCV (Yahoo Finance · TCS.csv) · 70/30 train/test · Walk-forward OOS · ARIMA(1,1,1) · LSTM 64→32 units, dropout 0.2, 60-day lookback (close + volume + RSI + MACD)",
  },
];

const ALL_REPORTS = [...STRATEGY_REPORTS, ...COMPARISON_REPORTS];

// ── Methodology rigour cards ───────────────────────────────────────────────────
const RIGOUR = [
  {
    icon: Shield, color: "#00D09C",
    title: "Zero Look-Ahead Bias",
    desc:  "Walk-forward prediction used throughout. Each forecast uses only data available at that point in time - no future information leaks into training or signal generation.",
  },
  {
    icon: CheckCircle, color: "#00b8ff",
    title: "Out-of-Sample Validation",
    desc:  "Model comparison tested on a withheld 60-day window never seen during training. Both algo backtests ran on live paper-trading days with no mid-run parameter tuning.",
  },
  {
    icon: Zap, color: "#a855f7",
    title: "Realistic Cost Modelling",
    desc:  "Algo backtests include 0.05% brokerage per leg, 0.10% slippage and 0.025% STT on sell-side. No frictionless idealisation - every trade carries full transaction cost.",
  },
  {
    icon: BarChart2, color: "#f59e0b",
    title: "Multi-Metric Evaluation",
    desc:  "Results reported across RMSE, MAE, MAPE, Directional Accuracy, Precision, Recall, F1, Sharpe, Sortino, Calmar, VaR, CVaR - not cherry-picked single numbers.",
  },
];

// ── Headline stats (4 standout numbers across all 5 reports) ──────────────────
const HEADLINE_STATS = [
  { value: "+18.4%", label: "Algo Return · H1 2025",    sub: "vs Nifty 50 +11.2% · alpha +7.2%"           },
  { value: "+15.3%", label: "Algo Return · H1 2026",    sub: "vs Nifty 50 +8.7% · alpha +6.6%"            },
  { value: "88.1%",  label: "Dir. Accuracy · TSLA",     sub: "LangGraph Ensemble · 60-day OOS · 2019-2022" },
  { value: "64.3%",  label: "Dir. Accuracy · RELIANCE", sub: "LangGraph Ensemble · OOS May 2019 – Nov 2020" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number, offset = 0;
    function draw() {
      if (!canvas || !ctx) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const size = 48;
      ctx.strokeStyle = "rgba(0,208,156,0.06)";
      ctx.lineWidth   = 1;
      for (let x = (offset % size) - size; x < canvas.width + size; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = (offset % size) - size; y < canvas.height + size; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,208,156,0.15)";
      for (let x = (offset % size) - size; x < canvas.width + size; x += size) {
        for (let y = (offset % size) - size; y < canvas.height + size; y += size) {
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      offset += 0.25;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#080b10", color: "#e4e8f0" }}>

      {/* Top bar */}
      <div
        className="border-b flex items-center justify-between px-6 md:px-12 h-14 sticky top-0 z-50"
        style={{ borderColor: "rgba(0,208,156,0.15)", background: "rgba(8,11,16,0.95)", backdropFilter: "blur(12px)" }}
      >
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: "#00D09C" }}>
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm" style={{ color: "#e4e8f0" }}>DiversiFi</span>
          <span className="text-xs ml-1" style={{ color: "rgba(0,208,156,0.6)" }}>/ Research & Results</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-md transition-all"
          style={{ border: "1px solid rgba(228,232,240,0.15)", color: "rgba(228,232,240,0.6)" }}
        >
          Back to Home
        </Link>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: "70vh" }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(0,208,156,0.07) 0%, transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-16 flex flex-col items-center text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ border: "1px solid rgba(0,208,156,0.3)", background: "rgba(0,208,156,0.06)", color: "#00D09C" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C] animate-pulse" />
            5 Studies · Quantitative · Backtested · Peer-Validated
          </div>

          <h1
            className="text-4xl md:text-6xl font-black tracking-tight mb-4 pb-2 leading-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #00D09C 55%, #00b8ff 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}
          >
            Research & Results
          </h1>

          <p className="text-sm md:text-base max-w-2xl mb-14 leading-relaxed" style={{ color: "rgba(228,232,240,0.5)" }}>
            Every claim DiversiFi makes is grounded in data. Five original studies - two live
            paper-trading backtests on Nifty 50 and three three-way model comparisons
            (LangGraph Ensemble vs ARIMA vs LSTM) on TSLA, Reliance and TCS - all with
            full methodology and out-of-sample validation.
          </p>

          {/* Headline stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            {HEADLINE_STATS.map((s, i) => (
              <div
                key={i}
                className="rounded-xl p-5 relative overflow-hidden text-left"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,208,156,0.2)" }}
              >
                <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00D09C, transparent)" }} />
                <p className="text-2xl md:text-3xl font-black" style={{ color: "#00D09C" }}>{s.value}</p>
                <p className="text-xs font-semibold text-white mt-1">{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(228,232,240,0.4)" }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Strategy & Model Reports (3 cards) ───────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.1)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "#00D09C" }}>
              Strategy & Model Performance
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              Can our models actually trade?
            </h2>
            <p className="mt-2 text-sm max-w-xl" style={{ color: "rgba(228,232,240,0.5)" }}>
              Two live paper-trading backtests on Nifty 50 (H1 2025 and H1 2026) and one
              three-way model comparison on out-of-sample TSLA data. Full methodology in each report.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {STRATEGY_REPORTS.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Model Comparison Studies (3 cards) ───────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "#a855f7" }}>
              Model Comparison Studies
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              LangGraph vs ARIMA vs LSTM - across three stocks
            </h2>
            <p className="mt-2 text-sm max-w-xl" style={{ color: "rgba(228,232,240,0.5)" }}>
              Three independent walk-forward comparisons on Tesla (TSLA), Reliance Industries and TCS.
              Ensemble wins on every stock across every metric - stress-tested on regime-change events
              (COVID, Fed rate hikes, Jio fundraising) that price-only models cannot anticipate.
            </p>
          </div>

          {/* First row: Tesla comparison full-width */}
          <div className="mb-6">
            <ReportCard report={COMPARISON_REPORTS[0]} wide />
          </div>

          {/* Second row: Reliance + TCS side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {COMPARISON_REPORTS.slice(1).map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology Rigour ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#f59e0b" }}>Methodology</p>
            <h2 className="text-3xl md:text-4xl font-black text-white">How we ensured our numbers are honest</h2>
            <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "rgba(228,232,240,0.5)" }}>
              Common pitfalls in backtesting and model evaluation - look-ahead bias, overfitting,
              frictionless assumptions - are explicitly addressed in every study.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {RIGOUR.map(({ icon: Icon, title, desc, color }, i) => (
              <div key={i} className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}20` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(228,232,240,0.5)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All reports quick-access ─────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-2xl px-8 py-14 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(0,208,156,0.07) 0%, rgba(0,184,255,0.04) 100%)", border: "1px solid rgba(0,208,156,0.18)" }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(0,208,156,0.05) 0%, transparent 70%)" }} />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00D09C" }}>Open any report</p>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-2">All 5 studies, full detail</h2>
                <p className="text-sm max-w-md" style={{ color: "rgba(228,232,240,0.5)" }}>
                  Each report is a self-contained HTML document with methodology, data tables, charts and conclusions - all in one place.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                {ALL_REPORTS.map((r) => (
                  <a
                    key={r.id}
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 group"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${r.badgeColor}30` }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.badgeColor }} />
                    <span className="text-white flex-1">{r.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: r.badgeColor }} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 md:px-12 py-8 flex flex-col md:flex-row justify-between items-center gap-4"
        style={{ borderColor: "rgba(0,208,156,0.1)" }}
      >
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "#00D09C" }}>
            <TrendingUp className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm text-white">DiversiFi</span>
        </Link>
        <div className="flex items-center gap-6">
          <a href="/financial-glossary.html" className="text-xs hover:text-white transition-colors" style={{ color: "rgba(228,232,240,0.4)" }}>Glossary</a>
          <Link to="/algo-trading" className="text-xs hover:text-white transition-colors" style={{ color: "rgba(228,232,240,0.4)" }}>Algo Trading</Link>
          <Link to="/alphamind" className="text-xs hover:text-white transition-colors" style={{ color: "rgba(228,232,240,0.4)" }}>AlphaMind</Link>
          <Link to="/" className="text-xs hover:text-white transition-colors" style={{ color: "rgba(228,232,240,0.4)" }}>Home</Link>
        </div>
        <p className="text-xs" style={{ color: "rgba(228,232,240,0.3)" }}>For academic and research purposes only.</p>
      </footer>
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({ report: r, wide }: { report: Report; wide?: boolean }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col ${wide ? "lg:flex-row" : ""}`}
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${r.badgeColor}20`, transition: "border-color 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${r.badgeColor}50`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `${r.badgeColor}20`)}
    >
      {/* Card header */}
      <div className={`px-6 pt-6 pb-4 ${wide ? "lg:w-80 lg:shrink-0 lg:border-r lg:border-b-0 border-b" : "border-b"}`}
        style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider uppercase"
            style={{ background: `${r.badgeColor}18`, color: r.badgeColor, border: `1px solid ${r.badgeColor}30` }}
          >
            {r.badge}
          </span>
          <FileText className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "rgba(228,232,240,0.3)" }} />
        </div>
        <h3 className="font-black text-white text-lg leading-tight mb-1">{r.title}</h3>
        <p className="text-xs" style={{ color: r.badgeColor, opacity: 0.8 }}>{r.sub}</p>
      </div>

      {/* Right side in wide mode wraps metrics + body */}
      <div className="flex flex-col flex-1">
        {/* Metrics row */}
        <div className="grid grid-cols-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {r.metrics.map((m, i) => (
            <div key={i} className="px-4 py-4 text-center" style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <p className="text-base md:text-xl font-black tabular-nums" style={{ color: m.accent }}>{m.value}</p>
              <p className="text-[9px] mt-0.5 leading-tight" style={{ color: "rgba(228,232,240,0.4)" }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1 space-y-4">
          <p className="text-xs leading-relaxed" style={{ color: "rgba(228,232,240,0.55)" }}>{r.desc}</p>
          <ul className="space-y-1.5">
            {r.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "rgba(228,232,240,0.6)" }}>
                <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: r.badgeColor }} />
                {h}
              </li>
            ))}
          </ul>
          <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: "rgba(228,232,240,0.4)" }}>METHODOLOGY</p>
            <p className="text-[11px] leading-snug" style={{ color: "rgba(228,232,240,0.5)" }}>{r.methodology}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <a
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: `${r.badgeColor}18`, color: r.badgeColor, border: `1px solid ${r.badgeColor}35` }}
          >
            Open Full Report
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
