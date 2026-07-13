import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, RotateCcw, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { analyzePortfolio, DEMO_PORTFOLIO } from "@/lib/portfolioEngine";
import type { PortfolioInput, StockHolding, MFHolding, PortfolioAnalysis } from "@/lib/portfolioEngine";
import { HealthScoreCard } from "@/components/portfolio/HealthScoreCard";
import { SectorDonutChart } from "@/components/portfolio/SectorDonutChart";
import { BenchmarkComparisonChart } from "@/components/portfolio/BenchmarkComparisonChart";
import { ConcentrationRiskPanel } from "@/components/portfolio/ConcentrationRiskPanel";
import { MFOverlapPanel } from "@/components/portfolio/MFOverlapPanel";
import { RecommendationsPanel } from "@/components/portfolio/RecommendationsPanel";
import { RebalancingActions } from "@/components/portfolio/RebalancingActions";
import { ProjectedAllocationChart } from "@/components/portfolio/ProjectedAllocationChart";
import { PortfolioSyncPanel } from "@/components/portfolio/PortfolioSyncPanel";
import { PerformanceChart } from "@/components/portfolio/PerformanceChart";
import { RiskMetricsRow } from "@/components/portfolio/RiskMetricsRow";
import { TaxHarvestPanel } from "@/components/portfolio/TaxHarvestPanel";
import { HoldingsPerformanceTable } from "@/components/portfolio/HoldingsPerformanceTable";

const STORAGE_KEY = "diversifi_portfolio";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const GOALS = [
  { value: "wealth_growth", label: "💰 Wealth Growth" },
  { value: "passive_income", label: "📈 Passive Income" },
  { value: "retirement", label: "🏡 Retirement" },
  { value: "short_term", label: "⚡ Short Term" },
];

function formatINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ─── Card Wrapper ─────────────────────────────────────────────────────────────
function Card({ title, subtitle, children, className = "", badge }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string; badge?: React.ReactNode;
}) {
  return (
    <div className={`bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── Stock Holdings Table ─────────────────────────────────────────────────────
function StockTable({ stocks, onChange }: { stocks: StockHolding[]; onChange: (s: StockHolding[]) => void }) {
  const update = (i: number, field: keyof StockHolding, val: string) => {
    const next = stocks.map((s, idx) => {
      if (idx !== i) return s;
      if (field === "symbol" || field === "name" || field === "buyDate") return { ...s, [field]: field === "symbol" ? val.toUpperCase() : val };
      return { ...s, [field]: parseFloat(val) || 0 };
    });
    if (field === "qty" || field === "currentPrice") {
      const s = next[i];
      next[i] = { ...s, currentValue: s.qty * s.currentPrice };
    }
    onChange(next);
  };
  const addRow = () => onChange([...stocks, { symbol: "", qty: 0, avgBuyPrice: 0, currentPrice: 0, currentValue: 0 }]);
  const removeRow = (i: number) => onChange(stocks.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-2 text-[10px] font-black text-gray-400 dark:text-white/30 uppercase tracking-widest px-1">
        <span>Symbol</span><span>Qty</span><span>Avg Price ₹</span><span>Curr Price ₹</span><span>Value ₹</span><span>Buy Date</span>
      </div>
      {stocks.map((s, i) => (
        <div key={i} className="grid grid-cols-6 gap-2 items-center group">
          {(["symbol", "qty", "avgBuyPrice", "currentPrice"] as const).map((f) => (
            <input key={f} value={(s as any)[f]} onChange={(e) => update(i, f, e.target.value)}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white
                focus:outline-none focus:border-[#00D09C]/50 transition-colors"
              placeholder={f === "symbol" ? "RELIANCE" : "0"}
            />
          ))}
          <div className="text-xs text-gray-600 dark:text-white/60">{formatINR(s.currentValue)}</div>
          <div className="flex items-center gap-1">
            <input value={s.buyDate ?? ""} onChange={(e) => update(i, "buyDate", e.target.value)}
              type="date"
              className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50 transition-colors"
            />
            <button onClick={() => removeRow(i)} className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 text-xs px-1 transition-all">✕</button>
          </div>
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-[#00D09C] hover:text-[#00D09C]/70 transition-colors mt-1">+ Add Stock</button>
    </div>
  );
}

// ─── MF Table ─────────────────────────────────────────────────────────────────
const MF_CATEGORIES = ["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "ELSS", "Index", "Debt", "Hybrid", "International"];

function MFTable({ funds, onChange }: { funds: MFHolding[]; onChange: (f: MFHolding[]) => void }) {
  const update = (i: number, field: keyof MFHolding, val: string) => {
    onChange(funds.map((f, idx) => {
      if (idx !== i) return f;
      if (field === "fundName" || field === "category" || field === "buyDate") return { ...f, [field]: val };
      return { ...f, [field]: parseFloat(val) || 0 };
    }));
  };
  const addRow = () => onChange([...funds, { fundName: "", category: "Large Cap", investedAmount: 0, currentValue: 0 }]);
  const removeRow = (i: number) => onChange(funds.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2 text-[10px] font-black text-gray-400 dark:text-white/30 uppercase tracking-widest px-1">
        <span className="col-span-2">Fund Name</span><span>Category</span><span>Curr Value ₹</span><span>Buy Date</span>
      </div>
      {funds.map((f, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 items-center group">
          <input value={f.fundName} onChange={(e) => update(i, "fundName", e.target.value)}
            className="col-span-2 w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50 transition-colors"
            placeholder="Mirae Asset Large Cap" />
          <select value={f.category} onChange={(e) => update(i, "category", e.target.value)}
            className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50 transition-colors">
            {MF_CATEGORIES.map((c) => <option key={c} value={c} className="bg-white dark:bg-card">{c}</option>)}
          </select>
          <input value={f.currentValue || ""} onChange={(e) => update(i, "currentValue", e.target.value)}
            className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50 transition-colors" placeholder="0" />
          <div className="flex items-center gap-1">
            <input value={f.buyDate ?? ""} onChange={(e) => update(i, "buyDate", e.target.value)}
              type="date"
              className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50 transition-colors"
            />
            <button onClick={() => removeRow(i)} className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 text-xs px-1 transition-all">✕</button>
          </div>
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-[#00D09C] hover:text-[#00D09C]/70 transition-colors mt-1">+ Add Fund</button>
    </div>
  );
}

// ─── Deep analysis types ──────────────────────────────────────────────────────
interface DeepAnalysis {
  performance: {
    portfolio_cagr: number | null;
    benchmark_cagr: number | null;
    port_6m_return: number | null;
    bench_6m_return: number | null;
    alpha: number | null;
    beta: number | null;
    sharpe: number | null;
    total_invested: number;
    total_current: number;
    total_pnl: number;
  };
  holdings: any[];
  chart_data: { date: string; portfolio: number; benchmark: number }[];
  tax: any;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<PortfolioInput>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEMO_PORTFOLIO;
    } catch { return DEMO_PORTFOLIO; }
  });
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  const set = useCallback(<K extends keyof PortfolioInput>(key: K, val: PortfolioInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: val }));
  }, []);

  const runAnalysis = () => {
    setAnalyzing(true);
    setDeepAnalysis(null);
    setDeepError(null);

    // Phase 1: instant frontend analysis
    setTimeout(() => {
      setAnalysis(analyzePortfolio(input));
      setAnalyzing(false);
    }, 600);

    // Phase 2: async backend deep analysis
    setDeepLoading(true);
    fetch(`${API_BASE}/api/portfolio/deep-analyse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stocks: input.stocks,
        mutualFunds: input.mutualFunds,
        benchmark: input.benchmark,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDeepAnalysis(data);
        else setDeepError(data.error ?? "Deep analysis failed");
      })
      .catch((e) => setDeepError(e.message))
      .finally(() => setDeepLoading(false));
  };

  const reset = () => { setAnalysis(null); setDeepAnalysis(null); setDeepError(null); setStep(0); };

  const STEPS = ["Import", "Profile", "Stocks", "Funds & Cash"];
  const totalValue = input.stocks.reduce((a, s) => a + s.currentValue, 0)
    + input.mutualFunds.reduce((a, m) => a + m.currentValue, 0) + input.cashBalance;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(0,208,156,0.04) 0%, transparent 60%)" }} />

      {/* Header */}
      <header className="top-0 z-50 backdrop-blur-xl px-8 md:px-12 py-6">
        <div className="flex items-center gap-4">
          <div className="w-px h-5 bg-gray-300 dark:bg-white/15" />
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white leading-none">Portfolio Analyzer</h1>
            <p className="text-[10px] text-gray-500 mt-2 dark:text-white/40 uppercase tracking-widest">AI-Powered Rebalancing</p>
          </div>
        </div>
        {analysis && (
          <div className="flex mt-6 items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-white/40">Total: <span className="text-gray-900 dark:text-white font-bold">{formatINR(totalValue)}</span></span>
            <Link to="/portfolio-simulation" className="flex items-center gap-1.5 text-xs text-gray-900 dark:text-white bg-[#00D09C]/20 border border-[#00D09C] hover:bg-[#00D09C]/30 px-3 py-1.5 rounded-lg transition-all">
              <Play className="w-3.5 h-3.5" /> Simulate
            </Link>
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ── WIZARD ── */}
        {!analysis && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-0 flex-1">
                  <button onClick={() => setStep(i)} className="flex items-center gap-2 group">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      i < step ? "bg-[#00D09C] text-white dark:text-background" : i === step ? "bg-[#00D09C]/30 text-[#00D09C] border border-[#00D09C]" : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/30"
                    }`}>{i < step ? "✓" : i + 1}</div>
                    <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-[#00D09C]" : "text-gray-400 dark:text-white/30"}`}>{s}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 dark:bg-white/10 mx-2" />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                {/* Step 0: Import */}
                {step === 0 && (
                  <div className="space-y-4">
                    <PortfolioSyncPanel
                      onStocksLoaded={(s) => set("stocks", s)}
                      onMFLoaded={(m) => set("mutualFunds", m)}
                    />
                    <div className="text-center text-xs text-gray-500 dark:text-white/30">
                      Already have data? Or using demo portfolio - just click Next to continue.
                    </div>
                  </div>
                )}

                {/* Step 1: Profile */}
                {step === 1 && (
                  <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Risk Profile</label>
                        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                          {(["Conservative", "Moderate", "Aggressive"] as const).map((r) => (
                            <button key={r} onClick={() => set("riskProfile", r)}
                              className={`flex-1 py-2.5 text-xs font-bold transition-all ${input.riskProfile === r ? "bg-[#00D09C] text-white dark:text-background" : "text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Benchmark</label>
                        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                          {(["nifty50", "nifty500"] as const).map((b) => (
                            <button key={b} onClick={() => set("benchmark", b)}
                              className={`flex-1 py-2.5 text-xs font-bold transition-all ${input.benchmark === b ? "bg-[#00D09C] text-white dark:text-background" : "text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                              {b === "nifty50" ? "Nifty 50" : "Nifty 500"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Investment Goal</label>
                        <select value={input.investmentGoal} onChange={(e) => set("investmentGoal", e.target.value)}
                          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50">
                          {GOALS.map((g) => <option key={g.value} value={g.value} className="bg-white dark:bg-card">{g.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Age (optional)</label>
                        <input type="number" value={input.age || ""} onChange={(e) => set("age", parseInt(e.target.value) || undefined)}
                          placeholder="28" className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Monthly SIP / Investment ₹ (optional)</label>
                        <input type="number" value={input.monthlyInvestment || ""} onChange={(e) => set("monthlyInvestment", parseInt(e.target.value) || undefined)}
                          placeholder="15000" className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Stocks */}
                {step === 2 && (
                  <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
                    <p className="text-xs text-gray-500 dark:text-white/40">Enter your stock holdings. Buy Date enables CAGR and tax analysis.</p>
                    <StockTable stocks={input.stocks} onChange={(s) => set("stocks", s)} />
                  </div>
                )}

                {/* Step 3: MF + Cash */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Mutual Fund Holdings</h3>
                      <MFTable funds={input.mutualFunds} onChange={(f) => set("mutualFunds", f)} />
                    </div>
                    <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">Cash / Liquid Balance ₹</label>
                      <input type="number" value={input.cashBalance || ""} onChange={(e) => set("cashBalance", parseFloat(e.target.value) || 0)}
                        placeholder="25000" className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]/50" />
                    </div>
                    <div className="bg-[#00D09C]/10 border border-[#00D09C]/25 rounded-2xl p-4">
                      <p className="text-xs text-gray-600 dark:text-white/50 mb-2">Portfolio Summary</p>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                          { label: "Stocks", val: formatINR(input.stocks.reduce((a, s) => a + s.currentValue, 0)) },
                          { label: "Mutual Funds", val: formatINR(input.mutualFunds.reduce((a, m) => a + m.currentValue, 0)) },
                          { label: "Cash", val: formatINR(input.cashBalance) },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-xs text-gray-500 dark:text-white/40">{item.label}</p>
                            <p className="text-sm font-bold text-[#00D09C]">{item.val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 text-center">
                        <p className="text-xs text-gray-500 dark:text-white/40">Total Portfolio Value</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{formatINR(totalValue)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep((s) => s + 1)}
                  className="flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-900 dark:text-white px-6 py-2 rounded-xl border border-gray-200 dark:border-white/15 transition-all">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={runAnalysis} disabled={analyzing || totalValue === 0}
                  className="flex items-center gap-2 text-sm font-bold bg-[#00D09C] text-white dark:text-background hover:opacity-90 disabled:opacity-50 px-8 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(0,208,156,0.25)]">
                  {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Play className="w-4 h-4" /> Run Analysis</>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Score row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2 sm:col-span-1 bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
                <HealthScoreCard score={analysis.healthScore} label="Portfolio Health" size={140} />
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
                <HealthScoreCard score={analysis.diversificationScore} label="Diversification" size={140} />
              </div>
              <div className="col-span-2 bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 grid grid-cols-2 gap-4 content-center">
                {[
                  { label: "Total Value", val: formatINR(analysis.totalValue) },
                  { label: "Stocks", val: `${input.stocks.length} holdings` },
                  { label: "Mutual Funds", val: `${input.mutualFunds.length} funds` },
                  { label: "Risk Profile", val: input.riskProfile },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] text-gray-500 dark:text-white/40 uppercase tracking-widest">{s.label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{s.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── DEEP ANALYSIS: Risk Metrics ── */}
            <Card
              title="Performance Metrics"
              subtitle="CAGR, Alpha, Beta, Sharpe - based on live market data"
              badge={
                deepLoading ? (
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching live data…
                  </span>
                ) : deepError ? (
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">Live data unavailable</span>
                ) : deepAnalysis ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Live</span>
                ) : null
              }
            >
              {(deepLoading || !deepAnalysis) && !deepError ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : deepAnalysis ? (
                <RiskMetricsRow
                  portfolioCagr={deepAnalysis.performance.portfolio_cagr}
                  benchmarkCagr={deepAnalysis.performance.benchmark_cagr}
                  port6mReturn={deepAnalysis.performance.port_6m_return}
                  bench6mReturn={deepAnalysis.performance.bench_6m_return}
                  alpha={deepAnalysis.performance.alpha}
                  beta={deepAnalysis.performance.beta}
                  sharpe={deepAnalysis.performance.sharpe}
                />
              ) : (
                <p className="text-xs text-gray-400 dark:text-white/30 text-center py-4">
                  Could not fetch live performance data. Ensure the backend is running.
                </p>
              )}
            </Card>

            {/* ── DEEP ANALYSIS: Performance Chart ── */}
            <Card
              title="Portfolio vs Benchmark (6 months)"
              subtitle={`Normalised to 100 - vs ${input.benchmark === "nifty50" ? "Nifty 50" : "Nifty 500"}`}
              badge={deepLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 dark:text-white/30" /> : undefined}
            >
              {deepLoading ? (
                <div className="h-52 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ) : (
                <PerformanceChart
                  data={deepAnalysis?.chart_data ?? []}
                  benchmarkLabel={input.benchmark === "nifty50" ? "Nifty 50" : "Nifty 500"}
                />
              )}
            </Card>

            {/* Score breakdown */}
            <Card title="Score Breakdown" subtitle="What drives your diversification score">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {([
                  ["Sector Spread", analysis.scoreBreakdown.sectorSpread, 25],
                  ["Asset Class Spread", analysis.scoreBreakdown.assetClassSpread, 20],
                  ["Concentration Safety", analysis.scoreBreakdown.concentrationSafe, 30],
                  ["MF Overlap Safety", analysis.scoreBreakdown.mfOverlapSafe, 15],
                  ["Risk Alignment", analysis.scoreBreakdown.riskAlignment, 10],
                  ["Benchmark Alignment", analysis.scoreBreakdown.benchmarkAlign, 10],
                ] as [string, number, number][]).map(([label, val, max]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-white/50">{label}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{val}/{max}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#00D09C] transition-all" style={{ width: `${(val / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Sector Allocation" subtitle="Your portfolio vs benchmark">
                <SectorDonutChart allocations={analysis.sectorAllocations} />
              </Card>
              <Card title="Benchmark Comparison" subtitle={`vs ${input.benchmark === "nifty50" ? "Nifty 50" : "Nifty 500"}`}>
                <BenchmarkComparisonChart allocations={analysis.sectorAllocations} benchmarkLabel={input.benchmark === "nifty50" ? "Nifty 50" : "Nifty 500"} />
              </Card>
            </div>

            {/* Risk row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Concentration Risk" subtitle="Single-stock and sector exposure analysis">
                <ConcentrationRiskPanel data={analysis.concentrationRisk} totalValue={analysis.totalValue} />
              </Card>
              <Card title="Mutual Fund Overlap" subtitle="Shared holdings across your funds">
                <MFOverlapPanel overlaps={analysis.mfOverlaps} />
              </Card>
            </div>

            {/* ── DEEP ANALYSIS: Holdings Performance Table ── */}
            <Card
              title="Holdings Performance"
              subtitle="Per-holding CAGR, P&L, holding period and tax classification"
              badge={deepLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 dark:text-white/30" /> : undefined}
            >
              {deepLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <HoldingsPerformanceTable holdings={deepAnalysis?.holdings ?? []} />
              )}
            </Card>

            {/* ── DEEP ANALYSIS: Tax Harvest Panel ── */}
            <Card
              title="Tax Analysis & Loss Harvesting"
              subtitle="FY2025-26 - LTCG 12.5% (above ₹1.25L exemption), STCG 20%"
              badge={deepLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 dark:text-white/30" /> : undefined}
            >
              {deepLoading ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}</div>
                </div>
              ) : deepAnalysis?.tax ? (
                <TaxHarvestPanel tax={deepAnalysis.tax} />
              ) : (
                <p className="text-xs text-gray-400 dark:text-white/30 text-center py-4">
                  Tax analysis will appear after live data loads. Ensure buy dates are set for your holdings.
                </p>
              )}
            </Card>

            {/* Recommendations */}
            <Card title="🤖 AI Recommendations" subtitle="Personalized insights based on your portfolio and risk profile">
              <RecommendationsPanel recommendations={analysis.recommendations} />
            </Card>

            {/* Rebalance + Projection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Rebalancing Actions" subtitle="Suggested moves to optimize your portfolio">
                <RebalancingActions suggestions={analysis.rebalanceSuggestions} />
              </Card>
              <Card title="Projected After Rebalance" subtitle="Estimated allocation if suggestions are followed">
                <ProjectedAllocationChart current={analysis.sectorAllocations} projected={analysis.projectedAllocations} />
              </Card>
            </div>

            {/* Re-analyze */}
            <div className="flex justify-center pb-8">
              <button onClick={reset} className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                <RotateCcw className="w-4 h-4" /> Edit Portfolio & Re-analyze
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
