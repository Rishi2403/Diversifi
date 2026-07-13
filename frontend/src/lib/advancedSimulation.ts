// ─── Advanced Portfolio Simulation Engine with LLM Integration ───────────────

import { AnthropicFoundry } from "@anthropic-ai/foundry-sdk";
import { StockHolding, MFHolding } from "./portfolioEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export const INDUSTRIES = [
  "Agricultural",
  "Apparel & Accessories",
  "Automobile & Ancillaries",
  "Banking",
  "Consumer Durables",
  "Derived Materials",
  "Energy",
  "Financial",
  "FMCG",
  "Healthcare",
  "Hospitality & Travel",
  "Industrial Products",
  "Industries",
  "IT Industry",
  "Logistics & Freight",
  "Media & Entertainment",
  "Others",
  "Raw Material",
  "Tele-Communication",
  "Textile Industry",
] as const;

export const COUNTRIES = [
  "India",
  "United States",
  "China",
  "Japan",
  "Germany",
  "United Kingdom",
  "France",
  "Russia",
  "Middle East",
  "Global",
] as const;

export type Industry = typeof INDUSTRIES[number];
export type Country = typeof COUNTRIES[number];

export interface IndustryScenario {
  id: string;
  type: "CRASH" | "BOOM";
  industry: Industry;
  impact: number; // -1 to 1
  startYear: number;
  duration: number; // years
  probability: number; // 0-1
}

export interface GeopoliticalScenario {
  id: string;
  name: string;
  countries: Country[];
  impact: number; // -1 to 1
  startYear: number;
  duration: number; // years
  probability: number;
}

export interface InflationScenario {
  id: string;
  country: Country;
  rate: number; // annual %
  startYear: number;
  duration: number; // years
}

export interface SIPAllocation {
  fundName: string;
  amount: number; // monthly ₹
}

export interface YearlyInvestmentPlan {
  year: number;
  sipMode: "total" | "fundwise";
  sipAmount: number; // monthly total (when sipMode === "total")
  sipAllocations: SIPAllocation[]; // per-fund (when sipMode === "fundwise")
  swpAmount: number; // monthly
  lumpsum: number; // one-time at start of year
  stockPurchases?: { symbol: string; amount: number }[];
}

export interface AdvancedSimulationInput {
  // Portfolio
  stocks: StockHolding[];
  mutualFunds: MFHolding[];
  cashBalance: number;

  // Time
  timeHorizon: number; // years

  // Investment plans (year-wise)
  investmentPlans: YearlyInvestmentPlan[];

  // Scenarios
  industryScenarios: IndustryScenario[];
  geopoliticalScenarios: GeopoliticalScenario[];
  inflationScenarios: InflationScenario[];

  // General parameters
  baseExpectedReturn: number; // %
  baseVolatility: number; // %
  simulations: number;
}

export interface HoldingImpact {
  symbol: string;
  name: string;
  type: "stock" | "mutualfund";
  baseValue: number;
  affectedBy: {
    scenarioId: string;
    scenarioName: string;
    impactPercent: number;
    reasoning: string;
  }[];
}

export interface AdvancedSimulationResult {
  paths: {
    months: number[];
    values: number[];
    finalValue: number;
    eventsTriggered: {
      month: number;
      scenario: string;
      impact: number;
    }[];
  }[];
  statistics: {
    mean: number;
    median: number;
    p10: number;
    p25: number;
    p75: number;
    p90: number;
    best: number;
    worst: number;
    standardDeviation: number;
  };
  holdingImpacts: HoldingImpact[];
  yearlyBreakdown: {
    year: number;
    meanValue: number;
    p10: number;
    p90: number;
  }[];
  probabilityOfLoss: number;
  riskMetrics: {
    sharpeRatio: number;
    maxDrawdown: number;
    valueAtRisk95: number;
    valueAtRisk99: number;
  };
}

// ─── LLM Integration ──────────────────────────────────────────────────────────

/**
 * Analyze which holdings are affected by scenarios using LLM
 */
