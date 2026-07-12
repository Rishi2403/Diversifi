import { useState, useRef } from "react";
import { Upload, PenLine, CheckCircle } from "lucide-react";
import type { StockHolding, MFHolding } from "@/lib/portfolioEngine";

interface Props {
  onStocksLoaded: (stocks: StockHolding[]) => void;
  onMFLoaded?: (mfs: MFHolding[]) => void;
}

type Tab = "csv" | "manual";

interface ParseResult {
  stocks: StockHolding[];
  mfs: MFHolding[];
}

function parseUnifiedCSV(text: string): ParseResult {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return { stocks: [], mfs: [] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  const col = (row: string[], ...keys: string[]): string => {
    for (const k of keys) {
      const idx = headers.findIndex((h) => h.includes(k));
      if (idx !== -1) return (row[idx] ?? "").replace(/"/g, "").trim();
    }
    return "";
  };

  const stocks: StockHolding[] = [];
  const mfs: MFHolding[] = [];

  for (const line of lines.slice(1)) {
    const row = line.split(",");
    const type = col(row, "type").toLowerCase();

    if (type === "stock" || (!type && col(row, "symbol", "ticker"))) {
      const symbol = col(row, "symbol", "ticker", "scrip").toUpperCase();
      const qty = parseFloat(col(row, "qty", "quantity", "shares")) || 0;
      const avgBuyPrice = parseFloat(col(row, "avgbuyprice", "avg", "average", "buy")) || 0;
      const currentPrice = parseFloat(col(row, "currentprice", "ltp", "cmp", "last")) || avgBuyPrice;
      const currentValue = parseFloat(col(row, "currentvalue", "market value", "value")) || qty * currentPrice;
      const name = col(row, "name");
      const buyDate = col(row, "buydate", "buy date", "date");

      if (symbol && qty > 0) {
        stocks.push({ symbol, name: name || undefined, qty, avgBuyPrice, currentPrice, currentValue, buyDate: buyDate || undefined });
      }
    } else if (type === "mf" || type === "mutual fund") {
      const fundName = col(row, "name", "fundname", "fund");
      const category = col(row, "category") || "Flexi Cap";
      const investedAmount = parseFloat(col(row, "investedamount", "invested", "cost", "amount")) || 0;
      const currentValue = parseFloat(col(row, "currentvalue", "value", "market")) || 0;
      const buyDate = col(row, "buydate", "buy date", "date");

      if (fundName && currentValue > 0) {
        mfs.push({ fundName, category, investedAmount, currentValue, buyDate: buyDate || undefined });
      }
    }
  }

  return { stocks, mfs };
}

export function PortfolioSyncPanel({ onStocksLoaded, onMFLoaded }: Props) {
  const [tab, setTab] = useState<Tab>("csv");
  const [csvStatus, setCsvStatus] = useState<"idle" | "success" | "error">("idle");
  const [csvCounts, setCsvCounts] = useState({ stocks: 0, mfs: 0 });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { stocks, mfs } = parseUnifiedCSV(text);

      if (stocks.length > 0 || mfs.length > 0) {
        if (stocks.length > 0) onStocksLoaded(stocks);
        if (mfs.length > 0 && onMFLoaded) onMFLoaded(mfs);
        setCsvCounts({ stocks: stocks.length, mfs: mfs.length });
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
    <div className="bg-white/5 border text-gray-800 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="flex border-b text-gray-800 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              tab === t.id
                ? "bg-[#00D09C]/15 text-[#00D09C] border-b-2 border-[#00D09C]"
                : "text-gray-400 dark:text-white/40 hover:text-[#00D09C]"
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "csv" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-white/50 leading-relaxed">
              Upload a portfolio CSV with columns: <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">type, symbol, name, qty, avgBuyPrice, currentPrice, currentValue, category, investedAmount, buyDate</code>. Download our <a href="/sample-portfolio.csv" className="text-[#00D09C] underline" download>sample template</a>.
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging ? "border-[#00D09C] bg-[#00D09C]/10" : "text-gray-800 dark:border-white/20 hover:border-[#00D09C]"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-white/30" />
              <p className="text-sm font-medium text-gray-600 dark:text-white/60">Drop CSV file here or <span className="text-[#00D09C]">click to browse</span></p>
              <p className="text-xs text-gray-400 dark:text-white/30 mt-1">Stocks and Mutual Funds in one file</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            {csvStatus === "success" && (
              <div className="flex items-center gap-2 text-green-400 text-sm font-bold bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <CheckCircle className="w-4 h-4" />
                Imported {csvCounts.stocks} stocks and {csvCounts.mfs} mutual funds!
              </div>
            )}
            {csvStatus === "error" && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                Could not parse CSV. Ensure the file has a <strong>type</strong> column with values "stock" or "mf".
              </div>
            )}
          </div>
        )}

        {tab === "manual" && (
          <div className="text-center py-6 space-y-2">
            <PenLine className="w-8 h-8 mx-auto text-white/30" />
            <p className="text-sm text-gray-600 dark:text-white/60 font-medium">Use the form below to enter holdings manually.</p>
            <p className="text-xs text-gray-500 dark:text-white/35">All fields are pre-filled with a demo portfolio so you can see the analyzer immediately.</p>
          </div>
        )}
      </div>
    </div>
  );
}
