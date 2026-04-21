import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { SectorAllocation } from "@/lib/portfolioEngine";

const COLORS = ["#9EA2F8","#4ade80","#f87171","#facc15","#60a5fa","#f97316","#a78bfa","#34d399","#fb7185","#38bdf8","#e879f9","#a3e635"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1e1b2e] border border-white/15 rounded-xl p-3 text-xs shadow-2xl">
      <p className="font-bold text-white">{d.sector}</p>
      <p className="text-white/60 mt-1">{d.percentage}%</p>
    </div>
  );
};

interface Props {
  current: SectorAllocation[];
  projected: SectorAllocation[];
}

function MiniDonut({ data, label }: { data: SectorAllocation[]; label: string }) {
  const filtered = data.filter((d) => d.percentage > 0);
  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{label}</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={filtered} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
            paddingAngle={2} dataKey="percentage" strokeWidth={0}>
            {filtered.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
        {filtered.map((s, i) => (
          <div key={s.sector} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[10px] text-white/60">{s.sector.length > 8 ? s.sector.slice(0,8)+"…" : s.sector}</span>
            <span className="text-[10px] font-bold text-white">{s.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectedAllocationChart({ current, projected }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <MiniDonut data={current} label="Current Allocation" />
      <div className="hidden sm:flex flex-col items-center justify-center pt-20 text-white/30 gap-1">
        <div className="w-px h-12 bg-white/10" />
        <span className="text-lg">→</span>
        <div className="w-px h-12 bg-white/10" />
      </div>
      <MiniDonut data={projected} label="After Rebalance" />
    </div>
  );
}
