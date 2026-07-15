import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BarChart2, TrendingUp, BookOpen, Globe, Check,
  ChevronRight, Cpu,
} from "lucide-react";

// ── Feature definitions ────────────────────────────────────────────────────────
type SourceType = "Live Feed" | "LLM" | "Local NLP" | "Scraped" | "Client Math";
interface DataSource { name: string; type: SourceType; }

const SOURCE_COLORS: Record<SourceType, string> = {
  "Live Feed":   "#00D09C",
  "LLM":        "#a855f7",
  "Local NLP":  "#f59e0b",
  "Scraped":    "#00b8ff",
  "Client Math":"#6366f1",
};

const FEATURES = [
  {
    id: "analyse",
    label: "Analyse",
    Icon: BarChart2,
    accent: "#00D09C",
    accentDim: "rgba(0,208,156,0.10)",
    accentBorder: "rgba(0,208,156,0.22)",
    badge: "Portfolio Intelligence",
    headline: "Know exactly where\nyour portfolio stands",
    sub: "AI-powered health scoring breaks down diversification, overlap, concentration risk and benchmark alignment - then tells you what to do about it.",
    capabilities: [
      "0-100 health score across 6 sub-dimensions",
      "Mutual fund overlap detection across holdings",
      "Sector & cap-size concentration analysis",
      "Benchmark comparison vs Nifty 50 / 500",
      "Tax harvesting opportunity detection",
      "Actionable rebalancing recommendations",
    ],
    sources: [
      { name: "yfinance", type: "Live Feed" },
      { name: "Groww API", type: "Live Feed" },
      { name: "NumPy / Pandas", type: "Client Math" },
    ] as DataSource[],
    stats: [
      { label: "AI Agents", value: "8+" },
      { label: "Sub-scores", value: "6" },
      { label: "Health Scale", value: "0-100" },
    ],
    cta: { label: "Open Analyser", href: "/portfolio-analyser" },
  },
  {
    id: "simulate",
    label: "Simulate",
    Icon: TrendingUp,
    accent: "#a855f7",
    accentDim: "rgba(168,85,247,0.10)",
    accentBorder: "rgba(168,85,247,0.22)",
    badge: "Monte Carlo Engine",
    headline: "See every possible future\nbefore you invest",
    sub: "5,000-path GBM simulation with year-wise SIP/SWP planning, AI-mapped industry and geopolitical scenarios and a Sharpe-calibrated fan chart.",
    capabilities: [
      "5,000 Monte Carlo paths (GBM model)",
      "Year-wise SIP, SWP and lumpsum planning",
      "Fund-wise or auto-allocated SIP modes",
      "Industry, geopolitical & inflation scenarios",
      "AI per-holding scenario impact analysis",
      "P10 / P90 fan chart, VaR, Sharpe ratio",
    ],
    sources: [
      { name: "Claude Sonnet", type: "LLM" },
      { name: "GBM Math (client-side)", type: "Client Math" },
    ] as DataSource[],
    stats: [
      { label: "MC Paths", value: "5,000" },
      { label: "Scenario Types", value: "3" },
      { label: "Max Horizon", value: "30 yr" },
    ],
    cta: { label: "Open Simulator", href: "/portfolio-simulation" },
  },
  {
    id: "research",
    label: "Research",
    Icon: BookOpen,
    accent: "#00b8ff",
    accentDim: "rgba(0,184,255,0.10)",
    accentBorder: "rgba(0,184,255,0.22)",
    badge: "Deep Stock Research",
    headline: "Research any stock\nin seconds, not hours",
    sub: "Multi-agent AI synthesises fundamentals, technical signals, news sentiment and peer comparisons into a single structured research report.",
    capabilities: [
      "AI-generated full research report",
      "Fundamental analysis (P/E, ROE, margins)",
      "Technical signal detection",
      "News sentiment scoring",
      "Peer & sector comparison",
      "Investment thesis generation",
    ],
    sources: [
      { name: "yfinance", type: "Live Feed" },
      { name: "mfapi.in", type: "Live Feed" },
      { name: "TextBlob", type: "Local NLP" },
      { name: "Claude Sonnet", type: "LLM" },
    ] as DataSource[],
    stats: [
      { label: "Data Sources", value: "4" },
      { label: "Coverage", value: "NSE/BSE" },
      { label: "AI Agents", value: "Multi" },
    ],
    cta: { label: "Open Research", href: "/research" },
  },
  {
    id: "news",
    label: "Global Markets",
    Icon: Globe,
    accent: "#f59e0b",
    accentDim: "rgba(245,158,11,0.10)",
    accentBorder: "rgba(245,158,11,0.22)",
    badge: "Live Market Intelligence",
    headline: "Global markets, indices,\ncommodities - in INR",
    sub: "Real-time prices for 10+ global equity indices, gold, silver, crude oil and crypto - all converted to INR for instant context.",
    capabilities: [
      "10+ global index prices (Nifty, S&P, Nasdaq…)",
      "Commodities in INR: Gold, Silver, Oil, Gas",
      "Crypto in INR: BTC, ETH and more",
      "Live % change and directional colour coding",
      "Market open / closed status per exchange",
      "FII / DII institutional flow data",
    ],
    sources: [
      { name: "yfinance", type: "Live Feed" },
      { name: "NSE India API", type: "Scraped" },
    ] as DataSource[],
    stats: [
      { label: "Indices", value: "10+" },
      { label: "Commodities", value: "4" },
      { label: "Crypto", value: "5+" },
    ],
    cta: { label: "View Markets", href: "/global-market" },
  },
] as const;

