import type { RebalanceSuggestion } from "@/lib/portfolioEngine";
import { TrendingUp, TrendingDown, RefreshCw, ArrowRightLeft } from "lucide-react";

interface Props { suggestions: RebalanceSuggestion[]; }

const TYPE_CONFIG = {
  BUY: { icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10 border-green-500/25", label: "BUY / ADD" },
  REDUCE: { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10 border-red-500/25", label: "REDUCE" },
  CONSOLIDATE: { icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25", label: "CONSOLIDATE" },
  SWITCH: { icon: ArrowRightLeft, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/25", label: "SWITCH" },
};

const PRIORITY_DOT: Record<string, string> = {
  HIGH: "bg-red-500", MEDIUM: "bg-yellow-400", LOW: "bg-green-400",
};

export function RebalancingActions({ suggestions }: Props) {
  if (suggestions.length === 0) {
    return <div className="text-center py-8 text-white/40 text-sm">No rebalancing actions needed at this time.</div>;
  }

  return (
    <div className="space-y-3">
      {suggestions.map((s, i) => {
        const cfg = TYPE_CONFIG[s.type];
        const Icon = cfg.icon;
        return (
          <div key={i} className={`flex items-start gap-3 rounded-xl p-4 border ${cfg.bg}`}>
            <div className={`mt-0.5 p-2 rounded-lg bg-white/5`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[s.priority]}`} />
                <span className="text-[10px] text-white/40 uppercase">{s.priority} priority</span>
              </div>
              <p className="text-sm font-bold text-white">{s.asset}</p>
              <p className="text-xs text-white/55 mt-0.5">{s.reason}</p>
              {s.currentPct !== undefined && s.targetPct !== undefined && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-white/40">Current:</span>
                  <span className="text-[11px] font-bold text-white">{s.currentPct}%</span>
                  <span className="text-white/30">→</span>
                  <span className="text-[11px] text-white/40">Target:</span>
                  <span className={`text-[11px] font-bold ${cfg.color}`}>{s.targetPct}%</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
