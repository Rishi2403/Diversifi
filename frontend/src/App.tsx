import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import ChatPage from "@/pages/ChatPage";
import GlobalTradePage from "@/pages/GlobalTradePage";
import NotFound from "@/pages/NotFound";
import PortfolioPage from "@/pages/PortfolioPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import ProfilePage from "@/pages/ProfilePage";
import AdvancedSimulationPage from "@/pages/AdvancedSimulationPage";
import GlobalMarketsPage from "./pages/GlobalMarketsPage";
import ResearchPage from "@/pages/ResearchPage";
import SuggestPage from "@/pages/SuggestPage";
import AnalysePage from "@/pages/AnalysePage";
import AlgoTradingPage from "@/pages/AlgoTradingPage";
import AgentPage from "@/pages/AgentPage";
import AgentSetupPage from "@/pages/AgentSetupPage";
import PulsePage from "@/pages/PulsePage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import ContactPage from "@/pages/ContactPage";
import ReportsPage from "@/pages/ReportsPage";
import FeaturesPage from "@/pages/FeaturesPage";

const queryClient = new QueryClient();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const App = () => (
  <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <ChatPage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/global-trade"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <GlobalTradePage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/global-trade"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <GlobalTradePage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/global-market"
              element={
                  <>
                    <Header />
                    <GlobalMarketsPage />
                  </>
              }
            />
            <Route
              path="/portfolio-analyser"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <PortfolioPage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <ProfilePage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/portfolio-simulation"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <AdvancedSimulationPage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <ResearchPage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research/suggest"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <SuggestPage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/research/analyse"
              element={
                <ProtectedRoute>
                  <>
                    <Header />
                    <AnalysePage />
                  </>
                </ProtectedRoute>
              }
            />
            <Route path="/algo-trading" element={<AlgoTradingPage />} />
            <Route path="/alphamind" element={<PulsePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route
              path="/agent"
              element={
                <ProtectedRoute>
                  <AgentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/setup"
              element={
                <ProtectedRoute>
                  <AgentSetupPage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
