import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

interface ChartPoint {
  date: string;
  portfolio: number;
  benchmark: number;
}

interface Props {
  data: ChartPoint[];
  benchmarkLabel: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function PerformanceChart({ data, benchmarkLabel }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 dark:text-white/30 text-sm">
        Performance chart unavailable - insufficient historical data
      </div>
    );
  }

  const displayData = data.map((d) => ({ ...d, date: formatDate(d.date) }));

  return (
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
          tickFormatter={(v) => `${v.toFixed(0)}`}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
          formatter={(val: number, name: string) => [`${val.toFixed(2)}`, name === "portfolio" ? "Your Portfolio" : benchmarkLabel]}
          labelStyle={{ color: "rgba(255,255,255,0.6)", marginBottom: 4 }}
        />
        <Legend
          formatter={(val) => val === "portfolio" ? "Your Portfolio" : benchmarkLabel}
          wrapperStyle={{ fontSize: 11 }}
        />
        <ReferenceLine y={100} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="portfolio" stroke="#00D09C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="benchmark" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="4 4" activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
