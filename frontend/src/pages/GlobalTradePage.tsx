import React, { useState, useEffect, useRef } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { fetchCountryGeopolitics, fetchGlobalBreakingNews, NewsArticle } from "@/services/newsService";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, ExternalLink, TrendingUp, TrendingDown, Newspaper, BarChart3, Sun, Moon, Maximize2, X } from "lucide-react";

// The 5 target countries by ISO_A3
const TARGET_COUNTRIES = ["IND", "USA", "JPN", "AUS", "CHN"];

// --- DUMMY DATA GENERATORS ---
const getMockSectors = (countryIso: string) => {
  const data: Record<string, {name: string, changePct: number}[]> = {
      'USA': [{name: 'Technology', changePct: 2.15}, {name: 'Financials', changePct: -0.52}, {name: 'Energy', changePct: 1.24}, {name: 'Healthcare', changePct: -1.05}],
      'IND': [{name: 'IT Services', changePct: 1.54}, {name: 'Banking', changePct: 2.05}, {name: 'Automotive', changePct: -1.20}, {name: 'Pharma', changePct: 0.85}],
      'CHN': [{name: 'E-Commerce', changePct: 3.20}, {name: 'Manufacturing', changePct: -1.05}, {name: 'Real Estate', changePct: -2.50}],
      'JPN': [{name: 'Automotive', changePct: -0.92}, {name: 'Electronics', changePct: 1.42}, {name: 'Robotics', changePct: 2.10}],
      'AUS': [{name: 'Mining', changePct: 1.28}, {name: 'Financials', changePct: 0.45}, {name: 'Energy', changePct: -0.80}]
  };
  return data[countryIso] || [{name: 'Industrials', changePct: 0.5}, {name: 'Consumer', changePct: -0.2}];
};

const getMockStockData = (countryIso: string) => {
  const data: Record<string, { ticker: string, name: string, price: number, changePct: number }[]> = {
    'USA': [
        { ticker: 'AAPL', name: 'Apple Inc.', price: 173.50, changePct: 1.25 },
        { ticker: 'MSFT', name: 'Microsoft Corp', price: 418.05, changePct: -0.35 },
        { ticker: 'NVDA', name: 'NVIDIA Corp', price: 875.28, changePct: 1.43 }
    ],
    'IND': [
        { ticker: 'RELIANCE', name: 'Reliance Ind', price: 2980.50, changePct: 1.54 },
        { ticker: 'TCS', name: 'Tata Consultancy', price: 3845.00, changePct: -0.32 },
        { ticker: 'HDFCBANK', name: 'HDFC Bank', price: 1530.10, changePct: 1.03 }
    ],
    'CHN': [
        { ticker: 'TCEHY', name: 'Tencent', price: 38.56, changePct: 3.26 },
        { ticker: 'BABA', name: 'Alibaba Group', price: 73.20, changePct: -1.08 }
    ],
    'JPN': [
        { ticker: 'TM', name: 'Toyota Motor', price: 245.50, changePct: -0.92 },
        { ticker: 'SONY', name: 'Sony Group', price: 85.34, changePct: 1.42 }
    ],
    'AUS': [
        { ticker: 'BHP', name: 'BHP Group', price: 58.60, changePct: 0.68 },
        { ticker: 'RIO', name: 'Rio Tinto', price: 65.20, changePct: -1.28 }
    ]
  };
  return data[countryIso] || [];
};

const getMockStockDetails = (ticker: string) => {
  return {
    marketCap: (Math.random() * 2 + 1).toFixed(2) + 'T',
    peRatio: (Math.random() * 20 + 10).toFixed(1),
    volume: (Math.random() * 50 + 10).toFixed(1) + 'M',
    high52: '$' + (Math.random() * 500 + 100).toFixed(2),
  };
}