// ── Mockup components ──────────────────────────────────────────────────────────
function AnalyseMockup() {
  const circumference = 238.76;
  const score = 82;
  const dashOffset = circumference * (1 - score / 100);
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(0,208,156,0.12)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="38" fill="none" stroke="#00D09C" strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white leading-none">{score}</span>
            <span className="text-[10px] font-bold tracking-widest" style={{ color: "#00D09C" }}>HEALTH</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Diversification", value: "88/100", color: "#00D09C" },
          { label: "MF Overlap", value: "Low", color: "#00b8ff" },
          { label: "Benchmark Fit", value: "91%", color: "#a855f7" },
          { label: "Concentration", value: "Moderate", color: "#f59e0b" },
        ].map((m, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${m.color}20` }}>
            <p className="text-[10px] text-white/40 mb-0.5">{m.label}</p>
            <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulateMockup() {
  const W = 280, H = 150;
  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }}>
          {/* P10/P90 band fill */}
          <path
            d={`M 0 ${H * 0.72} C 70 ${H * 0.65}, 140 ${H * 0.45}, ${W} ${H * 0.18}
                L ${W} ${H * 0.62} C 140 ${H * 0.82}, 70 ${H * 0.85}, 0 ${H * 0.72} Z`}
            fill="rgba(168,85,247,0.12)"
          />
          {/* P10 boundary */}
          <path d={`M 0 ${H * 0.72} C 70 ${H * 0.85}, 140 ${H * 0.82}, ${W} ${H * 0.62}`}
            fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="1" />
          {/* P90 boundary */}
          <path d={`M 0 ${H * 0.72} C 70 ${H * 0.65}, 140 ${H * 0.45}, ${W} ${H * 0.18}`}
            fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="1" />
          {/* Mean line */}
          <path d={`M 0 ${H * 0.72} C 70 ${H * 0.72}, 140 ${H * 0.6}, ${W} ${H * 0.37}`}
            fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          {/* Year labels */}
          {[0, 1, 2, 3].map((i) => (
            <text key={i} x={i * (W / 3)} y={H - 4} textAnchor="middle"
              fill="rgba(255,255,255,0.25)" fontSize="8">
              Yr {i * 10}
            </text>
          ))}
          {/* Today dot */}
          <circle cx="0" cy={H * 0.72} r="4" fill="#a855f7" />
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Mean Return", value: "+18.4%", color: "#a855f7" },
          { label: "Sharpe", value: "1.84", color: "#00D09C" },
          { label: "VaR 95%", value: "−8.3%", color: "#f59e0b" },
        ].map((m, i) => (
          <div key={i} className="rounded-xl py-2.5 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${m.color}20` }}>
            <p className="text-sm font-black" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[9px] text-white/35 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResearchMockup() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl p-4" style={{ background: "rgba(0,184,255,0.06)", border: "1px solid rgba(0,184,255,0.2)" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-black text-white text-base leading-tight">RELIANCE.NS</p>
            <p className="text-xs text-white/40 mt-0.5">Reliance Industries Ltd.</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-white text-sm">₹2,847</p>
            <p className="text-xs font-semibold" style={{ color: "#00D09C" }}>+2.3%</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: "AI Signal", value: "Strong Buy", color: "#00D09C" },
            { label: "Fundamentals", value: "Solid", color: "#00b8ff" },
            { label: "Valuation", value: "Fairly Priced", color: "#f59e0b" },
            { label: "Momentum", value: "Positive", color: "#a855f7" },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-white/45">{r.label}</span>
              <span className="text-xs font-semibold" style={{ color: r.color }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1.5">AI Summary</p>
        <p className="text-xs text-white/55 leading-relaxed">
          Strong digital segment growth (+43% YoY). Jio Financial expansion on track. Management guidance positive for FY26.
        </p>
      </div>
    </div>
  );
}

