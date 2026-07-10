import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Plus,
  Trash2,
  Play,
  ChevronRight,
  ChevronLeft,
  Loader2,
  FileSpreadsheet,
  Calendar,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  Moon,
  Sun,
  Info,
} from "lucide-react";
import { StockHolding, MFHolding } from "@/lib/portfolioEngine";
import {
  INDUSTRIES,
  COUNTRIES,
  Industry,
  Country,
  IndustryScenario,
  GeopoliticalScenario,
  InflationScenario,
  YearlyInvestmentPlan,
  AdvancedSimulationInput,
  AdvancedSimulationResult,
  runAdvancedSimulation,
} from "@/lib/advancedSimulation";
import {
  InvestmentPlanStep,
  ScenarioBuilderStep,
} from "@/components/simulation/SimulationSteps";

function formatINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdvancedSimulationPage() {
  const [step, setStep] = useState(0); // 0-4
  const [isDark, setIsDark] = useState(false);

  // Portfolio data
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [mutualFunds, setMutualFunds] = useState<MFHolding[]>([]);
  const [cashBalance, setCashBalance] = useState(0);

  // Time horizon
  const [timeHorizon, setTimeHorizon] = useState(10);

  // Investment plans
  const [investmentPlans, setInvestmentPlans] = useState<YearlyInvestmentPlan[]>(
    Array.from({ length: 10 }, (_, i) => ({
      year: i,
      sipAmount: 0,
      swpAmount: 0,
      lumpsum: 0,
      stockPurchases: [],
    }))
  );

  // Scenarios
  const [industryScenarios, setIndustryScenarios] = useState<IndustryScenario[]>([]);
  const [geopoliticalScenarios, setGeopoliticalScenarios] = useState<GeopoliticalScenario[]>([]);
  const [inflationScenarios, setInflationScenarios] = useState<InflationScenario[]>([]);

  // Parameters
  const [baseExpectedReturn, setBaseExpectedReturn] = useState(12);
  const [baseVolatility, setBaseVolatility] = useState(18);

  // Simulation
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<AdvancedSimulationResult | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme-mode");
    if (storedTheme) {
      const dark = storedTheme === "dark";
      setIsDark(dark);
      applyTheme(dark);
    } else {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(dark);
      applyTheme(dark);
    }
  }, []);

  useEffect(() => {
    setInvestmentPlans(
      Array.from({ length: timeHorizon }, (_, i) => ({
        year: i,
        sipAmount: investmentPlans[i]?.sipAmount || 0,
        swpAmount: investmentPlans[i]?.swpAmount || 0,
        lumpsum: investmentPlans[i]?.lumpsum || 0,
        stockPurchases: investmentPlans[i]?.stockPurchases || [],
      }))
    );
  }, [timeHorizon]);

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    applyTheme(newDark);
    localStorage.setItem("theme-mode", newDark ? "dark" : "light");
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const newStocks: StockHolding[] = [];
    const newMFs: MFHolding[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const type = values[headers.indexOf("type")]?.toLowerCase();

      if (type === "stock") {
        newStocks.push({
          symbol: values[headers.indexOf("symbol")] || "",
          name: values[headers.indexOf("name")] || "",
          qty: parseFloat(values[headers.indexOf("qty")]) || 0,
          avgBuyPrice: parseFloat(values[headers.indexOf("avgbuyprice")]) || 0,
          currentPrice: parseFloat(values[headers.indexOf("currentprice")]) || 0,
          currentValue: parseFloat(values[headers.indexOf("currentvalue")]) || 0,
        });
      } else if (type === "mutualfund" || type === "mf") {
        newMFs.push({
          fundName: values[headers.indexOf("name")] || values[headers.indexOf("fundname")] || "",
          category: values[headers.indexOf("category")] || "Equity",
          investedAmount: parseFloat(values[headers.indexOf("investedamount")]) || 0,
          currentValue: parseFloat(values[headers.indexOf("currentvalue")]) || 0,
        });
      }
    }

    setStocks([...stocks, ...newStocks]);
    setMutualFunds([...mutualFunds, ...newMFs]);
  };

  const runSimulation = async () => {
    setSimulating(true);

    const input: AdvancedSimulationInput = {
      stocks,
      mutualFunds,
      cashBalance,
      timeHorizon,
      investmentPlans,
      industryScenarios,
      geopoliticalScenarios,
      inflationScenarios,
      baseExpectedReturn,
      baseVolatility,
      simulations: 5000, // Reduced for faster LLM processing
    };

    try {
      const simulationResult = await runAdvancedSimulation(input);
      setResult(simulationResult);
      setStep(4);
    } catch (error) {
      console.error("Simulation error:", error);
      alert("Simulation failed. Please check your inputs and try again.");
    } finally {
      setSimulating(false);
    }
  };

  const totalValue =
    stocks.reduce((sum, s) => sum + s.currentValue, 0) +
    mutualFunds.reduce((sum, m) => sum + m.currentValue, 0) +
    cashBalance;

  const STEPS = ["Portfolio", "Investment Plan", "Scenarios", "Review"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(158,162,248,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="top-0 z-50 backdrop-blur-xl">
        <div className="px-8 md:px-12 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-px h-5 bg-gray-300 dark:bg-white/15" />
            <div>
              <h1 className="text-lg font-black text-gray-900 dark:text-white leading-none">
                Advanced Portfolio Simulation
              </h1>
              <p className="text-[10px] text-gray-500 mt-2 dark:text-white/40 uppercase tracking-widest">
                AI-Powered Scenario Analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalValue > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-white/40">Portfolio Value</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatINR(totalValue)}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {!result ? (
          <>
            {/* Progress Stepper */}
            <div className="mb-8">
              <div className="flex items-center gap-0">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-0 flex-1">
                    <button
                      onClick={() => setStep(i)}
                      className="flex items-center gap-2 group"
                      disabled={simulating}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          i < step
                            ? "bg-[#00D09C] text-white"
                            : i === step
                            ? "bg-[#00D09C]/30 text-[#00D09C] border border-[#00D09C]"
                            : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/30"
                        }`}
                      >
                        {i < step ? "✓" : i + 1}
                      </div>
                      <span
                        className={`text-xs font-medium hidden sm:block ${
                          i === step
                            ? "text-[#00D09C]"
                            : "text-gray-500 dark:text-white/30"
                        }`}
                      >
                        {s}
                      </span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/10 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <PortfolioInputStep
                    stocks={stocks}
                    setStocks={setStocks}
                    mutualFunds={mutualFunds}
                    setMutualFunds={setMutualFunds}
                    cashBalance={cashBalance}
                    setCashBalance={setCashBalance}
                    onCSVUpload={handleCSVUpload}
                  />
                )}

                {step === 1 && (
                  <InvestmentPlanStep
                    timeHorizon={timeHorizon}
                    setTimeHorizon={setTimeHorizon}
                    investmentPlans={investmentPlans}
                    setInvestmentPlans={setInvestmentPlans}
                    stocks={stocks}
                  />
                )}

                {step === 2 && (
                  <ScenarioBuilderStep
                    timeHorizon={timeHorizon}
                    industryScenarios={industryScenarios}
                    setIndustryScenarios={setIndustryScenarios}
                    geopoliticalScenarios={geopoliticalScenarios}
                    setGeopoliticalScenarios={setGeopoliticalScenarios}
                    inflationScenarios={inflationScenarios}
                    setInflationScenarios={setInflationScenarios}
                  />
                )}

                {step === 3 && (
                  <ReviewStep
                    stocks={stocks}
                    mutualFunds={mutualFunds}
                    cashBalance={cashBalance}
                    timeHorizon={timeHorizon}
                    investmentPlans={investmentPlans}
                    industryScenarios={industryScenarios}
                    geopoliticalScenarios={geopoliticalScenarios}
                    inflationScenarios={inflationScenarios}
                    baseExpectedReturn={baseExpectedReturn}
                    setBaseExpectedReturn={setBaseExpectedReturn}
                    baseVolatility={baseVolatility}
                    setBaseVolatility={setBaseVolatility}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || simulating}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={simulating}
                  className="flex items-center gap-2 text-sm bg-[#00D09C] text-white hover:opacity-90 px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={runSimulation}
                  disabled={simulating || totalValue === 0}
                  className="flex items-center gap-2 text-sm font-bold bg-[#00D09C] text-white hover:opacity-90 disabled:opacity-50 px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(158,162,248,0.3)]"
                >
                  {simulating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Run Simulation
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        ) : (
          <ResultsStep result={result} onReset={() => setResult(null)} />
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Portfolio Input ──────────────────────────────────────────────────

function PortfolioInputStep({
  stocks,
  setStocks,
  mutualFunds,
  setMutualFunds,
  cashBalance,
  setCashBalance,
  onCSVUpload,
}: {
  stocks: StockHolding[];
  setStocks: (s: StockHolding[]) => void;
  mutualFunds: MFHolding[];
  setMutualFunds: (m: MFHolding[]) => void;
  cashBalance: number;
  setCashBalance: (c: number) => void;
  onCSVUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const addStock = () => {
    setStocks([
      ...stocks,
      {
        symbol: "",
        name: "",
        qty: 0,
        avgBuyPrice: 0,
        currentPrice: 0,
        currentValue: 0,
      },
    ]);
  };

  const updateStock = (index: number, field: keyof StockHolding, value: any) => {
    const newStocks = [...stocks];
    (newStocks[index] as any)[field] = value;

    if (field === "qty" || field === "currentPrice") {
      newStocks[index].currentValue =
        newStocks[index].qty * newStocks[index].currentPrice;
    }

    setStocks(newStocks);
  };

  const removeStock = (index: number) => {
    setStocks(stocks.filter((_, i) => i !== index));
  };

  const addMF = () => {
    setMutualFunds([
      ...mutualFunds,
      { fundName: "", category: "Equity", investedAmount: 0, currentValue: 0 },
    ]);
  };

  const updateMF = (index: number, field: keyof MFHolding, value: any) => {
    const newMFs = [...mutualFunds];
    (newMFs[index] as any)[field] = value;
    setMutualFunds(newMFs);
  };

  const removeMF = (index: number) => {
    setMutualFunds(mutualFunds.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* CSV Upload */}
      <div className="bg-gradient-to-br from-[#00D09C]/10 to-emerald-500/10 border border-[#00D09C]/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <FileSpreadsheet className="w-8 h-8 text-[#00D09C] flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">
              Quick Import
            </h3>
            <p className="text-xs text-gray-600 dark:text-white/70 mb-4">
              Upload a CSV file with columns: type, symbol/name, qty, avgBuyPrice,
              currentPrice, currentValue, category, investedAmount
            </p>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D09C] text-white rounded-lg cursor-pointer hover:opacity-90 transition text-sm font-bold">
                <Upload className="w-4 h-4" />
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={onCSVUpload}
                  className="hidden"
                />
              </label>
              {/* <a
                href="/sample-portfolio.csv"
                download="sample-portfolio.csv"
                className="text-xs text-[#00D09C] hover:text-[#00D09C]/80 underline transition"
              >
                Download Sample CSV
              </a> */}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Entry - Stocks */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white">Stocks</h3>
          <button
            onClick={addStock}
            className="flex items-center gap-1 text-xs text-[#00D09C] hover:text-[#00D09C]/80 transition"
          >
            <Plus className="w-4 h-4" /> Add Stock
          </button>
        </div>

        {stocks.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-white/40 text-center py-4">
            No stocks added yet. Click "Add Stock" to begin.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-2 text-[10px] font-black text-gray-500 dark:text-white/30 uppercase tracking-widest px-1">
              <span>Symbol</span>
              <span>Qty</span>
              <span>Avg Price</span>
              <span>Current Price</span>
              <span>Value</span>
              <span></span>
            </div>
            {stocks.map((stock, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 items-center group">
                <input
                  value={stock.symbol}
                  onChange={(e) => updateStock(i, "symbol", e.target.value.toUpperCase())}
                  placeholder="RELIANCE"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                />
                <input
                  type="number"
                  value={stock.qty || ""}
                  onChange={(e) => updateStock(i, "qty", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                />
                <input
                  type="number"
                  value={stock.avgBuyPrice || ""}
                  onChange={(e) =>
                    updateStock(i, "avgBuyPrice", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                />
                <input
                  type="number"
                  value={stock.currentPrice || ""}
                  onChange={(e) =>
                    updateStock(i, "currentPrice", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                />
                <span className="text-xs text-gray-700 dark:text-white/70 font-medium">
                  {formatINR(stock.currentValue)}
                </span>
                <button
                  onClick={() => removeStock(i)}
                  className="opacity-0 group-hover:opacity-100 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Entry - Mutual Funds */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white">
            Mutual Funds
          </h3>
          <button
            onClick={addMF}
            className="flex items-center gap-1 text-xs text-[#00D09C] hover:text-[#00D09C]/80 transition"
          >
            <Plus className="w-4 h-4" /> Add Fund
          </button>
        </div>

        {mutualFunds.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-white/40 text-center py-4">
            No mutual funds added yet. Click "Add Fund" to begin.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-[10px] font-black text-gray-500 dark:text-white/30 uppercase tracking-widest px-1">
              <span className="col-span-2">Fund Name</span>
              <span>Category</span>
              <span>Current Value</span>
            </div>
            {mutualFunds.map((mf, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center group">
                <input
                  value={mf.fundName}
                  onChange={(e) => updateMF(i, "fundName", e.target.value)}
                  placeholder="Fund Name"
                  className="col-span-2 w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                />
                <select
                  value={mf.category}
                  onChange={(e) => updateMF(i, "category", e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                >
                  <option value="Equity">Equity</option>
                  <option value="Debt">Debt</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={mf.currentValue || ""}
                    onChange={(e) =>
                      updateMF(i, "currentValue", parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="flex-1 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
                  />
                  <button
                    onClick={() => removeMF(i)}
                    className="opacity-0 group-hover:opacity-100 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cash Balance */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <label className="block text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-2">
          Cash Balance ₹
        </label>
        <input
          type="number"
          value={cashBalance || ""}
          onChange={(e) => setCashBalance(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
        />
      </div>
    </div>
  );
}

// ─── Step 4: Review & Run ─────────────────────────────────────────────────────

function ReviewStep({
  stocks,
  mutualFunds,
  cashBalance,
  timeHorizon,
  investmentPlans,
  industryScenarios,
  geopoliticalScenarios,
  inflationScenarios,
  baseExpectedReturn,
  setBaseExpectedReturn,
  baseVolatility,
  setBaseVolatility,
}: {
  stocks: StockHolding[];
  mutualFunds: MFHolding[];
  cashBalance: number;
  timeHorizon: number;
  investmentPlans: YearlyInvestmentPlan[];
  industryScenarios: IndustryScenario[];
  geopoliticalScenarios: GeopoliticalScenario[];
  inflationScenarios: InflationScenario[];
  baseExpectedReturn: number;
  setBaseExpectedReturn: (v: number) => void;
  baseVolatility: number;
  setBaseVolatility: (v: number) => void;
}) {
  const totalValue =
    stocks.reduce((sum, s) => sum + s.currentValue, 0) +
    mutualFunds.reduce((sum, m) => sum + m.currentValue, 0) +
    cashBalance;

  const totalInvestment = investmentPlans.reduce(
    (sum, p) => sum + (p.sipAmount * 12 + p.lumpsum + (p.stockPurchases?.reduce((s, sp) => s + sp.amount, 0) || 0)),
    0
  );

  const totalWithdrawal = investmentPlans.reduce((sum, p) => sum + p.swpAmount * 12, 0);

  return (
    <div className="space-y-6">
      {/* Base Parameters */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">
          Base Market Parameters
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-white/50 mb-2">
              Expected Return (% p.a.)
            </label>
            <input
              type="number"
              value={baseExpectedReturn}
              onChange={(e) => setBaseExpectedReturn(parseFloat(e.target.value) || 0)}
              step="0.5"
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-white/50 mb-2">
              Volatility (% p.a.)
            </label>
            <input
              type="number"
              value={baseVolatility}
              onChange={(e) => setBaseVolatility(parseFloat(e.target.value) || 0)}
              step="1"
              className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#00D09C]"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-500" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase">
              Portfolio
            </h4>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{formatINR(totalValue)}</p>
          <p className="text-xs text-gray-600 dark:text-white/60 mt-1">
            {stocks.length} stocks, {mutualFunds.length} funds
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase">
              Total Investment
            </h4>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {formatINR(totalInvestment)}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/60 mt-1">
            Over {timeHorizon} years
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-purple-500" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase">
              Scenarios
            </h4>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {industryScenarios.length + geopoliticalScenarios.length + inflationScenarios.length}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/60 mt-1">
            {industryScenarios.length} industry, {geopoliticalScenarios.length} geo,{" "}
            {inflationScenarios.length} inflation
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">
          Simulation Configuration
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-white/60">Time Horizon</span>
            <span className="font-bold text-gray-900 dark:text-white">{timeHorizon} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-white/60">Expected Return</span>
            <span className="font-bold text-gray-900 dark:text-white">{baseExpectedReturn}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-white/60">Volatility</span>
            <span className="font-bold text-gray-900 dark:text-white">{baseVolatility}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-white/60">Monte Carlo Simulations</span>
            <span className="font-bold text-gray-900 dark:text-white">5,000 runs</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#00D09C]/10 to-emerald-500/10 border border-[#00D09C]/30 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#00D09C] flex-shrink-0" />
          <div>
            <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">
              Ready to Simulate
            </h4>
            <p className="text-xs text-gray-700 dark:text-white/70 leading-relaxed">
              Our AI will analyze each of your {stocks.length + mutualFunds.length} holdings to
              determine which scenarios affect them and by how much. This may take 30-60 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Results Step ─────────────────────────────────────────────────────────────

function ResultsStep({
  result,
  onReset,
}: {
  result: AdvancedSimulationResult;
  onReset: () => void;
}) {
  const meanReturn =
    ((result.statistics.mean / (result.statistics.median || 1) - 1) * 100).toFixed(1);
  const isProfit = result.statistics.mean > result.statistics.median;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">
            Expected Value
          </p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {formatINR(result.statistics.mean)}
          </p>
          <p
            className={`text-sm mt-1 ${
              isProfit
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {isProfit ? (
              <TrendingUp className="w-4 h-4 inline" />
            ) : (
              <TrendingDown className="w-4 h-4 inline" />
            )}{" "}
            {meanReturn}%
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">
            Best Case (90th %)
          </p>
          <p className="text-2xl font-black text-green-600 dark:text-green-400">
            {formatINR(result.statistics.p90)}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/50 mt-1">Top 10% outcome</p>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">
            Worst Case (10th %)
          </p>
          <p className="text-2xl font-black text-red-600 dark:text-red-400">
            {formatINR(result.statistics.p10)}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/50 mt-1">Bottom 10% outcome</p>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">
            Risk of Loss
          </p>
          <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
            {formatPercent(result.probabilityOfLoss)}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/50 mt-1">
            Below initial value
          </p>
        </div>
      </div>

      {/* Holding Impacts */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#00D09C]" />
          AI Impact Analysis - Affected Holdings
        </h3>

        {result.holdingImpacts.filter((h) => h.affectedBy.length > 0).length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-white/40 text-center py-4">
            No holdings significantly affected by the configured scenarios.
          </p>
        ) : (
          <div className="space-y-3">
            {result.holdingImpacts
              .filter((h) => h.affectedBy.length > 0)
              .map((holding) => (
                <div
                  key={holding.symbol}
                  className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {holding.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-white/40">
                        {holding.type === "stock" ? "Stock" : "Mutual Fund"} •{" "}
                        {formatINR(holding.baseValue)}
                      </p>
                    </div>
                    <span className="text-xs bg-[#00D09C]/20 text-[#00D09C] px-2 py-1 rounded">
                      {holding.affectedBy.length} scenario(s)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {holding.affectedBy.map((impact, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs bg-gray-50 dark:bg-black/20 rounded-lg p-2"
                      >
                        <div
                          className={`flex-shrink-0 w-16 text-right font-bold ${
                            impact.impactPercent > 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {impact.impactPercent > 0 ? "+" : ""}
                          {impact.impactPercent.toFixed(1)}%
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {impact.scenarioName || impact.scenarioId}
                          </p>
                          <p className="text-gray-600 dark:text-white/60 mt-0.5">
                            {impact.reasoning}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Year-wise Breakdown */}
      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">
          Year-wise Expected Value
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {result.yearlyBreakdown.map((year) => (
            <div
              key={year.year}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-center"
            >
              <p className="text-xs text-gray-500 dark:text-white/40 mb-1">Year {year.year}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {formatINR(year.meanValue)}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-white/40 mt-1">
                {formatINR(year.p10)} - {formatINR(year.p90)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">
            Sharpe Ratio
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {result.riskMetrics.sharpeRatio.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/50 mt-1">Risk-adjusted returns</p>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">
            Max Drawdown
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatPercent(result.riskMetrics.maxDrawdown)}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/50 mt-1">Largest potential loss</p>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">
            Value at Risk (95%)
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatINR(result.riskMetrics.valueAtRisk95)}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/50 mt-1">95% confidence floor</p>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-white/15 transition border border-gray-300 dark:border-white/20"
        >
          Run New Simulation
        </button>
      </div>
    </motion.div>
  );
}
