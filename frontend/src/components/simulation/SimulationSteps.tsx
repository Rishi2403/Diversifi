import { Plus, Trash2, Calendar, Zap, AlertCircle, CheckCircle, Info, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  Industry,
  Country,
  INDUSTRIES,
  COUNTRIES,
  IndustryScenario,
  GeopoliticalScenario,
  InflationScenario,
  YearlyInvestmentPlan,
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

export function InvestmentPlanStep({
  timeHorizon,
  setTimeHorizon,
  investmentPlans,
  setInvestmentPlans,
  stocks,
}: {
  timeHorizon: number;
  setTimeHorizon: (h: number) => void;
  investmentPlans: YearlyInvestmentPlan[];
  setInvestmentPlans: (plans: YearlyInvestmentPlan[]) => void;
  stocks: StockHolding[];
}) {
  const updatePlan = (year: number, field: keyof YearlyInvestmentPlan, value: any) => {
    const newPlans = [...investmentPlans];
    const planIndex = newPlans.findIndex((p) => p.year === year);
    if (planIndex >= 0) {
      (newPlans[planIndex] as any)[field] = value;
      setInvestmentPlans(newPlans);
    }
  };

  const addStockPurchase = (year: number) => {
    const newPlans = [...investmentPlans];
    const planIndex = newPlans.findIndex((p) => p.year === year);
    if (planIndex >= 0) {
      const current = newPlans[planIndex].stockPurchases || [];
      newPlans[planIndex].stockPurchases = [...current, { symbol: "", amount: 0 }];
      setInvestmentPlans(newPlans);
    }
  };

  const updateStockPurchase = (
    year: number,
    purchaseIndex: number,
    field: "symbol" | "amount",
    value: any
  ) => {
    const newPlans = [...investmentPlans];
    const planIndex = newPlans.findIndex((p) => p.year === year);
    if (planIndex >= 0 && newPlans[planIndex].stockPurchases) {
      (newPlans[planIndex].stockPurchases![purchaseIndex] as any)[field] = value;
      setInvestmentPlans(newPlans);
    }
  };

  const removeStockPurchase = (year: number, purchaseIndex: number) => {
    const newPlans = [...investmentPlans];
    const planIndex = newPlans.findIndex((p) => p.year === year);
    if (planIndex >= 0 && newPlans[planIndex].stockPurchases) {
      newPlans[planIndex].stockPurchases = newPlans[planIndex].stockPurchases!.filter(
        (_, i) => i !== purchaseIndex
      );
      setInvestmentPlans(newPlans);
    }
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
          min="1"
          max="30"
          className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
        />
        <p className="text-xs text-gray-500 dark:text-white/40 mt-2">
          Configure investment plans for each year of your simulation (1-30 years)
        </p>
      </div>

      {/* Year-wise Plans */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Year-wise Investment Plans
        </h3>

        {investmentPlans.map((plan) => (
          <div
            key={plan.year}
            className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Year {plan.year + 1}
              </h4>
              <span className="text-xs text-gray-500 dark:text-white/40">
                {new Date().getFullYear() + plan.year}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                  Monthly SIP ₹
                </label>
                <input
                  type="number"
                  value={plan.sipAmount || ""}
                  onChange={(e) =>
                    updatePlan(plan.year, "sipAmount", parseInt(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                  Monthly SWP ₹
                </label>
                <input
                  type="number"
                  value={plan.swpAmount || ""}
                  onChange={(e) =>
                    updatePlan(plan.year, "swpAmount", parseInt(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                  Lumpsum ₹
                </label>
                <input
                  type="number"
                  value={plan.lumpsum || ""}
                  onChange={(e) =>
                    updatePlan(plan.year, "lumpsum", parseInt(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                />
              </div>
            </div>

            {/* Stock Purchases */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-gray-500 dark:text-white/40 uppercase">
                  Stock Purchases (one-time)
                </label>
                <button
                  onClick={() => addStockPurchase(plan.year)}
                  className="text-xs text-[#00D09C] hover:text-[#00D09C]/80 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              {plan.stockPurchases && plan.stockPurchases.length > 0 ? (
                <div className="space-y-2">
                  {plan.stockPurchases.map((purchase, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={purchase.symbol}
                        onChange={(e) =>
                          updateStockPurchase(plan.year, i, "symbol", e.target.value)
                        }
                        className="flex-1 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                      >
                        <option value="">Select stock...</option>
                        {stocks.map((s) => (
                          <option key={s.symbol} value={s.symbol}>
                            {s.symbol} - {s.name || s.symbol}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={purchase.amount || ""}
                        onChange={(e) =>
                          updateStockPurchase(
                            plan.year,
                            i,
                            "amount",
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="Amount ₹"
                        className="w-32 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                      />
                      <button
                        onClick={() => removeStockPurchase(plan.year, i)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-white/40 italic">
                  No stock purchases planned
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
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
              based on their industry, geography, and business model. Each scenario's
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
                    <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1 uppercase">
                      Countries Involved
                    </label>
                    <select
                      multiple
                      value={scenario.countries}
                      onChange={(e) => {
                        const selected = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value as Country
                        );
                        updateGeoScenario(scenario.id, "countries", selected);
                      }}
                      className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                      size={4}
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-500 dark:text-white/40 mt-1">
                      Hold Ctrl/Cmd to select multiple
                    </p>
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