function NewsMockup() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: "NIFTY 50",   value: "24,850.30", change: "+0.55%", up: true  },
          { name: "S&P 500",    value: "5,612.00",  change: "+0.43%", up: true  },
          { name: "NASDAQ",     value: "19,240.10", change: "−0.12%", up: false },
          { name: "SENSEX",     value: "81,320.45", change: "+0.60%", up: true  },
        ].map((idx, i) => (
          <div key={i} className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[10px] text-white/35 mb-0.5">{idx.name}</p>
            <p className="text-sm font-bold text-white leading-tight">{idx.value}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: idx.up ? "#00D09C" : "#ef4444" }}>
              {idx.change}
            </p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { name: "Gold",      value: "₹7,412/g",   up: true  },
          { name: "BTC",       value: "₹73.2L",      up: true  },
          { name: "Crude",     value: "₹6,890/bbl", up: false },
        ].map((c, i) => (
          <div key={i} className="rounded-xl px-2 py-2.5 text-center"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.14)" }}>
            <p className="text-[9px] text-white/35">{c.name}</p>
            <p className="text-[11px] font-bold mt-0.5" style={{ color: c.up ? "#f59e0b" : "#ef4444" }}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCKUPS = [AnalyseMockup, SimulateMockup, ResearchMockup, NewsMockup];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeaturesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  // Canvas animated grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    let offset = 0;
    const size = 40;
    const animate = () => {
      offset = (offset + 0.2) % size;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(0,208,156,0.04)";
      ctx.lineWidth = 1;
      for (let x = (offset % size) - size; x < canvas.width + size; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = (offset % size) - size; y < canvas.height + size; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,208,156,0.06)";
      for (let x = (offset % size) - size; x < canvas.width + size; x += size) {
        for (let y = (offset % size) - size; y < canvas.height + size; y += size) {
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  const switchTab = (i: number) => {
    if (i === active) return;
    setVisible(false);
    setTimeout(() => { setActive(i); setVisible(true); }, 160);
  };

  const feat = FEATURES[active];
  const MockupComponent = MOCKUPS[active];

  return (
    <div className="min-h-screen" style={{ background: "#080b10", color: "#e4e8f0" }}>

      {/* Top bar */}
      <div
        className="sticky top-0 z-50 border-b flex items-center justify-between px-6 md:px-12 h-14"
        style={{ borderColor: "rgba(0,208,156,0.12)", background: "rgba(8,11,16,0.92)", backdropFilter: "blur(12px)" }}
      >
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#00D09C" }}>
            <TrendingUp className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm text-white">DiversiFi</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link to="/algo-trading" className="text-xs font-semibold flex items-center gap-1" style={{ color: "#00D09C" }}>
            <Cpu className="w-3 h-3" /> Algo Trading
          </Link>
          <Link to="/reports" className="text-xs text-white/40 hover:text-white/70 transition-colors">Reports</Link>
          <Link to="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">← Home</Link>
        </div>
      </div>

      {/* Hero */}
      <div ref={heroRef} className="relative overflow-hidden px-6 md:px-12 py-16 md:py-20">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,208,156,0.06) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6"
            style={{ borderColor: "rgba(0,208,156,0.3)", background: "rgba(0,208,156,0.07)", color: "#00D09C" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C] animate-pulse" />
            Four tools · One platform
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
            Everything you need for<br />
            <span style={{ color: "#00D09C" }}>smarter investing</span>
          </h1>
          <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            From portfolio health analysis to global market intelligence - built for Indian retail investors, powered by AI.
          </p>
        </div>
      </div>

      {/* Feature selector */}
      <div className="px-6 md:px-12 pb-2 max-w-4xl mx-auto">
        <div
          className="relative flex p-1.5 rounded-2xl gap-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Sliding pill */}
          <div
            className="absolute inset-y-1.5 rounded-xl pointer-events-none"
            style={{
              left: `calc(${active * 25}% + 6px)`,
              width: "calc(25% - 3px)",
              background: feat.accentDim,
              border: `1px solid ${feat.accentBorder}`,
              transition: "left 0.28s cubic-bezier(.4,0,.2,1), background 0.28s, border-color 0.28s",
            }}
          />
          {FEATURES.map((f, i) => (
            <button
              key={f.id}
              onClick={() => switchTab(i)}
              className="flex-1 relative z-10 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-colors duration-200"
              style={{ color: active === i ? f.accent : "rgba(228,232,240,0.32)" }}
            >
              <f.Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature content */}
      <div className="px-6 md:px-12 py-10 max-w-4xl mx-auto">
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}
        >
          <div className="grid md:grid-cols-2 gap-8 items-start">

            {/* Left: text */}
            <div className="space-y-6">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3"
                  style={{ background: feat.accentDim, color: feat.accent, border: `1px solid ${feat.accentBorder}` }}
                >
                  <feat.Icon className="w-3 h-3" />
                  {feat.badge}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight whitespace-pre-line">
                  {feat.headline}
                </h2>
                <p className="text-sm text-white/50 mt-3 leading-relaxed">{feat.sub}</p>
              </div>

              {/* Capabilities */}
              <div>
                <p className="text-[10px] font-bold tracking-widest text-white/25 uppercase mb-3">Capabilities</p>
                <ul className="space-y-2.5">
                  {feat.capabilities.map((cap, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/65">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: feat.accentDim, border: `1px solid ${feat.accentBorder}` }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: feat.accent }} />
                      </div>
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data Sources */}
              <div>
                <p className="text-[10px] font-bold tracking-widest text-white/25 uppercase mb-2.5">Data Sources</p>
                <div className="flex flex-wrap gap-2">
                  {feat.sources.map((src) => {
                    const color = SOURCE_COLORS[src.type as SourceType];
                    return (
                      <span
                        key={src.name}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                        {src.name}
                        <span className="text-[9px] opacity-60 font-normal">{src.type}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-3">
                {feat.stats.map((s, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-xl px-3 py-3 text-center"
                    style={{ background: feat.accentDim, border: `1px solid ${feat.accentBorder}` }}
                  >
                    <p className="text-lg font-black" style={{ color: feat.accent }}>{s.value}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                to={feat.cta.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-black transition-opacity hover:opacity-85"
                style={{ background: feat.accent }}
              >
                {feat.cta.label}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: mockup */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: `1px solid ${feat.accentBorder}`,
                boxShadow: `0 0 40px ${feat.accentDim}`,
              }}
            >
              <div
                className="flex items-center gap-1.5 mb-4 pb-3"
                style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: feat.accent }} />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{feat.label} · Preview</span>
              </div>
              <MockupComponent />
            </div>

          </div>
        </div>
      </div>

      {/* Quick-nav strip */}
      <div
        className="mx-6 md:mx-12 mb-10 rounded-2xl p-6 max-w-4xl md:mx-auto"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-bold text-white/25 uppercase tracking-wider mb-4">Explore All Features</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FEATURES.map((f, i) => (
            <Link
              key={f.id}
              to={f.cta.href}
              className="flex flex-col gap-1.5 rounded-xl p-3 transition-all"
              style={{ background: i === active ? f.accentDim : "rgba(255,255,255,0.03)", border: `1px solid ${i === active ? f.accentBorder : "rgba(255,255,255,0.06)"}` }}
            >
              <f.Icon className="w-4 h-4" style={{ color: f.accent }} />
              <span className="text-xs font-semibold text-white/80">{f.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer
        className="border-t px-6 md:px-12 py-6"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#00D09C" }}>
              <TrendingUp className="w-3 h-3 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-white">DiversiFi</span>
            <span className="text-white/25 text-xs">© 2025</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <Link to="/" className="text-xs text-white/35 hover:text-white/65 transition-colors">Home</Link>
            {/* <Link to="/algo-trading" className="text-xs font-semibold flex items-center gap-1" style={{ color: "#00D09C" }}>
              <Cpu className="w-3 h-3" /> Algo Trading
            </Link> */}
            <a href="/financial-glossary.html" className="text-xs text-white/35 hover:text-white/65 transition-colors">Glossary</a>
            <Link to="/reports" className="text-xs text-white/35 hover:text-white/65 transition-colors">Reports</Link>
            <Link to="/privacy" className="text-xs text-white/35 hover:text-white/65 transition-colors">Privacy</Link>
          </div>
        </div>
        <p className="text-[10px] text-white/20 mt-4 max-w-4xl mx-auto">
          For academic and research purposes only. Not financial or investment advice.
        </p>
      </footer>
    </div>
  );
}
