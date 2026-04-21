import type { Recommendation } from "@/lib/portfolioEngine";

interface Props { recommendations: Recommendation[]; }

const SEVERITY_STYLE = {
  HIGH: { bg: "bg-red-500/10", border: "border-red-500/25", badge: "bg-red-500/20 text-red-400", dot: "bg-red-500" },
  MEDIUM: { bg: "bg-yellow-500/10", border: "border-yellow-500/25", badge: "bg-yellow-500/20 text-yellow-400", dot: "bg-yellow-400" },
  LOW: { bg: "bg-blue-500/10", border: "border-blue-500/25", badge: "bg-blue-500/20 text-blue-400", dot: "bg-blue-400" },
};

export function RecommendationsPanel({ recommendations }: Props) {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-white/40 text-sm">
        ✅ Portfolio looks well balanced — no major recommendations.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recommendations.map((r) => {
        const s = SEVERITY_STYLE[r.severity];
        return (
          <div key={r.id} className={`rounded-xl p-4 border ${s.bg} ${s.border} space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{r.emoji}</span>
                <p className="text-sm font-bold text-white leading-tight">{r.title}</p>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${s.badge}`}>
                {r.severity}
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{r.description}</p>
            <div className="flex items-center gap-1.5 pt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <p className="text-xs font-semibold text-white/80">{r.action}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
