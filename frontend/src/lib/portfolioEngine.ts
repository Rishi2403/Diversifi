// ─── Types ────────────────────────────────────────────────────────────────────

import { SECTOR_MAP, ALL_SECTORS, MF_TOP_HOLDINGS, categorySimilarityScore, NIFTY50_WEIGHTS, NIFTY500_WEIGHTS,  } from "./data";

export interface StockHolding {
  symbol: string;
  name?: string;
  qty: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  buyDate?: string;
}

export interface MFHolding {
  fundName: string;
  category: string;
  investedAmount: number;
  currentValue: number;
  buyDate?: string;
}

export interface PortfolioInput {
  stocks: StockHolding[];
  mutualFunds: MFHolding[];
  cashBalance: number;
  riskProfile: "Conservative" | "Moderate" | "Aggressive";
  investmentGoal: string;
  age?: number;
  monthlyInvestment?: number;
  benchmark: "nifty50" | "nifty500";
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  benchmarkPct: number;
  delta: number;
  status: "overweight" | "underweight" | "aligned" | "missing";
}

export interface ConcentrationRisk {
  topHoldings: { name: string; pct: number; isRisk: boolean }[];
  sectorRisks: { sector: string; pct: number; isRisk: boolean }[];
  top3Risk: boolean;
  tooManyPositions: boolean;
  stockCountRisk: boolean;
}

export interface MFOverlap {
  fund1: string;
  fund2: string;
  category1: string;
  category2: string;
  sharedStocks: string[];
  overlapScore: number;
  overlapType: "category" | "holdings" | "both";
  reason: string;
}

export interface Recommendation {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  emoji: string;
  title: string;
  description: string;
  action: string;
}

