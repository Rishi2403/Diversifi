import { ThemeToggle } from "./ThemeToggle";
import { Link, useLocation } from "react-router-dom";
import { UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";

export function Header() {
  const location = useLocation();

  const navLinks = [
    { name: "Analyse", path: "/portfolio-analyser" },
    { name: "Simulate", path: "/portfolio-simulation" },
    { name: "News", path: "/global-trade" },
  ];

  return (
    <nav className="sticky z-40 px-6 md:px-12 py-6 flex items-center justify-between backdrop-blur-sm">
      <div className="flex items-center gap-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="text-2xl font-bold" style={{ color: "#9EA2F8" }}>
            ◯
          </div>
          <span className="font-bold">DiversiFi</span>
        </Link>

        {/* Menu Items - Hidden on mobile */}
        <SignedIn>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors duration-200 ${
                  location.pathname === link.path
                    ? "text-[#9EA2F8]"
                    : "text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </SignedIn>
      </div>

      {/* Right side - Theme toggle and buttons */}
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <SignedOut>
          <Link
            to="/sign-in"
            className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-white"
            style={{
              backgroundColor: "#141318",
            }}
          >
            Sign In
          </Link>
        </SignedOut>
        <SignedIn>
          <Link
            to="/chat"
            className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-white"
            style={{
              backgroundColor: "#141318",
            }}
          >
            Chat
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
                userButtonPopoverCard: "bg-white dark:bg-[#1a0f3a]",
                userButtonPopoverActionButton: "hover:bg-gray-100 dark:hover:bg-white/10",
                userButtonPopoverActionButtonText: "text-gray-900 dark:text-white",
              },
            }}
            afterSignOutUrl="/"
          />
        </SignedIn>
      </div>
    </nav>
  );
}
