import { Link, useLocation } from "react-router-dom";
import { Activity, Lightbulb, Search } from "lucide-react";

const TABS = [
  { label: "Market Pulse", path: "/research",         icon: Activity  },
  { label: "Suggest",      path: "/research/suggest", icon: Lightbulb },
  { label: "Analyse",      path: "/research/analyse", icon: Search    },
];

export function ResearchNav() {
  const { pathname } = useLocation();
  return (
    <div className="border-b border-border bg-background">
      <div className="px-6 md:px-8 flex items-center gap-0">
        {TABS.map(({ label, path, icon: Icon }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-[#00D09C] text-[#00D09C]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
