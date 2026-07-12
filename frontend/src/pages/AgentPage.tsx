import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Loader2, Bot, BarChart2, TrendingUp, Layers } from "lucide-react";
import AgentStatusBar     from "@/components/agent/AgentStatusBar";
import VerdictBanner      from "@/components/agent/VerdictBanner";
import ActivityFeed       from "@/components/agent/ActivityFeed";
import AlertCards         from "@/components/agent/AlertCards";
import HoldingsGrid       from "@/components/agent/HoldingsGrid";
import NewsSentimentFeed  from "@/components/agent/NewsSentimentFeed";
import EmailReportPanel   from "@/components/agent/EmailReportPanel";
import { Header } from "@/components/Header";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry { timestamp: string; icon: string; message: string; level: string; }
interface AlertItem { symbol: string; name?: string; is_mf?: boolean; issue: string; action: string; change_pct?: number; tier?: string; holding?: string; }

interface AgentState {
  lastChecked:    string | null;
  verdict:        string;
  verdictReason:  string;
  overallSummary: string;
  topAlerts:      AlertItem[];
  alerts:         AlertItem[];
  watchlist:      AlertItem[];
  activityLog:    LogEntry[];
  lastReportSentAt: string | null;
  newsSentiment:  Record<string, { label: string; score: number; headlines: string[] }>;
}

interface DashboardData {
  success:     boolean;
  email:       string;
  name:        string;
  profile:     Record<string, any>;
  agentState:  AgentState;
  holdings:    { stocks: any[]; mutualFunds: any[] };
  summary:     { totalInvested: number; totalCurrent: number; totalPnL: number; pnlPct: number; stockCount: number; mfCount: number };
  newsSentiment: Record<string, any>;
}

