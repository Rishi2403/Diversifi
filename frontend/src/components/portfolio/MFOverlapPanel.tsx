import type { MFOverlap } from "@/lib/portfolioEngine";
import { AlertCircle, CheckCircle } from "lucide-react";

interface Props { overlaps: MFOverlap[]; }

function scoreColor(score: number) {
  if (score >= 70) return "text-red-400";
  if (score >= 50) return "text-yellow-500";
  return "text-orange-400";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-red-500/5 border-red-500/20";
  if (score >= 50) return "bg-yellow-500/5 border-yellow-500/20";
  return "bg-orange-500/5 border-orange-500/20";
}

export function MFOverlapPanel({ overlaps }: Props) {
  if (overlaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
        <CheckCircle className="w-10 h-10 text-green-400" />
        <p className="text-sm font-bold text-green-400">No Significant Overlap</p>
        <p className="text-xs text-gray-500 dark:text-white/40 max-w-xs">Your funds have different mandates and distinct sector exposures.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-yellow-500 dark:text-yellow-400 text-xs font-bold">
        <AlertCircle className="w-4 h-4" />
        {overlaps.length} fund pair{overlaps.length > 1 ? "s" : ""} with significant exposure overlap
      </div>
      {overlaps.map((o, i) => (
        <div key={i} className={`border rounded-xl p-4 space-y-3 ${scoreBg(o.overlapScore)}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded font-bold flex-shrink-0">{o.category1}</span>
                <p className="text-xs font-bold text-gray-900 dark:text-white/90 truncate">{o.fund1}</p>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-white/30 pl-1">↕ overlaps with</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded font-bold flex-shrink-0">{o.category2}</span>
                <p className="text-xs font-bold text-gray-900 dark:text-white/90 truncate">{o.fund2}</p>
              </div>
            </div>
            <div className="flex-shrink-0 text-center">
              <p className={`text-2xl font-black ${scoreColor(o.overlapScore)}`}>{o.overlapScore}%</p>
              <p className="text-[9px] text-gray-500 dark:text-white/40 uppercase">overlap</p>
            </div>
          </div>

          {/* Why they overlap */}
          <div className="bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 dark:text-white/50 uppercase tracking-widest mb-0.5">Why</p>
            <p className="text-xs text-gray-700 dark:text-white/70">{o.reason}</p>
          </div>

          {/* Shared holdings (if available) */}
          {o.sharedStocks.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 dark:text-white/40 uppercase tracking-widest mb-1.5">
                Common Holdings ({o.overlapType === "both" ? "confirmed via top-holdings data" : "sample"})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {o.sharedStocks.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-yellow-500/15 border border-yellow-500/25 rounded-md text-[11px] font-bold text-yellow-600 dark:text-yellow-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <p className="text-[10px] text-gray-400 dark:text-white/25">
        Overlap is computed from SEBI category mandates (sector profile similarity) + known top holdings. Same-category funds share the same investable universe by regulation.
      </p>
    </div>
  );
}
