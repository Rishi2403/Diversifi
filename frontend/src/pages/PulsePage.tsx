import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, Radio, Bell, Newspaper, Eye, Shield,
  ChevronRight, Activity, Zap, BarChart2,
} from "lucide-react";

const PIPELINE = [
  { label: "Price Fetch",    sub: "yfinance · NSE live",        color: "#00D09C" },
  { label: "News Ingest",    sub: "Live headlines & feeds",  color: "#00b8ff" },
  { label: "Emotion Scan",   sub: "Bullish · Bearish · Neutral", color: "#a855f7" },
  { label: "Signal Verdict", sub: "Sentiment Analysis", color: "#f59e0b" },
  { label: "Alert Engine",   sub: "Threshold · Risk tiers",     color: "#ef4444" },
  { label: "Intel Digest",   sub: "Daily roundup · Auto-send",  color: "#00D09C" },
];

const FEATURES = [
  {
    icon: Eye,
    title: "Live Portfolio Watch",
    desc: "Every stock and mutual fund refreshed every 2 minutes during NSE market hours (9:15 AM - 3:30 PM IST). Prices, P&L and intraday moves - always current.",
    color: "#00D09C",
  },
  {
    icon: Radio,
    title: "Market Sentiment Scanner",
    desc: "News headlines for each holding are scored for market emotion every cycle - Bullish, Bearish, or Neutral. AlphaMind reads the crowd's mood from live feeds before prices react.",
    color: "#00b8ff",
  },
  {
    icon: Bell,
    title: "3-Tier Alert System",
    desc: "Immediate Action for sharp single-day drops (>8%), Caution for gradual declines with trend patterns (>3%) and All Clear when all holdings are within normal range.",
    color: "#ef4444",
  },
  {
    icon: Newspaper,
    title: "Breaking News Intelligence",
    desc: "When market-moving news hits any of your holdings, AlphaMind detects the emotional shift first. Significant sentiment swings surface as alerts - before the broader market reacts.",
    color: "#a855f7",
  },
];

const METRICS = [
  { label: "Update Interval", value: "2 min",       accent: "#00D09C" },
  { label: "Alert Tiers",     value: "3-level",     accent: "#ef4444" },
  { label: "Asset Coverage",  value: "Stocks + MFs", accent: "#00b8ff" },
  { label: "Sentiment Scan",  value: "Live News",   accent: "#a855f7" },
];

const COVERAGE = [
  { icon: TrendingUp, label: "NSE Equities",    value: "Live prices",   sub: "yfinance · .NS suffix",     color: "#00D09C" },
  { icon: BarChart2,  label: "Mutual Funds",    value: "NAV tracking",  sub: "Gains bar · Category tags", color: "#00b8ff" },
  { icon: Zap,        label: "Verdict Speed",   value: "< 30 sec",      sub: "Full analysis cycle",       color: "#a855f7" },
  { icon: Shield,     label: "Alert Precision", value: "3-tier system", sub: "Immediate · Caution · OK",  color: "#ef4444" },
];

