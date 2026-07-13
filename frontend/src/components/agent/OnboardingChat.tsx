import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

const QUESTIONS = [
  "How do you typically invest - SIPs, lumpsum, or both? And roughly how much per month?",
  "What are you investing for and over what timeframe? (e.g., retirement in 20 years, a house in 5 years)",
  "If your portfolio dropped 20% in a month, what would you do - buy more, hold, or sell?",
  "Are there any sectors or companies you specifically want to focus on or avoid?",
];

const INTRO = "Hi! I'm your Diversifi agent. I'll personalise your experience with 4 quick questions. Let's start:";

interface Message {
  role: "bot" | "user";
  text: string;
  typing?: boolean; // true while the text is still streaming in
}

interface Props {
  onComplete: (transcript: string) => void;
}

function useTypingText(targetText: string, active: boolean, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(targetText); return; }
    setDisplayed("");
    let i = 0;
    const words = targetText.split(" ");
    const interval = setInterval(() => {
      i++;
      setDisplayed(words.slice(0, i).join(" ") + (i < words.length ? "▍" : ""));
      if (i >= words.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [targetText, active]);
  return displayed;
}

// A single bot bubble that streams its text in
function BotBubble({ text, isNew }: { text: string; isNew: boolean }) {
  const displayed = useTypingText(text, isNew);
  return (
    <div className="max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted text-foreground">
      {displayed || <span className="opacity-40">▍</span>}
    </div>
  );
}

// Animated 3-dot typing indicator
function TypingIndicator() {
  return (
    <div className="flex gap-1 px-4 py-3 bg-muted rounded-2xl rounded-tl-sm w-16">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  );
}

export default function OnboardingChat({ onComplete }: Props) {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [qIdx, setQIdx]               = useState(-1);       // -1 = showing intro
  const [showTyping, setShowTyping]   = useState(false);
  const [done, setDone]               = useState(false);
  const [newMsgIdx, setNewMsgIdx]     = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const answers   = useRef<string[]>([]);

  // Boot sequence: intro → Q1
  useEffect(() => {
    async function boot() {
      await delay(400);
      setShowTyping(true);
      await delay(1100);
      setShowTyping(false);
      setMessages([{ role: "bot", text: INTRO }]);
      setNewMsgIdx(0);
      await delay(1400);
      setShowTyping(true);
      await delay(900);
      setShowTyping(false);
      setMessages(m => [...m, { role: "bot", text: QUESTIONS[0] }]);
      setNewMsgIdx(1);
      setQIdx(0);
    }
    boot();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTyping]);

  function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed || done || qIdx < 0) return;
    answers.current.push(trimmed);

    const userMsg: Message = { role: "user", text: trimmed };
    setMessages(m => [...m, userMsg]);
    setInput("");

    const nextQ = qIdx + 1;
    await delay(300);
    setShowTyping(true);

    if (nextQ < QUESTIONS.length) {
      await delay(900 + Math.random() * 400);
      setShowTyping(false);
      const ack = pickAck(qIdx);
      const botIdx = messages.length + 2;
      setMessages(m => [...m, { role: "bot", text: ack + " " + QUESTIONS[nextQ] }]);
      setNewMsgIdx(botIdx);
      setQIdx(nextQ);
    } else {
      await delay(1000 + Math.random() * 300);
      setShowTyping(false);
      setMessages(m => [...m, { role: "bot", text: "Perfect - thanks for sharing! Setting up your personalised agent now…" }]);
      setDone(true);

      const transcript = QUESTIONS.map((q, i) => `Q: ${q}\nA: ${answers.current[i] ?? ""}`).join("\n\n");
      setTimeout(() => onComplete(transcript), 800);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
              m.role === "bot" ? "bg-primary" : "bg-muted"
            }`}>
              {m.role === "bot"
                ? <Bot className="w-4 h-4 text-primary-foreground" />
                : <User className="w-4 h-4 text-muted-foreground" />
              }
            </div>
            {m.role === "bot"
              ? <BotBubble text={m.text} isNew={i === newMsgIdx} />
              : (
                <div className="max-w-[82%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm bg-primary text-primary-foreground">
                  {m.text}
                </div>
              )
            }
          </div>
        ))}

        {showTyping && (
          <div className="flex gap-2.5 items-end">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <TypingIndicator />
          </div>
        )}

        {done && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="animate-spin inline-block">⚙️</span>
              Extracting investment profile…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!done && qIdx >= 0 && (
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Your answer…`}
              autoFocus
              className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-muted-foreground text-xs mt-2 text-center">
            Question {qIdx + 1} of {QUESTIONS.length}
          </p>
        </div>
      )}
    </div>
  );
}

function pickAck(qIdx: number): string {
  const acks = [
    ["Got it!", "Makes sense.", "Noted!"],
    ["Great!", "Good to know.", "Understood!"],
    ["Interesting!", "That's helpful.", "I see!"],
    ["Perfect.", "Noted!", "Got it."],
  ];
  const pool = acks[qIdx] ?? ["Got it!"];
  return pool[Math.floor(Math.random() * pool.length)];
}
