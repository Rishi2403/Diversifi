import React, { useState, useEffect, useRef } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { fetchCountryGeopolitics, fetchGlobalBreakingNews, NewsArticle } from "@/services/newsService";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, ExternalLink, TrendingUp, TrendingDown, Newspaper, BarChart3, Maximize2, X, AlertTriangle } from "lucide-react";

const TARGET_COUNTRIES = ["IND", "USA", "JPN", "AUS", "CHN"];

// --- MOCK CONFLICT & ALERT DATA ---
const CONFLICT_ARCS = [
  // USA -> Iran (Distant Conflict - Missiles/Trajectories)
  { startLat: 38.0, startLng: -97.0, endLat: 32.42, endLng: 53.68 },
];

type AlertPoint = {
    lat: number;
    lng: number;
    name: string;
    type: 'chokepoint' | 'conflict';
    description: string;
    affectedSectors: { name: string, risk: string }[];
    alerts: { time: string, msg: string }[];
};

const STRATEGIC_ALERTS: AlertPoint[] = [
  { 
      lat: 26.56, lng: 56.25, name: 'Strait of Hormuz', type: 'chokepoint',
      description: `Strait of Hormuz is a global strategic chokepoint currently experiencing severe naval escalation. Tensions involve frequent maritime domain awareness operations and threats of full blockade.`,
      affectedSectors: [
          { name: "Global Energy & Oil", risk: "Critical Disruption" },
          { name: "Maritime Logistics", risk: "Severe Rerouting" },
          { name: "Insurance Underwriting", risk: "Premium Spikes" }
      ],
      alerts: [
          { time: "1H Ago", msg: "Naval exercises escalated in transit corridor." },
          { time: "4H Ago", msg: "Oil tankers diverted to Cape of Good Hope." }
      ]
  },
  { 
      lat: 50.5, lng: 35.0, name: 'Eastern Europe Conflict', type: 'conflict',
      description: `Active conventional warfare zone causing massive regional disruption. Supply chains for essential raw materials remain highly constrained.`,
      affectedSectors: [
          { name: "Global Agriculture", risk: "Severe Shortages" },
          { name: "European Energy Supply", risk: "Price Volatility" }
      ],
      alerts: [
          { time: "10M Ago", msg: "Kinetic exchange reported near major transit routes." }
      ]
  },
  { 
      lat: 33.5, lng: 69.5, name: 'Durand Line Skirmishes', type: 'conflict',
      description: `Border skirmishes leading to regional instability. Affecting critical overland trade routes through central Asia and regional logistics.`,
      affectedSectors: [
          { name: "Regional Logistics", risk: "Route Closures" }
      ],
      alerts: [
          { time: "1H Ago", msg: "Major border crossing closed indefinitely." }
      ]
  }
];

// --- MOCK STOCK DATA ---
const getMockSectors = (countryIso: string) => {
  const data: Record<string, { name: string; changePct: number }[]> = {
    USA: [{ name: "Technology", changePct: 2.15 }, { name: "Financials", changePct: -0.52 }, { name: "Energy", changePct: 1.24 }, { name: "Healthcare", changePct: -1.05 }],
    IND: [{ name: "IT Services", changePct: 1.54 }, { name: "Banking", changePct: 2.05 }, { name: "Automotive", changePct: -1.2 }, { name: "Pharma", changePct: 0.85 }],
    CHN: [{ name: "E-Commerce", changePct: 3.2 }, { name: "Manufacturing", changePct: -1.05 }, { name: "Real Estate", changePct: -2.5 }],
    JPN: [{ name: "Automotive", changePct: -0.92 }, { name: "Electronics", changePct: 1.42 }, { name: "Robotics", changePct: 2.1 }],
    AUS: [{ name: "Mining", changePct: 1.28 }, { name: "Financials", changePct: 0.45 }, { name: "Energy", changePct: -0.8 }],
  };
  return data[countryIso] || [{ name: "Industrials", changePct: 0.5 }, { name: "Consumer", changePct: -0.2 }];
};

