import { Plus, Trash2, Calendar, Zap, AlertCircle, CheckCircle, Info, TrendingUp, TrendingDown, BarChart3, Copy, ChevronDown } from "lucide-react";
import {
  Industry,
  Country,
  INDUSTRIES,
  COUNTRIES,
  IndustryScenario,
  GeopoliticalScenario,
  InflationScenario,
  YearlyInvestmentPlan,
  SIPAllocation,
  HoldingImpact,
  AdvancedSimulationResult,
} from "@/lib/advancedSimulation";
import { StockHolding, MFHolding } from "@/lib/portfolioEngine";
import { motion } from "framer-motion";

function formatINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Step 2: Investment Plan ──────────────────────────────────────────────────

const STEP_UP_OPTIONS = [
  { label: "No step-up", value: 0 },
  { label: "+5% / yr", value: 5 },
  { label: "+10% / yr", value: 10 },
  { label: "+15% / yr", value: 15 },
  { label: "+20% / yr", value: 20 },
];

export function InvestmentPlanStep({
  timeHorizon,
  setTimeHorizon,
  investmentPlans,
  setInvestmentPlans,
  stocks,
  mutualFunds,
  cashBalance,
}: {
  timeHorizon: number;
  setTimeHorizon: (h: number) => void;
  investmentPlans: YearlyInvestmentPlan[];
  setInvestmentPlans: (plans: YearlyInvestmentPlan[]) => void;
  stocks: StockHolding[];
  mutualFunds: MFHolding[];
  cashBalance: number;
}) {
  const totalPortfolioValue =
    stocks.reduce((s, x) => s + x.currentValue, 0) +
    mutualFunds.reduce((s, m) => s + m.currentValue, 0) +
    cashBalance;

  const allHoldings = [
    ...stocks.map((s) => ({ name: s.name || s.symbol, value: s.currentValue })),
    ...mutualFunds.map((m) => ({ name: m.fundName, value: m.currentValue })),
  ];

  const updatePlan = (year: number, field: keyof YearlyInvestmentPlan, value: any) => {
    const newPlans = [...investmentPlans];
    const idx = newPlans.findIndex((p) => p.year === year);
    if (idx >= 0) {
      (newPlans[idx] as any)[field] = value;
      setInvestmentPlans(newPlans);
    }
  };

  const updateSIPAllocation = (year: number, i: number, field: keyof SIPAllocation, value: any) => {
    const newPlans = [...investmentPlans];
    const idx = newPlans.findIndex((p) => p.year === year);
    if (idx >= 0) {
      const allocs = [...(newPlans[idx].sipAllocations || [])];
      (allocs[i] as any)[field] = value;
      newPlans[idx].sipAllocations = allocs;
      setInvestmentPlans(newPlans);
    }
  };

  const addSIPAllocation = (year: number) => {
    const newPlans = [...investmentPlans];
    const idx = newPlans.findIndex((p) => p.year === year);
    if (idx >= 0) {
      newPlans[idx].sipAllocations = [...(newPlans[idx].sipAllocations || []), { fundName: "", amount: 0 }];
      setInvestmentPlans(newPlans);
    }
  };

  const removeSIPAllocation = (year: number, i: number) => {
    const newPlans = [...investmentPlans];
    const idx = newPlans.findIndex((p) => p.year === year);
    if (idx >= 0) {
      newPlans[idx].sipAllocations = (newPlans[idx].sipAllocations || []).filter((_, j) => j !== i);
      setInvestmentPlans(newPlans);
    }
  };

  const addStockPurchase = (year: number) => {
    const newPlans = [...investmentPlans];
    const idx = newPlans.findIndex((p) => p.year === year);
    if (idx >= 0) {
      newPlans[idx].stockPurchases = [...(newPlans[idx].stockPurchases || []), { symbol: "", amount: 0 }];
      setInvestmentPlans(newPlans);
    }
  };

  const updateStockPurchase = (year: number, i: number, field: "symbol" | "amount", value: any) => {
    const newPlans = [...investmentPlans];
    const idx = newPlans.findIndex((p) => p.year === year);
    if (idx >= 0 && newPlans[idx].stockPurchases) {
      (newPlans[idx].stockPurchases![i] as any)[field] = value;
      setInvestmentPlans(newPlans);
    }
  };

  const removeStockPurchase = (year: number, i: number) => {
    const newPlans = [...investmentPlans];
    const idx = newPlans.findIndex((p) => p.year === year);
    if (idx >= 0) {
      newPlans[idx].stockPurchases = (newPlans[idx].stockPurchases || []).filter((_, j) => j !== i);
      setInvestmentPlans(newPlans);
    }
  };

  // Copy this year's config to all subsequent years with optional annual step-up
  const copyToRemaining = (fromYear: number, stepUpPct: number) => {
    const src = investmentPlans.find((p) => p.year === fromYear);
    if (!src) return;
    const newPlans = investmentPlans.map((plan) => {
      if (plan.year <= fromYear) return plan;
      const n = plan.year - fromYear;
      const mult = Math.pow(1 + stepUpPct / 100, n);
      return {
        ...plan,
        sipMode: src.sipMode,
        sipAmount: Math.round(src.sipAmount * mult),
        sipAllocations: src.sipAllocations.map((a) => ({ ...a, amount: Math.round(a.amount * mult) })),
        swpAmount: Math.round(src.swpAmount * mult),
        lumpsum: src.lumpsum, // lumpsum not stepped up
        stockPurchases: src.stockPurchases,
      };
    });
    setInvestmentPlans(newPlans);
  };

  return (
    <div className="space-y-6">
      {/* Time Horizon */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">
          Simulation Time Horizon (Years)
        </label>
        <input
          type="number"
          value={timeHorizon}
          onChange={(e) => setTimeHorizon(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
          min="1" max="30"
          className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
        />
        <p className="text-xs text-gray-500 dark:text-white/40 mt-2">
          Configure investment plans for each year (1–30 years). Use "Copy to remaining years" on any card to propagate it forward.
        </p>
      </div>

      {/* Year-wise Plans */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Year-wise Investment Plans
        </h3>

        {investmentPlans.map((plan) => {
          const currentYear = new Date().getFullYear();
          const effectiveSIP =
            plan.sipMode === "fundwise"
              ? (plan.sipAllocations || []).reduce((s, a) => s + a.amount, 0)
              : plan.sipAmount;

          return (
            <div key={plan.year} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Year {plan.year + 1}
                  {effectiveSIP > 0 && (
                    <span className="ml-2 text-xs font-normal text-[#00D09C]">SIP ₹{effectiveSIP.toLocaleString("en-IN")}/mo</span>
                  )}
                </h4>
                <span className="text-xs text-gray-500 dark:text-white/40">{currentYear + plan.year}</span>
              </div>

              {/* ── SIP section ── */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">Monthly SIP ₹</label>
                  {/* Mode toggle */}
                  <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-white/10 text-[10px] font-semibold ml-auto">
                    <button
                      onClick={() => updatePlan(plan.year, "sipMode", "total")}
                      className={`px-2.5 py-1 transition-colors ${plan.sipMode !== "fundwise" ? "bg-[#00D09C] text-white" : "bg-white dark:bg-white/5 text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/10"}`}
                    >
                      Total (auto-allocate)
                    </button>
                    <button
                      onClick={() => updatePlan(plan.year, "sipMode", "fundwise")}
                      className={`px-2.5 py-1 border-l border-gray-200 dark:border-white/10 transition-colors ${plan.sipMode === "fundwise" ? "bg-[#00D09C] text-white" : "bg-white dark:bg-white/5 text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/10"}`}
                    >
                      Fund-wise
                    </button>
                  </div>
                </div>

                {plan.sipMode !== "fundwise" ? (
                  /* Total SIP with auto-allocate preview */
                  <div>
                    <input
                      type="number"
                      value={plan.sipAmount || ""}
                      onChange={(e) => updatePlan(plan.year, "sipAmount", parseInt(e.target.value) || 0)}
                      placeholder="₹ monthly total SIP"
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                    {plan.sipAmount > 0 && totalPortfolioValue > 0 && allHoldings.length > 0 && (
                      <div className="mt-2 rounded-lg bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 px-3 py-2">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase mb-1.5">Auto-allocation preview</p>
                        <div className="space-y-1">
                          {allHoldings.map((h, i) => {
                            const weight = totalPortfolioValue > 0 ? h.value / totalPortfolioValue : 0;
                            const alloc = Math.round(plan.sipAmount * weight);
                            if (alloc === 0) return null;
                            return (
                              <div key={i} className="flex justify-between text-[10px]">
                                <span className="text-gray-600 dark:text-white/50 truncate max-w-[60%]">{h.name}</span>
                                <span className="text-[#00D09C] font-semibold">₹{alloc.toLocaleString("en-IN")}/mo ({(weight * 100).toFixed(0)}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fund-wise SIP */
                  <div className="space-y-1.5">
                    <datalist id={`funds-${plan.year}`}>
                      {mutualFunds.map((m) => <option key={m.fundName} value={m.fundName} />)}
                    </datalist>
                    {(plan.sipAllocations || []).map((alloc, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          list={`funds-${plan.year}`}
                          value={alloc.fundName}
                          onChange={(e) => updateSIPAllocation(plan.year, i, "fundName", e.target.value)}
                          placeholder="Fund name"
                          className="flex-1 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                        />
                        <input
                          type="number"
                          value={alloc.amount || ""}
                          onChange={(e) => updateSIPAllocation(plan.year, i, "amount", parseInt(e.target.value) || 0)}
                          placeholder="₹/mo"
                          className="w-28 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                        />
                        <button onClick={() => removeSIPAllocation(plan.year, i)} className="text-red-600 dark:text-red-400 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSIPAllocation(plan.year)}
                      className="flex items-center gap-1 text-xs text-[#00D09C] hover:text-[#00D09C]/80"
                    >
                      <Plus className="w-3 h-3" /> Add fund SIP
                    </button>
                    {(plan.sipAllocations || []).length > 0 && (
                      <p className="text-[10px] text-gray-500 dark:text-white/40">
                        Total: ₹{(plan.sipAllocations || []).reduce((s, a) => s + a.amount, 0).toLocaleString("en-IN")}/mo
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* SWP + Lumpsum */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">Monthly SWP ₹</label>
                  <input
                    type="number"
                    value={plan.swpAmount || ""}
                    onChange={(e) => updatePlan(plan.year, "swpAmount", parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">Annual Lumpsum ₹</label>
                  <input
                    type="number"
                    value={plan.lumpsum || ""}
                    onChange={(e) => updatePlan(plan.year, "lumpsum", parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                  />
                </div>
              </div>

              {/* Stock Purchases */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-white/40 uppercase">Stock Purchases (one-time)</label>
                  <button onClick={() => addStockPurchase(plan.year)} className="text-xs text-[#00D09C] hover:text-[#00D09C]/80 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {(plan.stockPurchases || []).length > 0 ? (
                  <div className="space-y-1.5">
                    {plan.stockPurchases!.map((purchase, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select
                          value={purchase.symbol}
                          onChange={(e) => updateStockPurchase(plan.year, i, "symbol", e.target.value)}
                          className="flex-1 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                        >
                          <option value="">Select stock...</option>
                          {stocks.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name || s.symbol}</option>)}
                        </select>
                        <input
                          type="number"
                          value={purchase.amount || ""}
                          onChange={(e) => updateStockPurchase(plan.year, i, "amount", parseInt(e.target.value) || 0)}
                          placeholder="Amount ₹"
                          className="w-28 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                        />
                        <button onClick={() => removeStockPurchase(plan.year, i)} className="text-red-600 dark:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-white/40 italic">No stock purchases planned</p>
                )}
              </div>

              {/* Copy to remaining years */}
              {plan.year < investmentPlans.length - 1 && (
                <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex items-center gap-2 flex-wrap">
                  <Copy className="w-3.5 h-3.5 text-gray-400 dark:text-white/30 shrink-0" />
                  <span className="text-[10px] text-gray-500 dark:text-white/40">Copy Year {plan.year + 1} to remaining years</span>
                  <div className="flex gap-1.5 ml-auto flex-wrap">
                    {STEP_UP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => copyToRemaining(plan.year, opt.value)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-white/60 hover:border-[#00D09C]/50 hover:text-[#00D09C] transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Country pill multi-select ────────────────────────────────────────────────

function CountryPillSelect({
  selected,
  onChange,
}: {
  selected: Country[];
  onChange: (countries: Country[]) => void;
}) {
  const toggle = (c: Country) => {
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);
  };
  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00D09C]/15 border border-[#00D09C]/35 text-[#00D09C]"
            >
              {c}
              <button
                onClick={() => toggle(c)}
                className="hover:text-red-400 transition-colors leading-none font-bold text-base ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {COUNTRIES.filter((c) => !selected.includes(c)).map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-white/60 hover:border-[#00D09C]/40 hover:text-[#00D09C] transition-colors"
          >
            + {c}
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-[10px] text-gray-400 dark:text-white/30">Click countries above to select them</p>
      )}
    </div>
  );
}

// ─── Step 3: Scenario Builder ─────────────────────────────────────────────────

export function ScenarioBuilderStep({
  timeHorizon,
  industryScenarios,
  setIndustryScenarios,
  geopoliticalScenarios,
  setGeopoliticalScenarios,
  inflationScenarios,
  setInflationScenarios,
}: {
  timeHorizon: number;
  industryScenarios: IndustryScenario[];
  setIndustryScenarios: (s: IndustryScenario[]) => void;
  geopoliticalScenarios: GeopoliticalScenario[];
  setGeopoliticalScenarios: (s: GeopoliticalScenario[]) => void;
  inflationScenarios: InflationScenario[];
  setInflationScenarios: (s: InflationScenario[]) => void;
}) {
  const addIndustryScenario = () => {
    setIndustryScenarios([
      ...industryScenarios,
      {
        id: `ind-${Date.now()}`,
        type: "CRASH",
        industry: INDUSTRIES[0],
        impact: -0.3,
        startYear: 0,
        duration: 1,
        probability: 0.1,
      },
    ]);
  };

  const updateIndustryScenario = (
    id: string,
    field: keyof IndustryScenario,
    value: any
  ) => {
    setIndustryScenarios(
      industryScenarios.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeIndustryScenario = (id: string) => {
    setIndustryScenarios(industryScenarios.filter((s) => s.id !== id));
  };

  const addGeoScenario = () => {
    setGeopoliticalScenarios([
      ...geopoliticalScenarios,
      {
        id: `geo-${Date.now()}`,
        name: "Regional Conflict",
        countries: [COUNTRIES[0]],
        impact: -0.2,
        startYear: 0,
        duration: 1,
        probability: 0.1,
      },
    ]);
  };

  const updateGeoScenario = (
    id: string,
    field: keyof GeopoliticalScenario,
    value: any
  ) => {
    setGeopoliticalScenarios(
      geopoliticalScenarios.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeGeoScenario = (id: string) => {
    setGeopoliticalScenarios(geopoliticalScenarios.filter((s) => s.id !== id));
  };

  const addInflationScenario = () => {
    setInflationScenarios([
      ...inflationScenarios,
      {
        id: `inf-${Date.now()}`,
        country: COUNTRIES[0],
        rate: 8,
        startYear: 0,
        duration: 1,
      },
    ]);
  };

  const updateInflationScenario = (
    id: string,
    field: keyof InflationScenario,
    value: any
  ) => {
    setInflationScenarios(
      inflationScenarios.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeInflationScenario = (id: string) => {
    setInflationScenarios(inflationScenarios.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#00D09C]/10 to-emerald-500/10 border border-[#00D09C]/30 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#00D09C] flex-shrink-0" />
          <div>
            <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">
              AI-Powered Scenario Analysis
            </h4>
            <p className="text-xs text-gray-700 dark:text-white/70 leading-relaxed">
              Our AI will analyze which of your holdings are affected by each scenario
              based on their industry, geography and business model. Each scenario's
              impact is customized per holding.
            </p>
          </div>
        </div>
      </div>

      {/* Industry Scenarios */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white">
            Industry Scenarios
          </h3>
          <button
            onClick={addIndustryScenario}
            className="flex items-center gap-1 text-xs text-[#00D09C] hover:text-[#00D09C]/80"
          >
            <Plus className="w-4 h-4" /> Add Scenario
          </button>
        </div>

        {industryScenarios.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-white/40 text-center py-4">
            No industry scenarios added. Click "Add Scenario" to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {industryScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Type
                    </label>
                    <select
                      value={scenario.type}
                      onChange={(e) =>
                        updateIndustryScenario(scenario.id, "type", e.target.value)
                      }
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    >
                      <option value="CRASH">Crash</option>
                      <option value="BOOM">Boom</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Industry
                    </label>
                    <select
                      value={scenario.industry}
                      onChange={(e) =>
                        updateIndustryScenario(
                          scenario.id,
                          "industry",
                          e.target.value as Industry
                        )
                      }
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    >
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Impact %
                    </label>
                    <input
                      type="number"
                      value={scenario.impact * 100}
                      onChange={(e) =>
                        updateIndustryScenario(
                          scenario.id,
                          "impact",
                          parseFloat(e.target.value) / 100 || 0
                        )
                      }
                      step="5"
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Start Year
                    </label>
                    <input
                      type="number"
                      value={scenario.startYear}
                      onChange={(e) =>
                        updateIndustryScenario(
                          scenario.id,
                          "startYear",
                          parseInt(e.target.value) || 0
                        )
                      }
                      min="0"
                      max={timeHorizon - 1}
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Duration (yrs)
                    </label>
                    <input
                      type="number"
                      value={scenario.duration}
                      onChange={(e) =>
                        updateIndustryScenario(
                          scenario.id,
                          "duration",
                          parseInt(e.target.value) || 1
                        )
                      }
                      min="1"
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 dark:text-white/40 uppercase">
                      Probability
                    </label>
                    <input
                      type="number"
                      value={scenario.probability * 100}
                      onChange={(e) =>
                        updateIndustryScenario(
                          scenario.id,
                          "probability",
                          parseFloat(e.target.value) / 100 || 0
                        )
                      }
                      step="5"
                      min="0"
                      max="100"
                      className="w-20 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                    <span className="text-xs text-gray-600 dark:text-white/60">%</span>
                  </div>
                  <button
                    onClick={() => removeIndustryScenario(scenario.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Geopolitical Scenarios */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white">
            Geopolitical Scenarios
          </h3>
          <button
            onClick={addGeoScenario}
            className="flex items-center gap-1 text-xs text-[#00D09C] hover:text-[#00D09C]/80"
          >
            <Plus className="w-4 h-4" /> Add Scenario
          </button>
        </div>

        {geopoliticalScenarios.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-white/40 text-center py-4">
            No geopolitical scenarios added.
          </p>
        ) : (
          <div className="space-y-3">
            {geopoliticalScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Scenario Name
                    </label>
                    <input
                      type="text"
                      value={scenario.name}
                      onChange={(e) =>
                        updateGeoScenario(scenario.id, "name", e.target.value)
                      }
                      placeholder="e.g., Trade War, Regional Conflict"
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1.5 uppercase">
                      Countries Involved
                    </label>
                    <CountryPillSelect
                      selected={scenario.countries}
                      onChange={(countries) => updateGeoScenario(scenario.id, "countries", countries)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Impact %
                    </label>
                    <input
                      type="number"
                      value={scenario.impact * 100}
                      onChange={(e) =>
                        updateGeoScenario(
                          scenario.id,
                          "impact",
                          parseFloat(e.target.value) / 100 || 0
                        )
                      }
                      step="5"
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Probability %
                    </label>
                    <input
                      type="number"
                      value={scenario.probability * 100}
                      onChange={(e) =>
                        updateGeoScenario(
                          scenario.id,
                          "probability",
                          parseFloat(e.target.value) / 100 || 0
                        )
                      }
                      step="5"
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Start Year
                    </label>
                    <input
                      type="number"
                      value={scenario.startYear}
                      onChange={(e) =>
                        updateGeoScenario(
                          scenario.id,
                          "startYear",
                          parseInt(e.target.value) || 0
                        )
                      }
                      min="0"
                      max={timeHorizon - 1}
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Duration (yrs)
                    </label>
                    <input
                      type="number"
                      value={scenario.duration}
                      onChange={(e) =>
                        updateGeoScenario(
                          scenario.id,
                          "duration",
                          parseInt(e.target.value) || 1
                        )
                      }
                      min="1"
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => removeGeoScenario(scenario.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inflation Scenarios */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white">
            Inflation Scenarios
          </h3>
          <button
            onClick={addInflationScenario}
            className="flex items-center gap-1 text-xs text-[#00D09C] hover:text-[#00D09C]/80"
          >
            <Plus className="w-4 h-4" /> Add Scenario
          </button>
        </div>

        {inflationScenarios.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-white/40 text-center py-4">
            No inflation scenarios added.
          </p>
        ) : (
          <div className="space-y-3">
            {inflationScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Country
                    </label>
                    <select
                      value={scenario.country}
                      onChange={(e) =>
                        updateInflationScenario(
                          scenario.id,
                          "country",
                          e.target.value as Country
                        )
                      }
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Rate % p.a.
                    </label>
                    <input
                      type="number"
                      value={scenario.rate}
                      onChange={(e) =>
                        updateInflationScenario(
                          scenario.id,
                          "rate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      step="0.5"
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Start Year
                    </label>
                    <input
                      type="number"
                      value={scenario.startYear}
                      onChange={(e) =>
                        updateInflationScenario(
                          scenario.id,
                          "startYear",
                          parseInt(e.target.value) || 0
                        )
                      }
                      min="0"
                      max={timeHorizon - 1}
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                        Duration (yrs)
                      </label>
                      <input
                        type="number"
                        value={scenario.duration}
                        onChange={(e) =>
                          updateInflationScenario(
                            scenario.id,
                            "duration",
                            parseInt(e.target.value) || 1
                          )
                        }
                        min="1"
                        className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                      />
                    </div>
                    <button
                      onClick={() => removeInflationScenario(scenario.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 pb-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Continue in parent file for Review and Results steps...