export async function analyzeHoldingImpacts(
  input: AdvancedSimulationInput,
  onProgress?: (pct: number, label: string) => void
): Promise<HoldingImpact[]> {
  const FOUNDRY_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const FOUNDRY_RESOURCE = import.meta.env.VITE_ANTHROPIC_FOUNDRY_RESOURCE;

  if (!FOUNDRY_API_KEY || !FOUNDRY_RESOURCE) {
    console.error("Anthropic Foundry credentials not found");
    return fallbackImpactAnalysis(input);
  }

  const holdings = [
    ...input.stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name || s.symbol,
      type: "stock" as const,
      value: s.currentValue,
    })),
    ...input.mutualFunds.map((m) => ({
      symbol: m.fundName,
      name: m.fundName,
      type: "mutualfund" as const,
      value: m.currentValue,
    })),
  ];

  const allScenarios = [
    ...input.industryScenarios.map((s) => ({
      id: s.id,
      name: `${s.type} in ${s.industry} industry`,
      type: "industry",
      impact: s.impact,
      industry: s.industry,
    })),
    ...input.geopoliticalScenarios.map((s) => ({
      id: s.id,
      name: s.name,
      type: "geopolitical",
      impact: s.impact,
      countries: s.countries,
    })),
  ];

  const holdingImpacts: HoldingImpact[] = [];

  // Process sequentially to avoid rate limiting and provide better progress
  console.log(`🤖 Starting AI analysis for ${holdings.length} holdings...`);

  for (let i = 0; i < holdings.length; i++) {
    const holding = holdings[i];
    onProgress?.(Math.round((i / holdings.length) * 100), `${holding.name} (${i + 1}/${holdings.length})`);

    try {
      const impact = await analyzeHoldingWithLLM(holding, allScenarios, FOUNDRY_API_KEY, FOUNDRY_RESOURCE);
      holdingImpacts.push(impact);

      // Small delay to avoid rate limiting (500ms between calls)
      if (i < holdings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to analyze ${holding.name}:`, error);
      // Use fallback for this holding
      const fallbackImpact = fallbackHoldingAnalysis(holding, allScenarios);
      holdingImpacts.push(fallbackImpact);
    }
  }

  console.log(`✅ AI analysis complete! ${holdingImpacts.length} holdings analyzed`);
  return holdingImpacts;
}

async function analyzeHoldingWithLLM(
  holding: {
    symbol: string;
    name: string;
    type: "stock" | "mutualfund";
    value: number;
  },
  scenarios: any[],
  apiKey: string,
  resource: string
): Promise<HoldingImpact> {
  const prompt = `You are a financial analyst analyzing how market scenarios affect specific holdings.

Holding Details:
- Name: ${holding.name}
- Symbol: ${holding.symbol}
- Type: ${holding.type}
- Current Value: ₹${holding.value}

Scenarios to analyze (use the exact id values shown below):
${scenarios.map((s) => `- id: "${s.id}" | name: "${s.name}" | base impact: ${(s.impact * 100).toFixed(0)}%`).join("\n")}

For each scenario, determine:
1. Will this holding be affected? (yes/no)
2. Impact percentage (-100 to +100)
3. Brief reasoning (one sentence)

Consider:
- For stocks: Company's industry, geography, business model
- For mutual funds: Fund category, holdings composition, diversification
- Industry-specific scenarios affect relevant sectors
- Geopolitical scenarios affect companies with exposure to those regions

Return ONLY a JSON array - one entry per scenario, using the EXACT id string from above:
[
  {
    "scenarioId": "<exact id from above>",
    "affected": true,
    "impactPercent": -30,
    "reasoning": "Brief explanation"
  }
]

Be realistic and conservative in impact estimates.`;

  try {
    const client = new AnthropicFoundry({
      apiKey,
      resource,
      dangerouslyAllowBrowser: true,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    if (!message.content[0] || message.content[0].type !== "text") {
      throw new Error("Invalid API response structure");
    }

    const text = message.content[0].text;

    // Extract JSON from markdown code blocks if present
    let jsonText = text;
    if (text.includes("```json")) {
      jsonText = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      jsonText = text.split("```")[1].split("```")[0].trim();
    }

    const analysis = JSON.parse(jsonText);

    if (!Array.isArray(analysis)) {
      throw new Error("Analysis result is not an array");
    }

    console.log(`✅ AI analyzed ${holding.name}: ${analysis.filter((a: any) => a.affected).length} scenarios affect it`);

    return {
      symbol: holding.symbol,
      name: holding.name,
      type: holding.type,
      baseValue: holding.value,
      affectedBy: analysis
        .filter((a: any) => a.affected)
        .map((a: any) => {
          const scenario = scenarios.find((s) => s.id === a.scenarioId);
          return {
            scenarioId: a.scenarioId,
            scenarioName: scenario?.name || scenarios.find((s) => s.name?.toLowerCase() === String(a.scenarioId).toLowerCase())?.name || a.scenarioId || "Scenario",
            impactPercent: a.impactPercent || 0,
            reasoning: a.reasoning || "No reasoning provided",
          };
        }),
    };
  } catch (error) {
    console.error(`❌ Error analyzing ${holding.symbol} with AI:`, error);
    console.log(`⚠️ Falling back to rule-based analysis for ${holding.name}`);
    // Fallback to rule-based analysis
    return fallbackHoldingAnalysis(holding, scenarios);
  }
}

