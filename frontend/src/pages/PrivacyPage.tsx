import { Header } from "@/components/Header";
import { Link } from "react-router-dom";
import { Shield, ChevronRight } from "lucide-react";

const LAST_UPDATED = "July 2026";

const sections = [
  {
    title: "1. Information We Collect",
    content: [
      "**Portfolio data** - When you use DiversiFi, you may upload a CSV containing stock and mutual fund holdings. This data is stored locally on our servers per your account and is used solely to power the analysis and monitoring features.",
      "**Account information** - We use Clerk for authentication. Your name, email address and profile details are managed by Clerk. We receive only your primary email address to link your portfolio data.",
      "**Usage data** - We may collect anonymised, aggregated usage metrics (page views, feature interactions) to improve the product. No personally identifiable information is included.",
    ],
  },
  {
    title: "2. How We Use Your Data",
    content: [
      "**Portfolio analysis** - Your holdings data is used to compute health scores, generate AI-powered insights, run Monte Carlo simulations and power the AlphaMind real-time monitoring agent.",
      "**Email communications** - If you enable AlphaMind, your email address (from Clerk) is used to send automated daily market intelligence reports. You can disable this at any time from the AlphaMind dashboard.",
      "**Improvement** - Aggregated, anonymised patterns may be used to improve model accuracy and feature design. Individual data is never shared.",
    ],
  },
  {
    title: "3. Third-Party Services",
    content: [
      "**Clerk** - Authentication and user management. Clerk's own privacy policy governs data handled by them.",
      "**Anthropic (Claude)** - AI analysis and verdict generation. Portfolio context is sent to the Claude API per analysis cycle. Anthropic's usage policies apply.",
      "**yfinance / Yahoo Finance** - Live price and news data fetched from Yahoo Finance APIs. No personal data is transmitted.",
      "**CoinGecko** - Cryptocurrency market data. No personal data is transmitted.",
      "**Frankfurter** - Foreign exchange rates. No personal data is transmitted.",
    ],
  },
  {
    title: "4. Data Storage & Security",
    content: [
      "Portfolio data is stored in JSON files on our backend server, associated with your email address. We do not use a database for user portfolio data at this stage.",
      "We take reasonable precautions to protect your data from unauthorised access. However, as DiversiFi is an academic research project, we do not guarantee enterprise-grade security SLAs.",
      "You can request deletion of your data at any time by contacting us at the address in the Contact section.",
    ],
  },
  {
    title: "5. Data Sharing",
    content: [
      "We do not sell, trade, or rent your personal information to third parties.",
      "We do not share individual portfolio data with any external party except where required to provide the service (e.g., sending anonymised context to Claude for analysis).",
    ],
  },
  {
    title: "6. Cookies",
    content: [
      "We use essential cookies set by Clerk for authentication session management. No advertising or tracking cookies are used.",
    ],
  },
  {
    title: "7. Children's Privacy",
    content: [
      "DiversiFi is not directed at children under the age of 18. We do not knowingly collect personal information from minors.",
    ],
  },
  {
    title: "8. Changes to This Policy",
    content: [
      "We may update this Privacy Policy from time to time. Material changes will be noted with an updated 'Last updated' date at the top of this page. Continued use of DiversiFi after changes constitutes acceptance.",
    ],
  },
  {
    title: "9. Contact",
    content: [
      "For privacy-related queries, data deletion requests, or any concerns, please reach out via the Contact page or email the team directly.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Privacy Policy</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-muted-foreground text-sm mt-1">Last updated: {LAST_UPDATED}</p>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              DiversiFi is an academic research project built by students. We respect your privacy
              and are committed to being transparent about how we handle your data.
            </p>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 mb-10">
          <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">Academic Research Project</p>
          <p className="text-amber-700/80 dark:text-amber-400/80 text-xs mt-1 leading-relaxed">
            DiversiFi is developed for academic and research purposes. It is not a commercial product.
            Use of this platform does not constitute financial advice.
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
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
          <Link to="/" className="hover:text-foreground transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
