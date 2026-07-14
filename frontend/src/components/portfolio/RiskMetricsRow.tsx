interface Props {
  portfolioCagr: number | null;
  benchmarkCagr: number | null;
  port6mReturn?: number | null;
  bench6mReturn?: number | null;
  alpha: number | null;
  beta: number | null;
  sharpe: number | null;
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
      <p className="text-[10px] text-gray-500 dark:text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-black ${color ?? "text-gray-900 dark:text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return "-";
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

function returnColor(v: number | null | undefined) {
  if (v === null || v === undefined) return undefined;
  return v >= 0 ? "text-emerald-500" : "text-red-400";
}

function sharpeColor(v: number | null | undefined) {
  if (v === null || v === undefined) return undefined;
  return v >= 1 ? "text-emerald-500" : v >= 0.5 ? "text-yellow-500" : "text-red-400";
}

export function RiskMetricsRow({ portfolioCagr, port6mReturn, bench6mReturn, alpha, beta, sharpe }: Props) {
  const show6m = port6mReturn !== null && port6mReturn !== undefined && bench6mReturn !== null && bench6mReturn !== undefined;

  const betaLabel = beta !== null
    ? beta < 0.8 ? "Low volatility" : beta > 1.2 ? "High volatility" : "Market-like"
    : undefined;
  const sharpeLabel = sharpe !== null
    ? sharpe >= 1.5 ? "Excellent" : sharpe >= 1 ? "Good" : sharpe >= 0.5 ? "Fair" : "Poor"
    : undefined;

  return (
    <div className="space-y-3">
      {/* Row 1: Returns comparison - same time basis */}
      {show6m && (
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Portfolio (6M)"
            value={fmtPct(port6mReturn)}
            sub="your stocks, last 6 months"
            color={returnColor(port6mReturn)}
          />
          <Stat
            label="Benchmark (6M)"
            value={fmtPct(bench6mReturn)}
            sub={`Nifty - same period`}
            color={returnColor(bench6mReturn)}
          />
        </div>
      )}

      {/* Row 2: Risk metrics + since-purchase CAGR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="CAGR (since buy)"
          value={portfolioCagr !== null && portfolioCagr !== undefined ? fmtPct(portfolioCagr) : "-"}
          sub="from purchase dates"
          color={returnColor(portfolioCagr)}
        />
        <Stat
          label="Alpha"
          value={fmtPct(alpha)}
          sub={alpha !== null ? (alpha >= 0 ? "Beats market" : "Below market") : undefined}
          color={alpha !== null ? (alpha >= 0 ? "text-emerald-500" : "text-red-400") : undefined}
        />
        <Stat
          label="Beta"
          value={beta !== null ? beta.toFixed(2) : "-"}
          sub={betaLabel}
          color={beta !== null && beta > 1.2 ? "text-orange-400" : undefined}
        />
        <Stat
          label="Sharpe Ratio"
          value={sharpe !== null ? sharpe.toFixed(2) : "-"}
          sub={sharpeLabel}
          color={sharpeColor(sharpe)}
        />
      </div>

      {/* Note clarifying what CAGR vs 6M mean */}
      <p className="text-[10px] text-gray-400 dark:text-white/25 text-right">
        6M returns are directly comparable. CAGR (since buy) is from your actual purchase dates - a different time horizon.
      </p>
    </div>
  );
}
