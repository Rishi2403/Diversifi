import { ThemeToggle } from "./ThemeToggle";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 dark:bg-background/80 backdrop-blur-sm">
      <nav className="container mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 font-bold text-lg">
          <div className="text-xl" style={{ color: "#9EA2F8" }}>
            ◯
          </div>
          <span>DiversiFi</span>
        </Link>

        <ThemeToggle />
      </nav>
    </header>
  );
}
