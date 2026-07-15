import { useState, useRef, useEffect, useCallback } from "react";
import { Send, TrendingUp, BarChart2, BookOpen, Sparkles, X } from "lucide-react";
import { ChatMarkdown } from "@/components/ChatMarkdown";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export interface ChatContext {
  source: "analyse" | "simulate" | "research" | "suggest";
  label: string;
  summary: string;
  suggestedPrompts: string[];
}

const CONTEXT_STORAGE_KEY = "diversifi_chat_context";

// ── Default suggested prompts ──────────────────────────────────────────────────
const DEFAULT_PROMPTS = [
  "Best SIP amount for ₹10,000/month over 15 years?",
  "Is Nifty 50 index a good long-term bet?",
  "Explain LTCG vs STCG tax rules in India",
  "How much gold should be in my portfolio?",
];

const SOURCE_META: Record<NonNullable<ChatContext["source"]>, { icon: typeof BarChart2; color: string; dim: string }> = {
  analyse:  { icon: BarChart2, color: "#00D09C", dim: "rgba(0,208,156,0.12)" },
  simulate: { icon: TrendingUp, color: "#a855f7", dim: "rgba(168,85,247,0.12)" },
  research: { icon: BookOpen,   color: "#00b8ff", dim: "rgba(0,184,255,0.12)" },
  suggest:  { icon: Sparkles,   color: "#f59e0b", dim: "rgba(245,158,11,0.12)" },
};

// ── Typing cursor ──────────────────────────────────────────────────────────────
function Cursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] ml-0.5 align-middle rounded-sm animate-pulse"
      style={{ background: "#00D09C", verticalAlign: "middle" }}
    />
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2.5 mt-0.5"
          style={{ background: "rgba(0,208,156,0.15)", border: "1px solid rgba(0,208,156,0.3)" }}
        >
          <TrendingUp className="w-3.5 h-3.5" style={{ color: "#00D09C" }} />
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "rounded-br-sm text-white"
            : "rounded-bl-sm bg-muted border border-border text-foreground"
        }`}
        style={isUser ? { background: "#00D09C", color: "#080b10" } : undefined}
      >
        {isUser ? (
          <p className="font-medium">{msg.content}</p>
        ) : (
          <>
            <ChatMarkdown content={msg.content} invert={false} />
            {msg.streaming && msg.content.length > 0 && <Cursor />}
          </>
        )}
        {msg.streaming && msg.content.length === 0 && (
          <span className="flex gap-1 items-center h-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: "#00D09C", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Suggested prompt chip ──────────────────────────────────────────────────────
function PromptChip({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left text-xs px-3.5 py-2.5 rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-[#00D09C]/40 hover:text-foreground"
    >
      {text}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [ctx, setCtx] = useState<ChatContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load context from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CONTEXT_STORAGE_KEY);
      if (raw) {
        const parsed: ChatContext = JSON.parse(raw);
        setCtx(parsed);
        // Inject context as silent assistant opener
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: `I've loaded your **${parsed.label}** context. Ask me anything about it, or bring up any other investment question - I'm here to help.`,
        }]);
      } else {
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "Hello! I'm your **AI Investment Advisor**, powered by Claude.\n\nI can help you with stocks, mutual funds, portfolio strategy, market analysis and anything finance-related for Indian markets.\n\nWhat would you like to explore today?",
        }]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const dismissContext = () => {
    sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
    setCtx(null);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const apiMessages = [...messages, userMsg]
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true }]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, context: ctx?.summary ?? "" }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const { text: chunk, error } = JSON.parse(payload);
            if (error) throw new Error(error);
            if (chunk) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
              );
            }
          } catch { /* parse error - skip line */ }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "I couldn't connect to the server. Please check your connection and try again.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m)
      );
      setStreaming(false);
    }
  }, [messages, streaming, ctx]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const prompts = ctx?.suggestedPrompts ?? DEFAULT_PROMPTS;
  const showPrompts = messages.length <= 1;
  const sourceMeta = ctx ? SOURCE_META[ctx.source] : null;
  const SourceIcon = sourceMeta?.icon;

  return (
    <div className="flex flex-col bg-background text-foreground" style={{ height: "calc(100vh - 3.5rem)" }}>

      {/* Context banner */}
      {ctx && sourceMeta && SourceIcon && (
        <div
          className="shrink-0 mx-4 md:mx-8 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: sourceMeta.dim, border: `1px solid ${sourceMeta.color}30` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <SourceIcon className="w-4 h-4 shrink-0" style={{ color: sourceMeta.color }} />
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: sourceMeta.color }}>
                {ctx.label}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{ctx.summary}</p>
            </div>
          </div>
          <button
            onClick={dismissContext}
            className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))}

          {/* Suggested prompts */}
          {showPrompts && (
            <div className="pt-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {ctx ? "Suggested questions about your context" : "Try asking"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prompts.map((p) => (
                  <PromptChip key={p} text={p} onClick={() => sendMessage(p)} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 md:px-8 pb-6 pt-3 border-t border-border bg-background">
        <div className="max-w-2xl mx-auto">
          {/* Model badge */}
          {/* <div5 */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 rounded-2xl p-2 bg-muted border border-border"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about stocks, portfolio strategy, mutual funds…"
              rows={1}
              disabled={streaming}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none px-3 py-2 max-h-32 leading-relaxed"
              style={{ minHeight: "36px" }}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
              style={{ background: "#00D09C" }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Investment queries only · Educational analysis, not financial advice
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helper: navigate to chat with context ─────────────────────────────────────
export function openChatWithContext(context: ChatContext) {
  sessionStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
}
