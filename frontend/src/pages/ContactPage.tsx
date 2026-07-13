import { Header } from "@/components/Header";
import { Link } from "react-router-dom";
import { Mail, Github, ChevronRight, MessageSquare, Users } from "lucide-react";

const TEAM = [
  {
    name: "Satyaki Dey",
    role: "Full Stack Engineer",
    focus: "React, Next.js, API Integration, System Design",
    initial: "S",
    email: "satyaki.dey.ks@gmail.com",
  },
  {
    name: "Priyanshu Dutta",
    role: "AI Engineer",
    focus: "RAG Systems, Backend APIs, Data Pipelines, ML Deployment",
    initial: "P",
    email: "priyanshuduttakey@gmail.com",
  },
  {
    name: "Rishi Bhattasali",
    role: "ML & Backend",
    focus: "ML Ops, Backend Architecture, API Design, Distributed Systems",
    initial: "R",
    email: null,
  },
  {
    name: "Shristy Dutta",
    role: "Research Analyst",
    focus: "Market Research, Financial Analysis, Data Interpretation",
    initial: "S",
    email: null,
  },
  {
    name: "Sonika Biswas",
    role: "Frontend Engineer",
    focus: "UI/UX, Responsive Design, Component Architecture",
    initial: "S",
    email: null,
  },
];

const TOPICS = [
  {
    icon: MessageSquare,
    title: "General Enquiries",
    desc: "Questions about DiversiFi's features, how it works, or partnership opportunities.",
    action: "satyaki.dey.ks@gmail.com",
    actionLabel: "Email us",
  },
  {
    icon: Github,
    title: "Bug Reports & Feedback",
    desc: "Found a bug or have a feature suggestion? We'd love to hear from you.",
    action: "https://github.com",
    actionLabel: "Open an issue",
  },
  {
    icon: Mail,
    title: "Privacy & Data Requests",
    desc: "Data deletion requests, privacy concerns, or questions about how your data is stored.",
    action: "satyaki.dey.ks@gmail.com",
    actionLabel: "Contact us",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Contact</span>
        </div>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground">Get in Touch</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xl">
            DiversiFi is an academic research project. We're a small team of students —
            we welcome feedback, bug reports, and questions.
          </p>
        </div>

        {/* Contact topics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
          {TOPICS.map(({ icon: Icon, title, desc, action, actionLabel }, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
              {action.startsWith("http") ? (
                <a
                  href={action}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {actionLabel} →
                </a>
              ) : (
                <a
                  href={`mailto:${action}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {actionLabel} →
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Team */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">The Team</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEAM.map((m, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: "#00D09C" }}
                  >
                    {m.initial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{m.name}</p>
                    <p className="text-xs font-medium" style={{ color: "#00D09C" }}>{m.role}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.focus}</p>
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-3 h-3" />
                    {m.email}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Academic Disclaimer:</strong> DiversiFi is developed
            as a final-year research project and is not a commercial product. All features,
            analyses, and AI outputs are for demonstration and research purposes only and do not
            constitute financial advice.
          </p>
        </div>

        {/* Footer nav */}
        <div className="mt-10 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link to="/" className="hover:text-foreground transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
