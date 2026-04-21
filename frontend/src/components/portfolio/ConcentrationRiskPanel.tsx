import type { ConcentrationRisk } from "@/lib/portfolioEngine";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface Props { data: ConcentrationRisk; totalValue: number; }

function RiskBadge({ isRisk }: { isRisk: boolean }) {
  return isRisk
    ? <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/20 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />RISK</span>
    : <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/20 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />OK</span>;
}

export function ConcentrationRiskPanel({ data, totalValue }: Props) {
  const alerts = [
    data.top3Risk && { label: "Top 3 holdings > 45% of portfolio", level: "HIGH" },
    data.tooManyPositions && { label: "More than 25 stock positions detected", level: "MEDIUM" },
    data.sectorRisks.some((s) => s.isRisk) && { label: "One or more sectors exceed 25%", level: "HIGH" },
  ].filter(Boolean) as { label: string; level: string }[];

  return (
    <div className="space-y-4">
      {/* Alert banners */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
              a.level === "HIGH"
                ? "bg-red-500/10 border-red-500/25 text-red-300"
                : "bg-yellow-500/10 border-yellow-500/25 text-yellow-300"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {a.label}
            </div>
          ))}
        </div>
      )}

      {/* Top holdings table */}
      <div>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Top Holdings Exposure</p>
        <div className="space-y-1.5">
          {data.topHoldings.map((h) => (
            <div key={h.name} className="flex items-center gap-3">
              <span className="text-xs font-bold text-white/80 w-24 truncate">{h.name}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(h.pct, 100)}%`,
                    background: h.isRisk ? "#f87171" : "#9EA2F8",
                  }}
                />
              </div>
              <span className={`text-xs font-bold w-10 text-right ${h.isRisk ? "text-red-400" : "text-white/70"}`}>
                {h.pct}%
              </span>
              <RiskBadge isRisk={h.isRisk} />
            </div>
          ))}
        </div>
      </div>

      {/* Sector concentration */}
      <div>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Sector Concentration</p>
        <div className="space-y-1.5">
          {data.sectorRisks.sort((a, b) => b.pct - a.pct).slice(0, 6).map((s) => (
            <div key={s.sector} className="flex items-center gap-3">
              <span className="text-xs font-bold text-white/80 w-28 truncate">{s.sector}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(s.pct, 100)}%`,
                    background: s.isRisk ? "#f87171" : "#4ade80",
                  }}
                />
              </div>
              <span className={`text-xs font-bold w-10 text-right ${s.isRisk ? "text-red-400" : "text-white/70"}`}>
                {s.pct}%
              </span>
              <RiskBadge isRisk={s.isRisk} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