const getMockStockData = (countryIso: string) => {
  const data: Record<string, { ticker: string; name: string; price: number; changePct: number }[]> = {
    USA: [{ ticker: "AAPL", name: "Apple Inc.", price: 173.5, changePct: 1.25 }, { ticker: "MSFT", name: "Microsoft Corp", price: 418.05, changePct: -0.35 }, { ticker: "NVDA", name: "NVIDIA Corp", price: 875.28, changePct: 1.43 }],
    IND: [{ ticker: "RELIANCE", name: "Reliance Ind", price: 2980.5, changePct: 1.54 }, { ticker: "TCS", name: "Tata Consultancy", price: 3845.0, changePct: -0.32 }, { ticker: "HDFCBANK", name: "HDFC Bank", price: 1530.1, changePct: 1.03 }],
    CHN: [{ ticker: "TCEHY", name: "Tencent", price: 38.56, changePct: 3.26 }, { ticker: "BABA", name: "Alibaba Group", price: 73.2, changePct: -1.08 }],
    JPN: [{ ticker: "TM", name: "Toyota Motor", price: 245.5, changePct: -0.92 }, { ticker: "SONY", name: "Sony Group", price: 85.34, changePct: 1.42 }],
    AUS: [{ ticker: "BHP", name: "BHP Group", price: 58.6, changePct: 0.68 }, { ticker: "RIO", name: "Rio Tinto", price: 65.2, changePct: -1.28 }],
  };
  return data[countryIso] || [];
};

const getMockStockDetails = (_ticker: string) => ({
  "Mkt Cap": (Math.random() * 2 + 1).toFixed(2) + "T",
  "P/E Ratio": (Math.random() * 20 + 10).toFixed(1),
  Volume: (Math.random() * 50 + 10).toFixed(1) + "M",
  "52W High": "$" + (Math.random() * 500 + 100).toFixed(2),
});

// --- CANDLE GENERATORS ---
const generateCandlesCount = (basePrice: number, num: number, volatility: number) => {
  const candles = [];
  let cur = basePrice;
  const now = new Date();
  for (let i = 0; i < num; i++) {
    const change = (Math.random() - 0.5) * basePrice * volatility;
    const open = cur;
    const close = cur + change;
    const high = Math.max(open, close) + Math.random() * basePrice * (volatility / 2);
    const low = Math.min(open, close) - Math.random() * basePrice * (volatility / 2);
    const d = new Date(now.getTime() - (num - i) * 86400000);
    const dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    candles.push({ open, close, high, low, date: dateLabel });
    cur = close;
  }
  return candles;
};

