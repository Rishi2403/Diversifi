import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, ChevronRight, BarChart2, FileText,
  Shield, Zap, CheckCircle, ExternalLink,
} from "lucide-react";

// ── Report definitions ────────────────────────────────────────────────────────

const REPORTS = [
  {
    id:      "algo",
    badge:   "Strategy Backtest",
    badgeColor: "#00D09C",
    title:   "Algorithmic Trading Engine",
    sub:     "LangGraph Multi-Agent Ensemble · H1 2025 · Nifty 50",
    desc:    "126-day paper-trading simulation on Nifty 50 constituents using a 6-node LangGraph pipeline. No look-ahead bias. ₹10L starting capital with realistic brokerage, slippage, and STT costs.",
    href:    "/algo-backtest-report.html",
    metrics: [
      { label: "Portfolio Return",  value: "+18.4%",  accent: "#00D09C" },
      { label: "Alpha vs Nifty 50", value: "+7.2%",   accent: "#00b8ff" },
      { label: "Sharpe Ratio",      value: "1.84",    accent: "#a855f7" },
      { label: "Win Rate",          value: "64.2%",   accent: "#f59e0b" },
    ],
    highlights: [
      "47 paper trades across 18 Nifty 50 stocks",
      "Sortino 2.31 · Max Drawdown −8.3% (recovered in 18 days)",
      "Signal lead time 1.8 days ahead of price confirmation",
      "Strong Buy signals: 83.3% win rate, avg +9.4%",
    ],
    methodology: "Walk-forward paper trading · 0.05% brokerage + 0.10% slippage + STT · Max 8 concurrent positions · Conviction-scaled sizing",
  },
  {
    id:      "comparison",
    badge:   "Model Comparison",
    badgeColor: "#00b8ff",
    title:   "Stock Prediction Model Benchmark",
    sub:     "LangGraph Ensemble vs ARIMA vs LSTM · Tesla (TSLA) · 60-day OOS",
    desc:    "Three-way empirical comparison of forecasting approaches on a 60-day out-of-sample test window across 7 quantitative metrics — regression accuracy and directional classification.",
    href:    "/comparison_report.html",
    metrics: [
      { label: "RMSE (LangGraph)", value: "28.4",   accent: "#00D09C" },
      { label: "vs ARIMA RMSE",   value: "39.4",   accent: "#f59e0b" },
      { label: "Directional Acc.", value: "88.1%",  accent: "#00b8ff" },
      { label: "F1 Score",         value: "0.882",  accent: "#a855f7" },
    ],
    highlights: [
      "LangGraph RMSE 28% lower than ARIMA, 71% lower than LSTM",
      "ARIMA directional F1: 0.508 — statistically near random",
      "LSTM recall 34.5% — missed 65% of genuine up-moves",
      "20 engineered features vs ARIMA's 2-lag autoregression",
    ],
    methodology: "698-day training / 60-day OOS split · Walk-forward refitting · GBR + RF ensemble (0.65×GBR + 0.35×RF) · Evaluated on RMSE, MAE, MAPE, Accuracy, Precision, Recall, F1",
  },
  {
    id:      "reliance",
    badge:   "Stock Analysis",
    badgeColor: "#a855f7",
    title:   "Reliance Industries — 5-Year Study",
    sub:     "RELIANCE.NS · NSE Daily OHLCV · Nov 2015 – Nov 2020",
    desc:    "Quantitative historical analysis of Reliance Industries across 1,233 trading days — return attribution, volatility, drawdown events, volume anomalies, and 9 identified market phases.",
    href:    "/reliance-stock-report.html",
    metrics: [
      { label: "5-Year Return",  value: "+337%",   accent: "#a855f7" },
      { label: "CAGR",           value: "34.4%",   accent: "#00D09C" },
      { label: "Ann. Volatility", value: "30.85%", accent: "#f59e0b" },
      { label: "Sharpe (est.)",  value: "~0.92",   accent: "#00b8ff" },
    ],
    highlights: [
      "₹456 → ₹1,993 over 5 years (4.4× appreciation)",
      "COVID drawdown −26.4%, recovered in just ~3 months",
      "2017 Jio launch phase: +94.7% in 15 months",
      "Mega Rally Apr–Sep 2020: +108.8% (Jio FDI ~$20B)",
    ],
    methodology: "1,233-day NSE daily OHLCV · Descriptive analytics: CAGR, Sharpe, Sortino, rolling drawdowns, volume analysis, phase segmentation",
  },
  {
    id:      "tcs",
    badge:   "Stock Analysis",
    badgeColor: "#ef4444",
    title:   "TCS — 10-Year Decade Study",
    sub:     "TCS.NS · NSE Daily OHLCV · Apr 2013 – Apr 2023",
    desc:    "Decade-long quantitative analysis of TCS across 2,467 trading days — covering two bull runs, three drawdown events, dividend-adjusted returns, and comparison against Nifty 50 CAGR.",
    href:    "/tcs-stock-report.html",
    metrics: [
      { label: "10-Year Return",  value: "+369%",   accent: "#ef4444" },
      { label: "CAGR",           value: "16.7%",   accent: "#00D09C" },
      { label: "vs Nifty CAGR",  value: "~11%",    accent: "#f59e0b" },
      { label: "₹1L → ₹4.7L",   value: "10 yrs",  accent: "#00b8ff" },
    ],
    highlights: [
      "2,467 trading days analysed · 8/11 positive years",
      "CAGR 16.7% vs Nifty 50's ~11–12% over same decade",
      "Pandemic Bull Phase: +120.1% (Apr 2020 – Jan 2022)",
      "Max Drawdown −28.2% (2022 rate-hike correction)",
    ],
    methodology: "2,467-day NSE daily OHLCV · Adj. close for dividends and splits · CAGR, Sharpe, VaR, rolling drawdown, volume trend, 7-phase segmentation",
  },
];