export interface RebalanceSuggestion {
  type: "BUY" | "REDUCE" | "CONSOLIDATE" | "SWITCH";
  asset: string;
  reason: string;
  currentPct?: number;
  targetPct?: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface PortfolioAnalysis {
  healthScore: number;
  diversificationScore: number;
  totalValue: number;
  sectorAllocations: SectorAllocation[];
  assetClassBreakdown: { name: string; value: number; pct: number }[];
  concentrationRisk: ConcentrationRisk;
  mfOverlaps: MFOverlap[];
  recommendations: Recommendation[];
  rebalanceSuggestions: RebalanceSuggestion[];
  projectedAllocations: SectorAllocation[];
  scoreBreakdown: {
    sectorSpread: number;
    assetClassSpread: number;
    concentrationSafe: number;
    mfOverlapSafe: number;
    riskAlignment: number;
    benchmarkAlign: number;
  };
}

// ─── Static Data ──────────────────────────────────────────────────────────────



// ─── Engine ───────────────────────────────────────────────────────────────────

function getSector(symbol: string): string {
  return SECTOR_MAP[symbol.toUpperCase()] ?? "Others";
}

function calcSectorAllocations(
  stocks: StockHolding[],
  totalStockValue: number,
  benchmarkWeights: Record<string, number>
): SectorAllocation[] {
  const map: Record<string, number> = {};
  for (const s of stocks) {
    const sec = getSector(s.symbol);
    map[sec] = (map[sec] ?? 0) + s.currentValue;
  }
  return ALL_SECTORS.map((sector) => {
    const value = map[sector] ?? 0;
    const pct = totalStockValue > 0 ? (value / totalStockValue) * 100 : 0;
    const bench = benchmarkWeights[sector] ?? 0;
    const delta = pct - bench;
    let status: SectorAllocation["status"] = "aligned";
    if (pct === 0 && bench > 0) status = "missing";
    else if (delta > 5) status = "overweight";
    else if (delta < -5) status = "underweight";
    return { sector, value, percentage: +pct.toFixed(2), benchmarkPct: bench, delta: +delta.toFixed(2), status };
  }).filter((s) => s.value > 0 || s.benchmarkPct > 0);
}

function calcConcentration(stocks: StockHolding[], totalValue: number): ConcentrationRisk {
  const sorted = [...stocks].sort((a, b) => b.currentValue - a.currentValue);
  // Measure per-stock concentration against stock-only total - MF value diluting stock risk is misleading
  const stockTotal = stocks.reduce((a, s) => a + s.currentValue, 0);
  const stockBase = stockTotal > 0 ? stockTotal : totalValue;
  const topHoldings = sorted.slice(0, 10).map((s) => {
    const pct = stockBase > 0 ? (s.currentValue / stockBase) * 100 : 0;
    return { name: s.symbol, pct: +pct.toFixed(2), isRisk: pct > 15 };
  });
  const sectorMap: Record<string, number> = {};
  for (const s of stocks) {
    const sec = getSector(s.symbol);
    sectorMap[sec] = (sectorMap[sec] ?? 0) + s.currentValue;
  }
  // Sector risk measured vs total portfolio (correct - sector dominance is portfolio-level risk)
  const sectorRisks = Object.entries(sectorMap).map(([sector, val]) => {
    const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
    return { sector, pct: +pct.toFixed(2), isRisk: pct > 25 };
  });
  const top3Sum = sorted.slice(0, 3).reduce((acc, s) => acc + s.currentValue, 0);
  const top3Pct = stockBase > 0 ? (top3Sum / stockBase) * 100 : 0;
  return {
    topHoldings,
    sectorRisks,
    top3Risk: top3Pct > 45,
    tooManyPositions: stocks.length > 25,
    stockCountRisk: stocks.length > 25,
  };
}

function findMFHoldings(fundName: string): string[] {
  if (MF_TOP_HOLDINGS[fundName]) return MF_TOP_HOLDINGS[fundName];
  const norm = fundName.toLowerCase();
  for (const [key, holdings] of Object.entries(MF_TOP_HOLDINGS)) {
    if (norm.includes(key.toLowerCase()) || key.toLowerCase().includes(norm)) {
      return holdings;
    }
  }
  return [];
}

function detectMFOverlap(funds: MFHolding[]): MFOverlap[] {
  const overlaps: MFOverlap[] = [];

  for (let i = 0; i < funds.length; i++) {
    for (let j = i + 1; j < funds.length; j++) {
      const f1 = funds[i];
      const f2 = funds[j];

      // 1. Category-based structural overlap (SEBI mandate → sector profile similarity)
      const sameCategory = f1.category === f2.category;
      const catScore = categorySimilarityScore(f1.category, f2.category);

      // 2. Holdings-based overlap (augments - not all funds have hardcoded holdings)
      const h1 = findMFHoldings(f1.fundName);
      const h2 = findMFHoldings(f2.fundName);
      const shared = h1.length > 0 && h2.length > 0 ? h1.filter((s) => h2.includes(s)) : [];
      const holdingsScore = shared.length > 0
        ? Math.round((shared.length / Math.max(h1.length, h2.length)) * 100)
        : 0;

      const finalScore = Math.max(catScore, holdingsScore);
      const hasHoldingsData = shared.length > 0;
      const overlapType: MFOverlap["overlapType"] = hasHoldingsData && catScore >= 45
        ? "both" : hasHoldingsData ? "holdings" : "category";

      // Flag if: same category OR sector profile similarity ≥ 45%
      if (sameCategory || catScore >= 45) {
        let reason: string;
        if (sameCategory) {
          reason = `Both are ${f1.category} funds - SEBI mandates near-identical investment universe`;
        } else {
          reason = `${catScore}% sector overlap: ${f1.category} and ${f2.category} funds have similar mandates`;
        }

        overlaps.push({
          fund1: f1.fundName,
          fund2: f2.fundName,
          category1: f1.category,
          category2: f2.category,
          sharedStocks: shared,
          overlapScore: finalScore,
          overlapType,
          reason,
        });
      }
    }
  }

  return overlaps.sort((a, b) => b.overlapScore - a.overlapScore);
}

function calcDiversificationScore(
  sectorAllocations: SectorAllocation[],
  assetClassBreakdown: { name: string; pct: number }[],
  concentrationRisk: ConcentrationRisk,
  mfOverlaps: MFOverlap[],
  stocks: StockHolding[],
  input: PortfolioInput
): { score: number; breakdown: PortfolioAnalysis["scoreBreakdown"] } {
  const activeSectors = sectorAllocations.filter((s) => s.percentage > 0).length;
  const sectorSpread = Math.min(25, Math.round((activeSectors / 8) * 25));

  const hasStocks = stocks.length > 0;
  const hasMF = input.mutualFunds.length > 0;
  const hasCash = input.cashBalance > 0;
  const assetTypes = [hasStocks, hasMF, hasCash].filter(Boolean).length;
  const assetClassSpread = Math.min(20, assetTypes * 7);

  const stockConc = concentrationRisk.topHoldings.filter((h) => h.isRisk).length === 0;
  const sectConc = concentrationRisk.sectorRisks.filter((r) => r.isRisk).length === 0;
  const concentrationSafe = stockConc && sectConc && !concentrationRisk.top3Risk ? 30 : stockConc || sectConc ? 15 : 5;

  const mfOverlapSafe = mfOverlaps.length === 0 ? 15 : mfOverlaps.length === 1 ? 11 : mfOverlaps.length <= 3 ? 7 : mfOverlaps.length <= 5 ? 4 : 1;

  // Risk alignment
  const aggrSectors = sectorAllocations.filter((s) =>
    ["Consumer Cyclical", "Realty", "Metals"].includes(s.sector) && s.percentage > 10
  ).length;
  let riskAlignment = 10;
  if (input.riskProfile === "Conservative" && aggrSectors > 0) riskAlignment = 4;
  else if (input.riskProfile === "Moderate" && aggrSectors > 1) riskAlignment = 7;

  const benchmarkAlign = sectorAllocations.filter((s) => Math.abs(s.delta) <= 10).length >= 5 ? 10 : 5;

  // Max possible raw = 25+20+30+15+10+10 = 110. Normalize to 0-100 so score is a true percentage.
  const rawScore = sectorSpread + assetClassSpread + concentrationSafe + mfOverlapSafe + riskAlignment + benchmarkAlign;
  const score = Math.round((rawScore / 110) * 100);
  return {
    score,
    breakdown: { sectorSpread, assetClassSpread, concentrationSafe, mfOverlapSafe, riskAlignment, benchmarkAlign },
  };
}

function buildRecommendations(
  sectorAllocations: SectorAllocation[],
  concentrationRisk: ConcentrationRisk,
  mfOverlaps: MFOverlap[],
  input: PortfolioInput,
  totalValue: number
): Recommendation[] {
  const recs: Recommendation[] = [];
  let id = 0;
  const next = () => String(++id);

  const overweightSectors = sectorAllocations.filter((s) => s.status === "overweight");
  const underweightSectors = sectorAllocations.filter((s) => s.status === "underweight" || s.status === "missing");

  for (const s of overweightSectors) {
    recs.push({
      id: next(), severity: "HIGH", emoji: "⚠️",
      title: `${s.sector} Overexposure (${s.percentage}%)`,
      description: `Your ${s.sector} allocation is ${s.delta.toFixed(1)}% above the ${input.benchmark === "nifty50" ? "Nifty 50" : "Nifty 500"} benchmark (${s.benchmarkPct}%). This increases concentration risk.`,
      action: `Consider reducing ${s.sector} by ${Math.ceil(s.delta)}%`,
    });
  }

  for (const s of underweightSectors.slice(0, 3)) {
    recs.push({
      id: next(), severity: "MEDIUM", emoji: "📉",
      title: `${s.sector} Underweighted (${s.percentage}%)`,
      description: `You are ${Math.abs(s.delta).toFixed(1)}% underweight in ${s.sector} vs benchmark (${s.benchmarkPct}%). This reduces portfolio balance.`,
      action: `Gradually increase ${s.sector} exposure`,
    });
  }

  const riskHoldings = concentrationRisk.topHoldings.filter((h) => h.isRisk);
  for (const h of riskHoldings) {
    recs.push({
      id: next(), severity: "HIGH", emoji: "🎯",
      title: `${h.name} exceeds 15% concentration`,
      description: `Single stock ${h.name} is ${h.pct}% of your portfolio. This is above the safe 15% threshold and creates significant idiosyncratic risk.`,
      action: `Trim ${h.name} position to below 15%`,
    });
  }

  if (concentrationRisk.top3Risk) {
    recs.push({
      id: next(), severity: "HIGH", emoji: "🔴",
      title: "Top 3 Holdings Dominate Portfolio",
      description: "Your top 3 holdings account for more than 45% of the portfolio. A single adverse event can cause severe drawdown.",
      action: "Distribute capital more evenly across holdings",
    });
  }

  if (mfOverlaps.length > 0) {
    recs.push({
      id: next(), severity: "MEDIUM", emoji: "🔁",
      title: `${mfOverlaps.length} Mutual Fund Overlap${mfOverlaps.length > 1 ? "s" : ""} Detected`,
      description: `You hold funds with significant overlap: ${mfOverlaps.map((o) => `${o.fund1} & ${o.fund2}`).join("; ")}. Overlapping funds dilute diversification.`,
      action: "Consolidate or replace duplicate funds with different mandates",
    });
  }

  if (concentrationRisk.tooManyPositions) {
    recs.push({
      id: next(), severity: "LOW", emoji: "📦",
      title: "Too Many Small Positions",
      description: `You hold more than 25 stocks. Small positions (under 1%) have negligible impact on returns but increase complexity.`,
      action: "Consolidate positions under 1% into quality large-caps or index funds",
    });
  }

  if (input.riskProfile === "Conservative") {
    const fmcgPharma = sectorAllocations.filter((s) => ["FMCG", "Pharma"].includes(s.sector) && s.percentage < 5);
    if (fmcgPharma.length > 0) {
      recs.push({
        id: next(), severity: "MEDIUM", emoji: "🛡️",
        title: "Low Defensive Sector Allocation",
        description: "As a conservative investor, FMCG and Pharma provide stability during downturns. Your current exposure is low.",
        action: "Add FMCG/Pharma or Debt Funds for better stability",
      });
    }
  }

  return recs.slice(0, 8);
}

function buildRebalanceSuggestions(
  sectorAllocations: SectorAllocation[],
  input: PortfolioInput
): RebalanceSuggestion[] {
  const suggestions: RebalanceSuggestion[] = [];

  for (const s of sectorAllocations.filter((sec) => sec.status === "overweight")) {
    suggestions.push({
      type: "REDUCE", asset: s.sector, priority: "HIGH",
      reason: `${s.delta.toFixed(1)}% overweight vs ${input.benchmark} benchmark`,
      currentPct: s.percentage, targetPct: s.benchmarkPct,
    });
  }

  for (const s of sectorAllocations.filter((sec) => sec.status === "underweight" || sec.status === "missing")) {
    suggestions.push({
      type: "BUY", asset: s.sector, priority: "MEDIUM",
      reason: `${Math.abs(s.delta).toFixed(1)}% underweight - improve diversification`,
      currentPct: s.percentage, targetPct: s.benchmarkPct,
    });
  }

  if (input.riskProfile === "Conservative") {
    suggestions.push({
      type: "BUY", asset: "Debt / Liquid Funds", priority: "HIGH",
      reason: "Conservative profile benefits from 20-30% debt allocation for capital protection",
    });
  }

  return suggestions.slice(0, 8);
}

function buildProjectedAllocations(
  current: SectorAllocation[]
): SectorAllocation[] {
  return current.map((s) => {
    const adj = s.delta > 5 ? s.percentage - s.delta * 0.5 : s.delta < -5 ? s.percentage + Math.abs(s.delta) * 0.5 : s.percentage;
    const newPct = Math.max(0, Math.min(100, adj));
    const newDelta = newPct - s.benchmarkPct;
    return {
      ...s, percentage: +newPct.toFixed(2), delta: +newDelta.toFixed(2),
      status: Math.abs(newDelta) <= 5 ? "aligned" : newDelta > 5 ? "overweight" : "underweight",
    };
  });
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function analyzePortfolio(input: PortfolioInput): PortfolioAnalysis {
  const stockTotal = input.stocks.reduce((a, s) => a + s.currentValue, 0);
  const mfTotal = input.mutualFunds.reduce((a, m) => a + m.currentValue, 0);
  const totalValue = stockTotal + mfTotal + input.cashBalance;

  const benchmarkWeights = input.benchmark === "nifty50" ? NIFTY50_WEIGHTS : NIFTY500_WEIGHTS;

  const sectorAllocations = calcSectorAllocations(input.stocks, totalValue, benchmarkWeights);

  const assetClassBreakdown = [
    { name: "Stocks", value: stockTotal, pct: totalValue > 0 ? +((stockTotal / totalValue) * 100).toFixed(2) : 0 },
    { name: "Mutual Funds", value: mfTotal, pct: totalValue > 0 ? +((mfTotal / totalValue) * 100).toFixed(2) : 0 },
    { name: "Cash", value: input.cashBalance, pct: totalValue > 0 ? +((input.cashBalance / totalValue) * 100).toFixed(2) : 0 },
  ].filter((a) => a.value > 0);

  const concentrationRisk = calcConcentration(input.stocks, totalValue);
  const mfOverlaps = detectMFOverlap(input.mutualFunds);

  const { score: divScore, breakdown: scoreBreakdown } = calcDiversificationScore(
    sectorAllocations, assetClassBreakdown, concentrationRisk, mfOverlaps, input.stocks, input
  );

  // Health score: weighted blend of diversification + benchmark alignment - concentration penalties
  // Max before penalties: divScore(0-100)*0.55 + benchAlignPct*30 + overlapBonus(15) = 55+30+15 = 100
  const alignedSectors = sectorAllocations.filter((s) => Math.abs(s.delta) <= 10).length;
  const benchAlignPct = alignedSectors / Math.max(sectorAllocations.length, 1);
  const concPenalty = (concentrationRisk.topHoldings.filter((h) => h.isRisk).length * 5) + (concentrationRisk.top3Risk ? 15 : 0);
  const overlapBonus = mfOverlaps.length === 0 ? 15 : mfOverlaps.length === 1 ? 8 : mfOverlaps.length <= 3 ? 3 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(
    divScore * 0.55 + benchAlignPct * 30 + overlapBonus - concPenalty
  )));

