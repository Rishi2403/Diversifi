import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Cpu, Activity, Shield, Zap, ChevronRight, BarChart2 } from "lucide-react";

function useCountUp(target: number, duration = 1800, decimals = 1, started = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, decimals, started]);
  return val;
}

const AGENTS = [
  { label: "News Ingest", sub: "GNews + NSE feeds", color: "#00D09C" },
  { label: "Sentiment Agent", sub: "LLM scoring", color: "#00b8ff" },
  { label: "Technical Agent", sub: "RSI · MACD · BB", color: "#a855f7" },
  { label: "Fundamental Agent", sub: "PE · ROE · D/E", color: "#f59e0b" },
  { label: "Risk Manager", sub: "Stop-loss · Sizing", color: "#ef4444" },
  { label: "Execution Router", sub: "Order dispatch", color: "#00D09C" },
];

const STRATEGIES = [
  {
    name: "Momentum Breakout",
    win: "68.4%",
    trades: 19,
    ret: "+11.2%",
    desc: "RSI extremes + volume surge. Long bias on Nifty 50 large-caps.",
    positive: true,
  },
  {
    name: "Sentiment Reversal",
    win: "61.5%",
    trades: 13,
    ret: "+4.8%",
    desc: "LLM-scored news shock + mean reversion. 3-5 day hold.",
    positive: true,
  },
  {
    name: "Factor Rotation",
    win: "60.0%",
    trades: 15,
    ret: "+2.4%",
    desc: "Fundamental screening across low-PE, high-ROE sectors monthly.",
    positive: true,
  },
];

