export interface CommodityItem {
  name: string;
  symbol: string;
  unit: string;
  price: number;
  change: number;
  change_pct: number;
}


export interface CurrencyItem {
  pair: string;
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
}


export interface SectorItem {
  name: string;
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
}


export interface IndexItem {
  name: string;
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
}


export interface GlobalMarketData {
  commodities: CommodityItem[];
  currencies: CurrencyItem[];
  sectors: SectorItem[];
  country_indices: Record<string, IndexItem[]>;
  timestamp: string;
}


export interface FIIDIIData {
  date: string;
  fii_net: number;
  dii_net: number;
  fii_buy: number;
  fii_sell: number;
  dii_buy: number;
  dii_sell: number;
  source: string;
}


export async function fetchGlobalMarketData(): Promise<GlobalMarketData | null> {
  try {
    const res = await fetch("/global/market-data");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}


export async function fetchFIIDII(): Promise<FIIDIIData | null> {
  try {
    const res = await fetch("/global/fii-dii");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}





