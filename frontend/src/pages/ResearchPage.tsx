import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Flame, Snowflake, Info, X, BarChart3, BarChart2 } from "lucide-react";
import { ResearchNav } from "@/components/ResearchNav";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Breakdown { technical: number; momentum: number; fundamental: number; sentiment: number; }
interface Metrics {
  rsi: number | null; macd_bullish: boolean; above_20dma: boolean; above_50dma: boolean;
  ret_5d: number | null; ret_30d: number | null; pe: number | null; eps: number | null; vol_vs_avg: number | null;
  recent_headlines: string[];
}
interface StockSignal {
  symbol: string; name: string; sector: string; price: number | null; change_pct: number | null;
  signal_score: number; signal: "HOT" | "NEUTRAL" | "COLD"; breakdown: Breakdown; metrics: Metrics;
}
interface SectorItem { sector: string; price: number; change_pct: number; }
interface PulseData { success: boolean; hot: StockSignal[]; cold: StockSignal[]; sectors: SectorItem[]; }

interface MfBreakdown { returns_1y: number; returns_3m: number; momentum_1m: number; consistency: number; }
interface MfSignal {
  code: number; name: string; category: string; amc: string;
  nav: number; change_pct: number; ret_1m: number; ret_3m: number; ret_6m: number; ret_1y: number | null;
  signal_score: number; signal: "HOT" | "NEUTRAL" | "COLD"; breakdown: MfBreakdown;
}
interface CategoryItem { category: string; nav: number; change_pct: number; }
interface MfPulseData { success: boolean; hot: MfSignal[]; cold: MfSignal[]; categories: CategoryItem[]; }

type Mode = "stocks" | "mf";

// ── Helpers ────────────────────────────────────────────────────────────────────

const scoreColor = (s: number) => s >= 65 ? "#00D09C" : s <= 40 ? "#EF4444" : "#F59E0B";
const heatBg = (pct: number) => {
  if (pct >  1.5) return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
  if (pct >  0)   return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
  if (pct < -1.5) return "bg-red-500/20 border-red-500/30 text-red-400";
  if (pct <  0)   return "bg-red-500/10 border-red-500/20 text-red-500";
  return "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50";
};
const fmt = (n: number | null) => n == null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const retLabel = (n: number | null) => n == null ? "N/A" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

// ── Shared components ──────────────────────────────────────────────────────────

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-gray-500 dark:text-white/40">{label}</span>
        <span className="font-bold text-gray-700 dark:text-white/70">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${(value / max) * 100}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
    </div>
  );
}

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

// ── Stock components ───────────────────────────────────────────────────────────

