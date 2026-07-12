import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, BarChart2, Shield, Zap, Cpu } from "lucide-react";
import { Header } from "@/components/Header";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

interface TickerItem { name: string; value: string; change: string; pct: string; up: boolean; }

const FALLBACK_TICKERS: TickerItem[] = [
  { name: "NIFTY 50",        value: "23,415.05", change: "+127.35", pct: "+0.55%", up: true  },
  { name: "SENSEX",          value: "77,209.90", change: "+387.45", pct: "+0.50%", up: true  },
  { name: "BANK NIFTY",      value: "50,127.80", change: "-215.60", pct: "-0.43%", up: false },
  { name: "NIFTY IT",        value: "38,204.15", change: "+520.75", pct: "+1.38%", up: true  },
  { name: "NIFTY PHARMA",    value: "21,340.60", change: "+180.30", pct: "+0.85%", up: true  },
  { name: "NIFTY AUTO",      value: "22,140.30", change: "+95.10",  pct: "+0.43%", up: true  },
  { name: "NIFTY MIDCAP 100",value: "52,891.40", change: "+243.20", pct: "+0.46%", up: true  },
  { name: "S&P 500",         value: "5,308.15",  change: "+28.20",  pct: "+0.53%", up: true  },
  { name: "NASDAQ",          value: "18,673.40", change: "+92.60",  pct: "+0.50%", up: true  },
  { name: "DOW JONES",       value: "39,142.20", change: "+130.50", pct: "+0.33%", up: true  },
];

function toTickerItems(indices: any[]): TickerItem[] {
  // Indian indices first, then global
  const sorted = [...indices].sort((a, b) =>
    (a.region === "India" ? 0 : 1) - (b.region === "India" ? 0 : 1)
  );
  return sorted.map((idx) => ({
    name: idx.name.toUpperCase(),
    value: idx.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    change: (idx.change >= 0 ? "+" : "") + Math.abs(idx.change).toFixed(2),
    pct: (idx.changePct >= 0 ? "+" : "") + idx.changePct.toFixed(2) + "%",
    up: idx.changePct >= 0,
  }));
}

