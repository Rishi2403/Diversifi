import { ShieldCheck, AlertTriangle, Siren } from "lucide-react";

interface Props {
  verdict: string;
  reason: string;
  summary: string;
  totalCurrent: number;
  totalPnL: number;
  pnlPct: number;
}

export default function VerdictBanner({ verdict, reason, summary, totalCurrent, totalPnL, pnlPct }: Props) {
  const configs = {
    "All Good": {
      wrapper: "border-emerald-500/25 bg-emerald-500/5",
      icon:    <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      badge:   "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25",
    },
    "Caution": {
      wrapper: "border-amber-500/25 bg-amber-500/5",
      icon:    <AlertTriangle className="w-6 h-6 text-amber-500" />,
      badge:   "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25",
    },
    "Immediate Action": {
      wrapper: "border-red-500/30 bg-red-500/5",
      icon:    <Siren className="w-6 h-6 text-red-500 animate-pulse" />,
      badge:   "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25",
    },
    "Analysing…": {
      wrapper: "border-border bg-card",
      icon:    <ShieldCheck className="w-6 h-6 text-muted-foreground animate-pulse" />,
      badge:   "bg-muted text-muted-foreground border border-border",
    },
  };

  const cfg = configs[verdict as keyof typeof configs] ?? configs["All Good"];
  const pnlPositive = totalPnL >= 0;

  return (
    <div className={`rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cfg.wrapper} transition-all duration-500`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {cfg.icon}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${cfg.badge}`}>
              {verdict}
            </span>
          </div>
          <p className="text-foreground text-sm mt-1.5 font-medium">{reason}</p>
          {summary && (
            <p className="text-muted-foreground text-xs mt-1 leading-relaxed max-w-2xl">{summary}</p>
          )}
        </div>
      </div>

      {/* Portfolio value callout */}
      <div className="text-right shrink-0 pl-2 sm:border-l sm:border-border">
        <div className="text-2xl font-bold text-foreground">
          ₹{totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </div>
        <div className={`text-sm font-semibold mt-0.5 ${pnlPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          {pnlPositive ? "+" : ""}₹{Math.abs(totalPnL).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          &nbsp;({pnlPositive ? "+" : ""}{pnlPct.toFixed(1)}%)
        </div>
        <div className="text-muted-foreground text-xs mt-0.5">total portfolio</div>
      </div>
    </div>
  );
}
