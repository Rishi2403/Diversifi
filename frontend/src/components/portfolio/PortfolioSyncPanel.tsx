import { useState, useRef } from "react";
import { Upload, PenLine, CheckCircle } from "lucide-react";
import type { StockHolding, MFHolding } from "@/lib/portfolioEngine";

interface Props {
  onStocksLoaded: (stocks: StockHolding[]) => void;
}

type Tab = "csv" | "manual";

// Map common CSV column names to our schema
function parseCSV(text: string): StockHolding[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const get = (row: string[], keys: string[]) => {
    for (const k of keys) {
      const idx = headers.findIndex((h) => h.includes(k));
      if (idx !== -1) return row[idx]?.replace(/"/g, "").trim() || "";
    }
    return "";
  };
  return lines.slice(1).filter(Boolean).map((line) => {
    const row = line.split(",");
    const symbol = get(row, ["symbol", "ticker", "scrip", "stock"]).toUpperCase();
    const qty = parseFloat(get(row, ["qty", "quantity", "shares", "units"])) || 0;
    const avgPrice = parseFloat(get(row, ["avg", "average", "buy price", "cost"])) || 0;
    const curPrice = parseFloat(get(row, ["ltp", "current price", "last price", "cmp"])) || avgPrice;
    const curValue = parseFloat(get(row, ["current value", "market value", "value"])) || qty * curPrice;
    return { symbol, qty, avgBuyPrice: avgPrice, currentPrice: curPrice, currentValue: curValue };
  }).filter((s) => s.symbol && s.qty > 0);
}

export function PortfolioSyncPanel({ onStocksLoaded, onMFLoaded }: Props) {
  const [tab, setTab] = useState<Tab>("csv");
  const [csvStatus, setCsvStatus] = useState<"idle" | "success" | "error">("idle");
  const [csvCount, setCsvCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        onStocksLoaded(parsed);
        setCsvCount(parsed.length);
        setCsvStatus("success");
      } else {
        setCsvStatus("error");
      }
    };
    reader.readAsText(file);
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "csv", label: "CSV Import", icon: "📄" },
    { id: "manual", label: "Manual Entry", icon: "✍️" },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              tab === t.id
                ? "bg-[#9EA2F8]/15 text-[#9EA2F8] border-b-2 border-[#9EA2F8]"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* CSV */}
        {tab === "csv" && (
          <div className="space-y-4">
            <p className="text-xs text-white/50 leading-relaxed">
              Export your portfolio as CSV from <strong className="text-white/70">Groww → Portfolio → Download</strong> or
              any other platform (Zerodha, INDMoney, Upstox) and upload here.
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging ? "border-[#9EA2F8] bg-[#9EA2F8]/10" : "border-white/20 hover:border-white/40"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-white/30" />
              <p className="text-sm font-medium text-white/60">Drop CSV file here or <span className="text-[#9EA2F8]">click to browse</span></p>
              <p className="text-xs text-white/30 mt-1">Supports Groww, Zerodha, INDMoney, Upstox CSV formats</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            {csvStatus === "success" && (
              <div className="flex items-center gap-2 text-green-400 text-sm font-bold bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <CheckCircle className="w-4 h-4" /> Imported {csvCount} holdings successfully!
              </div>
            )}
            {csvStatus === "error" && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                Could not parse CSV. Please ensure Symbol, Qty, and Price columns are present.
              </div>
            )}
          </div>
        )}

        {/* MANUAL */}
        {tab === "manual" && (
          <div className="text-center py-6 space-y-2">
            <PenLine className="w-8 h-8 mx-auto text-white/30" />
            <p className="text-sm text-white/60 font-medium">Use the form below to enter holdings manually.</p>
            <p className="text-xs text-white/35">All fields are pre-filled with a demo portfolio so you can see the analyzer immediately.</p>
          </div>
        )}
      </div>
    </div>
  );
}