export default function AlgoTradingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Trigger count-up when hero enters viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (heroRef.current) obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  // Animated grid canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let offset = 0;

    function draw() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const size = 48;
      ctx.strokeStyle = "rgba(0,208,156,0.07)";
      ctx.lineWidth = 1;

      // Scrolling vertical lines
      for (let x = (offset % size) - size; x < canvas.width + size; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      // Scrolling horizontal lines
      for (let y = (offset % size) - size; y < canvas.height + size; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Glowing dots at intersections
      ctx.fillStyle = "rgba(0,208,156,0.18)";
      for (let x = (offset % size) - size; x < canvas.width + size; x += size) {
        for (let y = (offset % size) - size; y < canvas.height + size; y += size) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      offset += 0.3;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const r = useCountUp(18.4, 1800, 1, visible);
  const alpha = useCountUp(7.2, 1800, 1, visible);
  const sharpe = useCountUp(1.84, 1800, 2, visible);
  const win = useCountUp(64.2, 1800, 1, visible);

  return (
    <div className="min-h-screen" style={{ background: "#080b10", color: "#e4e8f0" }}>
      {/* Top bar */}
      <div
        className="border-b flex items-center justify-between px-6 md:px-12 h-14"
        style={{ borderColor: "rgba(0,208,156,0.15)", background: "rgba(8,11,16,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}
      >
        <Link to="/" className="flex items-center gap-2 group">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ backgroundColor: "#00D09C" }}
          >
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm" style={{ color: "#e4e8f0" }}>DiversiFi</span>
          <span className="text-xs ml-1" style={{ color: "rgba(0,208,156,0.6)" }}>/ Algo</span>
        </Link>
        <a
          href="/algo-backtest-report.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-md transition-all"
          style={{
            border: "1px solid rgba(0,208,156,0.35)",
            color: "#00D09C",
            background: "rgba(0,208,156,0.07)",
          }}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          View Full Report
        </a>
      </div>

      {/* Hero */}
      <div ref={heroRef} className="relative overflow-hidden" style={{ minHeight: "88vh" }}>
        {/* Animated grid */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 1 }}
        />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(0,208,156,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-16 flex flex-col items-center text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{
              border: "1px solid rgba(0,208,156,0.3)",
              background: "rgba(0,208,156,0.06)",
              color: "#00D09C",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C] animate-pulse" />
            LangGraph Multi-Agent Ensemble · Paper Trading H1 2025
          </div>

          <h1
            className="text-5xl md:text-7xl font-black tracking-tighter mb-2 pb-4 leading-none"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #00D09C 50%, #00b8ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Algorithmic
            <br />
            Trading Engine
          </h1>

          <p className="text-base md:text-lg max-w-xl mt-4 mb-12 leading-relaxed" style={{ color: "rgba(228,232,240,0.6)" }}>
            Six AI agents. One unified signal. Backtested against Nifty 50
            constituents with zero look-ahead bias across 47 paper trades.
          </p>

          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-12">
            {[
              { label: "Portfolio Return", value: `+${r}%`, accent: "#00D09C" },
              { label: "Alpha vs Nifty 50", value: `+${alpha}%`, accent: "#00b8ff" },
              { label: "Sharpe Ratio", value: sharpe.toFixed(2), accent: "#a855f7" },
              { label: "Win Rate", value: `${win}%`, accent: "#f59e0b" },
            ].map((m, i) => (
              <div
                key={i}
                className="rounded-xl p-5 relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${m.accent}30`,
                  boxShadow: `0 0 30px ${m.accent}10`,
                }}
              >
                <div
                  className="absolute inset-x-0 bottom-0 h-0.5"
                  style={{ background: `linear-gradient(90deg, transparent, ${m.accent}, transparent)` }}
                />
                <p
                  className="text-3xl md:text-4xl font-black tabular-nums"
                  style={{ color: m.accent }}
                >
                  {m.value}
                </p>
                <p className="text-xs mt-1.5" style={{ color: "rgba(228,232,240,0.5)" }}>
                  {m.label}
                </p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="/algo-backtest-report.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "#00D09C", color: "#080b10" }}
            >
              View Full Backtest Report
              <ChevronRight className="w-4 h-4" />
            </a>
            <Link
              to="/"
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
              style={{
                border: "1px solid rgba(228,232,240,0.15)",
                color: "rgba(228,232,240,0.7)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Agent Pipeline */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.1)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00D09C" }}>
              System Architecture
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              The 6-Agent Pipeline
            </h2>
            <p className="mt-3 text-sm max-w-lg mx-auto" style={{ color: "rgba(228,232,240,0.5)" }}>
              A LangGraph stateful graph where each node is a specialist LLM agent.
              Signals flow left to right - no agent sees future data.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-0">
            {AGENTS.map((a, i) => (
              <div key={i} className="flex items-center">
                <div
                  className="rounded-xl px-5 py-4 text-center relative overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${a.color}30`,
                    minWidth: 130,
                  }}
                >
                  <div
                    className="absolute top-0 inset-x-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${a.color}, transparent)` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ background: `${a.color}18`, border: `1px solid ${a.color}40` }}
                  >
                    <Cpu className="w-4 h-4" style={{ color: a.color }} />
                  </div>
                  <p className="text-xs font-bold text-white">{a.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(228,232,240,0.4)" }}>{a.sub}</p>
                </div>
                {i < AGENTS.length - 1 && (
                  <div className="flex items-center px-2">
                    <div className="h-px w-6" style={{ background: "rgba(0,208,156,0.25)" }} />
                    <div
                      className="w-0 h-0"
                      style={{
                        borderTop: "4px solid transparent",
                        borderBottom: "4px solid transparent",
                        borderLeft: "6px solid rgba(0,208,156,0.4)",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategy Breakdown */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00b8ff" }}>
              Sub-Strategies
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Three Signal Sources
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STRATEGIES.map((s, i) => (
              <div
                key={i}
                className="rounded-xl p-6 relative overflow-hidden group"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(0,208,156,0.12)",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,208,156,0.35)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(0,208,156,0.12)")}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(0,208,156,0.1)" }}
                  >
                    <Activity className="w-4.5 h-4.5" style={{ color: "#00D09C" }} />
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-md"
                    style={{ background: "rgba(0,208,156,0.1)", color: "#00D09C" }}
                  >
                    {s.ret}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mb-1">{s.name}</h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(228,232,240,0.5)" }}>
                  {s.desc}
                </p>
                <div className="flex gap-4 pt-4" style={{ borderTop: "1px solid rgba(0,208,156,0.1)" }}>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(228,232,240,0.4)" }}>Win Rate</p>
                    <p className="text-sm font-bold" style={{ color: "#00D09C" }}>{s.win}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(228,232,240,0.4)" }}>Trades</p>
                    <p className="text-sm font-bold text-white">{s.trades}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk snapshot */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#ef4444" }}>
              Risk Analytics
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Risk Controls Built-In
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: "Max Drawdown", value: "−8.3%", sub: "Below −15% hard stop", color: "#ef4444" },
              { icon: Activity, label: "VaR (95%, 1d)", value: "−1.2%", sub: "Value at Risk", color: "#f59e0b" },
              { icon: Zap, label: "Beta vs Nifty", value: "0.74", sub: "Lower market exposure", color: "#a855f7" },
              { icon: TrendingUp, label: "Annualised Alpha", value: "+14.4%", sub: "Excess over benchmark", color: "#00D09C" },
            ].map(({ icon: Icon, label, value, sub, color }, i) => (
              <div
                key={i}
                className="rounded-xl p-5 flex flex-col gap-3"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${color}20`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ background: `${color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color }}>{value}</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(228,232,240,0.4)" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report CTA banner */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-2xl px-8 py-14 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(0,208,156,0.07) 0%, rgba(0,184,255,0.05) 100%)",
              border: "1px solid rgba(0,208,156,0.2)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,208,156,0.06) 0%, transparent 70%)",
              }}
            />
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "#00D09C" }}>
              Detailed Analysis Available
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Comprehensive Backtest Report
            </h2>
            <p className="text-sm max-w-md mx-auto mb-8" style={{ color: "rgba(228,232,240,0.55)" }}>
              Equity curve, per-stock attribution, sector rotation timeline, signal quality analysis,
              and full methodology - all in one report.
            </p>
            <a
              href="/algo-backtest-report.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: "#00D09C", color: "#080b10" }}
            >
              <BarChart2 className="w-4 h-4" />
              Open Full Report
              <ChevronRight className="w-4 h-4" />
            </a>
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
        <p className="text-xs" style={{ color: "rgba(228,232,240,0.35)" }}>
          For academic and research purposes only. Not financial or investment advice.
        </p>
      </footer>
    </div>
  );
}
