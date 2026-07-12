import React, { useState, useEffect, useRef } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { fetchCountryGeopolitics, fetchGlobalBreakingNews, NewsArticle } from "@/services/newsService";
import { fetchGlobalMarketData, fetchFIIDII, GlobalMarketData, FIIDIIData, IndexItem } from "@/services/globalMarketService";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, ExternalLink, TrendingUp, TrendingDown,
  Newspaper, BarChart3, AlertTriangle, Activity,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";


// ── Static data ──────────────────────────────────────────────


const TARGET_COUNTRIES = ["IND", "USA", "JPN", "AUS", "CHN"];


const CONFLICT_ARCS = [
  { startLat: 38.0, startLng: -97.0, endLat: 32.42, endLng: 53.68 },
];


type SectorImpactRow = {
  sector: string;
  stocks: string;
  sensitivity: "high" | "medium" | "low";
  direction: "up" | "down" | "neutral" | "mixed";
  note: string;
};
type CountryImpact = {
  tradeVolume: string;
  exports: string;
  imports: string;
  sectorImpact: SectorImpactRow[];
  forexNote: string;
};


const INDIA_IMPACT_BY_COUNTRY: Record<string, CountryImpact> = {
  USA: {
    tradeVolume: "$78.3B",
    exports: "IT Services 35% · Pharma 18% · Textiles 12% · Engineering 10%",
    imports: "Crude Oil · Defence Equipment · Electronics · Aviation",
    sectorImpact: [
      { sector: "IT Services", stocks: "TCS, Infosys, Wipro, HCL", sensitivity: "high", direction: "down", note: "60%+ revenue from US clients; slowdown triggers guidance cuts" },
      { sector: "Pharma", stocks: "Sun Pharma, Dr Reddy's, Cipla", sensitivity: "medium", direction: "up", note: "US generics market: FDA ANDA approvals drive export growth" },
      { sector: "Textiles & Apparel", stocks: "Arvind, Welspun, KPR Mill", sensitivity: "medium", direction: "down", note: "US tariff changes directly affect apparel export orders" },
    ],
    forexNote: "USD/INR: A strong dollar boosts IT exporter revenues; RBI typically intervenes aggressively above ₹84.",
  },
  CHN: {
    tradeVolume: "$118.4B",
    exports: "Chemicals · Iron Ore · IT Hardware",
    imports: "Electronics 45% · Active Pharma Ingredients · Machinery · Solar Panels",
    sectorImpact: [
      { sector: "Metals & Steel", stocks: "Tata Steel, JSW Steel, SAIL", sensitivity: "high", direction: "down", note: "Chinese steel dumping creates severe pricing pressure on Indian producers" },
      { sector: "Chemicals & API", stocks: "PI Industries, Divi's Labs, Aarti Ind", sensitivity: "high", direction: "mixed", note: "Heavy API supply dependency; supply-chain decoupling creates long-term opportunity" },
      { sector: "Renewables", stocks: "Adani Green, Waaree Energies, NTPC", sensitivity: "medium", direction: "up", note: "PLI push reduces China panel dependency; domestic manufacturing wins" },
    ],
    forexNote: "CNY depreciation makes Chinese goods cheaper globally, hurting competitiveness of Indian exports in third markets.",
  },
  JPN: {
    tradeVolume: "$20.5B",
    exports: "Auto Components · Pharma · Chemicals",
    imports: "Machinery · Electronics · Steel Products",
    sectorImpact: [
      { sector: "Automobiles", stocks: "Maruti Suzuki, Tata Motors, M&M", sensitivity: "high", direction: "mixed", note: "Maruti's Suzuki JV makes Japanese technology shifts directly relevant to India" },
      { sector: "Electronics Mfg", stocks: "Dixon Technologies, Kaynes, Amber", sensitivity: "medium", direction: "up", note: "Japan supply-chain diversification into India as China+1 beneficiary" },
    ],
    forexNote: "JPY weakness triggers yen carry-trade unwinds → FII outflows from emerging markets including India.",
  },
  AUS: {
    tradeVolume: "$26.8B",
    exports: "Pharma · IT Services · Textiles",
    imports: "Coking Coal 40% · Gold · Copper · LNG",
    sectorImpact: [
      { sector: "Steel & Mining", stocks: "JSW Steel, Tata Steel, NMDC", sensitivity: "high", direction: "down", note: "Australia supplies ~30% of India's coking coal; price swings directly hit steelmakers" },
      { sector: "Power & Energy", stocks: "NTPC, Adani Power, Coal India", sensitivity: "medium", direction: "mixed", note: "Thermal coal pricing affects power generation input costs" },
      { sector: "Jewellery & Gold", stocks: "Titan, Kalyan Jewellers, PC Jeweller", sensitivity: "low", direction: "neutral", note: "Gold import volumes affect working capital; mild margin sensitivity" },
    ],
    forexNote: "AUD/INR fluctuations affect commodity import costs; AUD is a proxy for global risk appetite.",
  },
  IND: {
    tradeVolume: "Domestic",
    exports: "N/A — Domestic benchmark index",
    imports: "N/A — Domestic benchmark index",
    sectorImpact: [
      { sector: "Banking & Finance", stocks: "HDFC Bank, ICICI Bank, SBI, Kotak", sensitivity: "high", direction: "up", note: "RBI rate decisions and credit growth are the primary domestic drivers" },
      { sector: "Consumer & FMCG", stocks: "HUL, ITC, Nestle, Dabur", sensitivity: "medium", direction: "up", note: "Rural demand recovery and food inflation directly affect volume growth" },
      { sector: "Automobiles", stocks: "Maruti, M&M, Bajaj Auto, Hero Moto", sensitivity: "medium", direction: "up", note: "EV transition and festive-season demand are key near-term catalysts" },
    ],
    forexNote: "INR is managed by RBI within a band. Domestic liquidity and RBI repo-rate trajectory drive equity sentiment.",
  },
};