const RIGOUR = [
  {
    icon: Shield,
    title: "Zero Look-Ahead Bias",
    desc:  "Walk-forward prediction used throughout. Each forecast uses only data available at that point in time — no future information leaks into training.",
    color: "#00D09C",
  },
  {
    icon: CheckCircle,
    title: "Out-of-Sample Validation",
    desc:  "Model comparison tested on a withheld 60-day window never seen during training. Backtest ran on 126 live trading days with no parameter tuning mid-run.",
    color: "#00b8ff",
  },
  {
    icon: Zap,
    title: "Realistic Cost Modelling",
    desc:  "Algo backtest includes 0.05% brokerage per leg, 0.10% slippage, and 0.025% STT on sell-side — no frictionless idealisation.",
    color: "#a855f7",
  },
  {
    icon: BarChart2,
    title: "Multi-Metric Evaluation",
    desc:  "Results measured on RMSE, MAE, MAPE, Directional Accuracy, Precision, Recall, F1, Sharpe, Sortino, Calmar, VaR, CVaR — not cherry-picked single numbers.",
    color: "#f59e0b",
  },
];

const HEADLINE_STATS = [
  { value: "+18.4%",  label: "Algo Portfolio Return",   sub: "H1 2025 paper trading" },
  { value: "88.1%",   label: "Directional Accuracy",     sub: "LangGraph vs TSLA OOS" },
  { value: "+337%",   label: "Reliance 5-Year Return",   sub: "Nov 2015 – Nov 2020"   },
  { value: "369%",    label: "TCS 10-Year Return",       sub: "Apr 2013 – Apr 2023"   },
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
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }} />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-16 flex flex-col items-center text-center">

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ border: "1px solid rgba(0,208,156,0.3)", background: "rgba(0,208,156,0.06)", color: "#00D09C" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C] animate-pulse" />
            Quantitative · Backtested · Peer-Validated
          </div>

          <h1
            className="text-4xl md:text-6xl font-black tracking-tight mb-4 pb-2 leading-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #00D09C 55%, #00b8ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Research & Results
          </h1>

          <p className="text-sm md:text-base max-w-2xl mb-14 leading-relaxed" style={{ color: "rgba(228,232,240,0.5)" }}>
            Every claim DiversiFi makes is grounded in data. Four original studies — two strategy/model
            evaluations and two long-term market analyses — conducted with rigorous methodology and
            published in full below.
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

      {/* ── Strategy & Model Reports ──────────────────────────────────────────── */}
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
              Two independent evaluations — one on Indian markets (paper trading), one on international
              data (out-of-sample benchmark). Both with full methodology disclosed.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {REPORTS.slice(0, 2).map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Market Analysis Reports ───────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "#a855f7" }}>
              Historical Market Studies
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              Understanding Indian equities, by the numbers
            </h2>
            <p className="mt-2 text-sm max-w-xl" style={{ color: "rgba(228,232,240,0.5)" }}>
              Long-horizon quantitative studies of two flagship NSE stocks — covering return attribution,
              drawdown events, volatility regimes, and volume behaviour across thousands of trading days.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {REPORTS.slice(2).map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology Rigour ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#f59e0b" }}>
              Methodology
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              How we ensured our numbers are honest
            </h2>
            <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "rgba(228,232,240,0.5)" }}>
              Common pitfalls in backtesting and model evaluation — look-ahead bias, overfitting,
              frictionless assumptions — are explicitly addressed in every study.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {RIGOUR.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={i}
                className="rounded-xl p-6"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}20` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color }} />
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
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00D09C" }}>
                  Open any report
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-2">All studies, full detail</h2>
                <p className="text-sm max-w-md" style={{ color: "rgba(228,232,240,0.5)" }}>
                  Each report is a self-contained HTML document with methodology, charts, data tables,
                  and conclusions — all in one place.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                {REPORTS.map((r) => (
                  <a
                    key={r.id}
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 group"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${r.badgeColor}30` }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.badgeColor }} />
                    <span className="text-white">{r.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: r.badgeColor }} />
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
          <Link to="/algo-trading" className="text-xs hover:text-white transition-colors" style={{ color: "rgba(228,232,240,0.4)" }}>Algo Trading</Link>
          <Link to="/alphamind" className="text-xs hover:text-white transition-colors" style={{ color: "rgba(228,232,240,0.4)" }}>AlphaMind</Link>
          <Link to="/" className="text-xs hover:text-white transition-colors" style={{ color: "rgba(228,232,240,0.4)" }}>Home</Link>
        </div>
        <p className="text-xs" style={{ color: "rgba(228,232,240,0.3)" }}>For academic and research purposes only.</p>
      </footer>
    </div>
  );
}

// ── Report card sub-component ─────────────────────────────────────────────────

function ReportCard({ report: r }: { report: typeof REPORTS[0] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${r.badgeColor}20`, transition: "border-color 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${r.badgeColor}50`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `${r.badgeColor}20`)}
    >
      {/* Card header */}
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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

      {/* Metrics */}
      <div className="grid grid-cols-4 px-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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
  );
}
