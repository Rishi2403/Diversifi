import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Info, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { ResearchNav } from "@/components/ResearchNav";

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = "stocks" | "mf";

interface StockResult {
  success: boolean; error?: string;
  symbol: string; name: string; sector: string;
  price: number; change_pct: number;
  signal_score: number; signal: string;
  action: string; confidence: string;
  breakdown: { technical: number; momentum: number; fundamental: number; sentiment: number };
  metrics: {
    rsi: number; macd_bullish: boolean; above_20dma: boolean; above_50dma: boolean;
    ret_5d: number; ret_30d: number; pe: number | null; eps: number;
    vol_vs_avg: number; recent_headlines: string[];
  };
  company_info: {
    sector: string; industry: string; market_cap: number | null;
    week52_high: number | null; week52_low: number | null;
    avg_volume: number | null; beta: number | null; description: string;
  };
}

interface MfResult {
  success: boolean; error?: string;
  code: number; name: string; category: string; amc: string; scheme_name: string;
  nav: number; change_pct: number;
  ret_1m: number; ret_3m: number; ret_6m: number; ret_1y: number | null;
  signal_score: number; signal: string;
  action: string; confidence: string;
  breakdown: { returns_1y: number; returns_3m: number; momentum_1m: number; consistency: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt   = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCr = (n: number | null) =>
  n == null ? "N/A" : n >= 1e12 ? `₹${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `₹${(n / 1e9).toFixed(2)}B` : n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : `₹${n.toLocaleString()}`;
const retLabel = (n: number | null) => n == null ? "N/A" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

const ACTION_STYLE: Record<string, { bg: string; text: string; border: string; icon: typeof TrendingUp }> = {
  "Strong Buy": { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", icon: TrendingUp },
  "Buy":        { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", icon: TrendingUp },
  "Hold":       { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   icon: AlertTriangle },
  "Caution":    { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20",  icon: AlertTriangle },
  "Avoid":      { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",     icon: TrendingDown },
};
const scoreColor = (s: number) => s >= 65 ? "#00D09C" : s <= 40 ? "#EF4444" : "#F59E0B";

// ── Shared components ──────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold shrink-0">
      {(["stocks", "mf"] as Mode[]).map((m) => (
        <button key={m} onClick={() => onChange(m)}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            mode === m
              ? "bg-white dark:bg-[#00D09C] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70"
          }`}
        >{m === "stocks" ? "Stocks" : "Mutual Funds"}</button>
      ))}
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-white/50 font-medium">{label}</span>
        <span className="font-bold text-gray-700 dark:text-white/70">{value} / {max}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${(value / max) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
      </div>
    </div>
  );
}

// ── Stock analysis display ─────────────────────────────────────────────────────