type AlertSector = { name: string; dir: "up" | "down" | "neutral"; note: string };
type AlertImpact = { headline: string; severity: "Critical" | "High" | "Moderate"; sectors: AlertSector[]; forex: string };


const INDIA_IMPACT_BY_ALERT: Record<string, AlertImpact> = {
  "Strait of Hormuz": {
    headline: "Crude supply shock: +8–15% oil price spike expected",
    severity: "Critical",
    sectors: [
      { name: "Energy — ONGC, BPCL, Oil India", dir: "up", note: "Upstream producers benefit directly from higher crude realisation" },
      { name: "Aviation — IndiGo, SpiceJet, Air India", dir: "down", note: "ATF costs rise 12–18%; every $10/bbl = ~₹800 Cr industry headwind" },
      { name: "Paints & Adhesives — Asian Paints, Pidilite", dir: "down", note: "Crude-linked input costs compress margins 150–200 bps" },
      { name: "Fertilisers — Coromandel, Chambal, GSFC", dir: "down", note: "Natural gas and shipping costs surge simultaneously" },
      { name: "IT Services — TCS, Infosys", dir: "neutral", note: "No direct commodity exposure; often acts as defensive safe haven" },
    ],
    forex: "INR likely to depreciate 0.8–1.5% vs USD as import bill widens; RBI expected to sell dollars to defend ₹84 level.",
  },
  "Eastern Europe Conflict": {
    headline: "Wheat, sunflower oil, fertiliser supply chains disrupted",
    severity: "High",
    sectors: [
      { name: "FMCG & Edible Oils — HUL, Adani Wilmar, Patanjali", dir: "down", note: "Sunflower oil shortage drives edible oil inflation; input cost pressure on all FMCG" },
      { name: "Fertilisers — GSFC, Coromandel, Chambal", dir: "down", note: "Urea and potash supply tightens globally; India fertiliser subsidy bill rises" },
      { name: "Defence — BEL, HAL, Bharat Forge", dir: "up", note: "Prolonged conflict accelerates India's domestic defence procurement" },
    ],
    forex: "Elevated commodity prices widen India's current account deficit; moderate INR depreciation pressure.",
  },
  "Durand Line Skirmishes": {
    headline: "Central Asia overland corridor at risk; limited direct India impact",
    severity: "Moderate",
    sectors: [
      { name: "Logistics & Ports — Adani Ports, CONCOR, Gateway Distriparks", dir: "down", note: "INSTC overland route disruption; sea shipping demand rises incrementally" },
      { name: "Defence & Aerospace — BEL, HAL, Data Patterns", dir: "up", note: "Regional instability accelerates defence procurement urgency" },
    ],
    forex: "Minimal direct forex impact; investor risk-off sentiment may drive marginal FII outflows.",
  },
};


const COMMODITY_HINTS: Record<string, string> = {
  "BZ=F":   "Higher crude → ONGC/BPCL ↑ · Aviation ↓ · Chemicals ↓ · INR weakens",
  "GC=F":   "Gold surge → Jewellery demand ↓ · SGB bonds attractive · CAD widens",
  "SI=F":   "Silver demand from solar manufacturing → Adani Green supply-chain cost",
  "NG=F":   "Higher gas → Fertilisers ↑ cost · City gas (IGL/MGL) margin squeeze",
  "HG=F":   "Copper prices → Hindalco/Sterlite ↑ · EV & power sector input cost",
};


