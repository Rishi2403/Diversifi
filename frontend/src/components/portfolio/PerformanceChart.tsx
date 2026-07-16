import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

interface ChartPoint {
  date: string;
  portfolio: number;
  benchmark: number;
}

interface Props {
  data6m: ChartPoint[];
  data3m: ChartPoint[];
  benchmarkLabel: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function PerformanceChart({ data6m, data3m, benchmarkLabel }: Props) {
  const [period, setPeriod] = useState<"6m" | "3m">("6m");
  const raw = period === "6m" ? data6m : data3m;

  if (!raw || raw.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 dark:text-white/30 text-sm">
        Performance chart unavailable - insufficient historical data
      </div>
    );
  }

  const displayData = raw.map((d) => ({ ...d, date: formatDate(d.date) }));

  return (
    <div>
      {/* Period toggle */}
      <div className="flex justify-end mb-3">
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/5 rounded-lg p-0.5 border border-gray-200 dark:border-white/10">
          {(["3m", "6m"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                period === p
                  ? "bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
            formatter={(val: number, name: string) => [
              `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`,
              name === "portfolio" ? "Your Portfolio" : benchmarkLabel,
            ]}
            labelStyle={{ color: "rgba(255,255,255,0.6)", marginBottom: 4 }}
          />
          <Legend
            formatter={(val) => val === "portfolio" ? "Your Portfolio" : benchmarkLabel}
            wrapperStyle={{ fontSize: 11 }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="portfolio" stroke="#00D09C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="benchmark" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="4 4" activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
