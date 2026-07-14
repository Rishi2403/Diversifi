interface Holding {
  symbol: string;
  name: string;
  is_mf: boolean;
  cagr: number | null;
  unrealized_pnl: number | null;
  holding_days: number | null;
  is_ltcg: boolean;
  cost: number;
  current_value: number;
  category?: string;
}

interface Props {
  holdings: Holding[];
}

function formatINR(n: number) {
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function holdingPeriod(days: number | null) {
  if (!days) return "-";
  if (days >= 365) return `${(days / 365).toFixed(1)}y`;
  return `${Math.round(days / 30)}m`;
}

export function HoldingsPerformanceTable({ holdings }: Props) {
  if (!holdings || holdings.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-white/30 text-center py-4">No holding data available</p>;
  }

  const sorted = [...holdings].sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-widest border-b border-gray-200 dark:border-white/10">
            <th className="text-left pb-2 font-black">Holding</th>
            <th className="text-right pb-2 font-black">Invested</th>
            <th className="text-right pb-2 font-black">Current</th>
            <th className="text-right pb-2 font-black">P&L</th>
            <th className="text-right pb-2 font-black">CAGR</th>
            <th className="text-right pb-2 font-black">Period</th>
            <th className="text-right pb-2 font-black">Tax</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {sorted.map((h, i) => {
            const pnl = h.unrealized_pnl ?? 0;
            const pnlColor = pnl >= 0 ? "text-emerald-500" : "text-red-400";
            const cagrColor = h.cagr === null ? "text-gray-400 dark:text-white/30"
              : h.cagr >= 15 ? "text-emerald-500"
              : h.cagr >= 8 ? "text-yellow-500"
              : "text-red-400";

            return (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${h.is_mf ? "bg-purple-500/15 text-purple-400" : "bg-[#00D09C]/15 text-[#00D09C]"}`}>
                      {h.is_mf ? "MF" : "EQ"}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white">{h.symbol}</p>
                      {h.name && h.name !== h.symbol && (
                        <p className="text-[10px] text-gray-400 dark:text-white/30 truncate max-w-[120px]">{h.name}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-right py-2.5 text-gray-600 dark:text-white/60">{h.cost > 0 ? formatINR(h.cost) : "-"}</td>
                <td className="text-right py-2.5 font-medium text-gray-800 dark:text-white">{formatINR(h.current_value)}</td>
                <td className={`text-right py-2.5 font-bold ${pnlColor}`}>
                  {h.unrealized_pnl !== null ? `${pnl >= 0 ? "+" : ""}${formatINR(pnl)}` : "-"}
                </td>
                <td className={`text-right py-2.5 font-bold ${cagrColor}`}>
                  {h.cagr !== null ? `${h.cagr >= 0 ? "+" : ""}${h.cagr.toFixed(1)}%` : "-"}
                </td>
                <td className="text-right py-2.5 text-gray-500 dark:text-white/40">{holdingPeriod(h.holding_days)}</td>
                <td className="text-right py-2.5">
                  {h.holding_days ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${h.is_ltcg ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-500"}`}>
                      {h.is_ltcg ? "LTCG" : "STCG"}
                    </span>
                  ) : <span className="text-gray-300 dark:text-white/20">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
