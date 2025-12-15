import { Link } from "react-router-dom";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface StatCard {
  value: string;
  label: string;
  featured?: boolean;
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const stats: StatCard[] = [
    { value: "5+", label: "AI Agents" },
    { value: "Real-Time", label: "Market Signals", featured: true },
    { value: "Multi-Source", label: "Data Fusion" },
    { value: "Explainable", label: "Predictions" },
  ];


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

      {/* Navbar */}
      <nav className="relative z-40 px-6 md:px-12 py-6 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-12">
          <div className="text-2xl font-bold" style={{ color: "#9EA2F8" }}>
            ◯
          </div>

          {/* Menu Items - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {["Platform", "Agents", "Research", "Insights", "Documentation"].map(
              (item) => (
                <a
                  key={item}
                  href="#"
                  className="text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary transition-colors duration-200"
                >
                  {item}
                </a>
              )
            )}
          </div>
        </div>

        {/* Right side - Theme toggle and Launch App button */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 transition-colors duration-200"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5" style={{ color: "#9EA2F8" }} />
            ) : (
              <Moon className="w-5 h-5 text-text-secondary" />
            )}
          </button>
          <Link
            to="/chat"
            className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-white"
            style={{
              backgroundColor: "#141318",
            }}
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 md:px-12">
        <div className="max-w-4xl text-center space-y-8">
          {/* Stay up to date pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-text-tertiary/30 bg-white/40 dark:bg-white/5 backdrop-blur-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#9EA2F8" }}
            />
            <span className="text-sm font-medium text-text-secondary dark:text-text-secondary">
              AI Driven Research Prototype
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="leading-tight text-[60px] text-text-primary dark:text-white">
            <span className="block">Intelligent Stock Market</span>
            <span className="block">Analysis Pipeline</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-text-secondary dark:text-text-secondary max-w-2xl mx-auto">
            An AI-powered system using RAG, multi-agent intelligence, and real-time market data.
          </p>

          {/* CTA Button */}
          <div className="pt-4">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-85 active:scale-95"
              style={{ backgroundColor: "#141318" }}
            >
              Launch App ↗
            </Link>
          </div>
        </div>

        {/* Floating Stats Cards - Positioned at bottom of hero */}
        {mounted && (
          <div className="absolute -bottom-32 md:-bottom-24 left-0 right-0 z-20">
            <div className="px-6 md:px-12">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
                {stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="relative group"
                    style={{
                      perspective: "1000px",
                    }}
                  >
                    <div
                      className={`rounded-2xl p-6 md:p-8 border transition-all duration-300 ${
                        stat.featured
                          ? "lg:col-span-1 border-text-tertiary/20 dark:border-text-tertiary/20"
                          : "border-text-tertiary/10 dark:border-text-tertiary/10"
                      } dark:bg-white/5`}
                      style={{
                        backgroundColor: stat.featured
                          ? "rgba(20, 19, 24, 0.9)"
                          : "rgba(255, 255, 255, 0.7)",
                        backdropFilter: "blur(12px)",
                        color: stat.featured ? "#F5F5F9" : "#141318",
                      }}
                    >
                      <div className="space-y-6">
                        {/* Value */}
                        <div className="space-y-1">
                          <p className="text-2xl md:text-3xl font-bold tracking-tight">
                            {stat.value}
                          </p>
                          <p
                            className="text-xs md:text-sm font-medium opacity-70"
                            style={{
                              color: stat.featured
                                ? "rgba(245, 245, 249, 0.7)"
                                : "rgba(20, 19, 24, 0.6)",
                            }}
                          >
                            {stat.label}
                          </p>
                        </div>

                        {/* Arrow Icon - Bottom Right */}
                        <div className="flex justify-end">
                          <div
                            className="p-2 rounded-lg"
                            style={{
                              backgroundColor: stat.featured
                                ? "rgba(245, 245, 249, 0.1)"
                                : "rgba(20, 19, 24, 0.05)",
                            }}
                          >
                            <ArrowUpRight
                              className="w-4 h-4"
                              style={{
                                color: stat.featured ? "#F5F5F9" : "#141318",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Spacing for Cards */}
      <div className="h-40 md:h-32" />

      {/* Additional Sections */}
      <section className="relative z-10 px-6 md:px-12 py-20 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6 mb-16">
            <h2 className="text-text-primary dark:text-white">Why This System Matters</h2>
            <p className="text-lg text-text-secondary dark:text-text-secondary max-w-2xl mx-auto">
              Designed to analyze complex market behavior using coordinated AI agents
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Multi-Agent Intelligence",
                description:
                  "Independent AI agents collaborate to analyze sentiment, trends, and technical indicators",
              },
              {
                title: "Retrieval-Augmented Generation (RAG)",
                description:
                  "Live market data and news are retrieved and grounded into AI-generated insights",
              },
              {
                title: "Explainable Predictions",
                description:
                  "Each recommendation is supported by transparent reasoning and agent-level analysis",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl border border-border backdrop-blur-sm dark:bg-white/5"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                }}
              >
                <h3 className="text-xl font-bold mb-3 text-text-primary dark:text-white">{feature.title}</h3>
                <p className="text-text-secondary dark:text-black">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="relative z-10 px-6 md:px-12 py-20 md:py-32 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-text-primary dark:text-white">Meet Our Team</h2>
            <p className="text-lg text-text-secondary dark:text-text-secondary max-w-2xl mx-auto">
              Pioneering AI-driven stock market analysis with expertise in machine learning, finance, and software engineering
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[
              {
                name: "Satyaki Dey",
                role: "Lead Architect",
                expertise: "ML & AI Systems",
              },
              {
                name: "Research Lead",
                role: "Data Science",
                expertise: "Market Analysis",
              },
              {
                name: "Backend Engineer",
                role: "System Design",
                expertise: "RAG & LLMs",
              },
              {
                name: "Frontend Engineer",
                role: "UI/UX",
                expertise: "User Experience",
              },
              {
                name: "Frontend Engineer",
                role: "UI/UX",
                expertise: "User Experience",
              },
            ].map((member, idx) => (
              <div
                key={idx}
                className="rounded-2xl p-6 border border-border transition-all duration-300 hover:border-primary/50 group dark:bg-white/5"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                }}
              >
                <div className="w-16 h-16 rounded-full mb-4 bg-gradient-primary-to-secondary flex items-center justify-center text-white font-bold text-lg">
                  {member.name.charAt(0)}
                </div>
                <h3 className="text-lg font-bold mb-1 text-text-primary dark:text-white">{member.name}</h3>
                <p className="text-sm font-medium text-primary dark:text-primary mb-2">{member.role}</p>
                <p className="text-sm text-text-secondary dark:text-black">{member.expertise}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 md:px-12 py-12 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-sm text-text-secondary dark:text-text-secondary">
              © 2025 Automated Stock Market Prediction Pipeline
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-text-secondary hover:text-text-primary dark:hover:text-text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-text-secondary hover:text-text-primary dark:hover:text-text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-text-secondary hover:text-text-primary dark:hover:text-text-primary transition-colors">
                Contact
              </a>
            </div>
          </div>
          <p className="text-sm text-text-secondary dark:text-text-secondary mt-12">
            Disclaimer: This system is developed for academic and research purposes only.
            It does not provide <br />financial or investment advice.
          </p>
        </div>
      </footer>
    </main>
  );
}
