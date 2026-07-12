import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

interface SentimentData {
  label: string;
  score: number;
  headlines: string[];
}

interface Props {
  sentimentMap: Record<string, SentimentData>;
}

function SentimentPill({ label }: { label: string }) {
  if (label === "Bullish")
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
        <TrendingUp className="w-3 h-3" /> Bullish
      </span>
    );
  if (label === "Bearish")
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/20 font-semibold">
        <TrendingDown className="w-3 h-3" /> Bearish
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold">
      <Minus className="w-3 h-3" /> Neutral
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  // score is -1 to 1 polarity, map to 0-100%
  const pct = Math.round((score + 1) / 2 * 100);
  const color = score > 0.1 ? "bg-emerald-500" : score < -0.1 ? "bg-red-500" : "bg-amber-400";
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{score.toFixed(2)}</span>
    </div>
  );
}

export default function NewsSentimentFeed({ sentimentMap }: Props) {
  const entries = Object.entries(sentimentMap);

  if (entries.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">News & Sentiment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="h-3 bg-muted rounded w-16 mb-3" />
              <div className="h-2 bg-muted rounded w-full mb-2" />
              <div className="h-2 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // show up to 4 cards (one per stock)
  const shown = entries.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">News & Sentiment</h3>
        <span className="text-xs text-muted-foreground">Top holdings</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {shown.map(([sym, data]) => (
          <div key={sym} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 hover:border-border/80 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-sm">{sym}</span>
              <SentimentPill label={data.label} />
            </div>

            {/* Score bar */}
            <ScoreBar score={data.score} />

            {/* Headlines */}
            <div className="space-y-1.5 mt-1">
              {data.headlines.length > 0 ? (
                data.headlines.slice(0, 2).map((h, i) => (
                  <p key={i} className="text-muted-foreground text-[11px] leading-snug flex gap-1.5">
                    <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-40" />
                    <span className="line-clamp-2">{h}</span>
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground text-[11px]">No headlines available</p>
              )}
            </div>

            <div className="text-[10px] text-muted-foreground/50 mt-auto pt-1">
              {data.headlines.length} article{data.headlines.length !== 1 ? "s" : ""} analysed
            </div>
          </div>
        ))}

        {/* Placeholder cards if fewer than 4 */}
        {shown.length < 4 && Array.from({ length: 4 - shown.length }).map((_, i) => (
          <div key={`ph-${i}`} className="rounded-xl border border-dashed border-border bg-card/50 p-4 flex items-center justify-center">
            <span className="text-muted-foreground text-xs">Analysing…</span>
          </div>
        ))}
      </div>
    </div>
  );
}
