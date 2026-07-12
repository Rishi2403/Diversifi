import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, Loader2 } from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis } from "recharts";

interface Stock {
  symbol: string;
  name?: string;
  qty: number;
  avgBuyPrice: number;
  currentValue: number;
  livePrice?: number;
  change1d?: number;
  buyDate?: string;
}

interface MF {
  fundName?: string;
  name?: string;
  category?: string;
  currentValue: number;
  investedAmount: number;
  buyDate?: string;
}

interface PricePoint { date: string; close: number; }

interface Props {
  stocks: Stock[];
  mutualFunds: MF[];
}

function pnlColor(val: number) {
  if (val > 0) return "text-emerald-500 dark:text-emerald-400";
  if (val < 0) return "text-red-500 dark:text-red-400";
  return "text-muted-foreground";
}

function pnlBg(val: number) {
  if (val > 0) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (val < 0) return "bg-red-500/10 text-red-600 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

// ── Mini Area Chart ───────────────────────────────────────────────────────────

function MiniPriceChart({ symbol }: { symbol: string }) {
  const [data, setData]       = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(false);
    fetch(`/api/agent/history?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data || []);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return (
    <div className="h-24 flex items-center justify-center">
      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
    </div>
  );
  if (error || data.length === 0) return (
    <div className="h-24 flex items-center justify-center text-muted-foreground text-xs">
      No chart data
    </div>
  );

  const first = data[0].close;
  const last  = data[data.length - 1].close;
  const trend = last >= first;
  const chartColor = trend ? "#10b981" : "#ef4444";

  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
            formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Close"]}
            labelFormatter={l => String(l).slice(5)} // show MM-DD
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={chartColor}
            strokeWidth={2}
            fill={`url(#grad-${symbol})`}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── MF Gains bar ─────────────────────────────────────────────────────────────

function MFGainsBar({ invested, current }: { invested: number; current: number }) {
  const gain = current - invested;
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
  const pct = Math.min(100, Math.max(0, (current / (invested * 2)) * 100)); // scale bar
  const positive = gain >= 0;

  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">Invested → Current</span>
        <span className={positive ? "text-emerald-500" : "text-red-500"}>
          {positive ? "+" : ""}{gainPct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${positive ? "bg-emerald-500" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
        <span>₹{invested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
        <span className={positive ? "text-emerald-500" : "text-red-500"}>
          ₹{current.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${color ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

// ── Stocks tab ────────────────────────────────────────────────────────────────

function StocksTab({ stocks }: { stocks: Stock[] }) {
  const [selected, setSelected] = useState(stocks[0]?.symbol ?? "");

  useEffect(() => {
    if (!selected && stocks.length > 0) setSelected(stocks[0].symbol);
  }, [stocks, selected]);

  const s = stocks.find(x => x.symbol === selected) ?? stocks[0];
  if (!s) return <div className="p-4 text-muted-foreground text-sm">No stocks</div>;

  const cost  = (s.avgBuyPrice || 0) * (s.qty || 0);
  const cv    = s.currentValue || 0;
  const pnl   = cv - cost;
  const pnlp  = cost > 0 ? (pnl / cost) * 100 : 0;
  const chg   = s.change1d;

  return (
    <div className="p-4 space-y-4">
      {/* Dropdown */}
      <div className="relative">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="w-full appearance-none bg-muted border border-border rounded-lg px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {stocks.map(s => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} — {s.name || s.symbol}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Live indicator */}
      {chg != null && (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${pnlBg(chg)}`}>
          {chg > 0 ? <TrendingUp className="w-4 h-4" /> : chg < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          {chg > 0 ? "+" : ""}{chg.toFixed(2)}% today
          {s.livePrice && <span className="font-normal opacity-70">· ₹{s.livePrice.toLocaleString("en-IN")}</span>}
        </div>
      )}

      {/* Mini Chart */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-xs text-muted-foreground">30-day price trend</span>
        </div>
        <MiniPriceChart symbol={selected} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Qty" value={`${s.qty} shares`} />
        <Stat label="Avg Buy Price" value={`₹${(s.avgBuyPrice || 0).toLocaleString("en-IN")}`} />
        <Stat label="Current Value" value={`₹${cv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
        <Stat label="Invested" value={`₹${cost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
        <Stat
          label="Unrealised P&L"
          value={`${pnl >= 0 ? "+" : ""}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })} (${pnlp >= 0 ? "+" : ""}${pnlp.toFixed(1)}%)`}
          color={pnlColor(pnl)}
        />
        {s.buyDate && (
          <Stat label="Buy Date" value={s.buyDate} />
        )}
      </div>
    </div>
  );
}

// ── MF tab ────────────────────────────────────────────────────────────────────

function MFTab({ mfs }: { mfs: MF[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const m = mfs[selectedIdx];
  if (!m) return <div className="p-4 text-muted-foreground text-sm">No mutual funds</div>;

  const name    = m.fundName || m.name || "Fund";
  const cv      = m.currentValue || 0;
  const inv     = m.investedAmount || 0;
  const pnl     = cv - inv;
  const pnlp    = inv > 0 ? (pnl / inv) * 100 : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Dropdown */}
      <div className="relative">
        <select
          value={selectedIdx}
          onChange={e => setSelectedIdx(Number(e.target.value))}
          className="w-full appearance-none bg-muted border border-border rounded-lg px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {mfs.map((mf, i) => (
            <option key={i} value={i}>
              {mf.fundName || mf.name || `Fund ${i + 1}`}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Category + P&L pill */}
      <div className="flex items-center gap-2 flex-wrap">
        {m.category && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium">
            {m.category}
          </span>
        )}
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${pnlBg(pnl)}`}>
          {pnl >= 0 ? "+" : ""}₹{Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({pnlp >= 0 ? "+" : ""}{pnlp.toFixed(1)}%)
        </span>
      </div>

      {/* Gains bar — visual progress */}
      <div className="rounded-xl border border-border bg-card p-4">
        <MFGainsBar invested={inv} current={cv} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Invested" value={`₹${inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
        <Stat label="Current Value" value={`₹${cv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
        <Stat
          label="Unrealised P&L"
          value={`${pnl >= 0 ? "+" : ""}${pnlp.toFixed(1)}%`}
          color={pnlColor(pnl)}
        />
        {m.buyDate && <Stat label="Buy Date" value={m.buyDate} />}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HoldingsGrid({ stocks, mutualFunds }: Props) {
  const [tab, setTab] = useState<"stocks" | "mf">("stocks");

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {(["stocks", "mf"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "stocks" ? `Stocks (${stocks.length})` : `Mutual Funds (${mutualFunds.length})`}
          </button>
        ))}
      </div>

      {tab === "stocks" && <StocksTab stocks={stocks} />}
      {tab === "mf"     && <MFTab mfs={mutualFunds} />}
    </div>
  );
}
