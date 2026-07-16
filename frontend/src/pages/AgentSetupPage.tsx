import { useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Upload, CheckCircle, Loader2, FileText, X } from "lucide-react";
import OnboardingChat from "@/components/agent/OnboardingChat";
import ProfileConfirmation from "@/components/agent/ProfileConfirmation";
import { Header } from "@/components/Header";

// ─── CSV Parser ──────────────────────────────────────────────────────────────


function parseCSV(text: string) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { stocks: [], mutualFunds: [] };
  const header = lines[0].split(",").map(h => h.trim().toLowerCase());

  const stocks: any[] = [];
  const mutualFunds: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.trim());
    const row: Record<string, string> = {};
    header.forEach((h, j) => { row[h] = vals[j] ?? ""; });

    if (row["type"] === "stock") {
      stocks.push({
        symbol:        row["symbol"] || "",
        name:          row["name"]   || row["symbol"] || "",
        qty:           parseFloat(row["qty"] || "0"),
        avgBuyPrice:   parseFloat(row["avgbuyprice"] || "0"),
        currentPrice:  parseFloat(row["currentprice"] || "0"),
        currentValue:  parseFloat(row["currentvalue"] || "0"),
        buyDate:       row["buydate"] || "",
      });
    } else if (row["type"] === "mf") {
      mutualFunds.push({
        fundName:       row["name"] || "",
        category:       row["category"] || "",
        currentValue:   parseFloat(row["currentvalue"] || "0"),
        investedAmount: parseFloat(row["investedamount"] || "0"),
        buyDate:        row["buydate"] || "",
      });
    }
  }
  return { stocks, mutualFunds };
}

// ─── Step indicators ─────────────────────────────────────────────────────────

const STEPS = ["Upload CSV", "Investment Profile", "Confirm & Launch"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className={`flex items-center gap-2 ${
            i <= current ? "text-foreground" : "text-muted-foreground/40"
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
              i < current  ? "bg-emerald-500 border-emerald-500 text-white" :
              i === current ? "border-primary text-primary" :
              "border-border text-muted-foreground/40"
            }`}>
              {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-sm font-medium hidden sm:block">{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-2 ${i < current ? "bg-emerald-500/50" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentSetupPage() {
  const { user } = useUser();
  const navigate  = useNavigate();
  const email     = user?.primaryEmailAddress?.emailAddress || "";

  const [step, setStep]       = useState(0);
  const [holdings, setHoldings] = useState<{ stocks: any[]; mutualFunds: any[] } | null>(null);
  const [csvName, setCsvName]   = useState("");
  const [csvErr, setCsvErr]     = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [profile, setProfile]   = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving]    = useState(false);

  // ── Step 0: CSV upload ──────────────────────────────────────────────────────

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setCsvErr("Please upload a .csv file");
      return;
    }
    setCsvErr("");
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.stocks.length === 0 && parsed.mutualFunds.length === 0) {
        setCsvErr("No holdings found. Check CSV format.");
        return;
      }
      setHoldings(parsed);
      setCsvName(file.name);
    };
    reader.readAsText(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  // ── Step 1: Chat complete → extract profile ─────────────────────────────────

  async function onChatComplete(transcript: string) {
    setExtracting(true);
    try {
      const res  = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setStep(2);
      }
    } catch {
      // fallback profile
      setProfile({ investmentStyle: "SIP", monthlyInvestment: null, goals: ["wealth creation"], horizon: "long term", riskAppetite: "Moderate", focusSectors: [], avoidSectors: [] });
      setStep(2);
    } finally {
      setExtracting(false);
    }
  }

  // ── Step 2: Confirm → save → navigate ──────────────────────────────────────

  async function onConfirm() {
    if (!holdings || !profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agent/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, holdings, profile }),
      });
      const data = await res.json();
      if (data.success) {
        navigate("/agent");
      }
    } catch {
      setSaving(false);
    }
  }

  return (
    <>
    <Header />
    <div className="min-h-[calc(100vh-56px)] bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-primary opacity-75" /><span className="relative h-2 w-2 rounded-full bg-primary" /></span>
            Setting up your Portfolio Agent
          </div>
          <h1 className="text-3xl font-bold text-foreground">Meet your Financial Agent</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Upload your portfolio and answer 4 quick questions. Your agent will watch it 24/7.
          </p>
        </div>

        <StepBar current={step} />

        {/* Step 0 - CSV Upload */}
        {step === 0 && (
          <div className="space-y-4">
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                dragOver ? "border-primary/70 bg-primary/5" : "border-border hover:border-border/60 bg-muted/30"
              }`}
            >
              {holdings ? (
                <div className="space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-foreground font-semibold">{csvName}</p>
                  <p className="text-muted-foreground text-sm">
                    {holdings.stocks.length} stocks + {holdings.mutualFunds.length} mutual funds
                  </p>
                  <button
                    onClick={() => { setHoldings(null); setCsvName(""); }}
                    className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 mx-auto mt-2 transition-colors"
                  >
                    <X className="w-3 h-3" />Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-foreground/70 font-medium">Drop your portfolio CSV here</p>
                  <p className="text-muted-foreground text-sm">or</p>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/70 border border-border text-sm font-medium transition-colors text-foreground">
                    <Upload className="w-4 h-4" />
                    Browse file
                    <input type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </label>
                  <p className="text-muted-foreground text-xs mt-2">
                    Use the sample-portfolio.csv format (type, symbol, name, qty, avgBuyPrice…)
                  </p>
                </div>
              )}
            </div>

            {csvErr && <p className="text-red-400 text-sm text-center">{csvErr}</p>}

            <a
              href="/sample-portfolio.csv"
              download
              className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Download sample CSV template
            </a>

            <button
              onClick={() => setStep(1)}
              disabled={!holdings}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 1 - Chat */}
        {step === 1 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden h-[480px] flex flex-col">
            {extracting ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-sm">Analysing your responses…</p>
              </div>
            ) : (
              <OnboardingChat onComplete={onChatComplete} />
            )}
          </div>
        )}

        {/* Step 2 - Confirm */}
        {step === 2 && profile && holdings && (
          <ProfileConfirmation
            profile={profile}
            stockCount={holdings.stocks.length}
            mfCount={holdings.mutualFunds.length}
            onConfirm={onConfirm}
            loading={saving}
          />
        )}
      </div>
    </div>
    </>
  );
}
