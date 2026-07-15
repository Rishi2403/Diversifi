import { useEffect, useState } from "react";
import { RefreshCw, Moon, Radio } from "lucide-react";

interface Props {
  lastChecked: string | null;
  verdict: string;
  onRefresh: () => void;
  analysing: boolean;
}

function isMarketHours(): boolean {
  const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day  = ist.getDay(); // 0=Sun 6=Sat
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

const INTERVAL = 120; // 2 minutes

export default function AgentStatusBar({ lastChecked, verdict, onRefresh, analysing }: Props) {
  const [countdown, setCountdown] = useState(INTERVAL);
  const [marketOpen, setMarketOpen] = useState(isMarketHours());

  // sync market hours every minute
  useEffect(() => {
    const t = setInterval(() => setMarketOpen(isMarketHours()), 60_000);
    return () => clearInterval(t);
  }, []);

  // reset countdown when a new check completes
  useEffect(() => {
    if (lastChecked) setCountdown(INTERVAL);
  }, [lastChecked]);

  // count down only during market hours
  useEffect(() => {
    if (!marketOpen) return;
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [marketOpen]);

  const dotColor =
    !marketOpen     ? "bg-slate-400" :
    verdict === "All Good"         ? "bg-emerald-400" :
    verdict === "Caution"          ? "bg-amber-400"   : "bg-red-400";

  const timeAgo = lastChecked
    ? (() => {
        const secs = Math.floor((Date.now() - new Date(lastChecked).getTime()) / 1000);
        if (secs < 60)   return `${secs}s ago`;
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
        return `${Math.floor(secs / 3600)}h ago`;
      })()
    : "never";

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="flex items-center justify-between px-5 py-2 bg-background/95 backdrop-blur border-b border-border text-sm">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          {marketOpen && !analysing && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-60`} />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
        </span>
        {analysing ? (
          <span className="text-foreground font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            Agent is analysing your portfolio…
          </span>
        ) : marketOpen ? (
          <span className="text-foreground font-medium">Agent is watching your portfolio</span>
        ) : (
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5" />
            Market closed · Monitoring paused
          </span>
        )}
      </div>

      <div className="flex items-center gap-5 text-muted-foreground text-xs">
        <span>Last checked: <span className="text-foreground">{timeAgo}</span></span>
        {marketOpen && !analysing && (
          <span>Updating in: <span className="text-foreground tabular-nums">{mins}:{secs.toString().padStart(2, "0")}</span></span>
        )}
        {!marketOpen && (
          <span className="text-muted-foreground">Opens at 9:15 AM IST</span>
        )}
        <button
          onClick={onRefresh}
          disabled={analysing || !marketOpen}
          className="flex items-center gap-1 hover:text-foreground disabled:opacity-30 transition-colors"
          title={!marketOpen ? "Only available during market hours (9:15–15:30 IST)" : analysing ? "Analysis in progress…" : "Refresh now"}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analysing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
