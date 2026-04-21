import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { SectorAllocation } from "@/lib/portfolioEngine";

const COLORS = [
  "#9EA2F8", "#4ade80", "#f87171", "#facc15", "#60a5fa",
  "#f97316", "#a78bfa", "#34d399", "#fb7185", "#38bdf8",
  "#e879f9", "#a3e635",
];

const STATUS_COLOR: Record<string, string> = {
  overweight: "#f87171",
  underweight: "#facc15",
  aligned: "#4ade80",
  missing: "#6b7280",
};

interface Props {
  allocations: SectorAllocation[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d: SectorAllocation = payload[0].payload;
  return (
    <div className="bg-[#1e1b2e] border border-white/15 rounded-xl p-3 text-xs shadow-2xl min-w-[180px]">
      <p className="font-bold text-white mb-1">{d.sector}</p>
      <p className="text-white/60">Portfolio: <span className="text-white font-semibold">{d.percentage}%</span></p>
      <p className="text-white/60">Benchmark: <span className="text-white/80">{d.benchmarkPct}%</span></p>
      <p className={`font-semibold mt-1 ${d.delta > 0 ? "text-red-400" : "text-yellow-400"}`}>
        {d.delta > 0 ? "+" : ""}{d.delta}% vs benchmark
      </p>
      <span
        className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
        style={{ background: STATUS_COLOR[d.status] + "30", color: STATUS_COLOR[d.status] }}
      >
        {d.status}
      </span>
    </div>
  );
};

export function SectorDonutChart({ allocations }: Props) {
  const data = allocations.filter((a) => a.percentage > 0);

  return (
    <div className="w-full h-full flex flex-col">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={70} outerRadius={110}
            paddingAngle={2} dataKey="percentage"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 px-2">
        {data.map((s, i) => (
          <div key={s.sector} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[11px] text-white/70">{s.sector}</span>
            <span className="text-[11px] font-bold text-white">{s.percentage}%</span>
            <span
              className="text-[9px] font-bold px-1 rounded"
              style={{ color: STATUS_COLOR[s.status], background: STATUS_COLOR[s.status] + "20" }}
            >
              {s.status === "overweight" ? "▲" : s.status === "underweight" ? "▼" : s.status === "missing" ? "✕" : "✓"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