const generateCandlesCount = (basePrice: number, num: number, volatility: number) => {
    const candles = [];
    let cur = basePrice;
    const now = new Date();
    for (let i = 0; i < num; i++) {
        const change = (Math.random() - 0.5) * (basePrice * volatility);
        const open = cur;
        const close = cur + change;
        const high = Math.max(open, close) + Math.random() * (basePrice * (volatility / 2));
        const low = Math.min(open, close) - Math.random() * (basePrice * (volatility / 2));
        
        const d = new Date(now.getTime() - (num - i) * 86400000); // subtract days
        const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        candles.push({ open, close, high, low, date: dateLabel });
        cur = close;
    }
    return candles;
}

// Interactive Fullscreen Candlestick SVG 
const InteractiveCandlestickChart = ({ data, isDark }: { data: {open: number, close: number, high: number, low: number, date: string}[], isDark: boolean }) => {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    if (!data || data.length === 0) return null;
    
    const min = Math.min(...data.map(d => d.low));
    const max = Math.max(...data.map(d => d.high));
    const range = max - min;
    const padding = range * 0.1;
    const adjustedMin = min - padding;
    const adjustedMax = max + padding;
    const yRange = (adjustedMax - adjustedMin) || 1;

    const barWidth = 100 / data.length;
    const textCol = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const gridCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    return (
        <div className="w-full h-full relative" onMouseLeave={() => setHoverIdx(null)}>
            {/* Y-Axis Labels */}
            <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-[10px] font-medium pointer-events-none" style={{ color: textCol }}>
                <span>${adjustedMax.toFixed(0)}</span>
                <span>${(adjustedMax - yRange/2).toFixed(0)}</span>
                <span>${adjustedMin.toFixed(0)}</span>
            </div>

            <div className="absolute left-14 right-0 top-0 bottom-6">
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 100 100`}>
                    {/* Grid */}
                    <path d="M 0 0 L 100 0 M 0 50 L 100 50 M 0 100 L 100 100" stroke={gridCol} strokeWidth="0.2" strokeDasharray="1 1" fill="none" />
                    
                    {data.map((candle, i) => {
                        const isGrowing = candle.close >= candle.open;
                        const color = isGrowing ? '#4ade80' : '#f87171';
                        
                        const y1 = 100 - ((candle.high - adjustedMin) / yRange) * 100;
                        const y2 = 100 - ((candle.low - adjustedMin) / yRange) * 100;
                        const rectTop = 100 - ((Math.max(candle.open, candle.close) - adjustedMin) / yRange) * 100;
                        const rectBottom = 100 - ((Math.min(candle.open, candle.close) - adjustedMin) / yRange) * 100;
                        const rectHeight = Math.max(0.5, rectBottom - rectTop);
                        
                        const xCenter = (barWidth * i) + (barWidth / 2);
                        const boxW = Math.max(0.5, barWidth * 0.7);
                        const boxX = xCenter - (boxW / 2);

                        return (
                            <g key={i}>
                                <line x1={xCenter} y1={y1} x2={xCenter} y2={y2} stroke={color} strokeWidth={barWidth * 0.1} />
                                <rect x={boxX} y={rectTop} width={boxW} height={rectHeight} fill={color} />
                                {/* Invisible Hover Hitbox */}
                                <rect 
                                    x={barWidth * i} y="0" width={barWidth} height="100" 
                                    fill="transparent" 
                                    onMouseEnter={() => setHoverIdx(i)}
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* X-Axis Labels (show subset) */}
                <div className="absolute flex justify-between w-full -bottom-6 text-[10px] font-medium" style={{ color: textCol }}>
                    <span>{data[0].date}</span>
                    <span>{data[Math.floor(data.length/2)].date}</span>
                    <span>{data[data.length-1].date}</span>
                </div>

                {/* Interactive Tooltip Overlay */}
                {hoverIdx !== null && (
                    <div 
                        className={`absolute top-0 w-[1px] h-full pointer-events-none transition-all duration-75 flex flex-col items-center ${isDark ? 'bg-white/30' : 'bg-black/30'}`}
                        style={{ left: `${(hoverIdx * barWidth) + (barWidth / 2)}%` }}
                    >
                        <div className={`mt-2 p-3 rounded-lg shadow-xl text-xs whitespace-nowrap transform -translate-x-1/2 min-w-[140px] ${isDark ? 'bg-[#1a1820] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900 border'}`}>
                            <div className="text-center font-bold mb-2 pb-2 border-b border-inherit">{data[hoverIdx].date}</div>
                            <div className="flex justify-between gap-4 mb-1">
                                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>O</span> 
                                <span className="font-semibold">${data[hoverIdx].open.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4 mb-1">
                                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>H</span> 
                                <span className="font-semibold text-green-500">${data[hoverIdx].high.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4 mb-1">
                                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>L</span> 
                                <span className="font-semibold text-red-500">${data[hoverIdx].low.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className={isDark ? 'text-white/50' : 'text-slate-500'}>C</span> 
                                <span className="font-semibold">${data[hoverIdx].close.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Mini Sparkline component for the accordion preview
const Sparkline = ({ data }: { data: any[] }) => {
    if(!data) return null;
    const min = Math.min(...data.map(d => d.low));
    const max = Math.max(...data.map(d => d.high));
    const range = (max - min) || 1;
    
    return (
        <svg width="40" height="20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline 
                fill="none" 
                stroke={data[data.length-1].close >= data[0].close ? '#4ade80' : '#f87171'} 
                strokeWidth="6"
                points={data.map((d, i) => `${(i/data.length)*100},${100 - ((d.close - min)/range)*100}`).join(' ')}
            />
        </svg>
    )
}

// Advanced Individual Stock Card
const StockCard = ({ stock, onOpenAnalysis, isDark }: { stock: any, onOpenAnalysis: (ticker: string) => void, isDark: boolean }) => {
  const candles30 = React.useMemo(() => generateCandlesCount(stock.price, 15, 0.05), [stock.price]);

  return (
    <button 
        onClick={() => onOpenAnalysis(stock.ticker)}
        className={`w-full text-left rounded-xl p-4 flex items-center justify-between transition-all group border ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#9ea2f8]/50' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-sm'}`}
    >
        <div>
            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600'}`}>{stock.ticker}</p>
            <p className={`text-[10px] uppercase ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{stock.name}</p>
        </div>
        <div className="flex items-center gap-6">
            <Sparkline data={candles30} />
            <div className="text-right">
                <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>${stock.price.toFixed(2)}</p>
                <div className={`flex items-center gap-1 text-xs font-semibold justify-end ${stock.changePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                </div>
            </div>
            <div className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'bg-[#9ea2f8]/20 text-[#9ea2f8]' : 'bg-indigo-100 text-indigo-600'}`}>
               <Maximize2 className="w-4 h-4" />
            </div>
        </div>
    </button>
  );
};


export default function GlobalTradePage() {
  const globeRef = useRef<GlobeMethods>();
  const [countries, setCountries] = useState<any>({ features: [] });
  const [hoverD, setHoverD] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [countryNews, setCountryNews] = useState<NewsArticle[]>([]);
  const [globalNews, setGlobalNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'market'>('news');
  
  // Theme State
  const [isDark, setIsDark] = useState(true);

  // Pro Modal State
  const [analyzedStock, setAnalyzedStock] = useState<any>(null);
  const [modalTimeframe, setModalTimeframe] = useState<'1D' | '1W' | '1M' | '6M' | '1Y'>('1M');

  useEffect(() => {
    // Sync Theme on mount
    const stored = localStorage.getItem("theme-mode");
    if (stored) setIsDark(stored === "dark");
    else setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);

    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
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

  const toggleTheme = () => {
      const v = !isDark;
      setIsDark(v);
      localStorage.setItem("theme-mode", v ? "dark" : "light");
      if (v) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
  };

  const handleCountryClick = (polygon: any) => {
    const isTarget = TARGET_COUNTRIES.includes(polygon.properties.ISO_A3);
    if (!isTarget) return;

    const { LAT, LON } = getCountryCenter(polygon.properties.ISO_A3) || { LAT: 0, LON: 0 };
    if (globeRef.current && LAT !== 0 && LON !== 0) {
      globeRef.current.pointOfView({ lat: LAT, lng: LON, altitude: 1.5 }, 1000);
      globeRef.current.controls().autoRotate = false;
    }

    setSelectedCountry(polygon);
    setActiveTab('news');
    setAnalyzedStock(null);
    setLoadingNews(true);
    fetchCountryGeopolitics(polygon.properties.ISO_A2, polygon.properties.ADMIN)
      .then(news => {
        setCountryNews(news);
        setLoadingNews(false);
      });
  };

  const getCountryCenter = (isoA3: string) => {
    const centers: Record<string, {LAT: number, LON: number}> = {
        'IND': { LAT: 20.5937, LON: 78.9629 },
        'USA': { LAT: 37.0902, LON: -95.7129 },
        'JPN': { LAT: 36.2048, LON: 138.2529 },
        'AUS': { LAT: -25.2744, LON: 133.7751 },
        'CHN': { LAT: 35.8617, LON: 104.1954 }
    };
    return centers[isoA3] || { LAT: 0, LON: 0 };
  };

  const polygonColor = (d: any) => {
    const isTarget = TARGET_COUNTRIES.includes(d.properties.ISO_A3);
    const isSelected = selectedCountry && selectedCountry.properties.ISO_A3 === d.properties.ISO_A3;
    const isHovered = hoverD && hoverD.properties.ISO_A3 === d.properties.ISO_A3;

    if (isDark) {
        if (isSelected) return 'rgba(158, 162, 248, 0.8)';
        if (!isTarget) return 'rgba(255, 255, 255, 0.05)';
        if (isHovered) return 'rgba(158, 162, 248, 0.5)';
        if (selectedCountry) return 'rgba(255, 255, 255, 0.1)';
        return 'rgba(255, 255, 255, 0.3)';
    } else {
        if (isSelected) return 'rgba(99, 102, 241, 0.8)'; // Indigo-500
        if (!isTarget) return 'rgba(0, 0, 0, 0.03)';
        if (isHovered) return 'rgba(99, 102, 241, 0.5)';
        if (selectedCountry) return 'rgba(0, 0, 0, 0.05)';
        return 'rgba(0, 0, 0, 0.2)';
    }
  };

  // Dynamic Theme Colors
  const t = {
      bg: isDark ? 'bg-[#1a0f3a]' : 'bg-slate-50',
      textMain: isDark ? 'text-white' : 'text-slate-900',
      textMuted: isDark ? 'text-white/60' : 'text-slate-500',
      panelBg: isDark ? 'bg-[#141318]/90' : 'bg-white/90',
      borderLine: isDark ? 'border-white/10' : 'border-slate-200',
      brandCol: isDark ? 'text-[#9EA2F8]' : 'text-indigo-600',
      brandBg: isDark ? 'bg-[#9EA2F8]' : 'bg-indigo-600',
      hoverBg: isDark ? 'hover:bg-white/10' : 'hover:bg-slate-200',
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden font-sans transition-colors duration-500 ${t.bg} ${t.textMain}`}>
      {/* Background styling depending on theme */}
      {isDark && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(circle at center, transparent 0%, #1a0f3a 100%)',
            zIndex: 1
          }} />
      )}

      {/* Header Actions */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-4">
        <Link to="/" className={`flex items-center gap-2 transition-colors backdrop-blur-md px-5 py-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white' : 'bg-white/80 border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm'}`}>
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Platform</span>
        </Link>
        <button 
           onClick={toggleTheme}
           className={`p-3 rounded-xl backdrop-blur-md border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white/80 border-slate-200 hover:bg-white text-slate-800 shadow-sm'}`}
        >
           {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Global Title */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 text-center pointer-events-none flex flex-col items-center">
        <h1 className="leading-tight text-[48px] md:text-[60px] font-bold tracking-tight drop-shadow-xl">
          Global <span className={t.brandCol}>Trade</span>
        </h1>
        <div className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full border backdrop-blur-sm ${isDark ? 'bg-black/40 border-[#9EA2F8]/30' : 'bg-white/80 border-indigo-200 shadow-sm'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${t.brandBg}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Live Geopolitical Market Impact</p>
        </div>
      </div>

      {/* Right Sidebar - Premium Editorial Breaking News UI */}
      <div className={`absolute top-0 right-0 h-full w-[440px] backdrop-blur-2xl border-l z-40 flex flex-col pt-32 pb-6 px-6 shadow-2xl transition-colors duration-500 ${t.panelBg} ${t.borderLine}`}>
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] animate-pulse" />
          <h2 className="text-3xl font-extrabold tracking-tight">Daily Briefing</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 space-y-6" style={{ scrollbarWidth: 'none' }}>
          {globalNews.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-4">
                <Loader2 className={`w-8 h-8 animate-spin ${t.brandCol}`} />
                <span className={`${t.textMuted} font-medium`}>Scanning global feeds...</span>
            </div>
          ) : (
            globalNews.map((news, idx) => (
              <a key={idx} href={news.url} target="_blank" rel="noopener noreferrer" className="block relative h-[250px] rounded-3xl overflow-hidden group shadow-xl">
                 {/* Full Cover Image */}
                 {news.image ? (
                     <img src={news.image} alt={news.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                 ) : (
                     <div className={`absolute inset-0 w-full h-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                 
                 {/* Editorial Overlay */}
                 <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end">
                    <span className="text-[10px] uppercase tracking-widest font-black text-black bg-white/90 px-3 py-1 rounded-full self-start mb-3 shadow-sm">
                        {news.source.name}
                    </span>
                    <h3 className="text-white text-lg font-bold leading-snug drop-shadow-md">
                        {news.title}
                    </h3>
                    <p className="text-white/60 text-xs mt-2 font-medium">{new Date(news.publishedAt).toLocaleDateString()}</p>
                 </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* Left Sidebar - Selected Country Details */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div 
            initial={{ x: -500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -500, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`absolute top-28 left-6 bottom-8 w-[450px] backdrop-blur-2xl border rounded-3xl z-40 flex flex-col p-6 shadow-2xl transition-colors duration-500 ${t.panelBg} ${t.borderLine}`}
          >
            {/* Header */}
            <div className={`flex justify-between items-start mb-6 pb-4 border-b ${t.borderLine}`}>
               <div>
                   <h2 className={`text-4xl font-extrabold tracking-tight ${t.brandCol}`}>{selectedCountry.properties.ADMIN}</h2>
                   <div className="flex items-center gap-2 mt-2">
                     <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md border ${isDark ? 'bg-white/5 text-white/70 border-white/10' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                         Market Overview
                     </span>
                   </div>
               </div>
               <button 
                  onClick={() => {
                      setSelectedCountry(null);
                      if (globeRef.current) globeRef.current.controls().autoRotate = true;
                  }}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} text-xl`}
                >
                   ×
               </button>
            </div>

            {/* Tabs */}
            <div className={`flex p-1 rounded-xl mb-6 border ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                <button 
                  onClick={() => setActiveTab('news')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'news' ? `${t.brandBg} text-white shadow-lg` : `${t.textMuted} ${t.hoverBg}`}`}
                >
                  <Newspaper className="w-4 h-4" /> Policy & News
                </button>
                <button 
                  onClick={() => setActiveTab('market')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'market' ? `${t.brandBg} text-white shadow-lg` : `${t.textMuted} ${t.hoverBg}`}`}
                >
                  <BarChart3 className="w-4 h-4" /> Equities Insight
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'none' }}>
              
              {/* NEWS TAB */}
              {activeTab === 'news' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {loadingNews ? (
                    <div className={`flex flex-col items-center justify-center h-48 space-y-4 ${t.textMuted}`}>
                        <Loader2 className={`w-8 h-8 animate-spin ${t.brandCol}`} />
                        <p className="text-sm font-medium">Analyzing regional sectors...</p>
                    </div>
                  ) : countryNews.length > 0 ? (
                    <div className="space-y-4">
                      {countryNews.map((news, idx) => (
                          <a key={idx} href={news.url} target="_blank" rel="noopener noreferrer" className="block group">
                              <div className={`border rounded-2xl p-5 transition-all shadow-sm ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#9EA2F8]/50' : 'bg-white border-slate-200 hover:border-indigo-400'}`}>
                                  <h3 className={`font-semibold text-[15px] mb-2 transition-colors leading-snug ${isDark ? 'group-hover:text-[#9EA2F8]' : 'text-slate-900 group-hover:text-indigo-600'}`}>{news.title}</h3>
                                  <p className={`text-xs mb-4 line-clamp-3 leading-relaxed ${t.textMuted}`}>{news.description}</p>
                                  <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                      <span>{news.source.name}</span>
                                      <div className={`flex items-center gap-1 transition-colors ${isDark ? 'group-hover:text-[#9EA2F8]' : 'group-hover:text-indigo-600'}`}>
                                          <span>Read</span>
                                          <ExternalLink className="w-3 h-3" />
                                      </div>
                                  </div>
                              </div>
                          </a>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center rounded-2xl p-8 border ${isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <p className="text-sm font-medium">No recent updates found for this region.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* MARKET TAB */}
              {activeTab === 'market' && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {/* Sector Performance Tags */}
                    <div className={`border rounded-2xl p-5 shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                        <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                           <TrendingUp className={`w-5 h-5 ${t.brandCol}`} /> Key Sectors (Mock)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {getMockSectors(selectedCountry.properties.ISO_A3).map((sector) => {
                                const isPos = sector.changePct >= 0;
                                return (
                                    <span key={sector.name} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isPos ? (isDark ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-100 text-green-700 border border-green-200') : (isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-100 text-red-700 border border-red-200')}`}>
                                        {sector.name} 
                                        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {isPos ? '+' : ''}{sector.changePct.toFixed(2)}%
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                       {getMockStockData(selectedCountry.properties.ISO_A3).map((stock) => (
                          <StockCard 
                              key={stock.ticker} 
                              stock={stock} 
                              onOpenAnalysis={(ticker) => setAnalyzedStock(getMockStockData(selectedCountry.properties.ISO_A3).find(s => s.ticker === ticker))}
                              isDark={isDark}
                          />
                       ))}
                       {getMockStockData(selectedCountry.properties.ISO_A3).length === 0 && (
                           <div className={`text-center p-6 rounded-xl text-sm ${isDark ? 'bg-white/5 text-white/50' : 'bg-slate-50 text-slate-500'}`}>
                               Market data currently unavailable across local exchanges.
                           </div>
                       )}
                    </div>
                 </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pro Chart Modal Overlay */}
      <AnimatePresence>
          {analyzedStock && (
            <div className={`fixed inset-0 z-[100] flex items-center justify-center p-8 backdrop-blur-md ${isDark ? 'bg-black/60' : 'bg-slate-900/40'}`}>
               <motion.div 
                   initial={{ scale: 0.95, opacity: 0 }} 
                   animate={{ scale: 1, opacity: 1 }} 
                   exit={{ scale: 0.95, opacity: 0 }}
                   className={`relative w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col border overflow-hidden ${isDark ? 'bg-[#18181b] border-white/10' : 'bg-white border-slate-200'}`}
                >
                    {/* Modal Headers */}
                    <div className={`p-6 flex justify-between items-center border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                        <div>
                            <h2 className="text-3xl font-black">{analyzedStock.ticker}</h2>
                            <p className={`text-sm font-medium uppercase tracking-widest ${t.textMuted}`}>{analyzedStock.name}</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right mr-6">
                                <p className="text-3xl font-bold">${analyzedStock.price.toFixed(2)}</p>
                                <p className={`font-bold text-sm ${analyzedStock.changePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                   {analyzedStock.changePct >= 0 ? '+' : ''}{analyzedStock.changePct.toFixed(2)}% Today
                                </p>
                            </div>
                            <button onClick={() => setAnalyzedStock(null)} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Chart Viewer */}
                    <div className="p-8 flex flex-col">
                        <div className="flex items-center gap-2 mb-8 bg-slate-500/5 p-1 rounded-xl self-start">
                            {['1D', '1W', '1M', '6M', '1Y'].map(tf => {
                                const isActive = modalTimeframe === tf;    
                                return (
                                <button 
                                  key={tf}
                                  onClick={() => setModalTimeframe(tf as any)}
                                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isActive ? (isDark ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white shadow-md') : (isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                                >
                                    {tf}
                                </button>
                            )})}
                        </div>
                        
                        <div className={`w-full h-[400px] rounded-2xl p-4 border ${isDark ? 'bg-[#121214] border-white/5' : 'bg-slate-50 border-slate-100 shadow-inner'}`}>
                            <InteractiveCandlestickChart 
                                isDark={isDark}
                                data={generateCandlesCount(analyzedStock.price, 
                                    modalTimeframe === '1D' ? 24 : 
                                    modalTimeframe === '1W' ? 30 : 
                                    modalTimeframe === '1M' ? 30 : 
                                    modalTimeframe === '6M' ? 40 : 52, 
                                    modalTimeframe === '1D' ? 0.01 : 
                                    modalTimeframe === '1Y' ? 0.3 : 0.08
                                )} 
                            />
                        </div>

                        {/* Analysis Footer */}
                        <div className={`grid grid-cols-4 gap-4 mt-8 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                             {Object.entries(getMockStockDetails(analyzedStock.ticker)).map(([key, val]) => (
                                 <div key={key}>
                                     <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>{key}</p>
                                     <p className="text-lg font-semibold">{val}</p>
                                 </div>
                             ))}
                        </div>
                    </div>
               </motion.div>
            </div>
          )}
      </AnimatePresence>

      {/* The 3D Globe Container */}
      <div 
        className="w-full h-full cursor-grab active:cursor-grabbing pb-12 pr-[440px]"
        onMouseEnter={() => {
          if (globeRef.current && !selectedCountry && !analyzedStock) globeRef.current.controls().autoRotate = false;
        }} 
        onMouseLeave={() => {
          if (globeRef.current && !selectedCountry && !analyzedStock) globeRef.current.controls().autoRotate = true;
        }}
        style={{
          width: "calc(100% + 440px)",
          marginLeft: "-220px"
        }}
      >
        <Globe
          ref={globeRef}
          globeImageUrl={isDark ? "//unpkg.com/three-globe/example/img/earth-night.jpg" : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"}
          backgroundImageUrl={isDark ? "//unpkg.com/three-globe/example/img/night-sky.png" : undefined}
          backgroundColor={isDark ? undefined : "rgba(0,0,0,0)"}
          polygonsData={countries.features}
          polygonAltitude={d => d === hoverD ? 0.05 : 0.01}
          polygonCapColor={polygonColor as any}
          polygonSideColor={() => isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)'}
          polygonStrokeColor={() => isDark ? '#111' : '#ccc'}
          onPolygonHover={setHoverD}
          onPolygonClick={handleCountryClick}
          polygonsTransitionDuration={300}
        />
      </div>
    </div>
  );
}