// --- SPARKLINE ---
const Sparkline = ({ data }: { data: ReturnType<typeof generateCandlesCount> }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data.map((d) => d.low));
  const max = Math.max(...data.map((d) => d.high));
  const range = (max - min) || 1;
  const isUp = data[data.length - 1].close >= data[0].close;
  return (
    <svg width="44" height="22" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={isUp ? "#4ade80" : "#f87171"}
        strokeWidth="6"
        points={data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d.close - min) / range) * 100}`).join(" ")}
      />
    </svg>
  );
};

// --- INTERACTIVE MODAL CHART ---
const InteractiveCandlestickChart = ({ data }: { data: ReturnType<typeof generateCandlesCount> }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data || data.length === 0) return null;

  const min = Math.min(...data.map((d) => d.low));
  const max = Math.max(...data.map((d) => d.high));
  const range = max - min;
  const padding = range * 0.12;
  const adjMin = min - padding;
  const adjMax = max + padding;
  const yRange = (adjMax - adjMin) || 1;
  const barWidth = 100 / data.length;

  // Calculate Simple Moving Average (SMA - 5 period)
  const smaPoints = data.map((d, i, arr) => {
    const startIdx = Math.max(0, i - 4);
    const subset = arr.slice(startIdx, i + 1);
    const avg = subset.reduce((sum, item) => sum + item.close, 0) / subset.length;
    
    const xC = barWidth * i + barWidth / 2;
    const yC = 100 - ((avg - adjMin) / yRange) * 100;
    return `${xC},${yC}`;
  }).join(' ');

  return (
    <div className="w-full h-full relative" onMouseLeave={() => setHoverIdx(null)}>
      {/* Chart Indicators Info */}
      <div className="absolute top-2 left-16 flex gap-4 text-[10px] font-bold tracking-widest pointer-events-none select-none text-white/40">
          <span className="text-blue-400">SMA(5) • ADV</span>
          <span className="text-purple-400">VOL • AVG</span>
      </div>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-6 w-14 flex flex-col justify-between text-[10px] font-mono text-white/40 pointer-events-none select-none">
        <span>${adjMax.toFixed(0)}</span>
        <span>${((adjMax + adjMin) / 2).toFixed(0)}</span>
        <span>${adjMin.toFixed(0)}</span>
      </div>

      <div className="absolute left-16 right-0 top-0 bottom-6">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          {/* Grid lines */}
          {[0, 50, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.3" strokeDasharray="2 2" />
          ))}

          {data.map((candle, i) => {
            const isGreen = candle.close >= candle.open;
            const color = isGreen ? "#4ade80" : "#f87171";
            const y1 = 100 - ((candle.high - adjMin) / yRange) * 100;
            const y2 = 100 - ((candle.low - adjMin) / yRange) * 100;
            const rTop = 100 - ((Math.max(candle.open, candle.close) - adjMin) / yRange) * 100;
            const rBot = 100 - ((Math.min(candle.open, candle.close) - adjMin) / yRange) * 100;
            const rH = Math.max(0.8, rBot - rTop);
            const xC = barWidth * i + barWidth / 2;
            const bW = Math.max(0.5, barWidth * 0.65);
            return (
              <g key={i}>
                <line x1={xC} y1={y1} x2={xC} y2={y2} stroke={color} strokeWidth={barWidth * 0.12} />
                <rect x={xC - bW / 2} y={rTop} width={bW} height={rH} fill={color} />
                <rect x={barWidth * i} y="0" width={barWidth} height="100" fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
              </g>
            );
          })}

          {/* Indicator: Moving Average */}
          <polyline 
             points={smaPoints} 
             fill="none" 
             stroke="#60a5fa" 
             strokeWidth="0.5" 
             strokeDasharray="1 1"
          />
        </svg>

        {/* X-axis labels */}
        <div className="absolute flex justify-between w-full -bottom-6 text-[10px] font-mono text-white/40 select-none">
          <span>{data[0].date}</span>
          <span>{data[Math.floor(data.length / 2)].date}</span>
          <span>{data[data.length - 1].date}</span>
        </div>

        {/* Hover tooltip */}
        {hoverIdx !== null && (
          <div
            className="absolute top-0 h-full pointer-events-none"
            style={{ left: `${hoverIdx * barWidth + barWidth / 2}%`, width: "1px", background: "rgba(255,255,255,0.2)" }}
          >
            <div className="absolute top-8 bg-[#1e1b2e] border border-white/15 rounded-xl p-3 text-xs shadow-2xl whitespace-nowrap -translate-x-1/2 min-w-[148px] z-50">
              <p className="text-center font-bold text-white/70 mb-2 pb-1 border-b border-white/10">{data[hoverIdx].date}</p>
              {[["O", data[hoverIdx].open], ["H", data[hoverIdx].high], ["L", data[hoverIdx].low], ["C", data[hoverIdx].close]].map(([label, val]) => (
                <div key={label as string} className="flex justify-between gap-4 mb-0.5">
                  <span className="text-white/40 font-bold">{label}</span>
                  <span className={`font-semibold ${label === "H" ? "text-green-400" : label === "L" ? "text-red-400" : "text-white"}`}>
                    ${(val as number).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- STOCK CARD (clickable row with sparkline → opens modal) ---
const StockCard = ({ stock, onOpenModal }: { stock: any; onOpenModal: (stock: any) => void }) => {
  const sparkData = React.useMemo(() => generateCandlesCount(stock.price, 15, 0.04), [stock.price]);
  const isUp = stock.changePct >= 0;
  return (
    <button
      onClick={() => onOpenModal(stock)}
      className="w-full text-left rounded-xl p-4 flex items-center justify-between transition-all group border bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#9EA2F8]/50"
    >
      <div>
        <p className="font-bold text-sm text-white group-hover:text-[#9EA2F8] transition-colors">{stock.ticker}</p>
        <p className="text-[10px] text-white/40 uppercase">{stock.name}</p>
      </div>
      <div className="flex items-center gap-5">
        <Sparkline data={sparkData} />
        <div className="text-right">
          <p className="font-bold text-sm text-white">${stock.price.toFixed(2)}</p>
          <p className={`text-xs font-semibold ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? "+" : ""}{stock.changePct.toFixed(2)}%
          </p>
        </div>
        <div className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-[#9EA2F8]/15 text-[#9EA2F8]">
          <Maximize2 className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
};