function fallbackHoldingAnalysis(
  holding: any,
  scenarios: any[]
): HoldingImpact {
  // Rule-based fallback with industry mapping
  const affectedBy: any[] = [];
  const holdingText = `${holding.name} ${holding.symbol}`.toLowerCase();

  // Industry keywords mapping
  const industryKeywords: Record<string, string[]> = {
    banking: ["bank", "hdfc", "icici", "sbi", "axis", "kotak", "bajaj finance"],
    "it industry": ["tcs", "infosys", "infy", "wipro", "tech", "hcl", "it ", "software"],
    energy: ["reliance", "ongc", "oil", "gas", "power", "energy", "ntpc"],
    automobile: ["maruti", "tata motors", "bajaj auto", "hero", "mahindra", "auto"],
    pharma: ["pharma", "cipla", "sun pharma", "dr reddy", "healthcare", "health"],
    fmcg: ["unilever", "itc", "britannia", "nestle", "fmcg", "consumer"],
    financial: ["finance", "insurance", "hdfc", "icici", "sbi", "mutual fund", "capital"],
  };

  for (const scenario of scenarios) {
    if (scenario.type === "industry") {
      // Check industry mapping
      const industryName = scenario.industry.toLowerCase();
      const keywords = industryKeywords[industryName] || industryName.toLowerCase().split(" ");

      if (keywords.some((kw) => holdingText.includes(kw))) {
        affectedBy.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          impactPercent: scenario.impact * 100,
          reasoning: `Holding appears to be in ${scenario.industry} industry (rule-based match)`,
        });
      }
    } else if (scenario.type === "geopolitical") {
      // Geopolitical scenarios affect all holdings with reduced impact
      affectedBy.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        impactPercent: scenario.impact * 50, // 50% of full impact for general exposure
        reasoning: `General market exposure to ${scenario.name} (rule-based estimate)`,
      });
    }
  }

  return {
    symbol: holding.symbol,
    name: holding.name,
    type: holding.type,
    baseValue: holding.value,
    affectedBy,
  };
}

function fallbackImpactAnalysis(
  input: AdvancedSimulationInput
): HoldingImpact[] {
  const holdings = [
    ...input.stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name || s.symbol,
      type: "stock" as const,
      value: s.currentValue,
    })),
    ...input.mutualFunds.map((m) => ({
      symbol: m.fundName,
      name: m.fundName,
      type: "mutualfund" as const,
      value: m.currentValue,
    })),
  ];

  const allScenarios = [
    ...input.industryScenarios.map((s) => ({
      id: s.id,
      name: `${s.type} in ${s.industry} industry`,
      type: "industry",
      impact: s.impact,
      industry: s.industry,
    })),
  ];

  return holdings.map((holding) =>
    fallbackHoldingAnalysis(holding, allScenarios)
  );
}

// ─── Simulation Engine ────────────────────────────────────────────────────────

