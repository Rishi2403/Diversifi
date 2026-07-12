import { useEffect, useRef } from "react";
import { Radio } from "lucide-react";

interface LogEntry {
  timestamp: string;
  icon: string;
  message: string;
  level: string;
}

interface Props {
  entries: LogEntry[];
  analysing: boolean;
  marketOpen: boolean;
}

const levelClass: Record<string, string> = {
  info:    "text-foreground/70",
  success: "text-emerald-500 dark:text-emerald-400",
  warn:    "text-amber-500 dark:text-amber-400",
  error:   "text-red-500 dark:text-red-400",
};

export default function ActivityFeed({ entries, analysing, marketOpen }: Props) {
  const topRef = useRef<HTMLDivElement>(null);

  // scroll to top whenever a new entry arrives (latest is at top)
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Radio className={`w-3.5 h-3.5 ${analysing ? "text-blue-400 animate-pulse" : marketOpen ? "text-emerald-400" : "text-muted-foreground"}`} />
          <h3 className="text-sm font-semibold text-foreground">Live Activity</h3>
        </div>
        <span className="text-xs text-muted-foreground">{entries.length} events</span>
      </div>

      {/* Fixed height scrollable area */}
      <div className="h-[420px] overflow-y-auto px-3 py-2 space-y-0.5 font-mono text-xs">
        <div ref={topRef} />

        {analysing && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-500/10 border border-blue-500/20 mb-1">
            <span className="text-base leading-none">🤖</span>
            <span className="text-blue-400 animate-pulse">Agent is thinking…</span>
          </div>
        )}

        {!marketOpen && entries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <span className="text-2xl block mb-2">🌙</span>
            Market closed. Agent will resume at 9:15 AM IST.
          </div>
        )}

        {entries.map((e, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-2 py-[3px] rounded hover:bg-muted/30 transition-colors group"
          >
            <span className="text-[13px] leading-none mt-0.5 shrink-0">{e.icon}</span>
            <span className="text-muted-foreground/60 shrink-0 tabular-nums text-[10px] mt-0.5">{e.timestamp}</span>
            <span className={`${levelClass[e.level] ?? "text-foreground/70"} leading-tight`}>
              {e.message}
            </span>
          </div>
        ))}

        {entries.length === 0 && marketOpen && !analysing && (
          <div className="text-muted-foreground text-center py-8">No activity yet</div>
        )}
      </div>
    </div>
  );
}
