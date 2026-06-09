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
    <div className="min-h-screen bg-[#1a0f3a] text-white font-mono">
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 20%, rgba(158,162,248,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a0f3a]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            to="/chat"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </Link>
          <div className="w-px h-5 bg-white/15" />
          <div>
            <h1 className="text-lg font-black text-white leading-none">
              Profile
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">
              Account Settings
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-[#9EA2F8]/20 border-2 border-[#9EA2F8] flex items-center justify-center">
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-10 h-10 text-[#9EA2F8]" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white mb-1">
                  {user.fullName || "User"}
                </h2>
                <p className="text-sm text-white/50">
                  {user.username || user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest">
              Account Details
            </h3>
            <div className="space-y-4">
              {user.primaryEmailAddress && (
                <div className="flex items-center gap-4 py-3 border-b border-white/5">
                  <Mail className="w-5 h-5 text-[#9EA2F8]" />
                  <div className="flex-1">
                    <p className="text-xs text-white/40 uppercase tracking-widest">
                      Email
                    </p>
                    <p className="text-sm text-white mt-1">
                      {user.primaryEmailAddress.emailAddress}
                    </p>
                  </div>
                  {user.primaryEmailAddress.verification?.status ===
                    "verified" && (
                    <Shield className="w-4 h-4 text-green-400" />
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 py-3 border-b border-white/5">
                <UserIcon className="w-5 h-5 text-[#9EA2F8]" />
                <div className="flex-1">
                  <p className="text-xs text-white/40 uppercase tracking-widest">
                    User ID
                  </p>
                  <p className="text-sm text-white mt-1 font-mono">{user.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-3">
                <Calendar className="w-5 h-5 text-[#9EA2F8]" />
                <div className="flex-1">
                  <p className="text-xs text-white/40 uppercase tracking-widest">
                    Member Since
                  </p>
                  <p className="text-sm text-white mt-1">
                    {formatDate(user.createdAt!)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest">
              Security
            </h3>
            <p className="text-sm text-white/50 mb-6">
              Manage your account security and authentication settings through
              Clerk.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/sign-in#/user'}
                className="px-4 py-2 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition-colors"
              >
                Manage Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