function StockAnalysisDisplay({ r }: { r: StockResult }) {
  const style = ACTION_STYLE[r.action] ?? ACTION_STYLE["Hold"];
  const Icon  = style.icon;
  const color = scoreColor(r.signal_score);
  const m     = r.metrics;
  const ci    = r.company_info;
  const up    = r.change_pct >= 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className={`rounded-2xl border p-5 ${style.bg} ${style.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-5 h-5 ${style.text}`} />
              <span className={`text-2xl font-black ${style.text}`}>{r.action}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/50">
              <span className="font-semibold text-gray-800 dark:text-white">{r.name}</span>
              &nbsp;·&nbsp;{r.symbol}&nbsp;·&nbsp;{ci.industry || r.sector}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">₹{fmt(r.price)}</p>
            <p className={`text-sm font-semibold ${up ? "text-emerald-500" : "text-red-400"}`}>{up ? "▲" : "▼"} {Math.abs(r.change_pct).toFixed(2)}% (5-day)</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10 flex-wrap">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-widest">Signal Score</p>
            <p className="text-3xl font-black tabular-nums" style={{ color }}>{r.signal_score}<span className="text-sm font-normal text-gray-400 dark:text-white/30">/100</span></p>
          </div>
          <div className="flex-1 min-w-32">
            <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: color, width: `${r.signal_score}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-widest">Confidence</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white">{r.confidence}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">Score Breakdown</p>
        <ScoreBar label="Technical — RSI, MACD, DMA crossover"  value={r.breakdown.technical}   max={35} color="#6366f1" />
        <ScoreBar label="Momentum — 5d & 30d returns, volume"   value={r.breakdown.momentum}    max={25} color="#00D09C" />
        <ScoreBar label="Fundamental — PE ratio, EPS sign"      value={r.breakdown.fundamental} max={20} color="#F59E0B" />
        <ScoreBar label="Sentiment — News headline polarity"    value={r.breakdown.sentiment}   max={20} color="#EC4899" />
      </div>

      <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
        <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">Technical Indicators</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: `RSI ${m.rsi}`,                                        ok: m.rsi >= 45 && m.rsi <= 72 },
            { label: `MACD ${m.macd_bullish ? "Bullish ↑" : "Bearish ↓"}`, ok: m.macd_bullish },
            { label: "Above 20 DMA",                                         ok: m.above_20dma },
            { label: "Above 50 DMA",                                         ok: m.above_50dma },
            { label: `Vol ×${m.vol_vs_avg.toFixed(1)} avg`,                  ok: m.vol_vs_avg >= 1 },
            { label: `30d: ${m.ret_30d > 0 ? "+" : ""}${m.ret_30d}%`,       ok: m.ret_30d >= 0 },
          ].map(({ label, ok }) => (
            <span key={label} className={`text-xs font-semibold px-3 py-1 rounded-full border ${ok ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
              {ok ? "✓" : "✗"} {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">Fundamental</p>
          <div className="space-y-2">
            {[
              { label: "Market Cap", value: fmtCr(ci.market_cap) },
              { label: "PE Ratio",   value: m.pe != null ? m.pe : "N/A" },
              { label: "EPS (TTM)", value: m.eps != null ? `₹${m.eps}` : "N/A" },
              { label: "Beta",       value: ci.beta != null ? ci.beta.toFixed(2) : "N/A" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/40">{label}</span>
                <span className="font-semibold text-gray-800 dark:text-white">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">Price Range</p>
          <div className="space-y-2">
            {[
              { label: "52W High",   value: ci.week52_high != null ? `₹${fmt(ci.week52_high)}` : "N/A" },
              { label: "52W Low",    value: ci.week52_low  != null ? `₹${fmt(ci.week52_low)}`  : "N/A" },
              { label: "Avg Volume", value: ci.avg_volume  != null ? `${(ci.avg_volume / 1e6).toFixed(2)}M` : "N/A" },
              { label: "Sector",     value: ci.sector || r.sector },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/40">{label}</span>
                <span className="font-semibold text-gray-800 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {m.recent_headlines.length > 0 && (
        <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">Recent News Used for Sentiment</p>
          <div className="space-y-2">{m.recent_headlines.map((h, i) => <p key={i} className="text-sm text-gray-600 dark:text-white/50 leading-snug">· {h}</p>)}</div>
        </div>
      )}

      {ci.description && (
        <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2">About</p>
          <p className="text-sm text-gray-600 dark:text-white/50 leading-relaxed">{ci.description}…</p>
        </div>
      )}

      <div className="flex items-start gap-2 p-4 rounded-2xl bg-[#00D09C]/5 border border-[#00D09C]/15">
        <Info className="w-3.5 h-3.5 text-[#00D09C] shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-500 dark:text-white/40 leading-relaxed">
          Data sources: yfinance · NewsService. Score = Technical (35) + Momentum (25) + Fundamental (20) + Sentiment (20).
          Action thresholds: Strong Buy ≥85 · Buy ≥65 · Hold ≥55 · Caution ≥40 · Avoid &lt;40.
        </p>
      </div>
    </motion.div>
  );
}

// ── MF analysis display ────────────────────────────────────────────────────────

function MfAnalysisDisplay({ r }: { r: MfResult }) {
  const style = ACTION_STYLE[r.action] ?? ACTION_STYLE["Hold"];
  const Icon  = style.icon;
  const color = scoreColor(r.signal_score);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className={`rounded-2xl border p-5 ${style.bg} ${style.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-5 h-5 ${style.text}`} />
              <span className={`text-2xl font-black ${style.text}`}>{r.action}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-white/50">
              <span className="font-semibold text-gray-800 dark:text-white">{r.name}</span>
              &nbsp;·&nbsp;{r.amc}&nbsp;·&nbsp;{r.category}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 dark:text-white/40 uppercase tracking-wide">NAV</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">₹{r.nav.toFixed(4)}</p>
            <p className={`text-sm font-semibold ${r.change_pct >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {r.change_pct >= 0 ? "▲" : "▼"} {Math.abs(r.change_pct).toFixed(2)}% (1-day)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10 flex-wrap">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-widest">Signal Score</p>
            <p className="text-3xl font-black tabular-nums" style={{ color }}>{r.signal_score}<span className="text-sm font-normal text-gray-400 dark:text-white/30">/100</span></p>
          </div>
          <div className="flex-1 min-w-32">
            <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: color, width: `${r.signal_score}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-widest">Confidence</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white">{r.confidence}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
        <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-4">Returns</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "1 Month",  value: retLabel(r.ret_1m), good: r.ret_1m >= 0 },
            { label: "3 Months", value: retLabel(r.ret_3m), good: r.ret_3m >= 0 },
            { label: "6 Months", value: retLabel(r.ret_6m), good: r.ret_6m >= 0 },
            { label: "1 Year",   value: retLabel(r.ret_1y), good: (r.ret_1y ?? 0) >= 0 },
          ].map(({ label, value, good }) => (
            <div key={label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30 mb-1">{label}</p>
              <p className={`text-base font-black tabular-nums ${value === "N/A" ? "text-gray-400" : good ? "text-emerald-500" : "text-red-400"}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">Score Breakdown</p>
        <ScoreBar label="1Y Returns — long-term performance"     value={r.breakdown.returns_1y}  max={40} color="#6366f1" />
        <ScoreBar label="3M Returns — recent trend"              value={r.breakdown.returns_3m}  max={20} color="#00D09C" />
        <ScoreBar label="1M Momentum — short-term direction"     value={r.breakdown.momentum_1m} max={15} color="#F59E0B" />
        <ScoreBar label="Consistency — positive across horizons" value={r.breakdown.consistency} max={25} color="#EC4899" />
      </div>

      <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
        <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">Fund Details</p>
        <div className="space-y-2">
          {[
            { label: "Full Scheme Name", value: r.scheme_name || r.name },
            { label: "AMC",             value: r.amc },
            { label: "Category",        value: r.category },
            { label: "Scheme Code",     value: String(r.code) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm gap-4">
              <span className="text-gray-500 dark:text-white/40 shrink-0">{label}</span>
              <span className="font-semibold text-gray-800 dark:text-white text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 p-4 rounded-2xl bg-[#00D09C]/5 border border-[#00D09C]/15">
        <Info className="w-3.5 h-3.5 text-[#00D09C] shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-500 dark:text-white/40 leading-relaxed">
          Data source: mfapi.in NAV history. Score = 1Y Returns (40) + 3M Returns (20) + 1M Momentum (15) + Consistency (25).
          Action thresholds: Strong Buy ≥85 · Buy ≥65 · Hold ≥55 · Caution ≥40 · Avoid &lt;40.
        </p>
      </div>
    </motion.div>
  );
}

// ── Disclaimer ─────────────────────────────────────────────────────────────────

function Disclaimer({ mode }: { mode: Mode }) {
  return (
    <p className="text-[10px] text-gray-400 dark:text-white/25 text-center py-4 px-4 max-w-2xl mx-auto leading-relaxed">
      ⚠ Analysis reflects {mode === "stocks" ? "historical data signals" : "NAV-based return signals"} only.
      It is <strong>not financial advice</strong>. Past signals do not guarantee future performance.
      Always consult a SEBI-registered investment advisor.
    </p>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AnalysePage() {
  const [mode,        setMode]        = useState<Mode>("stocks");
  const [query,       setQuery]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [stockResult, setStockResult] = useState<StockResult | null>(null);
  const [mfResult,    setMfResult]    = useState<MfResult | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setQuery("");
    setError(null);
  };

  const run = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setStockResult(null);
    setMfResult(null);
    try {
      if (mode === "stocks") {
        const r = await fetch("/api/research/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: q.toUpperCase() }),
        });
        const d = await r.json();
        if (d.success) setStockResult(d);
        else setError(d.error || "Analysis failed.");
      } else {
        const r = await fetch("/api/research/mf/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const d = await r.json();
        if (d.success) setMfResult(d);
        else setError(d.error || "Analysis failed.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const STOCK_CHIPS = ["TCS", "RELIANCE", "INFY", "HDFCBANK", "SUNPHARMA", "AXISBANK"];
  const MF_CHIPS    = ["HDFC Top 100", "Axis Bluechip", "Parag Parikh Flexi Cap", "SBI Small Cap", "Quant Small Cap"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ResearchNav />

      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 dark:text-white">
            Analyse {mode === "stocks" ? "a Stock" : "a Mutual Fund"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
            {mode === "stocks"
              ? "Enter any NSE symbol — get a full AI signal breakdown with actionable verdict"
              : "Search by fund name or scheme code — get a return-based signal analysis"}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={handleModeChange} />
      </div>

      <div className="max-w-2xl mx-auto px-6 md:px-8 py-8 space-y-6">

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder={mode === "stocks" ? "e.g. TCS, RELIANCE, INFY, HDFCBANK" : "e.g. HDFC Top 100, Axis Bluechip, 120503"}
              className="w-full pl-10 pr-4 py-3 bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:outline-none focus:border-[#00D09C]/50"
            />
          </div>
          <button onClick={run} disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-[#00D09C] hover:opacity-90 disabled:opacity-50 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Analysing…" : "Analyse"}
          </button>
        </div>

        {/* Quick-pick chips */}
        <div className="flex flex-wrap gap-2">
          {(mode === "stocks" ? STOCK_CHIPS : MF_CHIPS).map((chip) => (
            <button key={chip} onClick={() => setQuery(chip)}
              className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:border-[#00D09C]/40 transition-colors">
              {chip}
            </button>
          ))}
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#00D09C]/5 border border-[#00D09C]/20">
          <Info className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 dark:text-white/50 leading-relaxed">
            {mode === "stocks"
              ? "We compute RSI, MACD, moving averages, price momentum, PE ratio, EPS, and news sentiment — then combine them into a transparent signal score with a Buy/Hold/Avoid verdict."
              : "We fetch NAV history from mfapi.in and compute 1M, 3M, 6M, and 1Y returns, then score consistency and momentum into a transparent signal score with a Buy/Hold/Avoid verdict."}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#00D09C]" />
            <p className="text-sm text-gray-500 dark:text-white/40">
              {mode === "stocks" ? "Fetching market data & running analysis…" : "Fetching NAV history & computing returns…"}
            </p>
          </div>
        )}

        {/* Error */}
        {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

        {/* Result */}
        <AnimatePresence>
          {stockResult && !loading && <StockAnalysisDisplay r={stockResult} />}
          {mfResult    && !loading && <MfAnalysisDisplay    r={mfResult}    />}
        </AnimatePresence>

        <Disclaimer mode={mode} />
      </div>
    </div>
  );
}