const CURRENCY_HINTS: Record<string, string> = {
  "USDINR=X": "Weak INR → IT exporters ↑ (TCS, Infosys) · Importers ↓ · RBI intervenes >₹84",
  "EURINR=X": "EUR/INR relevant for pharma exports to Europe and luxury goods imports",
  "JPYINR=X": "JPY weakness → yen carry unwinds → FII outflows from Indian equities",
  "GBPINR=X": "GBP/INR: Tata Group UK ops, India–UK FTA discussions impact trade flows",
};


type AlertPoint = {
  lat: number; lng: number; name: string;
  type: "chokepoint" | "conflict";
  description: string;
  affectedSectors: { name: string; risk: string }[];
  alerts: { time: string; msg: string }[];
};


const STRATEGIC_ALERTS: AlertPoint[] = [
  {
    lat: 26.56, lng: 56.25, name: "Strait of Hormuz", type: "chokepoint",
    description: "Global strategic chokepoint experiencing severe naval escalation. Threats of maritime blockade have placed 20% of global crude oil supply at risk, with tanker rerouting already underway.",
    affectedSectors: [
      { name: "Global Energy & Oil", risk: "Critical Disruption" },
      { name: "Maritime Logistics", risk: "Severe Rerouting" },
      { name: "Insurance Underwriting", risk: "Premium Spikes" },
    ],
    alerts: [
      { time: "1H Ago", msg: "Naval exercises escalated in transit corridor." },
      { time: "4H Ago", msg: "Oil tankers diverted to Cape of Good Hope." },
    ],
  },
  {
    lat: 50.5, lng: 35.0, name: "Eastern Europe Conflict", type: "conflict",
    description: "Active conventional warfare zone causing massive regional disruption. Grain, fertiliser, and energy supply chains remain severely constrained, with no ceasefire visible on the horizon.",
    affectedSectors: [
      { name: "Global Agriculture", risk: "Severe Shortages" },
      { name: "European Energy Supply", risk: "Price Volatility" },
    ],
    alerts: [{ time: "10M Ago", msg: "Kinetic exchange reported near major transit routes." }],
  },
  {
    lat: 33.5, lng: 69.5, name: "Durand Line Skirmishes", type: "conflict",
    description: "Border skirmishes causing regional instability and closure of critical overland trade routes through Central Asia, impacting the INSTC corridor.",
    affectedSectors: [{ name: "Regional Logistics", risk: "Route Closures" }],
    alerts: [{ time: "1H Ago", msg: "Major border crossing closed indefinitely." }],
  },
];


// ── Mock fallbacks ────────────────────────────────────────────


