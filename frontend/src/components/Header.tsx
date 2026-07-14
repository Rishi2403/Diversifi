import { ThemeToggle } from "./ThemeToggle";
import { Link, useLocation } from "react-router-dom";
import { UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { TrendingUp, MessageSquare } from "lucide-react";

export function Header() {
  const location = useLocation();

  const navLinks = [
    { name: "Analyse",  path: "/portfolio-analyser", alt: "/portfolio" },
    { name: "Simulate", path: "/portfolio-simulation" },
    { name: "Research", path: "/research" },
    { name: "News",     path: "/global-trade" },
    { name: "AlphaMind", path: "/alphamind" },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-background border-b border-border flex items-center px-6 md:px-8 h-14">
      <div className="flex items-center flex-1 gap-8">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ backgroundColor: "#00D09C" }}
          >
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm tracking-tight">DiversiFi</span>
        </Link>

        <SignedIn>
          <div className="hidden md:flex items-center h-14">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.path ||
                ("alt" in link && location.pathname === link.alt) ||
                (link.path !== "/" && location.pathname.startsWith(link.path + "/"));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 h-14 flex items-center text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? "border-[#00D09C] text-[#00D09C]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </SignedIn>
      </div>

      <div className="flex items-center gap-3">
        <SignedIn>
          <Link
            to="/chat"
            title="Chat"
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              location.pathname === "/chat"
                ? "text-[#00D09C] bg-[#00D09C]/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </Link>
        </SignedIn>
        <ThemeToggle />
        <SignedOut>
          <Link
            to="/sign-in"
            className="px-5 py-1.5 rounded-md font-semibold text-sm text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#00D09C" }}
          >
            Sign In
          </Link>
        </SignedOut>
        <SignedIn>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
                userButtonPopoverCard: "bg-card border border-border",
                userButtonPopoverActionButton: "hover:bg-muted",
                userButtonPopoverActionButtonText: "text-foreground",
              },
            }}
            afterSignOutUrl="/"
          />
        </SignedIn>
      </div>
    </nav>
  );
}
