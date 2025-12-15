import { useState, useRef, useEffect } from "react";
import { ArrowUpRight, Moon, Sun, Send, CheckCircle2 } from "lucide-react";

// --- Interfaces ---
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ReasoningStep {
  name: string;
  status: "pending" | "active" | "complete";
}

interface BackendEvent {
  type: "result" | "clarifier";
  title: string;
  message: string;
}

const API_BASE = "http://127.0.0.1:8000";

export default function ChatPage() {
  // --- UI State ---
  const [isDark, setIsDark] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Hello! I'm your AI stock market analyst. Ask me about any stock, market trends, or sentiment analysis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // --- Backend Logic State ---
  const [taskId, setTaskId] = useState<string | null>(null);
  const [waitingClarification, setWaitingClarification] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);

  // --- Theme Logic (Preserved from Original) ---
  useEffect(() => {
    const stored = localStorage.getItem("theme-mode");
    if (stored) {
      const dark = stored === "dark";
      setIsDark(dark);
      applyTheme(dark);
    } else {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(dark);
      applyTheme(dark);
    }

    // Cleanup polling on unmount
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    applyTheme(newDark);
    localStorage.setItem("theme-mode", newDark ? "dark" : "light");
  };

  // --- Scroll Logic ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, reasoningSteps]);

  // --- Backend Interaction Logic ---

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    
    // Reset reasoning steps for new query unless it's a clarification
    if (!waitingClarification) {
        setReasoningSteps([{ name: "Initializing Agent...", status: "active" }]);
    }

    try {
      // Logic Branch: Clarification vs New Question
      if (waitingClarification && taskId) {
        await fetch(`${API_BASE}/clarify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId, answer: userText }),
        });
        
        setWaitingClarification(false);
        // Resume polling existing task
        startPolling(taskId);
      } else {
        // New Question
        const res = await fetch(`${API_BASE}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userText }),
        });

        if (!res.ok) throw new Error("Backend connection failed");

        const data = await res.json();
        if (data.task_id) {
          setTaskId(data.task_id);
          startPolling(data.task_id);
        }
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Error: Could not connect to the analyst backend.",
        },
      ]);
      setReasoningSteps((prev) => prev.map(s => ({...s, status: "complete"}))); // Stop spinners
    }
  };

  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/get/${id}`);
        if (!res.ok) return; // Skip if network blip
        
        const data = await res.json();

        // Update Reasoning Steps
        if (data.events && Array.isArray(data.events)) {
            const mappedSteps: ReasoningStep[] = data.events.map((e: BackendEvent) => ({
                name: e.title,
                status: "complete"
            }));
            
            // If still running, add a generic "active" step at the bottom
            if (data.status !== "COMPLETED" && !data.events.some((e: BackendEvent) => e.type === "clarifier")) {
                mappedSteps.push({ name: "Processing...", status: "active" });
            }
            
            setReasoningSteps(mappedSteps);
        }

        // Handle Clarification Request
        const clarifier = data.events?.find(
          (e: BackendEvent) => e.type === "clarifier"
        );

        if (clarifier) {
          setIsProcessing(false);
          setWaitingClarification(true);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: clarifier.message,
            },
          ]);
          clearInterval(pollRef.current!);
          return;
        }

        // Handle Completion
        if (data.status === "COMPLETED") {
          clearInterval(pollRef.current!);
          setIsProcessing(false);

          if (data.answer) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "assistant",
                content: data.answer,
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Polling error", err);
        // Don't stop polling immediately on one error, waiting for recovery
      }
    }, 1500);
  };

  // --- RENDER (Original UI) ---
  return (
    <main className="min-h-screen w-full bg-white dark:bg-[#1a0f3a] overflow-hidden">
      {/* Background Gradient */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "var(--gradient-radial)",
        }}
      />

      {/* Subtle grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Stats Cards - Reinterpreted as AI Metrics */}
      <div className="relative z-10 px-6 md:px-12 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
          {[
            { value: "5", label: "Active Agents" },
            { value: "12", label: "Data Sources", featured: true },
            { value: "94%", label: "Confidence" },
            { value: "100%", label: "Model Status" },
          ].map((metric, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-4 md:p-6 border transition-all duration-300 dark:bg-white/5 ${metric.featured ? "border-text-tertiary/20" : "border-text-tertiary/10"
                }`}
              style={{
                backgroundColor: metric.featured
                  ? "rgba(20, 19, 24, 0.9)"
                  : "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(12px)",
                color: metric.featured ? "#F5F5F9" : "#141318",
              }}
            >
              <div className="space-y-3">
                <p className="text-xl md:text-2xl font-bold tracking-tight">
                  {metric.value}
                </p>
                <p
                  className="text-xs md:text-sm font-medium opacity-70"
                  style={{
                    color: metric.featured
                      ? "rgba(245, 245, 249, 0.7)"
                      : "rgba(20, 19, 24, 0.6)",
                  }}
                >
                  {metric.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area - Chat Interface */}
      <div className="relative z-10 px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Panel */}
          <div className="lg:col-span-2 rounded-2xl border border-text-tertiary/10 overflow-hidden dark:bg-white/5" style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}>
            {/* Chat Messages */}
            <div className="h-96 md:h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  <div
                    className="max-w-xs px-4 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor:
                        msg.role === "user"
                          ? "#141318"
                          : "rgba(255,255,255,0.5)",
                      color: msg.role === "user" ? "#F5F5F9" : "#141318",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div
                    className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.5)",
                      color: "#4D4D4D",
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    Processing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-text-tertiary/10 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={waitingClarification ? "Please provide the required clarification..." : "Ask about a stock, market trend, or sentiment…"}
                  className="flex-1 px-4 py-2 rounded-lg text-sm border border-text-tertiary/20 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.5)",
                    color: "#141318",
                  }}
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  className="p-2 rounded-lg transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: "#141318",
                    color: "#F5F5F9",
                  }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* System Reasoning Panel */}
          <div className="rounded-2xl border border-text-tertiary/10 p-6 overflow-hidden dark:bg-white/5" style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}>
            <h3 className="font-bold text-sm md:text-base mb-6 text-text-primary dark:text-white">
              System Reasoning
            </h3>

            <div className="space-y-3">
              {reasoningSteps.length === 0 && !isProcessing && (
                   <p className="text-sm opacity-50 italic">Waiting for query...</p>
              )}
              {reasoningSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.status === "complete" ? (
                      <CheckCircle2
                        className="w-5 h-5"
                        style={{ color: "#9EA2F8" }}
                      />
                    ) : step.status === "active" ? (
                      <div
                        className="w-5 h-5 rounded-full border-2 animate-spin"
                        style={{
                          borderColor: "rgba(158, 162, 248, 0.3)",
                          borderTopColor: "#9EA2F8",
                        }}
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full border-2"
                        style={{ borderColor: "rgba(20, 19, 24, 0.2)" }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "#141318",
                        opacity: step.status === "pending" ? 0.5 : 1,
                      }}
                    >
                      {step.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}