import { SignUp } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,208,156,0.06) 0%, transparent 60%)",
        }}
      />

      <Link
        to="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Get Started
            </h1>
            <p className="text-muted-foreground text-sm">
              Create your account to unlock AI-powered financial insights
            </p>
          </div>

          <div className="flex justify-center">
            <SignUp
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-card border border-border shadow-xl",
                  headerTitle: "text-foreground",
                  headerSubtitle: "text-muted-foreground",
                  socialButtonsBlockButton:
                    "bg-muted border border-border text-foreground hover:bg-muted/80",
                  formButtonPrimary:
                    "bg-[#00D09C] hover:bg-[#00D09C]/90 text-white font-semibold",
                  identityPreviewText: "text-foreground",
                  identityPreviewEditButton: "text-[#00D09C]",
                  formFieldLabel: "text-muted-foreground",
                  formFieldInput:
                    "bg-muted border-border text-foreground placeholder:text-muted-foreground",
                  dividerLine: "bg-border",
                  dividerText: "text-muted-foreground",
                  formHeaderTitle: "text-foreground",
                  formHeaderSubtitle: "text-muted-foreground",
                  otpCodeFieldInput: "bg-muted border-border text-foreground",
                  footer: "bg-transparent",
                  footerAction: "bg-transparent",
                  footerActionText: "text-muted-foreground",
                  footerActionLink: "text-[#00D09C] hover:text-[#00D09C]/80",
                  footerPages: "bg-card",
                  footerPagesLink: "text-[#00D09C]",
                },
              }}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              afterSignUpUrl="/chat"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