export default function LandingPage() {
  const [tickers, setTickers] = useState<TickerItem[]>(FALLBACK_TICKERS);

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.indices) && data.indices.length > 0) {
          setTickers(toTickerItems(data.indices));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen w-full bg-background overflow-hidden">
      {/* Market Ticker Strip */}
      <div className="border-b border-border bg-card overflow-hidden h-9 flex items-center">
        <div
          className="flex whitespace-nowrap"
          style={{ animation: "ticker 40s linear infinite" }}
        >
          {[...tickers, ...tickers, ...tickers].map((t, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2 px-5 shrink-0 border-r border-border h-9"
            >
              <span className="text-xs font-semibold text-foreground">{t.name}</span>
              <span className="text-xs font-bold text-foreground">{t.value}</span>
              <span
                className="text-xs font-medium flex items-center gap-0.5"
                style={{ color: t.up ? "#00D09C" : "#FF4D4D" }}
              >
                {t.up ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {t.change} ({t.pct})
              </span>
            </div>
          ))}
        </div>
      </div>


      {/* Navbar */}
      <Header />


      {/* Hero Section */}
      <div className="relative px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="max-w-2xl space-y-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
            style={{
              borderColor: "rgba(0,208,156,0.35)",
              backgroundColor: "rgba(0,208,156,0.07)",
              color: "#00D09C",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C] animate-pulse" />
            AI-Powered Research • Indian Markets
          </div>


          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Smart Portfolio
            <br />
            <span style={{ color: "#00D09C" }}>Analysis & Insights</span>
          </h1>


          <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
            AI-driven portfolio health scoring, sector analysis, rebalancing
            recommendations, and Monte Carlo simulations — built for Indian markets.
          </p>


          <div className="flex flex-wrap gap-2">
            <a
              href="/comparison_report.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-[#00D09C]/60 transition-all"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              View Model Comparison Report
            </a>
            <a
              href="/algo-backtest-report.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-[#00D09C]/60 transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              View Algo Backtest Report
            </a>
          </div>



          <div className="flex items-center gap-3 pt-2">
            <SignedOut>
              <Link
                to="/sign-in"
                className="px-6 py-2.5 rounded-md font-semibold text-sm text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: "#00D09C" }}
              >
                Get Started Free
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/portfolio-analyser"
                className="px-6 py-2.5 rounded-md font-semibold text-sm text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: "#00D09C" }}
              >
                Open Dashboard
              </Link>
            </SignedIn>
            <Link
              to="/global-market"
              className="px-6 py-2.5 rounded-md font-semibold text-sm border border-border text-foreground hover:bg-muted transition-all"
            >
              Global Markets
            </Link>
          </div>
        </div>


        {/* Stats row */}
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "AI Agents", value: "8+", sub: "Collaborative intelligence" },
            { label: "Data Sources", value: "12+", sub: "Real-time market signals" },
            { label: "Health Score", value: "0–100", sub: "Portfolio scoring system" },
            { label: "Simulations", value: "5,000", sub: "Monte Carlo runs" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>


      {/* Features Section */}
      <section className="px-6 md:px-12 py-16 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Why DiversiFi?
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Built for serious investors who want data-driven clarity
            </p>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                Icon: BarChart2,
                title: "Portfolio Health Score",
                description:
                  "0–100 score measuring diversification, concentration risk, MF overlap, and benchmark alignment against Nifty 50 / 500.",
                link: null,
              },
              {
                Icon: Zap,
                title: "Multi-Agent AI",
                description:
                  "8+ specialized AI agents analyse sentiment, trends, and technicals to deliver comprehensive, explainable insights.",
                link: null,
              },
              {
                Icon: Shield,
                title: "Risk Analytics",
                description:
                  "Monte Carlo simulations with 5,000 runs model portfolio outcomes across bull, bear, and black-swan scenarios.",
                link: null,
              },
              {
                Icon: Cpu,
                title: "Algo Trading Engine",
                description:
                  "+18.4% simulated return · 1.84 Sharpe · 64.2% win rate. LangGraph multi-agent ensemble backtested on Nifty 50 H1 2025.",
                link: "/algo-trading",
              },
            ].map(({ Icon, title, description, link }, i) => {
              const inner = (
                <>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: link ? "rgba(0,208,156,0.15)" : "rgba(0,208,156,0.1)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#00D09C" }} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                    {title}
                    {link && (
                      <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(0,208,156,0.12)", color: "#00D09C" }}
                      >
                        NEW
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </>
              );
              return link ? (
                <Link
                  key={i}
                  to={link}
                  className="bg-card border border-border rounded-xl p-6 hover:border-[#00D09C]/60 transition-colors block"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-6 hover:border-[#00D09C]/40 transition-colors"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* Team Section */}
      <section className="px-6 md:px-12 py-16 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Meet Our Team
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Experts in AI, finance, and software engineering
            </p>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                name: "Satyaki Dey",
                role: "Full Stack Engineer",
                expertise: "React, Next.js, API Integration, System Design",
              },
              {
                name: "Priyanshu Dutta",
                role: "AI Engineer",
                expertise:
                  "RAG Systems, Backend APIs, Data Pipelines, ML Deployment",
              },
              {
                name: "Rishi Bhattasali",
                role: "ML & Backend",
                expertise:
                  "ML Ops, Backend Architecture, API Design, Distributed Systems",
              },
              {
                name: "Shristy Dutta",
                role: "Research Analyst",
                expertise:
                  "Market Research, Financial Analysis, Data Interpretation",
              },
              {
                name: "Sonika Biswas",
                role: "Frontend Engineer",
                expertise: "UI/UX, Responsive Design, Component Architecture",
              },
            ].map((m, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-5 hover:border-[#00D09C]/30 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white mb-4"
                  style={{ backgroundColor: "#00D09C" }}
                >
                  {m.name.charAt(0)}
                </div>
                <p className="font-semibold text-sm text-foreground">{m.name}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: "#00D09C" }}>
                  {m.role}
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {m.expertise}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: "#00D09C" }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm text-foreground">DiversiFi</span>
            <span className="text-muted-foreground text-xs">© 2025</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/algo-trading"
              className="text-xs font-semibold transition-colors flex items-center gap-1"
              style={{ color: "#00D09C" }}
            >
              <Cpu className="w-3 h-3" />
              Algo Trading
            </Link>
            <a
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 max-w-7xl mx-auto">
          Disclaimer: For academic and research purposes only. Not financial or
          investment advice.
        </p>
      </footer>
    </main>
  );
}