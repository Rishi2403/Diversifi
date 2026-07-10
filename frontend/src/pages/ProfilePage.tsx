import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Calendar, Shield, User as UserIcon } from "lucide-react";

export default function ProfilePage() {
  const { user } = useUser();

  if (!user) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(0,208,156,0.04) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            to="/chat"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </Link>
          <div className="w-px h-5 bg-border" />
          <div>
            <h1 className="text-base font-bold text-foreground leading-none">
              Profile
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              Account Settings
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-5">
          {/* Profile Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-5">
              <div
                className="w-16 h-16 rounded-full border-2 flex items-center justify-center overflow-hidden"
                style={{ borderColor: "#00D09C" }}
              >
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-8 h-8" style={{ color: "#00D09C" }} />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {user.fullName || "User"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {user.username || user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground mb-5 uppercase tracking-widest">
              Account Details
            </h3>
            <div className="space-y-4">
              {user.primaryEmailAddress && (
                <div className="flex items-center gap-4 py-3 border-b border-border">
                  <Mail className="w-4 h-4 shrink-0" style={{ color: "#00D09C" }} />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                      Email
                    </p>
                    <p className="text-sm text-foreground mt-1">
                      {user.primaryEmailAddress.emailAddress}
                    </p>
                  </div>
                  {user.primaryEmailAddress.verification?.status === "verified" && (
                    <Shield className="w-4 h-4 text-green-500" />
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 py-3 border-b border-border">
                <UserIcon className="w-4 h-4 shrink-0" style={{ color: "#00D09C" }} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    User ID
                  </p>
                  <p className="text-sm text-foreground mt-1 font-mono">{user.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-3">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: "#00D09C" }} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Member Since
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    {formatDate(user.createdAt!)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-widest">
              Security
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Manage your account security and authentication settings through Clerk.
            </p>
            <button
              onClick={() => (window.location.href = "/sign-in#/user")}
              className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors"
            >
              Manage Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
