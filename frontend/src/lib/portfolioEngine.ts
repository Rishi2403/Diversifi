// ─── Types ────────────────────────────────────────────────────────────────────

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

export const SECTOR_MAP: Record<string, string> = {
  // Financial Services
  HDFCBANK: "Financial Services", ICICIBANK: "Financial Services",
  SBIN: "Financial Services", KOTAKBANK: "Financial Services",
  AXISBANK: "Financial Services", BAJFINANCE: "Financial Services",
  BAJAJFINSV: "Financial Services", HDFCLIFE: "Financial Services",
  SBILIFE: "Financial Services", ICICIPRULI: "Financial Services",
  PNB: "Financial Services", BANKBARODA: "Financial Services",
  INDUSINDBK: "Financial Services", FEDERALBNK: "Financial Services",
  MUTHOOTFIN: "Financial Services", CHOLAFIN: "Financial Services",
  // IT
  TCS: "IT", INFY: "IT", WIPRO: "IT", HCLTECH: "IT",
  TECHM: "IT", LTIM: "IT", MPHASIS: "IT", PERSISTENT: "IT",
  COFORGE: "IT", OFSS: "IT", KPIT: "IT", TATAELXSI: "IT",
  // Energy
  RELIANCE: "Energy", ONGC: "Energy", NTPC: "Energy",
  POWERGRID: "Energy", ADANIGREEN: "Energy", TATAPOWER: "Energy",
  TORNTPOWER: "Energy", BPCL: "Energy", IOC: "Energy",
  HINDPETRO: "Energy", GAIL: "Energy",
  // Pharma
  SUNPHARMA: "Pharma", DRREDDY: "Pharma", CIPLA: "Pharma",
  DIVISLAB: "Pharma", AUROPHARMA: "Pharma", TORNTPHARM: "Pharma",
  LUPIN: "Pharma", BIOCON: "Pharma", ABBOTINDIA: "Pharma",
  ALKEM: "Pharma", LAURUSLABS: "Pharma",
  // FMCG
  HINDUNILVR: "FMCG", ITC: "FMCG", NESTLEIND: "FMCG",
  BRITANNIA: "FMCG", DABUR: "FMCG", GODREJCP: "FMCG",
  MARICO: "FMCG", COLPAL: "FMCG", EMAMILTD: "FMCG",
  TATACONSUM: "FMCG",
  // Industrials
  LT: "Industrials", LTTS: "Industrials", SIEMENS: "Industrials",
  ABB: "Industrials", BHEL: "Industrials", CGPOWER: "Industrials",
  HAVELLS: "Industrials", POLYCAB: "Industrials", CUMMINSIND: "Industrials",
  VOLTAS: "Industrials", THERMAX: "Industrials", AIAENG: "Industrials",
  ULTRACEMCO: "Industrials", SHREECEM: "Industrials", ACC: "Industrials",
  AMBUJACEM: "Industrials", GRASIM: "Industrials",
  // Auto
  MARUTI: "Auto", TMPV: "Auto", TMCV: "Auto", BAJAJ_AUTO: "Auto",
  EICHERMOT: "Auto", HEROMOTOCO: "Auto", "M&M": "Auto",
  TVSMOTORS: "Auto", ASHOKLEY: "Auto", BOSCHLTD: "Auto",
  // Consumer Cyclical
  TITAN: "Consumer Cyclical", DMART: "Consumer Cyclical",
  JUBLFOOD: "Consumer Cyclical", NAUKRI: "Consumer Cyclical",
  ZOMATO: "Consumer Cyclical", INDIGO: "Consumer Cyclical",
  // Telecom
  BHARTIARTL: "Telecom", IDEA: "Telecom", INDUSTOWER: "Telecom",
  // Metals
  TATASTEEL: "Metals", HINDALCO: "Metals", JSWSTEEL: "Metals",
  VEDL: "Metals", SAIL: "Metals", NMDC: "Metals",
  COALINDIA: "Metals", HINDZINC: "Metals",
  // Realty
  DLF: "Realty", GODREJPROP: "Realty", OBEROIRLTY: "Realty",
  PRESTIGE: "Realty", PHOENIXLTD: "Realty",
};

const NIFTY50_WEIGHTS: Record<string, number> = {
  "Financial Services": 35.45, "IT": 13.78, "Energy": 12.35,
  "FMCG": 9.12, "Auto": 7.24, "Industrials": 7.12,
  "Pharma": 4.89, "Consumer Cyclical": 4.56, "Telecom": 2.87,
  "Metals": 2.62, "Realty": 0, "Others": 0,
};

const NIFTY500_WEIGHTS: Record<string, number> = {
  "Financial Services": 28.5, "IT": 12.4, "Energy": 10.2,
  "FMCG": 7.8, "Auto": 8.1, "Industrials": 10.5,
  "Pharma": 6.2, "Consumer Cyclical": 5.8, "Telecom": 2.4,
  "Metals": 4.6, "Realty": 2.1, "Others": 1.4,
};

