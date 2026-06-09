import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import type { SectorAllocation } from "@/lib/portfolioEngine";

interface Props {
  allocations: SectorAllocation[];
  benchmarkLabel: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1e1b2e] border border-gray-200 dark:border-white/15 rounded-xl p-3 text-xs shadow-2xl min-w-[160px]">
      <p className="font-bold text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill }} className="font-medium">{p.name}</span>
          <span className="text-gray-900 dark:text-white font-bold">{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

export function BenchmarkComparisonChart({ allocations, benchmarkLabel }: Props) {
  const data = allocations.map((a) => ({
    name: a.sector.length > 10 ? a.sector.slice(0, 10) + "…" : a.sector,
    fullName: a.sector,
    Portfolio: a.percentage,
    Benchmark: a.benchmarkPct,
    status: a.status,
  }));

  const portfolioColor = (entry: any) => {
    if (entry.status === "overweight") return "#f87171";
    if (entry.status === "underweight" || entry.status === "missing") return "#facc15";
    return "#9EA2F8";
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-white/10" />
        <XAxis
          dataKey="name"
          tick={{ className: "fill-gray-500 dark:fill-white/50", fontSize: 10 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ className: "fill-gray-500 dark:fill-white/50", fontSize: 10 }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ className: "fill-gray-100 dark:fill-white/5" }} />
        <Legend
          formatter={(v) => <span className="text-gray-600 dark:text-white/60 text-[11px]">{v}</span>}
        />
        <Bar dataKey="Portfolio" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell key={i} fill={portfolioColor(entry)} fillOpacity={0.85} />
          ))}
        </Bar>
        <Bar dataKey="Benchmark" className="fill-gray-300 dark:fill-white/20" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
