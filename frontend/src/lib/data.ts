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

export const NIFTY50_WEIGHTS: Record<string, number> = {
  "Financial Services": 35.45, "IT": 13.78, "Energy": 12.35,
  "FMCG": 9.12, "Auto": 7.24, "Industrials": 7.12,
  "Pharma": 4.89, "Consumer Cyclical": 4.56, "Telecom": 2.87,
  "Metals": 2.62, "Realty": 0, "Others": 0,
};

export const NIFTY500_WEIGHTS: Record<string, number> = {
  "Financial Services": 28.5, "IT": 12.4, "Energy": 10.2,
  "FMCG": 7.8, "Auto": 8.1, "Industrials": 10.5,
  "Pharma": 6.2, "Consumer Cyclical": 5.8, "Telecom": 2.4,
  "Metals": 4.6, "Realty": 2.1, "Others": 1.4,
};

// ─── SEBI Category Overlap Matrix ────────────────────────────────────────────
// Score = expected % portfolio duplication between two funds of these categories.
// Driven primarily by market-cap universe overlap (SEBI mandates), not sector similarity.
// E.g. Large Cap must invest ≥80% in top-100 stocks - any two such funds share the same universe.
// Flexi Cap is ~55% large-cap by practice, so it overlaps Large Cap but not Small Cap.
export const CATEGORY_BASE_OVERLAP: Record<string, Record<string, number>> = {
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

export function categorySimilarityScore(cat1: string, cat2: string): number {
  if (cat1 === cat2) return CATEGORY_BASE_OVERLAP[cat1]?.[cat1] ?? 65;
  return CATEGORY_BASE_OVERLAP[cat1]?.[cat2] ?? CATEGORY_BASE_OVERLAP[cat2]?.[cat1] ?? 0;
}

export const MF_TOP_HOLDINGS: Record<string, string[]> = {
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

export const ALL_SECTORS = [
  "Financial Services", "IT", "Energy", "FMCG", "Auto",
  "Industrials", "Pharma", "Consumer Cyclical", "Telecom", "Metals", "Realty", "Others",
];