// --- STOCK MODAL ---
type Timeframe = "1D" | "1W" | "1M" | "6M" | "1Y";
const TF_CONFIG: Record<Timeframe, { count: number; vol: number }> = {
  "1D": { count: 24, vol: 0.01 },
  "1W": { count: 30, vol: 0.03 },
  "1M": { count: 30, vol: 0.07 },
  "6M": { count: 40, vol: 0.15 },
  "1Y": { count: 52, vol: 0.28 },
};

const StockModal = ({ stock, onClose }: { stock: any; onClose: () => void }) => {
  const [tf, setTf] = useState<Timeframe>("1M");
  const candles = React.useMemo(() => generateCandlesCount(stock.price, TF_CONFIG[tf].count, TF_CONFIG[tf].vol), [stock.price, tf]);
  const details = React.useMemo(() => getMockStockDetails(stock.ticker), [stock.ticker]);
  const isUp = stock.changePct >= 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-10 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-5xl bg-[#18181b] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal header */}
        <div className="p-6 flex justify-between items-center border-b border-white/10">
          <div>
            <h2 className="text-3xl font-black text-white">{stock.ticker}</h2>
            <p className="text-sm font-medium uppercase tracking-widest text-white/40">{stock.name}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-3xl font-bold text-white">${stock.price.toFixed(2)}</p>
              <p className={`font-bold text-sm ${isUp ? "text-green-400" : "text-red-400"}`}>
                {isUp ? "+" : ""}{stock.changePct.toFixed(2)}% Today
              </p>
            </div>
            
            {/* BUY BUTTON (MOCK) */}
            <button 
                className="bg-green-500 hover:bg-green-400 text-black font-extrabold uppercase px-8 py-2.5 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.2)] ml-4 transition-colors cursor-not-allowed opacity-90"
                onClick={() => {}}
            >
                Buy
            </button>
            <button onClick={onClose} className="p-2 ml-4 rounded-full bg-white/5 hover:bg-white/15 transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Chart area */}
        <div className="p-6 md:p-8 flex flex-col gap-6">
          {/* Timeframe pills */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl self-start border border-white/5 relative z-10">
            {(["1D", "1W", "1M", "6M", "1Y"] as Timeframe[]).map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  tf === t ? "bg-[#9EA2F8] text-black shadow-md" : "text-white/50 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Candlestick chart */}
          <div className="w-full h-[360px] bg-[#121214] rounded-2xl p-4 border border-white/5">
            <InteractiveCandlestickChart data={candles} />
          </div>

          {/* Stats footer */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
            {Object.entries(details).map(([key, val]) => (
              <div key={key}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{key}</p>
                <p className="text-lg font-semibold text-white mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function GlobalTradePage() {
  const globeRef = useRef<GlobeMethods>();
  const [countries, setCountries] = useState<any>({ features: [] });
  const [hoverD, setHoverD] = useState<any>(null);
  
  // Selection Contexts
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertPoint | null>(null);
  
  const [countryNews, setCountryNews] = useState<NewsArticle[]>([]);
  const [globalNews, setGlobalNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [activeTab, setActiveTab] = useState<"news" | "market">("news");
  const [modalStock, setModalStock] = useState<any>(null);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson")
      .then((r) => r.json())
      .then(setCountries);
    fetchGlobalBreakingNews().then(setGlobalNews);
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.pointOfView({ altitude: 2 });
    }
  }, []);

  const getCountryCenter = (isoA3: string) => {
    const c: Record<string, { LAT: number; LON: number }> = {
      IND: { LAT: 20.59, LON: 78.96 },
      USA: { LAT: 37.09, LON: -95.71 },
      JPN: { LAT: 36.2, LON: 138.25 },
      AUS: { LAT: -25.27, LON: 133.78 },
      CHN: { LAT: 35.86, LON: 104.2 },
    };
    return c[isoA3] || { LAT: 0, LON: 0 };
  };

  const clearSelections = () => {
      setSelectedCountry(null);
      setSelectedAlert(null);
      if (globeRef.current) globeRef.current.controls().autoRotate = true;
  }

  const handleCountryClick = (polygon: any) => {
    if (!TARGET_COUNTRIES.includes(polygon.properties.ISO_A3)) return;
    const { LAT, LON } = getCountryCenter(polygon.properties.ISO_A3);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: LAT, lng: LON, altitude: 1.5 }, 1000);
      globeRef.current.controls().autoRotate = false;
    }
    setSelectedAlert(null);
    setSelectedCountry(polygon);
    setActiveTab("news");
    setModalStock(null);
    setLoadingNews(true);
    fetchCountryGeopolitics(polygon.properties.ISO_A2, polygon.properties.ADMIN).then((news) => {
      setCountryNews(news);
      setLoadingNews(false);
    });
  };

  const handleAlertClick = (alertItem: AlertPoint) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: alertItem.lat, lng: alertItem.lng, altitude: 0.8 }, 1000);
      globeRef.current.controls().autoRotate = false;
    }
    setSelectedCountry(null);
    setSelectedAlert(alertItem);
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

  const chokepoints = STRATEGIC_ALERTS.filter(a => a.type === 'chokepoint');
  const conflicts = STRATEGIC_ALERTS.filter(a => a.type === 'conflict');

  return (
    <div className="relative w-full h-screen bg-[#1a0f3a] overflow-hidden text-white font-sans">
      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: "radial-gradient(ellipse at center, transparent 30%, #1a0f3a 100%)" }} />

      {/* Back button */}
      <div className="absolute top-6 left-6 z-50">
        <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Platform</span>
        </Link>
      </div>

      {/* Title */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none flex flex-col items-center">
        <h1 className="leading-tight text-[48px] md:text-[60px] font-bold tracking-tight text-white drop-shadow-xl">
          Global <span style={{ color: "#9EA2F8" }}>Trade</span>
        </h1>
        <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full border border-[#9EA2F8]/30 bg-black/40 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full animate-pulse bg-red-500" />
          <p className="text-white/80 text-sm font-medium">Live Escalations & Markets</p>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ─ Editorial Breaking News ── */}
      <div className="absolute top-0 right-0 h-full w-[440px] bg-[#141318]/88 backdrop-blur-2xl border-l border-white/10 z-40 flex flex-col pt-32 pb-6 px-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-8 px-1">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] animate-pulse" />
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Daily Briefing</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-1 space-y-6" style={{ scrollbarWidth: "none" }}>
          {globalNews.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#9EA2F8]" />
              <span className="text-white/50 font-medium">Scanning global feeds...</span>
            </div>
          ) : (
            globalNews.map((news, idx) => (
              <a key={idx} href={news.url} target="_blank" rel="noopener noreferrer" className="block relative h-[240px] rounded-3xl overflow-hidden group shadow-xl">
                {news.image ? (
                  <img src={news.image} alt={news.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                ) : (
                  <div className="absolute inset-0 bg-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="text-[10px] uppercase tracking-widest font-black text-black bg-white/90 px-3 py-1 rounded-full self-start mb-3 inline-block shadow-sm">
                    {news.source.name}
                  </span>
                  <h3 className="text-white text-base font-bold leading-snug drop-shadow-md mt-2">{news.title}</h3>
                  <p className="text-white/50 text-[11px] mt-1.5 font-medium">{new Date(news.publishedAt).toLocaleDateString()}</p>
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* ── LEFT SIDEBAR ─ Country Panel ── */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div
            initial={{ x: -500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -500, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-28 left-6 bottom-8 w-[450px] bg-[#141318]/92 backdrop-blur-2xl border border-white/10 rounded-3xl z-40 flex flex-col p-6 shadow-2xl"
          >
            {/* Panel header */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: "#9EA2F8" }}>{selectedCountry.properties.ADMIN}</h2>
                <span className="mt-2 inline-block px-2.5 py-1 bg-white/5 text-white/60 text-[10px] uppercase font-bold tracking-wider rounded-md border border-white/10">
                  Market Overview
                </span>
              </div>
              <button
                onClick={clearSelections}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-xl"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
              {(["news", "market"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab ? "bg-[#9EA2F8] text-black shadow-lg" : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab === "news" ? <><Newspaper className="w-4 h-4" /> Policy & News</> : <><BarChart3 className="w-4 h-4" /> Market Impact</>}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>

              {/* NEWS */}
              {activeTab === "news" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {loadingNews ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4 text-white/50">
                      <Loader2 className="w-8 h-8 animate-spin text-[#9EA2F8]" />
                      <p className="text-sm font-medium">Fetching intelligence...</p>
                    </div>
                  ) : countryNews.length > 0 ? (
                    <div className="space-y-4">
                      {countryNews.map((news, idx) => (
                        <a key={idx} href={news.url} target="_blank" rel="noopener noreferrer" className="block group">
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-[#9EA2F8]/50 transition-all shadow-md">
                            <h3 className="font-semibold text-sm mb-2 group-hover:text-[#9EA2F8] transition-colors leading-snug">{news.title}</h3>
                            <p className="text-xs text-white/55 mb-4 line-clamp-3 leading-relaxed">{news.description}</p>
                            <div className="flex items-center justify-between text-[11px] text-white/35 font-bold uppercase tracking-wider">
                              <span>{news.source.name}</span>
                              <div className="flex items-center gap-1 group-hover:text-[#9EA2F8] transition-colors">
                                <span>Read</span>
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center bg-white/5 rounded-2xl p-8 border border-white/10">
                      <p className="text-white/50 text-sm font-medium">No recent updates found for this region.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* MARKET */}
              {activeTab === "market" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                  {/* Sector tags */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white/75 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#9EA2F8]" /> Key Sector Performance
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {getMockSectors(selectedCountry.properties.ISO_A3).map((s) => {
                        const pos = s.changePct >= 0;
                        return (
                          <span key={s.name} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${pos ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                            {s.name}
                            {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {pos ? "+" : ""}{s.changePct.toFixed(2)}%
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stock rows */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">Live Equities (Mock)</p>
                    {getMockStockData(selectedCountry.properties.ISO_A3).map((stock) => (
                      <StockCard key={stock.ticker} stock={stock} onOpenModal={setModalStock} />
                    ))}
                    {getMockStockData(selectedCountry.properties.ISO_A3).length === 0 && (
                      <div className="text-center p-6 bg-white/5 rounded-xl text-white/50 text-sm">Market data unavailable for this jurisdiction.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEFT SIDEBAR ─ Unified Strategic Alert Panel ── */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ x: -500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -500, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-28 left-6 bottom-8 w-[450px] bg-[#141318]/92 backdrop-blur-2xl border border-red-500/30 rounded-3xl z-40 flex flex-col p-6 shadow-[0_0_25px_rgba(255,0,0,0.1)]"
          >
            {/* Panel header */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-red-500/20 relative">
              <div>
                <h2 className="text-4xl font-black text-red-500 tracking-tight flex items-center gap-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    <AlertTriangle className="w-8 h-8" /> Alert
                </h2>
                <span className="mt-2 inline-block px-2.5 py-1 bg-red-500/10 text-red-400 text-[10px] uppercase font-bold tracking-widest rounded-md border border-red-500/20">
                  Strategic {selectedAlert.type} • {selectedAlert.name}
                </span>
              </div>
              <button
                onClick={clearSelections}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors text-xl"
              >
                ×
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto pr-1 relative space-y-6" style={{ scrollbarWidth: "none" }}>
                
                {/* Description */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 shadow-inner">
                    <p className="text-sm text-red-100/90 leading-relaxed font-medium">
                        {selectedAlert.description}
                    </p>
                </div>

                {/* Affected Trade Sectors */}
                <div>
                    <h3 className="text-[11px] font-black text-white/40 uppercase tracking-widest pl-1 mb-3">At-Risk Global Sectors</h3>
                    <div className="space-y-2">
                        {selectedAlert.affectedSectors.map((sector, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                <span className="font-semibold text-sm text-white/90">{sector.name}</span>
                                <span className="text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/10 px-2 py-1 rounded-md">{sector.risk}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Intelligence Feed */}
                <div>
                    <h3 className="text-[11px] font-black text-white/40 uppercase tracking-widest pl-1 mb-3">Live Intelligence Feed</h3>
                    <div className="space-y-4 relative border-l-2 border-red-500/30 ml-2 pl-5 mt-2">
                        {selectedAlert.alerts.map((alert, idx) => (
                            <div key={idx} className="relative">
                                {/* Timeline blip */}
                                <div className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
                                <span className="text-[10px] font-black text-red-400/80 uppercase mb-0.5 block">{alert.time}</span>
                                <p className="text-sm text-white/90 font-medium leading-snug">{alert.msg}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STOCK ANALYSIS MODAL ── */}
      <AnimatePresence>
        {modalStock && <StockModal stock={modalStock} onClose={() => setModalStock(null)} />}
      </AnimatePresence>

      {/* Globe */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseEnter={() => { if (globeRef.current && !selectedCountry && !selectedAlert) globeRef.current.controls().autoRotate = false; }}
        onMouseLeave={() => { if (globeRef.current && !selectedCountry && !selectedAlert) globeRef.current.controls().autoRotate = true; }}
        style={{ width: "calc(100% + 440px)", marginLeft: "-220px" }}
      >
        <Globe
          ref={globeRef}
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
          
          /* Tooltip for hovering countries */
          polygonLabel={({ properties: d }: any) => `
             <div style="background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 6px; color: white; border: 1px solid rgba(255,255,255,0.2); font-family: sans-serif; font-size: 12px; pointer-events: none;">
                <b>${d.ADMIN}</b> <span style="color: rgba(255,255,255,0.5); font-size: 10px;">${d.ISO_A3}</span>
             </div>
          `}
          
          /* Strategic Conflict & Trade Route Rendering */
          arcsData={CONFLICT_ARCS}
          arcColor={() => 'rgba(255, 60, 60, 0.9)'}
          arcDashLength={0.3}
          arcDashGap={0.2}
          arcDashInitialGap={() => Math.random()}
          arcDashAnimateTime={2000}
          arcStroke={1.0}

          /* HTML Elements: Clickable Conflict Swords */
          htmlElementsData={conflicts}
          htmlElement={(d: any) => {
             const el = document.createElement('div');
             el.style.pointerEvents = 'auto'; // allow clicking
             
             const inner = document.createElement('div');
             inner.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/></svg>';
             inner.style.color = '#ef4444'; // Solid Red
             inner.style.cursor = 'pointer';
             inner.style.transform = 'translate(-50%, -50%)';
             inner.style.filter = 'drop-shadow(0px 0px 8px rgba(239, 68, 68, 0.9))';
             inner.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

             // Handle click event securely on inner element
             inner.onclick = () => handleAlertClick(d as AlertPoint);
             
             // Add hover effect safely without conflicting with react-globe.gl's transforms
             inner.onmouseenter = () => { inner.style.transform = 'translate(-50%, -50%) scale(1.3)'; };
             inner.onmouseleave = () => { inner.style.transform = 'translate(-50%, -50%) scale(1)'; };
             
             el.appendChild(inner);
             return el;
          }}

          /* Chokepoints (Strait of Hormuz glow) */
          ringsData={chokepoints}
          ringColor={() => 'rgba(239, 68, 68, 0.8)'}
          ringMaxRadius={3}
          ringPropagationSpeed={1}
          ringRepeatPeriod={800}

          labelsData={chokepoints}
          labelLat={(d: any) => d.lat}
          labelLng={(d: any) => d.lng}
          labelText={(d: any) => d.name}
          labelSize={1.5}
          labelDotRadius={0.4}
          labelColor={() => 'rgba(255, 60, 60, 1)'}
          labelResolution={2}
          onLabelClick={handleAlertClick}
        />
      </div>

      {/* Monitored markets hint */}
      {!selectedCountry && !selectedAlert && (
        <div className="absolute bottom-8 left-8 z-40 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl">
          <h3 className="text-xs font-black text-[#9EA2F8] uppercase tracking-widest mb-3">Monitored Jurisdictions</h3>
          <div className="flex gap-2 flex-wrap max-w-[280px]">
            {["India", "USA", "Japan", "Australia", "China"].map((c) => (
              <span key={c} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/90 hover:bg-white/10 hover:border-[#9EA2F8]/50 transition-all cursor-default">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
