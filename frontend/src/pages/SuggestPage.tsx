import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Loader2, TrendingUp, ChevronDown, Info, Calculator, MessageSquare } from "lucide-react";
import { ResearchNav } from "@/components/ResearchNav";
import { openChatWithContext } from "@/pages/ChatPage";

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode       = "stocks" | "mf";
type InvestType = "lumpsum" | "sip";

interface StockMetrics {
  rsi: number; macd_bullish: boolean; above_20dma: boolean; above_50dma: boolean;
  ret_5d: number; ret_30d: number; pe: number | null; eps: number; vol_vs_avg: number;
}
interface StockSuggestion {
  rank: number; symbol: string; name: string; sector: string;
  price: number; change_pct: number; signal_score: number;
  breakdown: { technical: number; momentum: number; fundamental: number; sentiment: number };
  metrics: StockMetrics; reasons: string;
}
interface MfSuggestion {
  rank: number; code: number; name: string; category: string; amc: string;
  nav: number; change_pct: number; signal_score: number;
  ret_1m: number; ret_3m: number; ret_6m: number; ret_1y: number | null;
  breakdown: { returns_1y: number; returns_3m: number; momentum_1m: number; consistency: number };
  reasons: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const HORIZONS      = ["Short (< 1 yr)", "Medium (1-3 yrs)", "Long (3+ yrs)"];
const RISKS         = ["Conservative", "Moderate", "Aggressive"];
const STOCK_SECTORS = ["Any", "Banking", "IT", "Pharma", "Auto", "FMCG", "Energy", "Metals", "Finance", "Power", "Telecom", "Infrastructure", "Consumer"];
const MF_CATEGORIES = ["Any", "Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "ELSS", "Index", "Sectoral", "Value", "Hybrid"];
const RANK_BADGES   = ["🥇", "🥈", "🥉"];
const RANK_LABELS   = ["Top Pick", "Runner-up", "Third Pick"];

const fmt       = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtAmt    = (n: number) => n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;
const retLabel  = (n: number | null) => n == null ? "N/A" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const scoreColor = (s: number) => s >= 65 ? "#00D09C" : s <= 40 ? "#EF4444" : "#F59E0B";

function expectedReturn(score: number): number {
  if (score >= 80) return 0.20;
  if (score >= 65) return 0.15;
  if (score >= 50) return 0.10;
  return 0.06;
}

function sipCorpus(monthly: number, years: number, annualRate: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

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

function InvestTypeToggle({ value, onChange }: { value: InvestType; onChange: (v: InvestType) => void }) {
  return (
    <div className="flex gap-2">
      {(["lumpsum", "sip"] as InvestType[]).map((v) => (
        <button key={v} onClick={() => onChange(v)}
          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
            value === v
              ? "bg-[#00D09C] text-white border-[#00D09C]"
              : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
          }`}
        >{v === "lumpsum" ? "Lumpsum" : "SIP (Monthly)"}</button>
      ))}
    </div>
  );
}

// ── Projected corpus pill ──────────────────────────────────────────────────────

function CorpusPill({ investType, amount, sipDuration, score }: {
  investType: InvestType; amount: number; sipDuration: number; score: number;
}) {
  if (investType !== "sip" || sipDuration === 0) return null;
  const rate   = expectedReturn(score);
  const corpus = sipCorpus(amount, sipDuration, rate);
  const invested = amount * sipDuration * 12;
  const gain   = corpus - invested;
  return (
    <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-[#00D09C]/8 border border-[#00D09C]/20">
      <Calculator className="w-3.5 h-3.5 text-[#00D09C] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 dark:text-white/30">Projected corpus after {sipDuration}yr · {(rate * 100).toFixed(0)}% p.a. est.</p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-black text-[#00D09C]">{fmtAmt(Math.round(corpus))}</span>
          <span className="text-[10px] text-gray-400 dark:text-white/30">
            invested {fmtAmt(invested)} · gain {fmtAmt(Math.round(gain))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Stock suggestion card ──────────────────────────────────────────────────────

function StockSuggestionCard({ s, delay = 0, investType, sipAmount, sipDuration }: {
  s: StockSuggestion; delay?: number; investType: InvestType; sipAmount: number; sipDuration: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(s.signal_score);
  const up    = s.change_pct >= 0;
  const m     = s.metrics;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2" style={{ backgroundColor: `${color}08` }}>
        <span className="text-lg">{RANK_BADGES[s.rank - 1]}</span>
        <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>{RANK_LABELS[s.rank - 1]}</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color, borderColor: color, backgroundColor: `${color}15` }}>{s.signal_score}/100</span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-base text-gray-900 dark:text-white">{s.name}</p>
            <p className="text-xs text-gray-400 dark:text-white/30">{s.symbol} · {s.sector}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900 dark:text-white tabular-nums">₹{fmt(s.price)}</p>
            <p className={`text-xs font-semibold ${up ? "text-emerald-500" : "text-red-400"}`}>{up ? "▲" : "▼"} {Math.abs(s.change_pct).toFixed(2)}% (5d)</p>
          </div>
        </div>
        <div className="mb-4 space-y-1.5">
          {s.reasons.split("\n").filter(Boolean).map((line, i) => (
            <p key={i} className="text-sm text-gray-700 dark:text-white/70 leading-snug">{line}</p>
          ))}
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/30 mb-1"><span>Signal Strength</span><span>{s.signal_score}/100</span></div>
          <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: color, width: `${s.signal_score}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>
        <CorpusPill investType={investType} amount={sipAmount} sipDuration={sipDuration} score={s.signal_score} />
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-[#00D09C] font-semibold mt-3">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide" : "Show"} metrics
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "RSI (14)",   value: m.rsi },
                  { label: "30d Return", value: `${m.ret_30d > 0 ? "+" : ""}${m.ret_30d}%` },
                  { label: "PE Ratio",   value: m.pe ?? "N/A" },
                  { label: "MACD",       value: m.macd_bullish ? "Bullish ↑" : "Bearish ↓" },
                  { label: "20 DMA",     value: m.above_20dma ? "Above ✓" : "Below ✗" },
                  { label: "50 DMA",     value: m.above_50dma ? "Above ✓" : "Below ✗" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-2 text-center">
                    <p className="text-[9px] text-gray-400 dark:text-white/30">{label}</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-white mt-0.5">{String(value)}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-3">
                {[
                  { k: "Technical",   v: s.breakdown.technical,   max: 35 },
                  { k: "Momentum",    v: s.breakdown.momentum,    max: 25 },
                  { k: "Fundamental", v: s.breakdown.fundamental, max: 20 },
                  { k: "Sentiment",   v: s.breakdown.sentiment,   max: 20 },
                ].map(({ k, v, max }) => (
                  <div key={k}>
                    <div className="flex justify-between text-[9px] text-gray-400 dark:text-white/30 mb-0.5"><span>{k.slice(0, 4)}</span><span>{v}/{max}</span></div>
                    <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#00D09C]/70" style={{ width: `${(v / max) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── MF suggestion card ─────────────────────────────────────────────────────────

function MfSuggestionCard({ s, delay = 0, investType, sipAmount, sipDuration }: {
  s: MfSuggestion; delay?: number; investType: InvestType; sipAmount: number; sipDuration: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(s.signal_score);

  const baseRate = s.ret_1y != null ? s.ret_1y / 100 : expectedReturn(s.signal_score);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2" style={{ backgroundColor: `${color}08` }}>
        <span className="text-lg">{RANK_BADGES[s.rank - 1]}</span>
        <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>{RANK_LABELS[s.rank - 1]}</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color, borderColor: color, backgroundColor: `${color}15` }}>{s.signal_score}/100</span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-base text-gray-900 dark:text-white">{s.name}</p>
            <p className="text-xs text-gray-400 dark:text-white/30">{s.amc} · {s.category}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 dark:text-white/40">NAV</p>
            <p className="font-bold text-gray-900 dark:text-white tabular-nums">₹{s.nav.toFixed(2)}</p>
            <p className={`text-xs font-semibold ${s.change_pct >= 0 ? "text-emerald-500" : "text-red-400"}`}>{s.change_pct >= 0 ? "▲" : "▼"} {Math.abs(s.change_pct).toFixed(2)}% (1d)</p>
          </div>
        </div>
        <div className="mb-4 space-y-1.5">
          {s.reasons.split("\n").filter(Boolean).map((line, i) => (
            <p key={i} className="text-sm text-gray-700 dark:text-white/70 leading-snug">{line}</p>
          ))}
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/30 mb-1"><span>Signal Strength</span><span>{s.signal_score}/100</span></div>
          <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: color, width: `${s.signal_score}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>

        {/* SIP corpus uses actual 1Y return if available, else signal-based estimate */}
        {investType === "sip" && sipDuration > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-[#00D09C]/8 border border-[#00D09C]/20">
            <Calculator className="w-3.5 h-3.5 text-[#00D09C] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 dark:text-white/30">
                Projected corpus after {sipDuration}yr · {(baseRate * 100).toFixed(0)}% p.a.
                {s.ret_1y != null ? " (based on 1Y return)" : " (signal estimate)"}
              </p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-black text-[#00D09C]">{fmtAmt(Math.round(sipCorpus(sipAmount, sipDuration, baseRate)))}</span>
                <span className="text-[10px] text-gray-400 dark:text-white/30">
                  invested {fmtAmt(sipAmount * sipDuration * 12)} · gain {fmtAmt(Math.round(sipCorpus(sipAmount, sipDuration, baseRate) - sipAmount * sipDuration * 12))}
                </span>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-[#00D09C] font-semibold mt-3">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide" : "Show"} returns
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: "1M Return", value: retLabel(s.ret_1m), good: s.ret_1m >= 0 },
                  { label: "3M Return", value: retLabel(s.ret_3m), good: s.ret_3m >= 0 },
                  { label: "6M Return", value: retLabel(s.ret_6m), good: s.ret_6m >= 0 },
                  { label: "1Y Return", value: retLabel(s.ret_1y), good: (s.ret_1y ?? 0) >= 0 },
                ].map(({ label, value, good }) => (
                  <div key={label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-2 text-center">
                    <p className="text-[9px] text-gray-400 dark:text-white/30">{label}</p>
                    <p className={`text-xs font-bold mt-0.5 ${value === "N/A" ? "text-gray-400" : good ? "text-emerald-500" : "text-red-400"}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-3">
                {[
                  { k: "1Y Ret",  v: s.breakdown.returns_1y,  max: 40 },
                  { k: "3M Ret",  v: s.breakdown.returns_3m,  max: 20 },
                  { k: "1M Mom",  v: s.breakdown.momentum_1m, max: 15 },
                  { k: "Consist", v: s.breakdown.consistency, max: 25 },
                ].map(({ k, v, max }) => (
                  <div key={k}>
                    <div className="flex justify-between text-[9px] text-gray-400 dark:text-white/30 mb-0.5"><span>{k}</span><span>{v}/{max}</span></div>
                    <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#00D09C]/70" style={{ width: `${(v / max) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Disclaimer ─────────────────────────────────────────────────────────────────

function Disclaimer({ mode }: { mode: Mode }) {
  return (
    <p className="text-[10px] text-gray-400 dark:text-white/25 text-center py-4 px-4 max-w-2xl mx-auto leading-relaxed">
      ⚠ Suggestions are generated by an AI model using {mode === "stocks" ? "historical data and technical signals" : "NAV history and return analysis"}.
      Projected corpus figures are illustrative estimates, not guarantees.
      This is <strong>not financial advice</strong>. Consult a SEBI-registered advisor before investing.
    </p>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SuggestPage() {
  const navigate = useNavigate();
  const [mode,        setMode]        = useState<Mode>("stocks");
  const [investType,  setInvestType]  = useState<InvestType>("lumpsum");
  const [amount,      setAmount]      = useState(100000);      // lumpsum total
  const [sipAmount,   setSipAmount]   = useState(10000);       // monthly SIP
  const [sipDuration, setSipDuration] = useState(2);          // years
  const [horizon,     setHorizon]     = useState("Medium (1-3 yrs)");
  const [risk,        setRisk]        = useState("Moderate");
  const [sector,      setSector]      = useState("Any");
  const [category,    setCategory]    = useState("Any");
  const [loading,     setLoading]     = useState(false);
  const [stockResults, setStockResults] = useState<StockSuggestion[] | null>(null);
  const [mfResults,    setMfResults]    = useState<MfSuggestion[] | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const horizonKey = horizon.split(" ")[0];

  const handleModeChange = (m: Mode) => { setMode(m); setError(null); };

  const run = async () => {
    setLoading(true);
    setError(null);
    if (mode === "stocks") setStockResults(null);
    else setMfResults(null);
    try {
      const body =
        mode === "stocks"
          ? {
              amount:          investType === "lumpsum" ? amount : sipAmount,
              horizon:         horizonKey,
              risk,
              sector:          sector === "Any" ? null : sector,
              investment_type: investType,
              duration_years:  investType === "sip" ? sipDuration : 0,
            }
          : {
              amount:          investType === "lumpsum" ? amount : sipAmount,
              horizon:         horizonKey,
              risk,
              category:        category === "Any" ? null : category,
              investment_type: investType,
              duration_years:  investType === "sip" ? sipDuration : 0,
            };

      const endpoint = mode === "stocks" ? "/api/research/suggest" : "/api/research/mf/suggest";
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        if (mode === "stocks") setStockResults(d.suggestions);
        else setMfResults(d.suggestions);
      } else {
        setError(d.error || "Failed to generate suggestions.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const results = mode === "stocks" ? stockResults : mfResults;
  const totalInvested = investType === "sip" ? fmtAmt(sipAmount * sipDuration * 12) : fmtAmt(amount);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ResearchNav />

      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-gray-900 dark:text-white">
            AI {mode === "stocks" ? "Stock" : "Mutual Fund"} Suggest
          </h1>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
            {mode === "stocks"
              ? "Tell us your profile - our AI ranks the best-matching stocks from Nifty 50"
              : "Tell us your profile - our AI ranks the best-matching funds from our MF watchlist"}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={handleModeChange} />
      </div>

      <div className="max-w-2xl mx-auto px-6 md:px-8 py-8 space-y-8">

        {/* Input form */}
        <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-6">

          {/* Investment type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Investment Type</label>
            <InvestTypeToggle value={investType} onChange={setInvestType} />
          </div>

          {/* Amount inputs */}
          {investType === "lumpsum" ? (
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest">Lumpsum Amount</label>
                <span className="text-sm font-bold text-[#00D09C]">{fmtAmt(amount)}</span>
              </div>
              <input type="range" min={5000} max={5000000} step={5000} value={amount}
                onChange={(e) => setAmount(Number(e.target.value))} className="w-full accent-[#00D09C]" />
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/25 mt-1"><span>₹5,000</span><span>₹50L</span></div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest">Monthly SIP Amount</label>
                  <span className="text-sm font-bold text-[#00D09C]">{fmtAmt(sipAmount)}/mo</span>
                </div>
                <input type="range" min={500} max={100000} step={500} value={sipAmount}
                  onChange={(e) => setSipAmount(Number(e.target.value))} className="w-full accent-[#00D09C]" />
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/25 mt-1"><span>₹500</span><span>₹1L</span></div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest">SIP Duration</label>
                  <span className="text-sm font-bold text-[#00D09C]">{sipDuration} yr{sipDuration !== 1 ? "s" : ""} · total {fmtAmt(sipAmount * sipDuration * 12)}</span>
                </div>
                <input type="range" min={1} max={30} step={1} value={sipDuration}
                  onChange={(e) => setSipDuration(Number(e.target.value))} className="w-full accent-[#00D09C]" />
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/25 mt-1"><span>1 yr</span><span>30 yrs</span></div>
              </div>
            </>
          )}

          {/* Horizon */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Investment Horizon</label>
            <div className="flex gap-2">
              {HORIZONS.map((h) => (
                <button key={h} onClick={() => setHorizon(h)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${horizon === h ? "bg-[#00D09C] text-white border-[#00D09C]" : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"}`}
                >{h}</button>
              ))}
            </div>
          </div>

          {/* Risk */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Risk Appetite</label>
            <div className="flex gap-2">
              {RISKS.map((r) => (
                <button key={r} onClick={() => setRisk(r)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${risk === r ? "bg-[#00D09C] text-white border-[#00D09C]" : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"}`}
                >{r}</button>
              ))}
            </div>
          </div>

          {/* Sector / Category */}
          {mode === "stocks" ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">
                Preferred Sector <span className="normal-case font-normal">(optional)</span>
              </label>
              <select value={sector} onChange={(e) => setSector(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50">
                {STOCK_SECTORS.map((s) => <option key={s} value={s} className="bg-white dark:bg-card">{s}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">
                Fund Category <span className="normal-case font-normal">(optional)</span>
              </label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50">
                {MF_CATEGORIES.map((c) => <option key={c} value={c} className="bg-white dark:bg-card">{c}</option>)}
              </select>
            </div>
          )}

          {/* Submit */}
          <button onClick={run} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-[#00D09C] hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(0,208,156,0.2)]">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating suggestions…</>
              : <><Lightbulb className="w-4 h-4" /> Get AI Suggestions</>}
          </button>
        </div>

        {/* How it works */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#00D09C]/5 border border-[#00D09C]/20">
          <Info className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 dark:text-white/50 leading-relaxed">
            {mode === "stocks"
              ? "Our engine filters the Nifty 50 watchlist by your risk profile and sector preference, ranks by composite signal score (Technical + Momentum + Fundamental + Sentiment), then uses AI to generate personalised reasoning."
              : "Our engine filters 20 curated Indian MFs by your risk profile and category preference, ranks by return-based signal score (1Y/3M returns + momentum + consistency), then uses AI to generate personalised reasoning."}
            {investType === "sip" ? " SIP corpus projections use actual 1Y fund returns where available, otherwise signal-based estimates." : ""}
          </p>
        </div>

        {/* Error */}
        {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

        {/* Results */}
        {results && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00D09C]" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Top Picks for {risk} · {horizonKey}-term · {investType === "sip" ? `${fmtAmt(sipAmount)}/mo SIP` : totalInvested}
                </h2>
              </div>
              <button
                onClick={() => {
                  const topNames = mode === "stocks"
                    ? (stockResults ?? []).slice(0, 3).map(s => s.symbol).join(", ")
                    : (mfResults ?? []).slice(0, 3).map(s => s.name).join(", ");
                  openChatWithContext({
                    source: "suggest",
                    label: `${mode === "stocks" ? "Stock" : "Mutual Fund"} Suggestions`,
                    summary: `Suggested ${mode} for ${risk} risk, ${horizon} horizon, ${investType === "sip" ? `₹${sipAmount}/mo SIP` : totalInvested} lumpsum. Top picks: ${topNames}.`,
                    suggestedPrompts: [
                      "Should I buy these at current levels?",
                      "What are the key risks in these picks?",
                      "How do I diversify across these suggestions?",
                      "Compare these with index funds",
                    ],
                  });
                  navigate("/chat");
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
                style={{ background: "rgba(0,208,156,0.08)", borderColor: "rgba(0,208,156,0.3)", color: "#00D09C" }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat with AI
              </button>
            </div>
            {mode === "stocks"
              ? (stockResults ?? []).map((s, i) => (
                  <StockSuggestionCard key={s.symbol} s={s} delay={i * 0.1}
                    investType={investType} sipAmount={sipAmount} sipDuration={sipDuration} />
                ))
              : (mfResults ?? []).map((s, i) => (
                  <MfSuggestionCard key={s.code} s={s} delay={i * 0.1}
                    investType={investType} sipAmount={sipAmount} sipDuration={sipDuration} />
                ))}
          </motion.div>
        )}

        <Disclaimer mode={mode} />
      </div>
    </div>
  );
}
