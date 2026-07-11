import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, TrendingUp, TrendingDown, Globe, BarChart3,
  Coins, DollarSign, Newspaper, Clock, WifiOff,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { fetchMarketNews, NewsArticle } from "@/services/newsService";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketItem {
  symbol: string;
  name: string;
  region?: string;
  flag?: string;
  unit?: string;
  price: number;
  change: number;
  changePct: number;
}

interface MarketsApiData {
  success: boolean;
  indices: MarketItem[];
  commodities: MarketItem[];
  timestamp: string;
}

interface CryptoItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
}

interface ForexRates {
  base: string;
  rates: Record<string, number>;
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = (n: number, dec = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const fmtCrypto = (n: number) => {
  if (n >= 1000) return `$${fmt(n, 2)}`;
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toPrecision(4)}`;
};

const fmtMktCap = (n: number) => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ChangeTag = ({ pct }: { pct: number }) => (
  <span
    className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
      pct >= 0 ? "bg-[#00D09C]/15 text-[#00D09C]" : "bg-red-500/15 text-red-400"
    }`}
  >
    {pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
    {fmtPct(pct)}
  </span>
);

const SkeletonCard = () => (
  <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
    <div className="h-6 bg-muted rounded w-2/3 mb-1" />
    <div className="h-3 bg-muted rounded w-1/3" />
  </div>
);

const SectionHeader = ({
  icon, title, subtitle,
}: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-1.5 rounded-md bg-[#00D09C]/10 text-[#00D09C]">{icon}</div>
    <div>
      <h2 className="font-semibold text-base leading-tight">{title}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

const IndexCard = ({ item, delay = 0 }: { item: MarketItem; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-card border border-border rounded-xl p-4 hover:border-[#00D09C]/40 transition-colors cursor-default"
  >
    <div className="flex items-start justify-between mb-2">
      <div>
        <p className="text-xs text-muted-foreground">
          {item.flag} {item.region}
        </p>
        <p className="font-semibold text-sm mt-0.5 leading-tight">{item.name}</p>
      </div>
      <ChangeTag pct={item.changePct} />
    </div>
    <p className="text-lg font-bold tabular-nums">{fmt(item.price)}</p>
    <p
      className={`text-xs mt-0.5 tabular-nums font-medium ${
        item.change >= 0 ? "text-[#00D09C]" : "text-red-400"
      }`}
    >
      {item.change >= 0 ? "▲" : "▼"}{" "}
      {Math.abs(item.change).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </p>
  </motion.div>
);

const CommodityCard = ({ item, delay = 0 }: { item: MarketItem; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-card border border-border rounded-xl p-4 hover:border-[#00D09C]/40 transition-colors cursor-default"
  >
    <div className="flex items-center justify-between mb-1">
      <p className="font-semibold text-sm">{item.name}</p>
      <ChangeTag pct={item.changePct} />
    </div>
    <p className="text-lg font-bold tabular-nums">${fmt(item.price)}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{item.unit}</p>
    <p
      className={`text-xs mt-0.5 tabular-nums font-medium ${
        item.change >= 0 ? "text-[#00D09C]" : "text-red-400"
      }`}
    >
      {item.change >= 0 ? "▲" : "▼"} ${Math.abs(item.change).toFixed(2)}
    </p>
  </motion.div>
);

const CryptoCard = ({ item, delay = 0 }: { item: CryptoItem; delay?: number }) => {
  const isUp = item.price_change_percentage_24h >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card border border-border rounded-xl p-4 hover:border-[#00D09C]/40 transition-colors cursor-default"
    >
      <div className="flex items-center gap-2 mb-2">
        <img
          src={item.image}
          alt={item.name}
          className="w-6 h-6 rounded-full"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div>
          <p className="font-semibold text-sm leading-tight">{item.name}</p>
          <p className="text-xs text-muted-foreground uppercase">{item.symbol}</p>
        </div>
      </div>
      <p className="text-base font-bold tabular-nums">{fmtCrypto(item.current_price)}</p>
      <div className="flex items-center justify-between mt-1">
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
            isUp ? "text-[#00D09C]" : "text-red-400"
          }`}
        >
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {fmtPct(item.price_change_percentage_24h)}
        </span>
        <span className="text-xs text-muted-foreground">{fmtMktCap(item.market_cap)}</span>
      </div>
    </motion.div>
  );
};

const NewsCard = ({ article }: { article: NewsArticle }) => (
  <a
    href={article.url}
    target="_blank"
    rel="noopener noreferrer"
    className="bg-card border border-border rounded-xl overflow-hidden hover:border-[#00D09C]/40 transition-colors flex flex-col"
  >
    {article.image && (
      <img
        src={article.image}
        alt=""
        className="w-full h-32 object-cover"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    )}
    <div className="p-3 flex flex-col flex-1">
      <p className="text-xs text-muted-foreground mb-1 font-medium">{article.source.name}</p>
      <p className="text-sm font-semibold line-clamp-2 leading-snug">{article.title}</p>
      {article.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">
          {article.description}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        {new Date(article.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  </a>
);

// ── Ticker strip ──────────────────────────────────────────────────────────────

const TickerStrip = ({ indices }: { indices: MarketItem[] }) => {
  if (!indices.length) return null;
  const items = [...indices, ...indices]; // duplicate for seamless loop
  return (
    <div className="overflow-hidden border-y border-border bg-card/60 py-2 select-none">
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        style={{ width: "max-content" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear", repeatType: "loop" }}
      >
        {items.map((item, i) => (
          <span key={`${item.symbol}-${i}`} className="inline-flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">
              {item.flag} {item.name}
            </span>
            <span className="font-mono tabular-nums text-foreground/80">{fmt(item.price)}</span>
            <span
              className={`font-semibold ${
                item.changePct >= 0 ? "text-[#00D09C]" : "text-red-400"
              }`}
            >
              {fmtPct(item.changePct)}
            </span>
            <span className="text-border mx-1">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
};

// ── Forex config ──────────────────────────────────────────────────────────────

const FOREX_PAIRS = [
  { quote: "INR", label: "USD / INR", flag: "🇮🇳" },
  { quote: "EUR", label: "USD / EUR", flag: "🇪🇺" },
  { quote: "GBP", label: "USD / GBP", flag: "🇬🇧" },
  { quote: "JPY", label: "USD / JPY", flag: "🇯🇵" },
  { quote: "CNY", label: "USD / CNY", flag: "🇨🇳" },
  { quote: "AUD", label: "USD / AUD", flag: "🇦🇺" },
  { quote: "CAD", label: "USD / CAD", flag: "🇨🇦" },
  { quote: "CHF", label: "USD / CHF", flag: "🇨🇭" },
];

// ── Custom tooltip for the bar chart ─────────────────────────────────────────

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-0.5">{d.payload.name}</p>
      <p className={d.value >= 0 ? "text-[#00D09C]" : "text-red-400"}>
        {fmtPct(d.value)}
      </p>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GlobalMarketsPage() {
  const [markets, setMarkets] = useState<MarketsApiData | null>(null);
  const [crypto, setCrypto] = useState<CryptoItem[]>([]);
  const [forex, setForex] = useState<ForexRates | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partialError, setPartialError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  const fetchAll = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    setPartialError(false);

    const [marketsRes, cryptoRes, forexRes, newsRes] = await Promise.allSettled([
      fetch("/api/markets").then((r) => r.json()),
      fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false"
      ).then((r) => r.json()),
      fetch(
        "https://api.frankfurter.app/latest?from=USD&to=INR,EUR,GBP,JPY,CNY,AUD,CAD,CHF"
      ).then((r) => r.json()),
      fetchMarketNews(),
    ]);

    let anyFailed = false;

    if (marketsRes.status === "fulfilled" && marketsRes.value?.success) {
      setMarkets(marketsRes.value);
    } else {
      anyFailed = true;
    }

    if (cryptoRes.status === "fulfilled" && Array.isArray(cryptoRes.value)) {
      setCrypto(cryptoRes.value);
    } else {
      anyFailed = true;
    }

    if (forexRes.status === "fulfilled" && forexRes.value?.rates) {
      setForex(forexRes.value);
    } else {
      anyFailed = true;
    }

    if (newsRes.status === "fulfilled") {
      setNews(newsRes.value);
    }

    if (anyFailed) setPartialError(true);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll(true);
    timerRef.current = window.setInterval(() => fetchAll(false), 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchAll]);

  const chartData = (markets?.indices ?? []).map((idx) => ({
    name: idx.name,
    change: idx.changePct,
  }));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Page header */}
      <div className="px-4 md:px-8 py-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00D09C]/10">
            <Globe className="w-5 h-5 text-[#00D09C]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Global Markets</h1>
            <p className="text-xs text-muted-foreground">
              Live indices · Commodities · Forex · Crypto · News
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchAll(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Ticker strip */}
      {loading ? (
        <div className="h-10 bg-card/60 border-y border-border animate-pulse" />
      ) : (
        <TickerStrip indices={markets?.indices ?? []} />
      )}

      <div className="px-4 md:px-8 py-6 space-y-10">

        {/* Partial error notice */}
        {partialError && (
          <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5">
            <WifiOff className="w-4 h-4 shrink-0" />
            Some data sources could not be reached. Displaying available data.
          </div>
        )}

        {/* ── Global Indices ── */}
        <section>
          <SectionHeader
            icon={<BarChart3 className="w-4 h-4" />}
            title="Global Indices"
            subtitle="Major stock market benchmarks worldwide"
          />
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(markets?.indices ?? []).map((item, i) => (
                <IndexCard key={item.symbol} item={item} delay={i * 0.04} />
              ))}
            </div>
          )}
        </section>

        {/* ── Market Performance Chart ── */}
        {!loading && chartData.length > 0 && (
          <section>
            <SectionHeader
              icon={<BarChart3 className="w-4 h-4" />}
              title="Market Performance"
              subtitle="Today's change % across major indices"
            />
            <div className="bg-card border border-border rounded-xl p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 12, bottom: 48, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v}%`}
                    width={42}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
                  <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.change >= 0 ? "#00D09C" : "#EF4444"}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Commodities + Forex ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Commodities */}
          <section>
            <SectionHeader
              icon={<Coins className="w-4 h-4" />}
              title="Commodities"
              subtitle="Energy, metals & natural resources"
            />
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(markets?.commodities ?? []).map((item, i) => (
                  <CommodityCard key={item.symbol} item={item} delay={i * 0.05} />
                ))}
              </div>
            )}
          </section>

          {/* Forex */}
          <section>
            <SectionHeader
              icon={<DollarSign className="w-4 h-4" />}
              title="Forex Rates"
              subtitle="Currency exchange rates — base: USD"
            />
            {loading || !forex ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-10 animate-pulse bg-muted/40 ${i < 7 ? "border-b border-border" : ""}`}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {FOREX_PAIRS.map(({ quote, label, flag }, i) => {
                  const rate = forex.rates[quote];
                  if (!rate) return null;
                  return (
                    <div
                      key={quote}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent/40 transition-colors ${
                        i < FOREX_PAIRS.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className="font-medium text-foreground/90">
                        {flag} {label}
                      </span>
                      <span className="font-mono font-bold tabular-nums">{rate.toFixed(4)}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </section>
        </div>

        {/* ── Cryptocurrencies ── */}
        <section>
          <SectionHeader
            icon={<Coins className="w-4 h-4" />}
            title="Cryptocurrencies"
            subtitle="Top 8 digital assets by market capitalisation"
          />
          {loading || !crypto.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {crypto.map((item, i) => (
                <CryptoCard key={item.id} item={item} delay={i * 0.04} />
              ))}
            </div>
          )}
        </section>

        {/* ── News ── */}
        <section>
          <SectionHeader
            icon={<Newspaper className="w-4 h-4" />}
            title="Global Market News"
            subtitle="Latest financial & economic headlines"
          />
          {!news.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl animate-pulse h-52"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.slice(0, 6).map((article, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <NewsCard article={article} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