  const recommendations = buildRecommendations(sectorAllocations, concentrationRisk, mfOverlaps, input, totalValue);
  const rebalanceSuggestions = buildRebalanceSuggestions(sectorAllocations, input);
  const projectedAllocations = buildProjectedAllocations(sectorAllocations);

  return {
    healthScore, diversificationScore: divScore, totalValue,
    sectorAllocations, assetClassBreakdown, concentrationRisk,
    mfOverlaps, recommendations, rebalanceSuggestions, projectedAllocations, scoreBreakdown,
  };
}

export const DEMO_PORTFOLIO: PortfolioInput = {
  stocks: [
    { symbol: "RELIANCE", name: "Reliance Industries", qty: 10, avgBuyPrice: 2500, currentPrice: 2980, currentValue: 29800, buyDate: "2022-08-15" },
    { symbol: "LT", name: "Larsen & Toubro", qty: 15, avgBuyPrice: 3200, currentPrice: 3600, currentValue: 54000, buyDate: "2022-03-10" },
    { symbol: "BHEL", name: "Bharat Heavy Electricals", qty: 80, avgBuyPrice: 200, currentPrice: 245, currentValue: 19600, buyDate: "2023-01-20" },
    { symbol: "CGPOWER", name: "CG Power", qty: 50, avgBuyPrice: 400, currentPrice: 620, currentValue: 31000, buyDate: "2022-11-05" },
    { symbol: "HDFCBANK", name: "HDFC Bank", qty: 20, avgBuyPrice: 1500, currentPrice: 1620, currentValue: 32400, buyDate: "2022-06-12" },
    { symbol: "ICICIBANK", name: "ICICI Bank", qty: 15, avgBuyPrice: 900, currentPrice: 1150, currentValue: 17250, buyDate: "2021-12-01" },
    { symbol: "TCS", name: "Tata Consultancy Services", qty: 5, avgBuyPrice: 3800, currentPrice: 3845, currentValue: 19225, buyDate: "2023-04-18" },
    { symbol: "SUNPHARMA", name: "Sun Pharma", qty: 20, avgBuyPrice: 1100, currentPrice: 1250, currentValue: 25000, buyDate: "2022-09-30" },
    { symbol: "SIEMENS", name: "Siemens India", qty: 10, avgBuyPrice: 5200, currentPrice: 6100, currentValue: 61000, buyDate: "2022-02-14" },
    { symbol: "ABB", name: "ABB India", qty: 8, avgBuyPrice: 4500, currentPrice: 5800, currentValue: 46400, buyDate: "2021-10-07" },
  ],
  mutualFunds: [
    { fundName: "Mirae Asset Large Cap", category: "Large Cap", investedAmount: 50000, currentValue: 62000, buyDate: "2022-01-10" },
    { fundName: "Axis Bluechip", category: "Large Cap", investedAmount: 40000, currentValue: 48000, buyDate: "2022-04-20" },
    { fundName: "SBI Large Cap", category: "Large Cap", investedAmount: 30000, currentValue: 36000, buyDate: "2021-09-15" },
    { fundName: "Parag Parikh Flexi Cap", category: "Flexi Cap", investedAmount: 60000, currentValue: 78000, buyDate: "2021-07-22" },
  ],
  cashBalance: 25000,
  riskProfile: "Moderate",
  investmentGoal: "wealth_growth",
  age: 30,
  monthlyInvestment: 15000,
  benchmark: "nifty50",
};
