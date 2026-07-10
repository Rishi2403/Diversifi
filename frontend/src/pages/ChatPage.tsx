import { useState, useRef, useEffect } from "react";
import {
  ArrowUpRight,
  Send,
  CheckCircle2,
  X,
  Info,
  AlertCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMarkdown } from "@/components/ChatMarkdown";

// --- Interfaces ---
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ReasoningStep {
  name: string;
  status: "pending" | "active" | "complete" | "error";
  message?: string;
}

interface BackendEvent {
  type: "result" | "clarifier" | "error";
  title: string;
  message: string;
}

const API_BASE = "http://localhost:8000";

// --- Modal Component ---
function StepModal({
  step,
  onClose,
}: {
  step: ReasoningStep | null;
  onClose: () => void;
}) {
  if (!step) return null;

  const isError = step.status === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg bg-white dark:bg-background rounded-2xl shadow-2xl border overflow-hidden transform transition-all scale-100 ${isError ? "border-red-500/30" : "border-white/10"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${isError ? "bg-red-50 dark:bg-red-500/20" : "bg-indigo-50 dark:bg-indigo-500/20"}`}
            >
              {isError ? (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : (
                <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {step.name} {isError ? "Error Log" : "Output"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div
            className={`prose dark:prose-invert max-w-none text-sm leading-relaxed ${isError ? "text-red-800 dark:text-red-300" : "text-gray-600 dark:text-gray-300"}`}
          >
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  return (
                    <code
                      className={`${className} bg-gray-100 dark:bg-white/10 rounded px-1 py-0.5 text-xs font-mono`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  return (
                    <pre className="bg-gray-100 dark:bg-black/30 p-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-white/10 my-2">
                      {children}
                    </pre>
                  );
                },
              }}
            >
              {step.message || "No detailed output provided."}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${isError ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  // --- UI State ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Hello! I amm your **AI finance assistant**. Ask me about *stocks*, *mutual funds*, *market trends*, or *general financial insights*",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Modal State ---
  const [selectedStep, setSelectedStep] = useState<ReasoningStep | null>(null);

  // --- Backend Logic State ---
  const [taskId, setTaskId] = useState<string | null>(null);
  const [waitingClarification, setWaitingClarification] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);

  const processedCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => stopPolling();
  }, []);

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
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userText },
    ]);
    setInput("");
    setIsProcessing(true);

    if (waitingClarification && taskId) {
      try {
        await fetch(`${API_BASE}/clarify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId, answer: userText }),
        });

        setWaitingClarification(false);
        startPolling(taskId);
      } catch (err) {
        console.error("Clarify Error:", err);
        setIsProcessing(false);
      }
    } else {
      processedCountRef.current = 0;
      setReasoningSteps([{ name: "Initializing Agent...", status: "active" }]);

      try {
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
      } catch (error) {
        console.error(error);
        setIsProcessing(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "Error: Connection failed.",
          },
        ]);
        setReasoningSteps((prev) =>
          prev.map((s) => ({ ...s, status: "complete" })),
        );
      }
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    isPollingRef.current = true;

    const poll = async () => {
      if (!isPollingRef.current) return;

      try {
        const res = await fetch(`${API_BASE}/get/${id}`);
        if (!res.ok) throw new Error("Poll failed");

        const data = await res.json();
        const allEvents = data.events || [];

        // 1. Update UI
        if (Array.isArray(allEvents)) {
          const mappedSteps: ReasoningStep[] = allEvents.map(
            (e: BackendEvent) => ({
              name: e.title,
              status: e.type === "error" ? "error" : "complete",
              message: e.message,
            }),
          );

          const hasClarifier = allEvents.some((e) => e.title === "Clarifier");
          const hasError = allEvents.some((e) => e.type === "error");

          if (data.status === "RUNNING" && !hasClarifier && !hasError) {
            mappedSteps.push({ name: "Processing...", status: "active" });
          }
          setReasoningSteps(mappedSteps);
        }

        // 2. Logic Control
        const newEvents = allEvents.slice(processedCountRef.current);
        processedCountRef.current = allEvents.length;

        // Check for Error
        const errorEvent = newEvents.find(
          (e: BackendEvent) => e.type === "error",
        );
        if (errorEvent) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content:
                "❌ **Error**: An error occurred. Check the *System Reasoning* panel for details.",
            },
          ]);
          setIsProcessing(false);
          stopPolling();
          return;
        }

        // Check for Clarifier
        const newClarifier = newEvents.find(
          (e: BackendEvent) => e.title === "Clarifier",
        );
        if (newClarifier) {
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (
              lastMsg.role === "assistant" &&
              lastMsg.content === newClarifier.message
            ) {
              return prev;
            }
            return [
              ...prev,
              {
                id: Date.now().toString(),
                role: "assistant",
                content: newClarifier.message,
              },
            ];
          });

          setIsProcessing(false);
          setWaitingClarification(true);
          stopPolling();
          return;
        }

        // Check for Completion
        if (data.status === "COMPLETED") {
          stopPolling();
          setIsProcessing(false);

          if (data.answer) {
            const cleanedAnswer = data.answer
              .split("\n")
              .filter((line) => !/^\|\s*:?-{2,}/.test(line.trim()))
              .join("\n");

            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg.content === cleanedAnswer) return prev;
              return [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "assistant",
                  content: cleanedAnswer,
                },
              ];
            });
          }
        } else if (data.status === "FAILED") {
          stopPolling();
          setIsProcessing(false);
        } else {
          pollTimeoutRef.current = setTimeout(poll, 1500);
        }
      } catch (err) {
        console.error("Polling error", err);
        pollTimeoutRef.current = setTimeout(poll, 2000);
      }
    };

    poll();
  };

  const stopPolling = () => {
    isPollingRef.current = false;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
  };

  // --- RENDER ---
  return (
    <main className="min-h-screen w-full bg-background overflow-hidden">
      {/* Modal */}
      {selectedStep && (
        <StepModal step={selectedStep} onClose={() => setSelectedStep(null)} />
      )}

      {/* Stats Cards */}
      <div className="relative z-10 px-6 md:px-12 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
          {(() => {
            const randomDataSources = 3;
            const randomConfidence = 100;

            return [
              { value: "8", label: "Active Agents" },
              {
                value: randomDataSources.toString(),
                label: "Data Sources",
                featured: true,
              },
              { value: `${randomConfidence}%`, label: "Confidence" },
              { value: "100%", label: "Model Status" },
            ].map((metric, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-4 md:p-5 border transition-all ${
                  metric.featured
                    ? "border-[#00D09C]/40 text-white"
                    : "border-border bg-card text-foreground"
                }`}
                style={metric.featured ? { backgroundColor: "#00D09C" } : undefined}
              >
                <p className="text-2xl font-bold tracking-tight">{metric.value}</p>
                <p className={`text-xs font-medium mt-1 ${metric.featured ? "text-white/80" : "text-muted-foreground"}`}>
                  {metric.label}
                </p>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="relative z-10 px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Panel */}
          <div
            className="lg:col-span-2 rounded-xl border border-border overflow-hidden bg-card"
          >
            <div className="h-96 md:h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xl px-4 py-3 rounded-xl ${
                      msg.role === "user"
                        ? "text-white"
                        : "bg-muted text-foreground"
                    }`}
                    style={msg.role === "user" ? { backgroundColor: "#00D09C" } : undefined}
                  >
                    <ChatMarkdown
                      content={msg.content}
                      invert={msg.role === "user"}
                    />
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div
                    className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 bg-muted text-muted-foreground"
                  >
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    Processing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    waitingClarification
                      ? "Please provide the required clarification..."
                      : "Ask about a stock, market trend, or sentiment…"
                  }
                  className="flex-1 px-4 py-2 rounded-lg text-sm border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#00D09C]/40 focus:ring-offset-0 transition-all"
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  className="p-2 rounded-lg transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#00D09C", color: "#fff" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Reasoning Panel */}
          <div
            className="rounded-xl border border-border p-6 overflow-hidden bg-card"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-sm md:text-base text-foreground">
                System Reasoning
              </h3>
            </div>

            <div className="space-y-4">
              {reasoningSteps.length === 0 && !isProcessing && (
                <p className="text-sm opacity-50 italic">
                  Waiting for query...
                </p>
              )}

              {reasoningSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`relative flex items-start gap-3 p-3 rounded-lg transition-all duration-200 group
                    ${step.status === "complete" || step.status === "error" ? "hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" : ""}`}
                  onClick={() =>
                    (step.status === "complete" || step.status === "error") &&
                    setSelectedStep(step)
                  }
                >
                  {/* Status Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {step.status === "complete" ? (
                      <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                    ) : step.status === "error" ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : step.status === "active" ? (
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-white/20" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${step.status === "pending" ? "opacity-50" : step.status === "error" ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                    >
                      {step.name}
                    </p>

                    {/* Markdown Preview Box */}
                    {step.message && (
                      <div
                        className={`text-xs mt-1 line-clamp-2 prose prose-sm dark:prose-invert max-w-none ${step.status === "error" ? "text-red-400 dark:text-red-300/70" : "text-gray-500 dark:text-gray-700"}`}
                      >
                        <ReactMarkdown
                          allowedElements={["p", "strong", "em", "code"]}
                          unwrapDisallowed={true}
                        >
                          {step.message}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {(step.status === "complete" || step.status === "error") && (
                    <ArrowUpRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