function isMarketHours(): boolean {
  const ist  = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day  = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-bold text-base ${color ?? "text-foreground"}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgentPage() {
  const { user, isLoaded } = useUser();
  const navigate           = useNavigate();
  const email              = user?.primaryEmailAddress?.emailAddress || "";

  const [checking, setChecking]     = useState(true);
  const [data, setData]             = useState<DashboardData | null>(null);
  const [analysing, setAnalysing]   = useState(false);
  const [marketOpen, setMarketOpen] = useState(isMarketHours());
  const [liveLog, setLiveLog]       = useState<LogEntry[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<AlertItem[]>([]);
  const [verdict, setVerdict]       = useState("Analysing…");
  const [verdictReason, setVerdictReason] = useState("First analysis in progress…");
  const [verdictSummary, setVerdictSummary] = useState("");
  const [topAlerts, setTopAlerts]   = useState<AlertItem[]>([]);
  const [prices, setPrices]         = useState<Record<string, { price: number; change1d: number }>>({});

  const sseRef = useRef<EventSource | null>(null);

  // ── Market hours refresh every minute ────────────────────────────────────

  useEffect(() => {
    const t = setInterval(() => setMarketOpen(isMarketHours()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Load dashboard data ───────────────────────────────────────────────────

  const loadDashboard = useCallback(async (em: string) => {
    try {
      const res  = await fetch(`/api/agent/dashboard?email=${encodeURIComponent(em)}`);
      const json = await res.json() as DashboardData;
      if (!json.success) return;
      setData(json);
      const st = json.agentState;
      setLiveLog(st.activityLog || []);
      setLiveAlerts(st.alerts    || []);
      setVerdict(st.verdict      || "All Good");
      setVerdictReason(st.verdictReason || "");
      setVerdictSummary(st.overallSummary || "");
      setTopAlerts(st.topAlerts  || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    async function init() {
      const res  = await fetch(`/api/agent/status?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json.status === "needs_onboarding" || json.status === "unknown_user") {
        navigate("/agent/setup");
        return;
      }
      setChecking(false);
      await loadDashboard(email);
      connectSSE(email);
    }
    init();
    return () => sseRef.current?.close();
  }, [isLoaded, email]);

  // ── SSE ───────────────────────────────────────────────────────────────────

  function connectSSE(em: string) {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`/api/agent/stream?email=${encodeURIComponent(em)}`);
    sseRef.current = es;

    es.onmessage = e => {
      try {
        const ev = JSON.parse(e.data);
        switch (ev.type) {
          case "analysis_start":
            setAnalysing(true);
            break;
          case "analysis_complete":
            setAnalysing(false);
            loadDashboard(em);
            break;
          case "activity_log":
            setLiveLog(prev => [ev.entry, ...prev].slice(0, 50));
            break;
          case "verdict_update":
            setVerdict(ev.verdict);
            setVerdictReason(ev.reason || "");
            setVerdictSummary(ev.summary || "");
            setTopAlerts(ev.topAlerts || []);
            break;
          case "alert_added":
            setLiveAlerts(prev => prev.find(a => a.symbol === ev.alert.symbol) ? prev : [...prev, ev.alert]);
            break;
          case "price_update":
            setPrices(prev => ({ ...prev, [ev.symbol]: { price: ev.price, change1d: ev.change1d } }));
            break;
          case "sentiment_update":
            setData(prev => prev ? { ...prev, newsSentiment: { ...prev.newsSentiment, [ev.symbol]: ev.sentiment } } : prev);
            break;
          case "market_closed":
            setAnalysing(false);
            break;
        }
      } catch { /* ignore */ }
    };

    es.onerror = () => setTimeout(() => connectSSE(em), 5000);
  }

  async function triggerRefresh() {
    if (!marketOpen) return;
    setAnalysing(true);
    await fetch("/api/agent/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  // ── Loading states ────────────────────────────────────────────────────────

  if (!isLoaded || checking) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-56px)] bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm">Connecting to your agent…</p>
          </div>
        </div>
      </>
    );
  }

  const agentState = data?.agentState;
  const holdings   = data?.holdings || { stocks: [], mutualFunds: [] };
  const summary    = data?.summary  || { totalInvested: 0, totalCurrent: 0, totalPnL: 0, pnlPct: 0, stockCount: 0, mfCount: 0 };
  const sentimentMap = data?.newsSentiment || agentState?.newsSentiment || {};

  const enrichedStocks = (holdings.stocks || []).map(s => ({
    ...s,
    livePrice: prices[s.symbol]?.price    ?? s.livePrice,
    change1d:  prices[s.symbol]?.change1d ?? s.change1d,
  }));

  const immediate = liveAlerts.filter(a => a.tier === "immediate");
  const caution   = liveAlerts.filter(a => a.tier === "caution");

  return (
    <>
      <Header />

      {/* Agent status bar (below main header) */}
      <AgentStatusBar
        lastChecked={agentState?.lastChecked ?? null}
        verdict={verdict}
        onRefresh={triggerRefresh}
        analysing={analysing}
      />

      <div className="bg-background min-h-[calc(100vh-96px)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">

          {/* Agent identity row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Portfolio Agent</h1>
                <p className="text-muted-foreground text-xs">
                  {data?.name && `${data.name} · `}Monitoring {summary.stockCount} stocks + {summary.mfCount} mutual funds
                </p>
              </div>
            </div>
            {!marketOpen && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground">
                🌙 Market closed
              </span>
            )}
          </div>

          {/* Verdict banner */}
          <VerdictBanner
            verdict={verdict}
            reason={verdictReason}
            summary={verdictSummary}
            totalCurrent={summary.totalCurrent}
            totalPnL={summary.totalPnL}
            pnlPct={summary.pnlPct}
          />

          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<BarChart2 className="w-4 h-4 text-muted-foreground" />}
              label="Total Invested"
              value={`₹${summary.totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
              label="Current Value"
              value={`₹${summary.totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
              label="Total P&L"
              value={`${summary.totalPnL >= 0 ? "+" : ""}₹${Math.abs(summary.totalPnL).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
              sub={`${summary.pnlPct >= 0 ? "+" : ""}${summary.pnlPct.toFixed(1)}%`}
              color={summary.totalPnL >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}
            />
            <StatCard
              icon={<Layers className="w-4 h-4 text-muted-foreground" />}
              label="Holdings"
              value={`${summary.stockCount + summary.mfCount}`}
              sub={`${summary.stockCount} stocks · ${summary.mfCount} MFs`}
            />
          </div>

          {/* Main 3-col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Activity feed + Email report */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
                <ActivityFeed entries={liveLog} analysing={analysing} marketOpen={marketOpen} />
              </div>
              <EmailReportPanel
                email={email}
                lastSentAt={agentState?.lastReportSentAt ?? null}
              />
            </div>

            {/* Right 2: Alerts + Holdings */}
            <div className="lg:col-span-2 space-y-4">
              <AlertCards immediate={immediate} caution={caution} topAlerts={topAlerts} />
              <HoldingsGrid stocks={enrichedStocks} mutualFunds={holdings.mutualFunds || []} />
            </div>
          </div>

          {/* Bottom: News (4 cards, full width) */}
          <NewsSentimentFeed sentimentMap={sentimentMap} />

        </div>
      </div>
    </>
  );
}
