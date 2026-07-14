import { CheckCircle, Target, Clock, TrendingUp, ShieldAlert, Loader2 } from "lucide-react";

interface Profile {
  name?: string;
  investmentStyle?: string;
  monthlyInvestment?: number | null;
  goals?: string[];
  horizon?: string;
  riskAppetite?: string;
  focusSectors?: string[];
  avoidSectors?: string[];
}

interface Props {
  profile: Profile;
  stockCount: number;
  mfCount: number;
  onConfirm: () => void;
  loading: boolean;
}

function Chip({ label, color = "default" }: { label: string; color?: "green" | "red" | "default" }) {
  const cls =
    color === "green" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" :
    color === "red"   ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" :
                        "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

export default function ProfileConfirmation({ profile, stockCount, mfCount, onConfirm, loading }: Props) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Profile Extracted</h2>
        <p className="text-muted-foreground text-sm mt-1">Here's what your agent understands about you</p>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<TrendingUp className="w-4 h-4 text-blue-500" />} label="Investment Style">
          <p className="text-foreground font-semibold">{profile.investmentStyle || "-"}</p>
          {profile.monthlyInvestment && (
            <p className="text-muted-foreground text-xs mt-0.5">
              ₹{profile.monthlyInvestment.toLocaleString("en-IN")}/month
            </p>
          )}
        </StatCard>

        <StatCard icon={<ShieldAlert className="w-4 h-4 text-amber-500" />} label="Risk Appetite">
          <p className="text-foreground font-semibold">{profile.riskAppetite || "Moderate"}</p>
        </StatCard>

        <StatCard icon={<Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} label="Goals">
          <div className="flex flex-wrap gap-1 mt-1">
            {(profile.goals || []).map(g => <Chip key={g} label={g} />)}
            {(!profile.goals || profile.goals.length === 0) && (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </div>
        </StatCard>

        <StatCard icon={<Clock className="w-4 h-4 text-purple-500" />} label="Horizon">
          <p className="text-foreground font-semibold">{profile.horizon || "-"}</p>
        </StatCard>
      </div>

      {/* Sector preferences */}
      {((profile.focusSectors?.length ?? 0) > 0 || (profile.avoidSectors?.length ?? 0) > 0) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
            Sector Preferences
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.focusSectors?.map(s => <Chip key={s} label={`Focus: ${s}`} color="green" />)}
            {profile.avoidSectors?.map(s  => <Chip key={s} label={`Avoid: ${s}`}  color="red" />)}
          </div>
        </div>
      )}

      {/* Portfolio loaded banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-primary text-sm font-medium">
          📂 Portfolio loaded: {stockCount} stocks + {mfCount} mutual funds
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Your agent will start monitoring immediately after confirmation.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Setting up agent…</>
        ) : (
          "Looks good - Start Monitoring"
        )}
      </button>
    </div>
  );
}
