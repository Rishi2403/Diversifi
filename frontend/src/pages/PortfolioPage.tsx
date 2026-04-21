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

const STORAGE_KEY = "diversifi_portfolio";

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
function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Stock Holdings Table ─────────────────────────────────────────────────────
function StockTable({ stocks, onChange }: { stocks: StockHolding[]; onChange: (s: StockHolding[]) => void }) {
  const update = (i: number, field: keyof StockHolding, val: string) => {
    const next = stocks.map((s, idx) =>
      idx === i ? { ...s, [field]: field === "symbol" || field === "name" ? val.toUpperCase() : parseFloat(val) || 0 } : s
    );
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
      <div className="grid grid-cols-5 gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest px-1">
        <span>Symbol</span><span>Qty</span><span>Avg Price ₹</span><span>Curr Price ₹</span><span>Value ₹</span>
      </div>
      {stocks.map((s, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 items-center group">
          {(["symbol", "qty", "avgBuyPrice", "currentPrice"] as const).map((f) => (
            <input key={f} value={(s as any)[f]} onChange={(e) => update(i, f, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white
                focus:outline-none focus:border-[#9EA2F8]/50 transition-colors"
              placeholder={f === "symbol" ? "RELIANCE" : "0"}
            />
          ))}
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/60 flex-1">{formatINR(s.currentValue)}</span>
            <button onClick={() => removeRow(i)} className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 text-xs px-1 transition-all">✕</button>
          </div>
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-[#9EA2F8] hover:text-[#9EA2F8]/70 transition-colors mt-1">+ Add Stock</button>
    </div>
  );
}

// ─── MF Table ─────────────────────────────────────────────────────────────────
const MF_CATEGORIES = ["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "ELSS", "Index", "Debt", "Hybrid", "International"];

function MFTable({ funds, onChange }: { funds: MFHolding[]; onChange: (f: MFHolding[]) => void }) {
  const update = (i: number, field: keyof MFHolding, val: string) => {
    onChange(funds.map((f, idx) => idx === i ? { ...f, [field]: field === "fundName" || field === "category" ? val : parseFloat(val) || 0 } : f));
  };
  const addRow = () => onChange([...funds, { fundName: "", category: "Large Cap", investedAmount: 0, currentValue: 0 }]);
  const removeRow = (i: number) => onChange(funds.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest px-1">
        <span className="col-span-2">Fund Name</span><span>Category</span><span>Curr Value ₹</span>
      </div>
      {funds.map((f, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 items-center group">
          <input value={f.fundName} onChange={(e) => update(i, "fundName", e.target.value)}
            className="col-span-2 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#9EA2F8]/50 transition-colors"
            placeholder="Mirae Asset Large Cap" />
          <select value={f.category} onChange={(e) => update(i, "category", e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#9EA2F8]/50 transition-colors">
            {MF_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#1a0f3a]">{c}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input value={f.currentValue || ""} onChange={(e) => update(i, "currentValue", e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#9EA2F8]/50 transition-colors" placeholder="0" />
            <button onClick={() => removeRow(i)} className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 text-xs px-1 transition-all">✕</button>
          </div>
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-[#9EA2F8] hover:text-[#9EA2F8]/70 transition-colors mt-1">+ Add Fund</button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [step, setStep] = useState(0); // 0=sync, 1=profile, 2=stocks, 3=mf+cash
  const [input, setInput] = useState<PortfolioInput>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEMO_PORTFOLIO;
    } catch { return DEMO_PORTFOLIO; }
  });
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  const set = useCallback(<K extends keyof PortfolioInput>(key: K, val: PortfolioInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: val }));
  }, []);

  const runAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalysis(analyzePortfolio(input));
      setAnalyzing(false);
    }, 800);
  };

  const reset = () => { setAnalysis(null); setStep(0); };

  const STEPS = ["Import", "Profile", "Stocks", "Funds & Cash"];
  const totalValue = input.stocks.reduce((a, s) => a + s.currentValue, 0)
    + input.mutualFunds.reduce((a, m) => a + m.currentValue, 0) + input.cashBalance;

  return (
    <div className="min-h-screen bg-[#1a0f3a] text-white font-mono">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(158,162,248,0.08) 0%, transparent 60%)" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a0f3a]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="w-px h-5 bg-white/15" />
          <div>
            <h1 className="text-lg font-black text-white leading-none">Portfolio Analyzer</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">AI-Powered Rebalancing</p>
          </div>
        </div>
        {analysis && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">Total: <span className="text-white font-bold">{formatINR(totalValue)}</span></span>
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all">
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
                      i < step ? "bg-[#9EA2F8] text-[#1a0f3a]" : i === step ? "bg-[#9EA2F8]/30 text-[#9EA2F8] border border-[#9EA2F8]" : "bg-white/10 text-white/30"
                    }`}>{i < step ? "✓" : i + 1}</div>
                    <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-[#9EA2F8]" : "text-white/30"}`}>{s}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/10 mx-2" />}
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
                    <div className="text-center text-xs text-white/30">
                      Already have data? Or using demo portfolio — just click Next to continue.
                    </div>
                  </div>
                )}

                {/* Step 1: Profile */}
                {step === 1 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Risk Profile</label>
                        <div className="flex rounded-xl overflow-hidden border border-white/10">
                          {(["Conservative", "Moderate", "Aggressive"] as const).map((r) => (
                            <button key={r} onClick={() => set("riskProfile", r)}
                              className={`flex-1 py-2.5 text-xs font-bold transition-all ${input.riskProfile === r ? "bg-[#9EA2F8] text-[#1a0f3a]" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Benchmark</label>
                        <div className="flex rounded-xl overflow-hidden border border-white/10">
                          {(["nifty50", "nifty500"] as const).map((b) => (
                            <button key={b} onClick={() => set("benchmark", b)}
                              className={`flex-1 py-2.5 text-xs font-bold transition-all ${input.benchmark === b ? "bg-[#9EA2F8] text-[#1a0f3a]" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                              {b === "nifty50" ? "Nifty 50" : "Nifty 500"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Investment Goal</label>
                        <select value={input.investmentGoal} onChange={(e) => set("investmentGoal", e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#9EA2F8]/50">
                          {GOALS.map((g) => <option key={g.value} value={g.value} className="bg-[#1a0f3a]">{g.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Age (optional)</label>
                        <input type="number" value={input.age || ""} onChange={(e) => set("age", parseInt(e.target.value) || undefined)}
                          placeholder="28" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#9EA2F8]/50" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Monthly SIP / Investment ₹ (optional)</label>
                        <input type="number" value={input.monthlyInvestment || ""} onChange={(e) => set("monthlyInvestment", parseInt(e.target.value) || undefined)}
                          placeholder="15000" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#9EA2F8]/50" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Stocks */}
                {step === 2 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <p className="text-xs text-white/40">Enter your stock holdings. Current Price × Qty = Current Value (auto-calculated).</p>
                    <StockTable stocks={input.stocks} onChange={(s) => set("stocks", s)} />
                  </div>
                )}

                {/* Step 3: MF + Cash */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-white">Mutual Fund Holdings</h3>
                      <MFTable funds={input.mutualFunds} onChange={(f) => set("mutualFunds", f)} />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Cash / Liquid Balance ₹</label>
                      <input type="number" value={input.cashBalance || ""} onChange={(e) => set("cashBalance", parseFloat(e.target.value) || 0)}
                        placeholder="25000" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#9EA2F8]/50" />
                    </div>
                    {/* Summary */}
                    <div className="bg-[#9EA2F8]/10 border border-[#9EA2F8]/25 rounded-2xl p-4">
                      <p className="text-xs text-white/50 mb-2">Portfolio Summary</p>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                          { label: "Stocks", val: formatINR(input.stocks.reduce((a, s) => a + s.currentValue, 0)) },
                          { label: "Mutual Funds", val: formatINR(input.mutualFunds.reduce((a, m) => a + m.currentValue, 0)) },
                          { label: "Cash", val: formatINR(input.cashBalance) },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-xs text-white/40">{item.label}</p>
                            <p className="text-sm font-bold text-[#9EA2F8]">{item.val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10 text-center">
                        <p className="text-xs text-white/40">Total Portfolio Value</p>
                        <p className="text-xl font-black text-white">{formatINR(totalValue)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
                className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white disabled:opacity-30 transition-colors px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep((s) => s + 1)}
                  className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/15 text-white px-6 py-2 rounded-xl border border-white/15 transition-all">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={runAnalysis} disabled={analyzing || totalValue === 0}
                  className="flex items-center gap-2 text-sm font-bold bg-[#9EA2F8] text-[#1a0f3a] hover:opacity-90 disabled:opacity-50 px-8 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(158,162,248,0.3)]">
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
              <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
                <HealthScoreCard score={analysis.healthScore} label="Portfolio Health" size={140} />
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
                <HealthScoreCard score={analysis.diversificationScore} label="Diversification" size={140} />
              </div>
              {/* Stats */}
              <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 grid grid-cols-2 gap-4 content-center">
                {[
                  { label: "Total Value", val: formatINR(analysis.totalValue) },
                  { label: "Stocks", val: `${input.stocks.length} holdings` },
                  { label: "Mutual Funds", val: `${input.mutualFunds.length} funds` },
                  { label: "Risk Profile", val: input.riskProfile },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{s.label}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{s.val}</p>
                  </div>
                ))}
              </div>
            </div>

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
                      <span className="text-white/50">{label}</span>
                      <span className="font-bold text-white">{val}/{max}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#9EA2F8] transition-all" style={{ width: `${(val / max) * 100}%` }} />
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

            {/* Re-analyze button */}
            <div className="flex justify-center pb-8">
              <button onClick={reset} className="flex items-center gap-2 text-sm text-white/50 hover:text-white px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">
                <RotateCcw className="w-4 h-4" /> Edit Portfolio & Re-analyze
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
