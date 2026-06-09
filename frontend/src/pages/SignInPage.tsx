import { SignIn } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#1a0f3a] text-white font-mono relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(158,162,248,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Back to home button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-white/50 text-sm">
              Sign in to access your financial dashboard
            </p>
          </div>

          {/* Clerk Sign In Component */}
          <div className="flex justify-center">
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-white/5 border border-white/10 shadow-2xl",
                  headerTitle: "text-white",
                  headerSubtitle: "text-white/50",
                  socialButtonsBlockButton:
                    "bg-white/10 border border-white/20 text-white hover:bg-white/15",
                  formButtonPrimary:
                    "bg-[#9EA2F8] hover:bg-[#9EA2F8]/90 text-[#1a0f3a] font-bold",
                  footerActionLink: "text-[#9EA2F8] hover:text-[#9EA2F8]/80",
                  identityPreviewText: "text-white",
                  identityPreviewEditButton: "text-[#9EA2F8]",
                  formFieldLabel: "text-white/70",
                  formFieldInput:
                    "bg-white/5 border-white/20 text-white placeholder:text-white/30",
                  footerActionText: "text-white/50",
                  dividerLine: "bg-white/20",
                  dividerText: "text-white/40",
                  formHeaderTitle: "text-white",
                  formHeaderSubtitle: "text-white/50",
                  otpCodeFieldInput:
                    "bg-white/5 border-white/20 text-white",
                  footer: "bg-transparent",
                  footerAction: "bg-transparent",
                  footerActionText: "text-[#9EA2F8]",
                  footerActionLink: "text-[#9EA2F8] hover:text-[#9EA2F8]/80",
                  footerPages: "bg-[#1a0f3a]",
                  footerPagesLink: "text-[#9EA2F8]",
                },
              }}
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              afterSignInUrl="/chat"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