function randomNormal(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function runSingleAdvancedSimulation(
  input: AdvancedSimulationInput,
  holdingImpacts: HoldingImpact[],
  pathIndex: number
) {
  const monthlyReturn = input.baseExpectedReturn / 12 / 100;
  const monthlyVolatility = input.baseVolatility / Math.sqrt(12) / 100;
  const totalMonths = input.timeHorizon * 12;

  const months: number[] = [];
  const values: number[] = [];
  const eventsTriggered: {
    month: number;
    scenario: string;
    impact: number;
  }[] = [];

  // Initial portfolio value
  let portfolioValue =
    input.stocks.reduce((sum, s) => sum + s.currentValue, 0) +
    input.mutualFunds.reduce((sum, m) => sum + m.currentValue, 0) +
    input.cashBalance;

  // Portfolio composition tracking
  let holdingValues = new Map<string, number>();
  input.stocks.forEach((s) => holdingValues.set(s.symbol, s.currentValue));
  input.mutualFunds.forEach((m) =>
    holdingValues.set(m.fundName, m.currentValue)
  );

  for (let month = 0; month <= totalMonths; month++) {
    months.push(month);
    values.push(portfolioValue);

    if (month === totalMonths) break;

    const currentYear = Math.floor(month / 12);

    // Check for scenario triggers
    let scenarioImpact = 0;

    // Industry scenarios
    for (const scenario of input.industryScenarios) {
      const scenarioMonth = scenario.startYear * 12;
      const scenarioDurationMonths = scenario.duration * 12;

      if (
        month >= scenarioMonth &&
        month < scenarioMonth + scenarioDurationMonths
      ) {
        if (Math.random() < 1 - Math.pow(1 - scenario.probability, 1 / 12)) {
          // Apply impact to affected holdings
          for (const holdingImpact of holdingImpacts) {
            const affected = holdingImpact.affectedBy.find(
              (a) => a.scenarioId === scenario.id
            );
            if (affected) {
              const holdingValue = holdingValues.get(holdingImpact.symbol) || 0;
              const weightInPortfolio = holdingValue / portfolioValue;
              scenarioImpact += weightInPortfolio * (affected.impactPercent / 100);

              eventsTriggered.push({
                month,
                scenario: `${scenario.type} - ${scenario.industry}`,
                impact: affected.impactPercent,
              });
            }
          }
        }
      }
    }

    // Geopolitical scenarios
    for (const scenario of input.geopoliticalScenarios) {
      const scenarioMonth = scenario.startYear * 12;
      const scenarioDurationMonths = scenario.duration * 12;

      if (
        month >= scenarioMonth &&
        month < scenarioMonth + scenarioDurationMonths
      ) {
        if (Math.random() < 1 - Math.pow(1 - scenario.probability, 1 / 12)) {
          const affected = holdingImpacts.filter((h) =>
            h.affectedBy.some((a) => a.scenarioId === scenario.id)
          );

          for (const holdingImpact of affected) {
            const impactData = holdingImpact.affectedBy.find(
              (a) => a.scenarioId === scenario.id
            );
            if (impactData) {
              const holdingValue = holdingValues.get(holdingImpact.symbol) || 0;
              const weightInPortfolio = holdingValue / portfolioValue;
              scenarioImpact += weightInPortfolio * (impactData.impactPercent / 100);
            }
          }

          eventsTriggered.push({
            month,
            scenario: scenario.name,
            impact: scenario.impact * 100,
          });
        }
      }
    }

    // Apply inflation
    let monthlyInflation = 0;
    for (const infScenario of input.inflationScenarios) {
      const scenarioMonth = infScenario.startYear * 12;
      const scenarioDurationMonths = infScenario.duration * 12;

      if (
        month >= scenarioMonth &&
        month < scenarioMonth + scenarioDurationMonths
      ) {
        monthlyInflation = infScenario.rate / 12 / 100;
        break;
      }
    }

    // Monthly return with random walk
    const randomReturn = randomNormal(monthlyReturn, monthlyVolatility);
    const totalReturn = randomReturn + scenarioImpact;

    // Apply return
    portfolioValue *= 1 + totalReturn;

    // Apply inflation
    portfolioValue *= 1 - monthlyInflation;

    // Update holding values proportionally
    holdingValues.forEach((value, key) => {
      holdingValues.set(key, value * (1 + totalReturn) * (1 - monthlyInflation));
    });

    // Apply investment plan for current year
    const plan = input.investmentPlans.find((p) => p.year === currentYear);
    if (plan) {
      // Monthly SIP — resolved from sipMode
      const effectiveSip = plan.sipMode === "fundwise"
        ? (plan.sipAllocations || []).reduce((s, a) => s + a.amount, 0)
        : (plan.sipAmount || 0);
      if (effectiveSip > 0) portfolioValue += effectiveSip;

      // Monthly SWP
      if (plan.swpAmount > 0) {
        portfolioValue -= plan.swpAmount;
        portfolioValue = Math.max(0, portfolioValue);
      }

      // Lumpsum at start of year (month 0, 12, 24...)
      if (month % 12 === 0 && plan.lumpsum > 0) {
        portfolioValue += plan.lumpsum;
      }

      // Stock purchases at start of year
      if (month % 12 === 0 && plan.stockPurchases) {
        for (const purchase of plan.stockPurchases) {
          portfolioValue += purchase.amount;
          const current = holdingValues.get(purchase.symbol) || 0;
          holdingValues.set(purchase.symbol, current + purchase.amount);
        }
      }
    }
  }

  return {
    months,
    values,
    finalValue: values[values.length - 1],
    eventsTriggered,
  };
}

export async function runAdvancedSimulation(
  input: AdvancedSimulationInput,
  onProgress?: (pct: number, label: string) => void
): Promise<AdvancedSimulationResult> {
  // Step 1: Analyze holding impacts using LLM (0–55%)
  onProgress?.(0, "Starting AI analysis...");
  const holdingImpacts = await analyzeHoldingImpacts(input, (pct, label) => {
    onProgress?.(Math.round(pct * 0.55), `Analysing ${label}`);
  });

  // Step 2: Run Monte Carlo simulations (55–95%) — chunked for UI responsiveness
  const numSimulations = input.simulations || 5000;
  const allPaths: any[] = [];
  const finalValues: number[] = [];
  const YIELD_EVERY = 500;

  for (let i = 0; i < numSimulations; i++) {
    const path = runSingleAdvancedSimulation(input, holdingImpacts, i);
    allPaths.push(path);
    finalValues.push(path.finalValue);

    if (i > 0 && i % YIELD_EVERY === 0) {
      const pct = 55 + Math.round((i / numSimulations) * 40);
      onProgress?.(pct, `Monte Carlo: ${Math.round((i / numSimulations) * 100)}% (${i.toLocaleString()} / ${numSimulations.toLocaleString()} paths)`);
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  onProgress?.(95, "Computing statistics...");

  // Step 3: Calculate statistics
  const sortedValues = [...finalValues].sort((a, b) => a - b);

  const mean = finalValues.reduce((sum, v) => sum + v, 0) / numSimulations;
  const median = sortedValues[Math.floor(numSimulations / 2)];
  const p10 = sortedValues[Math.floor(numSimulations * 0.1)];
  const p25 = sortedValues[Math.floor(numSimulations * 0.25)];
  const p75 = sortedValues[Math.floor(numSimulations * 0.75)];
  const p90 = sortedValues[Math.floor(numSimulations * 0.9)];
  const best = sortedValues[numSimulations - 1];
  const worst = sortedValues[0];

  const variance =
    finalValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    numSimulations;
  const standardDeviation = Math.sqrt(variance);

  // Yearly breakdown
  const yearlyBreakdown = [];
  for (let year = 1; year <= input.timeHorizon; year++) {
    const monthIdx = year * 12;
    const yearValues = allPaths.map((p) => p.values[monthIdx] || p.finalValue);
    const yearSorted = [...yearValues].sort((a, b) => a - b);

    yearlyBreakdown.push({
      year,
      meanValue: yearValues.reduce((sum, v) => sum + v, 0) / numSimulations,
      p10: yearSorted[Math.floor(numSimulations * 0.1)],
      p90: yearSorted[Math.floor(numSimulations * 0.9)],
    });
  }

  // Probability of loss
  const initialValue =
    input.stocks.reduce((sum, s) => sum + s.currentValue, 0) +
    input.mutualFunds.reduce((sum, m) => sum + m.currentValue, 0) +
    input.cashBalance;

  const lossCount = finalValues.filter((v) => v < initialValue).length;
  const probabilityOfLoss = lossCount / numSimulations;

  // Risk metrics — annualised Sharpe using input volatility as the return vol estimator
  const annualisedReturn = Math.pow(mean / initialValue, 1 / input.timeHorizon) - 1;
  const riskFreeRate = 0.065; // India 10-yr G-sec proxy
  const sharpeRatio = (annualisedReturn - riskFreeRate) / (input.baseVolatility / 100);

  let maxDrawdown = 0;
  allPaths.forEach((path) => {
    let peak = path.values[0];
    path.values.forEach((value: number) => {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
  });

  const valueAtRisk95 = sortedValues[Math.floor(numSimulations * 0.05)];
  const valueAtRisk99 = sortedValues[Math.floor(numSimulations * 0.01)];

  // Sample paths for visualization
  const samplePaths = [];
  for (let i = 0; i < Math.min(50, numSimulations); i++) {
    const idx = Math.floor(Math.random() * numSimulations);
    samplePaths.push(allPaths[idx]);
  }

  onProgress?.(100, "Simulation complete");

  return {
    paths: samplePaths,
    statistics: {
      mean,
      median,
      p10,
      p25,
      p75,
      p90,
      best,
      worst,
      standardDeviation,
    },
    holdingImpacts,
    yearlyBreakdown,
    probabilityOfLoss,
    riskMetrics: {
      sharpeRatio,
      maxDrawdown,
      valueAtRisk95,
      valueAtRisk99,
    },
  };
}