export default function AlphaMindPage() {
  const heroRef  = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let offset = 0;

    function draw() {
      if (!canvas || !ctx) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const size = 48;
      ctx.strokeStyle = "rgba(0,208,156,0.07)";
      ctx.lineWidth   = 1;

      for (let x = (offset % size) - size; x < canvas.width + size; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = (offset % size) - size; y < canvas.height + size; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      ctx.fillStyle = "rgba(0,208,156,0.18)";
      for (let x = (offset % size) - size; x < canvas.width + size; x += size) {
        for (let y = (offset % size) - size; y < canvas.height + size; y += size) {
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }

      offset += 0.3;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#080b10", color: "#e4e8f0" }}>

      {/* Top bar */}
      <div
        className="border-b flex items-center justify-between px-6 md:px-12 h-14"
        style={{ borderColor: "rgba(0,208,156,0.15)", background: "rgba(8,11,16,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}
      >
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: "#00D09C" }}>
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm" style={{ color: "#e4e8f0" }}>DiversiFi</span>
          <span className="text-xs ml-1" style={{ color: "rgba(0,208,156,0.6)" }}>/ AlphaMind</span>
        </Link>
        <Link
          to="/agent"
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-md transition-all"
          style={{ border: "1px solid rgba(0,208,156,0.35)", color: "#00D09C", background: "rgba(0,208,156,0.07)" }}
        >
          <Activity className="w-3.5 h-3.5" />
          Open Dashboard
        </Link>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div ref={heroRef} className="relative overflow-hidden" style={{ minHeight: "88vh" }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(0,208,156,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)" }}
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-16 flex flex-col items-center text-center">

          {/* Live badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ border: "1px solid rgba(0,208,156,0.3)", background: "rgba(0,208,156,0.06)", color: "#00D09C" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C] animate-pulse" />
            Live News · Market Emotions · Real-Time Signals
          </div>

          <h1
            className="text-6xl md:text-9xl font-black tracking-tighter mb-2 pb-4 leading-none"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #00D09C 50%, #00b8ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            AlphaMind
          </h1>

          <p className="text-lg md:text-xl font-semibold mb-3" style={{ color: "rgba(228,232,240,0.85)" }}>
            Your Dedicated Real-Time Market Intelligence Assistant
          </p>

          <p className="text-sm md:text-base max-w-xl mb-12 leading-relaxed" style={{ color: "rgba(228,232,240,0.5)" }}>
            AlphaMind scans live news headlines, reads market emotions and tracks every holding
            in your portfolio - surfacing sentiment shifts and risk signals every 2 minutes,
            so you always know what the market is feeling.
          </p>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-12">
            {METRICS.map((m, i) => (
              <div
                key={i}
                className="rounded-xl p-5 relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${m.accent}30`, boxShadow: `0 0 30px ${m.accent}08` }}
              >
                <div
                  className="absolute inset-x-0 bottom-0 h-0.5"
                  style={{ background: `linear-gradient(90deg, transparent, ${m.accent}, transparent)` }}
                />
                <p className="text-xl md:text-2xl font-black" style={{ color: m.accent }}>{m.value}</p>
                <p className="text-xs mt-1.5" style={{ color: "rgba(228,232,240,0.5)" }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/agent"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: "#00D09C", color: "#080b10" }}
            >
              <Activity className="w-4 h-4" />
              Activate AlphaMind
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all"
              style={{ border: "1px solid rgba(228,232,240,0.15)", color: "rgba(228,232,240,0.7)", background: "rgba(255,255,255,0.03)" }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* ── Agent Loop Pipeline ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.1)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00D09C" }}>
              How It Works
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              The AlphaMind Signal Loop
            </h2>
            <p className="mt-3 text-sm max-w-lg mx-auto" style={{ color: "rgba(228,232,240,0.5)" }}>
              Every 2 minutes during market hours, AlphaMind sweeps the full pipeline - fetching prices,
              scanning news, reading market emotions and surfacing signals before they become losses.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-0">
            {PIPELINE.map((step, i) => (
              <div key={i} className="flex items-center">
                <div
                  className="rounded-xl px-5 py-4 text-center relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${step.color}30`, minWidth: 130 }}
                >
                  <div
                    className="absolute top-0 inset-x-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ background: `${step.color}18`, border: `1px solid ${step.color}40` }}
                  >
                    <Radio className="w-4 h-4" style={{ color: step.color }} />
                  </div>
                  <p className="text-xs font-bold text-white">{step.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(228,232,240,0.4)" }}>{step.sub}</p>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className="flex items-center px-2">
                    <div className="h-px w-6" style={{ background: "rgba(0,208,156,0.25)" }} />
                    <div
                      className="w-0 h-0"
                      style={{ borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "6px solid rgba(0,208,156,0.4)" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00b8ff" }}>
              Capabilities
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Everything Your Portfolio Needs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={i}
                className="rounded-xl p-6 relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}15`, transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}40`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = `${color}15`)}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-bold text-white text-base mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(228,232,240,0.5)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Coverage Stats ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#f59e0b" }}>
              Coverage
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Built for Indian Retail Investors
            </h2>
            <p className="mt-3 text-sm max-w-lg mx-auto" style={{ color: "rgba(228,232,240,0.5)" }}>
              AlphaMind covers NSE-listed equities and all major mutual fund categories -
              both tracked and analysed together in one unified view.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {COVERAGE.map(({ icon: Icon, label, value, sub, color }, i) => (
              <div
                key={i}
                className="rounded-xl p-5 flex flex-col gap-3"
                style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${color}20` }}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-xl font-black" style={{ color }}>{value}</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(228,232,240,0.4)" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Data Sources ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00D09C" }}>Transparency</p>
            <h2 className="text-2xl md:text-3xl font-black text-white">Data Sources</h2>
            <p className="text-sm mt-3 max-w-lg mx-auto" style={{ color: "rgba(228,232,240,0.45)" }}>Every signal AlphaMind surfaces is grounded in real, traceable data</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {([
              { name: "yfinance", type: "Live Feed", typeColor: "#00D09C", desc: "NSE stock prices (last traded price + previous close) and per-ticker news headlines - fetched live for every holding on each 2-minute scan cycle" },
              { name: "TextBlob", type: "Local NLP", typeColor: "#f59e0b", desc: "Sentiment polarity scoring applied to every news headline collected by yfinance - runs fully in-process, no external API call or added latency" },
              { name: "Claude Sonnet", type: "LLM", typeColor: "#a855f7", desc: "Anthropic claude-sonnet-4-6 synthesises price moves, sentiment scores and your portfolio profile into a plain-English verdict and risk signal per holding" },
            ] as const).map((s) => (
              <div key={s.name} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-base font-black text-white">{s.name}</span>
                  <span className="text-[9px] font-bold px-2 py-1 rounded shrink-0 ml-2" style={{ background: `${s.typeColor}18`, color: s.typeColor }}>{s.type}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(228,232,240,0.45)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 border-t" style={{ borderColor: "rgba(0,208,156,0.08)" }}>
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-2xl px-8 py-16 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(0,208,156,0.07) 0%, rgba(0,184,255,0.05) 100%)",
              border: "1px solid rgba(0,208,156,0.2)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,208,156,0.06) 0%, transparent 70%)" }}
            />

            {/* Pulsing dot */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <span className="w-4 h-4 rounded-full bg-[#00D09C] block" />
                <span className="absolute inset-0 rounded-full bg-[#00D09C] animate-ping opacity-40" />
              </div>
            </div>

            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "#00D09C" }}>
              Ready to go live
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Your Portfolio Deserves a Dedicated Analyst
            </h2>
            <p className="text-sm max-w-md mx-auto mb-8" style={{ color: "rgba(228,232,240,0.55)" }}>
              Upload your portfolio, answer 4 quick questions and AlphaMind starts scanning -
              live prices, breaking news, market emotions and risk signals delivered
              straight to you every 2 minutes.
            </p>
            <Link
              to="/agent"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: "#00D09C", color: "#080b10" }}
            >
              <Activity className="w-4 h-4" />
              Activate AlphaMind
              <ChevronRight className="w-4 h-4" />
            </Link>
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
          <span className="text-xs ml-1" style={{ color: "rgba(0,208,156,0.6)" }}>/ AlphaMind</span>
        </Link>
        <p className="text-xs" style={{ color: "rgba(228,232,240,0.35)" }}>
          For academic and research purposes only. Not financial or investment advice.
        </p>
      </footer>
    </div>
  );
}
