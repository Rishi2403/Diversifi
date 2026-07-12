import { useState } from "react";
import { Mail, Send, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  email: string;
  lastSentAt: string | null;
}

export default function EmailReportPanel({ email, lastSentAt }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function sendReport() {
    setStatus("sending");
    setErrMsg("");
    try {
      const res = await fetch("/api/agent/report/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("sent");
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setErrMsg(data.error || "Failed to send");
        setStatus("error");
      }
    } catch {
      setErrMsg("Network error");
      setStatus("error");
    }
  }

  const lastSentLabel = lastSentAt
    ? new Date(lastSentAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
    : "Never";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Daily Report</h3>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Recipient</span>
          <span className="text-foreground truncate max-w-[180px]">{email}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Last sent</span>
          <span className="text-foreground">{lastSentLabel}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Auto-send</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Enabled (market close)</span>
        </div>
      </div>

      <p className="text-muted-foreground text-xs mb-3">
        Includes: portfolio snapshot, verdict, top alerts, holdings table, and live dashboard link.
      </p>

      {status === "sent" ? (
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          Report sent successfully!
        </div>
      ) : (
        <button
          onClick={sendReport}
          disabled={status === "sending"}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {status === "sending" ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
          ) : (
            <><Send className="w-4 h-4" />Send Report Now</>
          )}
        </button>
      )}

      {status === "error" && (
        <p className="text-red-500 text-xs mt-2">{errMsg}</p>
      )}
    </div>
  );
}