// ─── SEBI Category Overlap Matrix ────────────────────────────────────────────
// Score = expected % portfolio duplication between two funds of these categories.
// Driven primarily by market-cap universe overlap (SEBI mandates), not sector similarity.
// E.g. Large Cap must invest ≥80% in top-100 stocks — any two such funds share the same universe.
// Flexi Cap is ~55% large-cap by practice, so it overlaps Large Cap but not Small Cap.
const CATEGORY_BASE_OVERLAP: Record<string, Record<string, number>> = {
  "Large Cap":       { "Large Cap": 85, "Index": 75, "Flexi Cap": 55, "ELSS": 50, "Multi Cap": 40, "Large & Mid Cap": 45, "Value": 40, "Hybrid": 35, "Mid Cap": 8,  "Small Cap": 3  },
  "Mid Cap":         { "Mid Cap": 80, "Large & Mid Cap": 40, "Multi Cap": 35, "Flexi Cap": 30, "Small Cap": 15, "ELSS": 25, "Value": 25, "Hybrid": 20, "Large Cap": 8,  "Index": 10 },
  "Small Cap":       { "Small Cap": 65, "Multi Cap": 28, "Flexi Cap": 20, "Mid Cap": 15, "Large & Mid Cap": 12, "ELSS": 18, "Value": 20, "Hybrid": 10, "Large Cap": 3,  "Index": 5  },
  "Flexi Cap":       { "Flexi Cap": 55, "Large Cap": 55, "ELSS": 55, "Multi Cap": 50, "Index": 50, "Large & Mid Cap": 48, "Value": 45, "Hybrid": 40, "Mid Cap": 30, "Small Cap": 20 },
  "Multi Cap":       { "Multi Cap": 60, "Large & Mid Cap": 55, "Flexi Cap": 50, "ELSS": 48, "Large Cap": 40, "Value": 40, "Index": 38, "Hybrid": 35, "Mid Cap": 35, "Small Cap": 28 },
  "ELSS":            { "ELSS": 70, "Flexi Cap": 55, "Large Cap": 50, "Multi Cap": 48, "Index": 48, "Large & Mid Cap": 45, "Value": 45, "Hybrid": 38, "Mid Cap": 25, "Small Cap": 18 },
  "Index":           { "Index": 90, "Large Cap": 75, "Flexi Cap": 50, "ELSS": 48, "Large & Mid Cap": 42, "Multi Cap": 38, "Value": 38, "Hybrid": 30, "Mid Cap": 10, "Small Cap": 5  },
  "Large & Mid Cap": { "Large & Mid Cap": 72, "Multi Cap": 55, "Flexi Cap": 48, "Large Cap": 45, "ELSS": 45, "Index": 42, "Mid Cap": 40, "Value": 40, "Hybrid": 32, "Small Cap": 12 },
  "Value":           { "Value": 65, "Flexi Cap": 45, "ELSS": 45, "Large Cap": 40, "Multi Cap": 40, "Large & Mid Cap": 40, "Index": 38, "Mid Cap": 25, "Hybrid": 35, "Small Cap": 20 },
  "Hybrid":          { "Hybrid": 60, "Flexi Cap": 40, "ELSS": 38, "Large Cap": 35, "Multi Cap": 35, "Large & Mid Cap": 32, "Value": 35, "Index": 30, "Mid Cap": 20, "Small Cap": 10 },
  "Sectoral":        {},
};

function categorySimilarityScore(cat1: string, cat2: string): number {
  if (cat1 === cat2) return CATEGORY_BASE_OVERLAP[cat1]?.[cat1] ?? 65;
  return CATEGORY_BASE_OVERLAP[cat1]?.[cat2] ?? CATEGORY_BASE_OVERLAP[cat2]?.[cat1] ?? 0;
}

const MF_TOP_HOLDINGS: Record<string, string[]> = {
  "Mirae Asset Large Cap": ["HDFCBANK", "ICICIBANK", "RELIANCE", "INFY", "TCS"],
  "Axis Bluechip": ["HDFCBANK", "ICICIBANK", "RELIANCE", "INFY", "BAJFINANCE"],
  "SBI Large Cap": ["HDFCBANK", "ICICIBANK", "RELIANCE", "TCS", "KOTAKBANK"],
  "Kotak Flexi Cap": ["HDFCBANK", "ICICIBANK", "RELIANCE", "TCS", "INFY"],
  "HDFC Top 100": ["HDFCBANK", "ICICIBANK", "RELIANCE", "INFY", "SBIN"],
  "Parag Parikh Flexi Cap": ["INFY", "COALINDIA", "ITC", "BAJFINANCE", "HDFCBANK"],
  "UTI Nifty 50 Index": ["HDFCBANK", "RELIANCE", "INFY", "TCS", "ICICIBANK"],
  "HDFC Index Nifty 50": ["HDFCBANK", "RELIANCE", "INFY", "TCS", "ICICIBANK"],
  "HDFC Mid Cap Opportunities": ["LT", "PERSISTENT", "BHEL", "CGPOWER", "NTPC"],
  "Nippon India Small Cap": ["BHEL", "CGPOWER", "AIAENG", "POLYCAB", "HAVELLS"],
  "Axis Small Cap": ["AIAENG", "CUMMINSIND", "POLYCAB", "OBEROIRLTY", "PRESTIGE"],
  "DSP Midcap": ["BHEL", "CGPOWER", "POLYCAB", "PERSISTENT", "HAVELLS"],
};

const ALL_SECTORS = [
  "Financial Services", "IT", "Energy", "FMCG", "Auto",
  "Industrials", "Pharma", "Consumer Cyclical", "Telecom", "Metals", "Realty", "Others",
];

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
  // Measure per-stock concentration against stock-only total — MF value diluting stock risk is misleading
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
  // Sector risk measured vs total portfolio (correct — sector dominance is portfolio-level risk)
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

      // 2. Holdings-based overlap (augments — not all funds have hardcoded holdings)
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
          reason = `Both are ${f1.category} funds — SEBI mandates near-identical investment universe`;
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
      reason: `${Math.abs(s.delta).toFixed(1)}% underweight — improve diversification`,
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