function StockDetailModal({ stock, onClose }: { stock: StockSignal; onClose: () => void }) {
  const m = stock.metrics;
  const color = scoreColor(stock.signal_score);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{stock.name}</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color, borderColor: color, backgroundColor: `${color}15` }}>{stock.signal}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">{stock.symbol} · {stock.sector}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-white/50" />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
          <div className="text-3xl font-black" style={{ color }}>{stock.signal_score}</div>
          <div><p className="text-xs text-gray-500 dark:text-white/40">Signal Score</p><p className="text-xs font-medium text-gray-700 dark:text-white/60">out of 100</p></div>
          <div className="ml-auto text-right">
            <p className="text-base font-bold text-gray-900 dark:text-white">₹{fmt(stock.price)}</p>
            <p className={`text-xs font-semibold ${(stock.change_pct ?? 0) >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {(stock.change_pct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(stock.change_pct ?? 0).toFixed(2)}% (5d)
            </p>
          </div>
        </div>
        <div className="space-y-2.5 mb-5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">Score Breakdown</p>
          <ScoreBar label="Technical (RSI + MACD + DMA)" value={stock.breakdown.technical}   max={35} color="#6366f1" />
          <ScoreBar label="Momentum (5d + 30d returns)"  value={stock.breakdown.momentum}    max={25} color="#00D09C" />
          <ScoreBar label="Fundamental (PE + EPS)"       value={stock.breakdown.fundamental} max={20} color="#F59E0B" />
          <ScoreBar label="Sentiment (News headlines)"   value={stock.breakdown.sentiment}   max={20} color="#EC4899" />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: "RSI (14)",   value: m.rsi ?? "—" },
            { label: "30-day Ret", value: m.ret_30d == null ? "—" : `${m.ret_30d > 0 ? "+" : ""}${m.ret_30d}%` },
            { label: "Vol vs Avg", value: m.vol_vs_avg == null ? "—" : `${m.vol_vs_avg.toFixed(2)}×` },
            { label: "PE Ratio",   value: m.pe ?? "N/A" },
            { label: "EPS",        value: m.eps ?? "N/A" },
            { label: "MACD",       value: m.macd_bullish ? "Bullish" : "Bearish" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30">{label}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">{String(value)}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {[{ label: "Above 20 DMA", ok: m.above_20dma }, { label: "Above 50 DMA", ok: m.above_50dma }, { label: "MACD Bullish", ok: m.macd_bullish }].map(({ label, ok }) => (
            <span key={label} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${ok ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
              {ok ? "✓" : "✗"} {label}
            </span>
          ))}
        </div>
        {m.recent_headlines.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-2">Recent Headlines</p>
            <div className="space-y-1.5">{m.recent_headlines.map((h, i) => <p key={i} className="text-xs text-gray-600 dark:text-white/50 leading-snug">· {h}</p>)}</div>
          </div>
        )}
        <div className="flex items-start gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
          <Info className="w-3.5 h-3.5 text-gray-400 dark:text-white/30 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-400 dark:text-white/30 leading-relaxed">Score = Technical (35) + Momentum (25) + Fundamental (20) + Sentiment (20). Sources: yfinance, NewsService.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StockCard({ stock, delay = 0 }: { stock: StockSignal; delay?: number }) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(stock.signal_score);
  const up    = (stock.change_pct ?? 0) >= 0;
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
        className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 hover:border-[#00D09C]/40 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{stock.name}</p>
            <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{stock.symbol} · {stock.sector}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">₹{fmt(stock.price)}</p>
            <p className={`text-[11px] font-semibold ${up ? "text-emerald-500" : "text-red-400"}`}>{up ? "▲" : "▼"} {Math.abs(stock.change_pct ?? 0).toFixed(2)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl font-black tabular-nums" style={{ color }}>{stock.signal_score}</span>
          <div className="flex-1">
            <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={{ width: 0 }} animate={{ width: `${stock.signal_score}%` }} transition={{ duration: 0.7, ease: "easeOut", delay }} />
            </div>
            <p className="text-[9px] text-gray-400 dark:text-white/30 mt-0.5">Signal score / 100</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[{ k: "Tech", v: stock.breakdown.technical, max: 35 }, { k: "Mom", v: stock.breakdown.momentum, max: 25 }, { k: "Fund", v: stock.breakdown.fundamental, max: 20 }, { k: "Sent", v: stock.breakdown.sentiment, max: 20 }].map(({ k, v, max }) => (
            <div key={k} className="text-center">
              <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-0.5"><div className="h-full rounded-full bg-[#00D09C]/70" style={{ width: `${(v / max) * 100}%` }} /></div>
              <p className="text-[9px] text-gray-400 dark:text-white/25">{k}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {[
            { label: `RSI ${stock.metrics.rsi ?? "—"}`, ok: (stock.metrics.rsi ?? 0) >= 50 && (stock.metrics.rsi ?? 0) <= 70 },
            { label: stock.metrics.macd_bullish ? "MACD ↑" : "MACD ↓", ok: stock.metrics.macd_bullish },
            { label: "20 DMA", ok: stock.metrics.above_20dma },
          ].map(({ label, ok }) => (
            <span key={label} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${ok ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{label}</span>
          ))}
        </div>
        <button onClick={() => setOpen(true)} className="w-full text-[10px] font-bold text-[#00D09C] hover:underline text-left">View full breakdown →</button>
      </motion.div>
      <AnimatePresence>{open && <StockDetailModal stock={stock} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

function SectorHeatmap({ sectors, loading }: { sectors: SectorItem[]; loading: boolean }) {
  if (loading) return <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>;
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {sectors.map((s, i) => (
        <motion.div key={s.sector} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
          className={`rounded-xl border p-3 text-center ${heatBg(s.change_pct)}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide leading-tight">{s.sector}</p>
          <p className="text-sm font-black mt-1 tabular-nums">{s.change_pct >= 0 ? "+" : ""}{s.change_pct.toFixed(2)}%</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── MF components ──────────────────────────────────────────────────────────────

function MfDetailModal({ mf, onClose }: { mf: MfSignal; onClose: () => void }) {
  const color = scoreColor(mf.signal_score);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{mf.name}</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color, borderColor: color, backgroundColor: `${color}15` }}>{mf.signal}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">{mf.amc} · {mf.category}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-gray-500 dark:text-white/50" />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
          <div className="text-3xl font-black" style={{ color }}>{mf.signal_score}</div>
          <div><p className="text-xs text-gray-500 dark:text-white/40">Signal Score</p><p className="text-xs font-medium text-gray-700 dark:text-white/60">out of 100</p></div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-gray-400 dark:text-white/40">NAV</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">₹{mf.nav.toFixed(4)}</p>
            <p className={`text-xs font-semibold ${mf.change_pct >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {mf.change_pct >= 0 ? "▲" : "▼"} {Math.abs(mf.change_pct).toFixed(2)}% (1d)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "1M Return", value: retLabel(mf.ret_1m), good: mf.ret_1m >= 0 },
            { label: "3M Return", value: retLabel(mf.ret_3m), good: mf.ret_3m >= 0 },
            { label: "6M Return", value: retLabel(mf.ret_6m), good: mf.ret_6m >= 0 },
            { label: "1Y Return", value: retLabel(mf.ret_1y), good: (mf.ret_1y ?? 0) >= 0 },
          ].map(({ label, value, good }) => (
            <div key={label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30">{label}</p>
              <p className={`text-sm font-bold mt-0.5 ${value === "N/A" ? "text-gray-400" : good ? "text-emerald-500" : "text-red-400"}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2.5 mb-5">
          <p className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">Score Breakdown</p>
          <ScoreBar label="1Y Returns: long-term performance"      value={mf.breakdown.returns_1y}  max={40} color="#6366f1" />
          <ScoreBar label="3M Returns: recent trend"               value={mf.breakdown.returns_3m}  max={20} color="#00D09C" />
          <ScoreBar label="1M Momentum: short-term direction"      value={mf.breakdown.momentum_1m} max={15} color="#F59E0B" />
          <ScoreBar label="Consistency: positive across horizons"  value={mf.breakdown.consistency} max={25} color="#EC4899" />
        </div>
        <div className="flex items-start gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
          <Info className="w-3.5 h-3.5 text-gray-400 dark:text-white/30 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-400 dark:text-white/30 leading-relaxed">Score = 1Y Returns (40) + 3M Returns (20) + 1M Momentum (15) + Consistency (25). Source: mfapi.in NAV data.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MfCard({ mf, delay = 0 }: { mf: MfSignal; delay?: number }) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(mf.signal_score);
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
        className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 hover:border-[#00D09C]/40 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{mf.name}</p>
            <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{mf.amc} · {mf.category}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 dark:text-white/40">NAV</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">₹{mf.nav.toFixed(2)}</p>
            <p className={`text-[11px] font-semibold ${mf.change_pct >= 0 ? "text-emerald-500" : "text-red-400"}`}>{mf.change_pct >= 0 ? "▲" : "▼"} {Math.abs(mf.change_pct).toFixed(2)}% (1d)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl font-black tabular-nums" style={{ color }}>{mf.signal_score}</span>
          <div className="flex-1">
            <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={{ width: 0 }} animate={{ width: `${mf.signal_score}%` }} transition={{ duration: 0.7, ease: "easeOut", delay }} />
            </div>
            <p className="text-[9px] text-gray-400 dark:text-white/30 mt-0.5">Signal score / 100</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[{ k: "1Y", v: mf.breakdown.returns_1y, max: 40 }, { k: "3M", v: mf.breakdown.returns_3m, max: 20 }, { k: "1M", v: mf.breakdown.momentum_1m, max: 15 }, { k: "Con", v: mf.breakdown.consistency, max: 25 }].map(({ k, v, max }) => (
            <div key={k} className="text-center">
              <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-0.5"><div className="h-full rounded-full bg-[#00D09C]/70" style={{ width: `${(v / max) * 100}%` }} /></div>
              <p className="text-[9px] text-gray-400 dark:text-white/25">{k}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {[
            { label: `1M ${retLabel(mf.ret_1m)}`, ok: mf.ret_1m >= 0 },
            { label: `3M ${retLabel(mf.ret_3m)}`, ok: mf.ret_3m >= 0 },
            { label: mf.ret_1y != null ? `1Y ${retLabel(mf.ret_1y)}` : "1Y N/A", ok: (mf.ret_1y ?? 0) >= 0 },
          ].map(({ label, ok }) => (
            <span key={label} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${ok ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{label}</span>
          ))}
        </div>
        <button onClick={() => setOpen(true)} className="w-full text-[10px] font-bold text-[#00D09C] hover:underline text-left">View full breakdown →</button>
      </motion.div>
      <AnimatePresence>{open && <MfDetailModal mf={mf} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

function CategoryHeatmap({ categories, loading }: { categories: CategoryItem[]; loading: boolean }) {
  if (loading) return <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>;
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {categories.map((c, i) => (
        <motion.div key={c.category} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
          className={`rounded-xl border p-3 text-center ${heatBg(c.change_pct)}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide leading-tight">{c.category}</p>
          <p className="text-sm font-black mt-1 tabular-nums">{c.change_pct >= 0 ? "+" : ""}{c.change_pct.toFixed(2)}%</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Disclaimer ─────────────────────────────────────────────────────────────────

function Disclaimer({ mode }: { mode: Mode }) {
  return (
    <p className="text-[10px] text-gray-400 dark:text-white/25 text-center py-6 px-4 max-w-2xl mx-auto leading-relaxed">
      ⚠ AI signals are based on {mode === "stocks" ? "technical, fundamental and sentiment data" : "NAV history and return consistency"}.
      They are <strong>not financial advice</strong>. Past performance does not guarantee future results.
      Always consult a SEBI-registered advisor before investing.
    </p>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [mode,        setMode]        = useState<Mode>("stocks");
  const [stockData,   setStockData]   = useState<PulseData | null>(null);
  const [mfData,      setMfData]      = useState<MfPulseData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const loadStocks = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const r = await fetch("/api/research/pulse");
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      const d = await r.json();
      if (d.success) {
        setStockData(d);
        setLastUpdated(new Date());
      } else {
        setError(d.error ?? "Failed to load market data");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch market data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMf = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const r = await fetch("/api/research/mf/pulse");
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      const d = await r.json();
      if (d.success) {
        setMfData(d);
        setLastUpdated(new Date());
      } else {
        setError(d.error ?? "Failed to load MF data");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch MF data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStocks(true); }, [loadStocks]);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setError(null);
    if (m === "mf" && !mfData) { loadMf(true); return; }
    if (m === "stocks" && !stockData) { loadStocks(true); return; }
    setLoading(false);
  };

  const refresh = () => mode === "stocks" ? loadStocks(false) : loadMf(false);
  const isLoading = loading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ResearchNav />

      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 dark:text-white">
            {mode === "stocks" ? "Market Pulse" : "MF Pulse"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
            {mode === "stocks" ? "AI signal scores across Nifty 50" : "AI return scores across 20 Indian MFs"}
            {" · "}{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : isLoading ? "Fetching live data, please wait…" : "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle mode={mode} onChange={handleModeChange} />
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-6 md:px-8 py-6 space-y-8 max-w-7xl mx-auto">

        {/* Error banner */}
        {error && !isLoading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-red-400 text-sm font-semibold">Error:</span>
            <span className="text-red-400 text-sm">{error}</span>
            <button onClick={refresh} className="ml-auto text-xs text-red-400 underline shrink-0">Retry</button>
          </div>
        )}

        {/* Heatmap */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            {mode === "stocks"
              ? <BarChart3 className="w-4 h-4 text-[#00D09C]" />
              : <BarChart2 className="w-4 h-4 text-[#00D09C]" />}
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {mode === "stocks" ? "Sector Performance Today" : "Category Performance Today"}
            </h2>
          </div>
          {mode === "stocks"
            ? <SectorHeatmap   sectors={stockData?.sectors ?? []}       loading={isLoading} />
            : <CategoryHeatmap categories={mfData?.categories ?? []}    loading={isLoading} />}
        </section>

        {/* Methodology */}
        <div className="bg-[#00D09C]/5 border border-[#00D09C]/20 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#00D09C] mb-1">How We Score</p>
            {mode === "stocks" ? (
              <p className="text-xs text-gray-600 dark:text-white/50 leading-relaxed">
                <strong>·&nbsp; Technical (35 pts):</strong> RSI(14), price vs 20/50-day MA, MACD crossover &nbsp;<br/>
                <strong>·&nbsp; Momentum (25 pts):</strong> 5-day & 30-day returns, volume surge &nbsp;<br/>
                <strong>·&nbsp; Fundamental (20 pts):</strong> Trailing PE quality, EPS sign &nbsp;·<br/>
                <strong>·&nbsp; Sentiment (20 pts):</strong> News headline polarity. &nbsp;Score ≥65 = HOT · ≤40 = COLD.
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-white/50 leading-relaxed">
                <strong>·&nbsp; 1Y Returns (40 pts):</strong> Long-term NAV performance &nbsp;<br/>
                <strong>·&nbsp; 3M Returns (20 pts):</strong> Recent trend &nbsp;<br/>
                <strong>·&nbsp; 1M Momentum (15 pts):</strong> Short-term direction &nbsp;<br/>
                <strong>·&nbsp; Consistency (25 pts):</strong> Positive returns across all horizons. &nbsp;Score ≥65 = HOT · ≤40 = COLD.
              </p>
            )}
          </div>
        </div>

        {/* Hot + Cold */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Hot Signals</h2>
              <span className="text-[10px] text-gray-400 dark:text-white/30">Score ≥ 65</span>
            </div>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>
            ) : mode === "stocks" ? (
              (stockData?.hot ?? []).length === 0
                ? <div className="text-center py-10 text-sm text-gray-400 dark:text-white/30">No hot signals right now</div>
                : <div className="space-y-3">{(stockData?.hot ?? []).map((s, i) => <StockCard key={s.symbol} stock={s} delay={i * 0.08} />)}</div>
            ) : (
              (mfData?.hot ?? []).length === 0
                ? <div className="text-center py-10 text-sm text-gray-400 dark:text-white/30">No hot signals right now</div>
                : <div className="space-y-3">{(mfData?.hot ?? []).map((m, i) => <MfCard key={m.code} mf={m} delay={i * 0.08} />)}</div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Snowflake className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Cold Signals</h2>
              <span className="text-[10px] text-gray-400 dark:text-white/30">Score ≤ 40</span>
            </div>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>
            ) : mode === "stocks" ? (
              (stockData?.cold ?? []).length === 0
                ? <div className="text-center py-10 text-sm text-gray-400 dark:text-white/30">No cold signals right now</div>
                : <div className="space-y-3">{(stockData?.cold ?? []).map((s, i) => <StockCard key={s.symbol} stock={s} delay={i * 0.08} />)}</div>
            ) : (
              (mfData?.cold ?? []).length === 0
                ? <div className="text-center py-10 text-sm text-gray-400 dark:text-white/30">No cold signals right now</div>
                : <div className="space-y-3">{(mfData?.cold ?? []).map((m, i) => <MfCard key={m.code} mf={m} delay={i * 0.08} />)}</div>
            )}
          </section>
        </div>

        <Disclaimer mode={mode} />
      </div>
    </div>
  );
}
