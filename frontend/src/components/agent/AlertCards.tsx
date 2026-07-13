import { useState } from "react";
import { ChevronDown, ChevronUp, Siren, AlertTriangle, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";

interface Alert {
  symbol: string;
  name?: string;
  is_mf?: boolean;
  issue: string;
  action: string;
  change_pct?: number;
  tier?: string;
  holding?: string;
}

interface Props {
  immediate: Alert[];
  caution: Alert[];
  topAlerts: Alert[];
}

function AlertSection({
  title, icon, alerts, defaultOpen, accentColor,
}: {
  title: string;
  icon: React.ReactNode;
  alerts: Alert[];
  defaultOpen: boolean;
  accentColor: "red" | "amber" | "emerald";
}) {
  const [open, setOpen] = useState(defaultOpen);

  const colors = {
    red:     { badge: "bg-red-500/15 text-red-500 dark:text-red-400",     border: "border-red-500/20",     header: "bg-red-500/5" },
    amber:   { badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400", border: "border-amber-500/20", header: "bg-amber-500/5" },
    emerald: { badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", header: "bg-emerald-500/5" },
  };
  const c = colors[accentColor];

  return (
    <div className={`rounded-xl border ${c.border} bg-card overflow-hidden`}>
      <button
        className={`w-full flex items-center justify-between px-4 py-3 ${c.header} hover:bg-muted/30 transition-colors`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.badge}`}>
            {alerts.length}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="divide-y divide-border">
          {alerts.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">None right now</p>
          ) : alerts.map((a, i) => (
            <div key={i} className="px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  a.is_mf ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>{a.is_mf ? "MF" : "EQ"}</span>
                <span className="text-foreground font-semibold text-sm">{a.symbol || a.name}</span>
                {a.change_pct != null && (
                  <span className={`text-xs font-medium ml-auto ${a.change_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {a.change_pct >= 0 ? "+" : ""}{a.change_pct.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-xs mb-1.5">{a.issue}</p>
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground/70">
                <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{a.action}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIRecommendationCard({ alert, index }: { alert: Alert; index: number }) {
  const colors = [
    "border-blue-500/20 bg-blue-500/5",
    "border-purple-500/20 bg-purple-500/5",
    "border-cyan-500/20 bg-cyan-500/5",
  ];
  const textColors = [
    "text-blue-500 dark:text-blue-400",
    "text-purple-500 dark:text-purple-400",
    "text-cyan-500 dark:text-cyan-400",
  ];

  return (
    <div className={`rounded-xl border p-4 ${colors[index % colors.length]}`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-7 h-7 rounded-lg bg-current/10 flex items-center justify-center ${textColors[index % textColors.length]}`}>
          <Lightbulb className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${textColors[index % textColors.length]}`}>
              {alert.holding ?? alert.symbol}
            </span>
            <span className="text-muted-foreground text-[10px]">AI Recommendation</span>
          </div>
          <p className="text-foreground text-xs font-medium mb-1">{alert.issue}</p>
          <p className="text-muted-foreground text-xs flex items-start gap-1">
            <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
            {alert.action}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AlertCards({ immediate, caution, topAlerts }: Props) {
  const allGood = immediate.length === 0 && caution.length === 0;

  return (
    <div className="space-y-3">
      {immediate.length > 0 && (
        <AlertSection
          title="Immediate Action Required"
          icon={<Siren className="w-4 h-4 text-red-500 animate-pulse" />}
          alerts={immediate}
          defaultOpen={true}
          accentColor="red"
        />
      )}

      <AlertSection
        title="Watchlist"
        icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        alerts={caution}
        defaultOpen={caution.length > 0}
        accentColor="amber"
      />

      <AlertSection
        title="All Clear"
        icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        alerts={allGood ? [{ symbol: "Portfolio", issue: "All holdings within normal parameters.", action: "No action needed - keep investing systematically.", is_mf: false }] : []}
        defaultOpen={allGood}
        accentColor="emerald"
      />

      {/* AI Recommendations as cards */}
      {topAlerts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-foreground">AI Recommendations</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
              {topAlerts.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {topAlerts.map((a, i) => (
              <AIRecommendationCard key={i} alert={a} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
