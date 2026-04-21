import type { MFOverlap } from "@/lib/portfolioEngine";
import { AlertCircle, CheckCircle } from "lucide-react";

interface Props { overlaps: MFOverlap[]; }

export function MFOverlapPanel({ overlaps }: Props) {
  if (overlaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
        <CheckCircle className="w-10 h-10 text-green-400" />
        <p className="text-sm font-bold text-green-400">No Significant Overlap Detected</p>
        <p className="text-xs text-white/40 max-w-xs">Your mutual funds have distinct holdings — good diversification.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold mb-1">
        <AlertCircle className="w-4 h-4" />
        {overlaps.length} fund pair{overlaps.length > 1 ? "s" : ""} share significant holdings
      </div>
      {overlaps.map((o, i) => (
        <div key={i} className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs font-bold text-white/90 leading-tight">{o.fund1}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">↕ overlaps with</p>
              <p className="text-xs font-bold text-white/90 leading-tight">{o.fund2}</p>
            </div>
            <div className="flex-shrink-0 text-center">
              <p className="text-2xl font-black text-yellow-400">{o.overlapScore}%</p>
              <p className="text-[9px] text-white/40 uppercase">overlap</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Shared Top Holdings</p>
            <div className="flex flex-wrap gap-1.5">
              {o.sharedStocks.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-yellow-500/15 border border-yellow-500/25 rounded-md text-[11px] font-bold text-yellow-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
