import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#1a0f3a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#9EA2F8] animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
