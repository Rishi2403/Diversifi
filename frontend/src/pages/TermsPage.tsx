import { Header } from "@/components/Header";
import { Link } from "react-router-dom";
import { FileText, ChevronRight } from "lucide-react";

const LAST_UPDATED = "July 2026";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: [
      "By accessing or using DiversiFi, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.",
      "These terms apply to all visitors, users, and anyone who accesses or uses DiversiFi.",
    ],
  },
  {
    title: "2. Nature of the Service",
    content: [
      "**Academic research project** - DiversiFi is developed as a final-year academic project. It is provided for educational and research demonstration purposes only.",
      "**Not financial advice** - Nothing on DiversiFi constitutes financial, investment, tax, or legal advice. Portfolio scores, AI verdicts, simulations, and all other outputs are for informational and demonstration purposes only.",
      "**Not a registered advisor** - DiversiFi is not a SEBI-registered investment advisor, stockbroker, or any other regulated financial entity.",
    ],
  },
  {
    title: "3. No Liability for Investment Decisions",
    content: [
      "Any investment decision you make based on information presented on DiversiFi is entirely your own responsibility.",
      "The DiversiFi team, contributors, and affiliated institutions expressly disclaim all liability for any losses, damages, or consequences - direct or indirect - arising from reliance on this platform.",
      "Past simulated performance shown (including the Algo Trading Engine backtest results) does not guarantee future returns.",
    ],
  },
  {
    title: "4. User Responsibilities",
    content: [
      "**Accurate data** - You are responsible for the accuracy of any portfolio data you upload. DiversiFi processes data as-is and cannot validate the correctness of your inputs.",
      "**Appropriate use** - You agree not to use DiversiFi for any unlawful purpose, to distribute malicious code, to attempt unauthorised access to our systems, or to violate any applicable law.",
      "**Account security** - You are responsible for maintaining the confidentiality of your account credentials managed through Clerk.",
    ],
  },
  {
    title: "5. Intellectual Property",
    content: [
      "The DiversiFi codebase, design, and content are the intellectual property of the development team. Unauthorised reproduction or commercial use is prohibited.",
      "Third-party data, APIs, and libraries used within DiversiFi remain the property of their respective owners and are governed by their own licenses.",
    ],
  },
  {
    title: "6. Service Availability",
    content: [
      "DiversiFi is provided on an 'as-is' and 'as-available' basis. We make no guarantees of uptime, availability, or continuity of service.",
      "We reserve the right to modify, suspend, or discontinue any part of the service at any time without notice.",
    ],
  },
  {
    title: "7. Third-Party Links and Services",
    content: [
      "DiversiFi may link to or integrate with third-party services (Clerk, Anthropic Claude, Yahoo Finance, CoinGecko, etc.). We are not responsible for the content, privacy practices, or availability of these third-party services.",
    ],
  },
  {
    title: "8. Modifications to Terms",
    content: [
      "We reserve the right to update these Terms of Service at any time. Changes will be reflected by an updated 'Last updated' date. Continued use of DiversiFi after any change constitutes your acceptance of the revised terms.",
    ],
  },
  {
    title: "9. Governing Law",
    content: [
      "These terms are governed by the laws of India. Any disputes arising from use of DiversiFi shall be subject to the exclusive jurisdiction of courts in India.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Terms of Service</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-muted-foreground text-sm mt-1">Last updated: {LAST_UPDATED}</p>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              Please read these terms carefully before using DiversiFi. By using the platform
              you agree to the terms described below.
            </p>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 mb-10">
          <p className="text-red-700 dark:text-red-400 text-sm font-semibold">Not Financial Advice</p>
          <p className="text-red-700/80 dark:text-red-400/80 text-xs mt-1 leading-relaxed">
            DiversiFi is an academic research project. All analysis, scores, simulations, and AI
            verdicts are for informational and demonstration purposes only. Do not make investment
            decisions based solely on this platform.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-bold text-foreground mb-4">{s.title}</h2>
              <ul className="space-y-3">
                {s.content.map((line, j) => {
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <li key={j} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-2 shrink-0" />
                      <span>
                        {parts.map((p, k) =>
                          p.startsWith("**") && p.endsWith("**")
                            ? <strong key={k} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>
                            : p
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-10 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
          <Link to="/" className="hover:text-foreground transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