const CountryIndices = ({ indices }: { indices: IndexItem[] }) => {
  if (!indices || indices.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black text-white/35 uppercase tracking-widest pl-1">Live Indices</p>
      <div className="grid grid-cols-2 gap-2">
        {indices.map(idx => {
          const up = idx.change_pct >= 0;
          return (
            <div key={idx.symbol} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1">
              <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider truncate">{idx.name}</p>
              <p className="text-sm font-black text-white">{idx.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              <p className={`text-xs font-bold flex items-center gap-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {up ? "+" : ""}{idx.change_pct.toFixed(2)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};






// ── New components ────────────────────────────────────────────


const DirIcon = ({ dir }: { dir: "up" | "down" | "neutral" | "mixed" }) => {
  if (dir === "up")      return <ArrowUpRight   className="w-3.5 h-3.5 text-green-400 shrink-0" />;
  if (dir === "down")    return <ArrowDownRight  className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  return                        <Minus           className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
};


const SensitivityPill = ({ level }: { level: "high" | "medium" | "low" }) => {
  const styles = { high: "bg-red-500/15 text-red-400 border-red-500/20", medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", low: "bg-green-500/15 text-green-400 border-green-500/20" };
  return <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles[level]}`}>{level}</span>;
};


const IndiaExposureCard = ({ iso }: { iso: string }) => {
  const impact = INDIA_IMPACT_BY_COUNTRY[iso];
  if (!impact) return null;
  return (
    <div className="bg-[#00D09C]/5 border border-[#00D09C]/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4 h-4 text-[#00D09C]" />
        <h3 className="text-xs font-black text-[#00D09C] uppercase tracking-widest">India Trade Exposure</h3>
      </div>
      <div className="space-y-0.5">
        <p className="text-lg font-bold text-white">{impact.tradeVolume} <span className="text-xs text-white/40 font-normal">annual bilateral trade</span></p>
        <p className="text-xs text-white/50"><span className="text-white/70 font-semibold">Exports: </span>{impact.exports}</p>
        <p className="text-xs text-white/50"><span className="text-white/70 font-semibold">Imports: </span>{impact.imports}</p>
      </div>
      <div className="space-y-2.5">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">India Sector Impact</p>
        {impact.sectorImpact.map((s, i) => (
          <div key={i} className="flex gap-2.5 items-start p-3 rounded-xl bg-white/5 border border-white/5">
            <DirIcon dir={s.direction} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-white/90">{s.sector}</p>
                <SensitivityPill level={s.sensitivity} />
              </div>
              <p className="text-[10px] text-white/40 mt-0.5">{s.stocks}</p>
              <p className="text-[10px] text-white/60 mt-1 leading-relaxed">{s.note}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/35 italic leading-relaxed border-t border-white/10 pt-3">{impact.forexNote}</p>
    </div>
  );
};


const AlertIndiaImpact = ({ alertName }: { alertName: string }) => {
  const impact = INDIA_IMPACT_BY_ALERT[alertName];
  if (!impact) return null;
  const sevColors = { Critical: "text-red-400 bg-red-500/10 border-red-500/25", High: "text-orange-400 bg-orange-500/10 border-orange-500/25", Moderate: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25" };
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-black text-white/40 uppercase tracking-widest pl-1">India Market Impact</p>
      <div className={`rounded-xl p-4 border ${sevColors[impact.severity]}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${sevColors[impact.severity]}`}>{impact.severity}</span>
        </div>
        <p className="text-sm font-bold text-white/90 leading-snug">{impact.headline}</p>
      </div>
      <div className="space-y-2">
        {impact.sectors.map((s, i) => (
          <div key={i} className="flex gap-2.5 items-start p-3 rounded-xl bg-white/5 border border-white/5">
            <DirIcon dir={s.dir} />
            <div>
              <p className="text-xs font-bold text-white/90">{s.name}</p>
              <p className="text-[10px] text-white/55 mt-0.5 leading-relaxed">{s.note}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/35 italic leading-relaxed border-t border-red-500/15 pt-3">{impact.forex}</p>
    </div>
  );
};


const SectorGrid = ({ sectors }: { sectors: GlobalMarketData["sectors"] }) => {
  if (!sectors?.length) return (
    <div className="grid grid-cols-2 gap-2">
      {["IT", "Bank", "Energy", "Pharma", "Auto", "Metal", "FMCG", "Realty"].map(n => (
        <div key={n} className="bg-white/5 border border-white/5 rounded-xl p-3 animate-pulse h-16" />
      ))}
    </div>
  );
  const nonNifty = sectors.filter(s => s.name !== "Nifty 50");
  return (
    <div className="grid grid-cols-2 gap-2">
      {nonNifty.map(s => {
        const up = s.change_pct >= 0;
        return (
          <div key={s.symbol} className="bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/8 transition-colors">
            <p className="text-[10px] font-black text-white/45 uppercase tracking-wider">{s.name}</p>
            <p className="text-sm font-bold text-white mt-0.5">{s.price.toLocaleString("en-IN")}</p>
            <p className={`text-[10px] font-semibold flex items-center gap-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
              {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {up ? "+" : ""}{s.change_pct.toFixed(2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
};


const FIIDIIPanel = ({ data }: { data: FIIDIIData | null }) => {
  if (!data) return (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 animate-pulse h-24" />
  );
  const fiiUp = data.fii_net >= 0;
  const diiUp = data.dii_net >= 0;
  const fmt = (v: number) => `₹${Math.abs(v).toFixed(0)} Cr`;
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">FII / DII Activity</p>
        <span className="text-[9px] text-white/25 italic">{data.source === "indicative" ? "indicative" : data.date}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[{ label: "FII Net", val: data.fii_net, up: fiiUp }, { label: "DII Net", val: data.dii_net, up: diiUp }].map(({ label, val, up }) => (
          <div key={label} className={`rounded-xl p-3 border ${up ? "bg-green-500/8 border-green-500/20" : "bg-red-500/8 border-red-500/20"}`}>
            <p className="text-[10px] font-bold text-white/50 uppercase">{label}</p>
            <p className={`text-base font-bold mt-0.5 ${up ? "text-green-400" : "text-red-400"}`}>{up ? "+" : "-"}{fmt(val)}</p>
            <p className="text-[9px] text-white/30 mt-0.5">{up ? "Net Buyer" : "Net Seller"}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] text-white/40">
        <div><span className="text-white/25">FII Buy</span> <span className="text-white/60 font-semibold">{fmt(data.fii_buy)}</span></div>
        <div><span className="text-white/25">FII Sell</span> <span className="text-white/60 font-semibold">{fmt(data.fii_sell)}</span></div>
        <div><span className="text-white/25">DII Buy</span> <span className="text-white/60 font-semibold">{fmt(data.dii_buy)}</span></div>
        <div><span className="text-white/25">DII Sell</span> <span className="text-white/60 font-semibold">{fmt(data.dii_sell)}</span></div>
      </div>
    </div>
  );
};


// ── Main page ─────────────────────────────────────────────────


export default function GlobalTradePage() {
  const globeRef = useRef<GlobeMethods>();
  const [countries, setCountries] = useState<any>({ features: [] });
  const [hoverD, setHoverD]       = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedAlert,   setSelectedAlert]   = useState<AlertPoint | null>(null);
  const [countryNews,  setCountryNews]  = useState<NewsArticle[]>([]);
  const [globalNews,   setGlobalNews]   = useState<NewsArticle[]>([]);
  const [loadingNews,  setLoadingNews]  = useState(false);
  const [activeTab,    setActiveTab]    = useState<"news" | "market">("news");
  const [rightTab,     setRightTab]     = useState<"briefing" | "market">("briefing");
  const [marketData,   setMarketData]   = useState<GlobalMarketData | null>(null);
  const [fiiData,      setFiiData]      = useState<FIIDIIData | null>(null);
  const [hoveredChip,  setHoveredChip]  = useState<string | null>(null);


  useEffect(() => {
    fetch("https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson")
      .then(r => r.json()).then(setCountries);
    fetchGlobalBreakingNews().then(setGlobalNews);
    fetchGlobalMarketData().then(setMarketData);
    fetchFIIDII().then(setFiiData);
  }, []);


  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.pointOfView({ altitude: 2 });
    }
  }, []);


  const getCountryCenter = (iso: string) => {
    const c: Record<string, { LAT: number; LON: number }> = {
      IND: { LAT: 20.59, LON: 78.96 }, USA: { LAT: 37.09, LON: -95.71 },
      JPN: { LAT: 36.2,  LON: 138.25 }, AUS: { LAT: -25.27, LON: 133.78 },
      CHN: { LAT: 35.86, LON: 104.2 },
    };
    return c[iso] || { LAT: 0, LON: 0 };
  };


  const clearSelections = () => {
    setSelectedCountry(null); setSelectedAlert(null);
    if (globeRef.current) globeRef.current.controls().autoRotate = true;
  };


  const handleCountryClick = (polygon: any) => {
    if (!TARGET_COUNTRIES.includes(polygon.properties.ISO_A3)) return;
    const { LAT, LON } = getCountryCenter(polygon.properties.ISO_A3);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: LAT, lng: LON, altitude: 1.5 }, 1000);
      globeRef.current.controls().autoRotate = false;
    }
    setSelectedAlert(null); setSelectedCountry(polygon);
    setActiveTab("news");
    setLoadingNews(true);
    fetchCountryGeopolitics(polygon.properties.ISO_A2, polygon.properties.ADMIN).then(news => {
      setCountryNews(news); setLoadingNews(false);
    });
  };


  const handleAlertClick = (alertItem: AlertPoint) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: alertItem.lat, lng: alertItem.lng, altitude: 0.8 }, 1000);
      globeRef.current.controls().autoRotate = false;
    }
    setSelectedCountry(null); setSelectedAlert(alertItem);
  };


  const polygonColor = (d: any) => {
    const isTarget = TARGET_COUNTRIES.includes(d.properties.ISO_A3);
    const isSel = selectedCountry?.properties.ISO_A3 === d.properties.ISO_A3;
    const isHov = hoverD?.properties.ISO_A3 === d.properties.ISO_A3;
    if (isSel) return "rgba(158,162,248,0.85)";
    if (!isTarget) return "rgba(255,255,255,0.04)";
    if (isHov) return "rgba(158,162,248,0.5)";
    if (selectedCountry) return "rgba(255,255,255,0.1)";
    return "rgba(255,255,255,0.28)";
  };


  const chokepoints = STRATEGIC_ALERTS.filter(a => a.type === "chokepoint");
  const conflicts   = STRATEGIC_ALERTS.filter(a => a.type === "conflict");


  // Build commodity + currency strip items
  const stripItems: { label: string; value: string; changePct: number; symbol: string; hint: string }[] = [
    ...(marketData?.commodities ?? []).map(c => ({
      label: c.name, value: `${c.unit.startsWith("$") ? "" : ""}$${c.price.toFixed(c.price > 100 ? 0 : 2)}`,
      changePct: c.change_pct, symbol: c.symbol, hint: COMMODITY_HINTS[c.symbol] ?? "",
    })),
    ...(marketData?.currencies ?? []).map(c => ({
      label: c.pair, value: `₹${c.price.toFixed(2)}`,
      changePct: c.change_pct, symbol: c.symbol, hint: CURRENCY_HINTS[c.symbol] ?? "",
    })),
  ];


  const nifty50 = marketData?.sectors.find(s => s.name === "Nifty 50");


  return (
    <div className="relative w-full h-screen bg-[#131415] overflow-hidden text-white font-sans">
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>


      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: "radial-gradient(ellipse at center, transparent 30%, #131415 100%)" }} />


      {/* Back */}
      {/* <div className="absolute top-6 left-6 z-50">
        <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back to Platform</span>
        </Link>
      </div> */}


      {/* Title */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none flex flex-col items-center">
        <h1 className="leading-tight text-[48px] md:text-[60px] font-bold tracking-tight text-white drop-shadow-xl">
          Global <span style={{ color: "#00D09C" }}>Trade</span>
        </h1>
        <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full border border-[#00D09C]/30 bg-black/40 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full animate-pulse bg-red-500" />
          <p className="text-white/80 text-sm font-medium">Live Macro · India Impact Intelligence</p>
        </div>
      </div>


      {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
      <div className="absolute top-0 right-0 h-full w-[440px] bg-[#131415]/88 backdrop-blur-2xl border-l border-white/10 z-40 flex flex-col pt-28 pb-14 shadow-2xl">


        {/* Tabs */}
        <div className="flex gap-1 mx-5 mb-5 p-1 bg-black/40 rounded-xl border border-white/5">
          {([["briefing", "Daily Briefing", Newspaper], ["market", "Market Pulse", Activity]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setRightTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${rightTab === key ? "bg-[#00D09C] text-black shadow-md" : "text-white/45 hover:text-white hover:bg-white/5"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>


        <div className="flex-1 overflow-y-auto px-5 space-y-5" style={{ scrollbarWidth: "none" }}>


          {/* Daily Briefing */}
          {rightTab === "briefing" && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] animate-pulse" />
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Daily Briefing</h2>
              </div>
              {globalNews.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00D09C]" />
                  <span className="text-white/50 font-medium">Scanning global feeds...</span>
                </div>
              ) : globalNews.map((news, idx) => (
                <a key={idx} href={news.url} target="_blank" rel="noopener noreferrer" className="block relative h-[220px] rounded-2xl overflow-hidden group shadow-xl">
                  {news.image ? <img src={news.image} alt={news.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    : <div className="absolute inset-0 bg-slate-800" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="text-[10px] uppercase tracking-widest font-black text-black bg-white/90 px-2.5 py-0.5 rounded-full inline-block mb-2">{news.source.name}</span>
                    <h3 className="text-white text-sm font-bold leading-snug drop-shadow-md">{news.title}</h3>
                    <p className="text-white/45 text-[10px] mt-1">{new Date(news.publishedAt).toLocaleDateString()}</p>
                  </div>
                </a>
              ))}
            </>
          )}


          {/* Market Pulse */}
          {rightTab === "market" && (
            <div className="space-y-5">
              {/* Nifty 50 header */}
              {nifty50 ? (
                <div className="bg-[#00D09C]/8 border border-[#00D09C]/25 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-[#00D09C] uppercase tracking-widest">Nifty 50</p>
                  <p className="text-3xl font-black text-white mt-1">{nifty50.price.toLocaleString("en-IN")}</p>
                  <div className={`flex items-center gap-1.5 mt-1 ${nifty50.change_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {nifty50.change_pct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-bold">{nifty50.change_pct >= 0 ? "+" : ""}{nifty50.change_pct.toFixed(2)}%</span>
                    <span className="text-white/30 text-xs">{nifty50.change_pct >= 0 ? "+" : ""}{nifty50.change.toFixed(0)} pts</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse h-24" />
              )}


              {/* Sector grid */}
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 pl-1">Nifty Sector Indices</p>
                <SectorGrid sectors={marketData?.sectors ?? []} />
              </div>


              {/* FII/DII */}
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 pl-1">Foreign & Domestic Flows</p>
                <FIIDIIPanel data={fiiData} />
              </div>
            </div>
          )}
        </div>
      </div>


      {/* ── COUNTRY PANEL ─────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div initial={{ x: -500, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -500, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-28 left-6 bottom-16 w-[460px] bg-[#131415]/92 backdrop-blur-2xl border border-white/10 rounded-3xl z-40 flex flex-col p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-5 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: "#00D09C" }}>{selectedCountry.properties.ADMIN}</h2>
                <span className="mt-1.5 inline-block px-2.5 py-1 bg-white/5 text-white/55 text-[10px] uppercase font-bold tracking-wider rounded-md border border-white/10">Market Intelligence</span>
              </div>
              <button onClick={clearSelections} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-xl">×</button>
            </div>


            <div className="flex p-1 bg-black/40 rounded-xl mb-5 border border-white/5">
              {(["news", "market"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === tab ? "bg-[#00D09C] text-black shadow-lg" : "text-white/45 hover:text-white hover:bg-white/5"}`}>
                  {tab === "news" ? <><Newspaper className="w-3.5 h-3.5" /> Policy & News</> : <><BarChart3 className="w-3.5 h-3.5" /> Market Impact</>}
                </button>
              ))}
            </div>


            <div className="flex-1 overflow-y-auto pr-1 space-y-4" style={{ scrollbarWidth: "none" }}>
              {activeTab === "news" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {loadingNews ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4 text-white/50">
                      <Loader2 className="w-8 h-8 animate-spin text-[#00D09C]" />
                      <p className="text-sm font-medium">Fetching intelligence...</p>
                    </div>
                  ) : countryNews.length > 0 ? (
                    <div className="space-y-3">
                      {countryNews.map((news, idx) => (
                        <a key={idx} href={news.url} target="_blank" rel="noopener noreferrer" className="block group">
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-[#00D09C]/50 transition-all">
                            <h3 className="font-semibold text-sm mb-1.5 group-hover:text-[#00D09C] transition-colors leading-snug">{news.title}</h3>
                            <p className="text-xs text-white/50 mb-3 line-clamp-2 leading-relaxed">{news.description}</p>
                            <div className="flex items-center justify-between text-[11px] text-white/30 font-bold uppercase tracking-wider">
                              <span>{news.source.name}</span>
                              <div className="flex items-center gap-1 group-hover:text-[#00D09C] transition-colors"><span>Read</span><ExternalLink className="w-3 h-3" /></div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center bg-white/5 rounded-2xl p-8 border border-white/10">
                      <p className="text-white/50 text-sm">No recent updates found for this region.</p>
                    </div>
                  )}
                </motion.div>
              )}


              {activeTab === "market" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* India Trade Exposure */}
                  <IndiaExposureCard iso={selectedCountry.properties.ISO_A3} />


                  {/* Nifty sectors (most relevant) */}
                  {marketData?.sectors && marketData.sectors.length > 1 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-[#00D09C]" /> Nifty Sector Performance
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {marketData.sectors.filter(s => s.name !== "Nifty 50").map(s => {
                          const up = s.change_pct >= 0;
                          return (
                            <span key={s.symbol} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border ${up ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                              {s.name} {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {up ? "+" : ""}{s.change_pct.toFixed(2)}%
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}


                  <CountryIndices indices={marketData?.country_indices?.[selectedCountry.properties.ISO_A3] ?? []} />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── ALERT PANEL ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div initial={{ x: -500, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -500, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-28 left-6 bottom-16 w-[460px] bg-[#131415]/92 backdrop-blur-2xl border border-red-500/30 rounded-3xl z-40 flex flex-col p-6 shadow-[0_0_25px_rgba(255,0,0,0.1)]">
            <div className="flex justify-between items-start mb-5 pb-4 border-b border-red-500/20">
              <div>
                <h2 className="text-3xl font-black text-red-500 tracking-tight flex items-center gap-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  <AlertTriangle className="w-7 h-7" /> Alert
                </h2>
                <span className="mt-1.5 inline-block px-2.5 py-1 bg-red-500/10 text-red-400 text-[10px] uppercase font-bold tracking-widest rounded-md border border-red-500/20">
                  {selectedAlert.type} · {selectedAlert.name}
                </span>
              </div>
              <button onClick={clearSelections} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors text-xl">×</button>
            </div>


            <div className="flex-1 overflow-y-auto pr-1 space-y-5" style={{ scrollbarWidth: "none" }}>
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                <p className="text-sm text-red-100/85 leading-relaxed">{selectedAlert.description}</p>
              </div>


              {/* India impact */}
              <AlertIndiaImpact alertName={selectedAlert.name} />


              {/* At-risk global sectors */}
              <div>
                <h3 className="text-[10px] font-black text-white/35 uppercase tracking-widest pl-1 mb-3">At-Risk Global Sectors</h3>
                <div className="space-y-2">
                  {selectedAlert.affectedSectors.map((sector, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="font-semibold text-sm text-white/85">{sector.name}</span>
                      <span className="text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/10 px-2 py-0.5 rounded-md">{sector.risk}</span>
                    </div>
                  ))}
                </div>
              </div>


              {/* Intelligence feed */}
              <div>
                <h3 className="text-[10px] font-black text-white/35 uppercase tracking-widest pl-1 mb-3">Live Intelligence Feed</h3>
                <div className="space-y-4 relative border-l-2 border-red-500/30 ml-2 pl-5">
                  {selectedAlert.alerts.map((alert, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                      <span className="text-[10px] font-black text-red-400/80 uppercase mb-0.5 block">{alert.time}</span>
                      <p className="text-sm text-white/85 font-medium leading-snug">{alert.msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── GLOBE ─────────────────────────────────────────────── */}
      <div className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseEnter={() => { if (globeRef.current && !selectedCountry && !selectedAlert) globeRef.current.controls().autoRotate = false; }}
        onMouseLeave={() => { if (globeRef.current && !selectedCountry && !selectedAlert) globeRef.current.controls().autoRotate = true; }}
        style={{ width: "calc(100% + 440px)", marginLeft: "-220px" }}>
        <Globe ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          polygonsData={countries.features}
          polygonAltitude={(d: any) => (d === hoverD ? 0.05 : 0.01)}
          polygonCapColor={polygonColor as any}
          polygonSideColor={() => "rgba(0,0,0,0.4)"}
          polygonStrokeColor={() => "#111"}
          onPolygonHover={setHoverD}
          onPolygonClick={handleCountryClick}
          polygonsTransitionDuration={300}
          polygonLabel={({ properties: d }: any) => `
            <div style="background:rgba(0,0,0,0.8);padding:4px 8px;border-radius:6px;color:white;border:1px solid rgba(255,255,255,0.2);font-size:12px;pointer-events:none;">
              <b>${d.ADMIN}</b> <span style="color:rgba(255,255,255,0.5);font-size:10px;">${d.ISO_A3}</span>
            </div>`}
          arcsData={CONFLICT_ARCS}
          arcColor={() => "rgba(255,60,60,0.9)"}
          arcDashLength={0.3} arcDashGap={0.2}
          arcDashInitialGap={() => Math.random()} arcDashAnimateTime={2000} arcStroke={1.0}
          htmlElementsData={conflicts}
          htmlElement={(d: any) => {
            const el = document.createElement("div");
            const inner = document.createElement("div");
            inner.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/></svg>';
            inner.style.color = "#ef4444"; inner.style.cursor = "pointer";
            inner.style.transform = "translate(-50%, -50%)";
            inner.style.filter = "drop-shadow(0px 0px 8px rgba(239,68,68,0.9))";
            inner.style.transition = "transform 0.2s cubic-bezier(0.175,0.885,0.32,1.275)";
            inner.onclick = () => handleAlertClick(d as AlertPoint);
            inner.onmouseenter = () => { inner.style.transform = "translate(-50%,-50%) scale(1.3)"; };
            inner.onmouseleave = () => { inner.style.transform = "translate(-50%,-50%) scale(1)"; };
            el.appendChild(inner); return el;
          }}
          ringsData={chokepoints}
          ringColor={() => "rgba(239,68,68,0.8)"}
          ringMaxRadius={3} ringPropagationSpeed={1} ringRepeatPeriod={800}
          labelsData={chokepoints}
          labelLat={(d: any) => d.lat} labelLng={(d: any) => d.lng}
          labelText={(d: any) => d.name} labelSize={1.5} labelDotRadius={0.4}
          labelColor={() => "rgba(255,60,60,1)"} labelResolution={2}
          onLabelClick={handleAlertClick}
        />
      </div>


      {/* ── BOTTOM COMMODITY / CURRENCY STRIP ─────────────────── */}
      <div className="absolute bottom-0 left-0 right-[440px] z-50 bg-[#0d0d0e]/95 border-t border-white/8 backdrop-blur-sm h-12 flex items-center overflow-hidden">
        {stripItems.length === 0 ? (
          <div className="flex items-center gap-3 px-4 text-white/30 text-xs animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching live market data...
          </div>
        ) : (
          <div className="flex whitespace-nowrap" style={{ animation: "marquee 70s linear infinite" }}>
            {[...stripItems, ...stripItems].map((item, i) => {
              const up = item.changePct >= 0;
              return (
                <div key={i} className="relative inline-flex items-center gap-2.5 px-5 shrink-0 border-r border-white/8 h-12 cursor-default group"
                  onMouseEnter={() => setHoveredChip(`${item.symbol}-${i}`)}
                  onMouseLeave={() => setHoveredChip(null)}>
                  <span className="text-[10px] font-bold text-white/55 uppercase tracking-wide">{item.label}</span>
                  <span className="text-xs font-bold text-white">{item.value}</span>
                  <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {up ? "+" : ""}{item.changePct.toFixed(2)}%
                  </span>
                  {/* Hover tooltip */}
                  {hoveredChip === `${item.symbol}-${i}` && item.hint && (
                    <div className="absolute bottom-14 left-0 z-[200] bg-[#1a1a1d] border border-[#00D09C]/30 rounded-xl p-3 text-[10px] text-white/70 leading-relaxed whitespace-normal max-w-[280px] shadow-2xl pointer-events-none">
                      <p className="font-black text-[#00D09C] text-[9px] uppercase tracking-wider mb-1">India Impact</p>
                      {item.hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Monitored markets hint */}
      {!selectedCountry && !selectedAlert && (
        <div className="absolute bottom-16 left-8 z-40 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-2xl">
          <h3 className="text-[10px] font-black text-[#00D09C] uppercase tracking-widest mb-2.5">Monitored Jurisdictions</h3>
          <div className="flex gap-2 flex-wrap max-w-[260px]">
            {["India", "USA", "Japan", "Australia", "China"].map(c => (
              <span key={c} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/85 cursor-default">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



