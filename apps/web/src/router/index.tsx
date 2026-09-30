import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard, GuestGuard } from "./guards";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

// Lazy-load pages for code splitting
const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("@/features/auth/RegisterPage").then((m) => ({ default: m.RegisterPage }))
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const StockSearchPage = lazy(() =>
  import("@/features/stocks/StockSearchPage").then((m) => ({ default: m.StockSearchPage }))
);
const StockDetailPage = lazy(() =>
  import("@/features/stocks/StockDetailPage").then((m) => ({ default: m.StockDetailPage }))
);
const WatchlistPage = lazy(() =>
  import("@/features/watchlist/WatchlistPage").then((m) => ({ default: m.WatchlistPage }))
);
const PortfolioPage = lazy(() =>
  import("@/features/portfolio/PortfolioPage").then((m) => ({ default: m.PortfolioPage }))
);
const AdminPage = lazy(() =>
  import("@/features/admin/AdminPage").then((m) => ({ default: m.AdminPage }))
);
const MarketAnalysisPage = lazy(() =>
  import("@/features/analysis/MarketAnalysisPage").then((m) => ({ default: m.MarketAnalysisPage }))
);

const PageLoader: React.FC = () => (
  <div className="p-8 space-y-4">
    <Skeleton height="32px" width="200px" />
    <Skeleton height="200px" />
    <div className="grid grid-cols-3 gap-4">
      <Skeleton height="120px" />
      <Skeleton height="120px" />
      <Skeleton height="120px" />
    </div>
  </div>
);

const ComingSoonPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center animate-fade-in">
    <div className="w-16 h-16 rounded-[16px] bg-[rgba(99,102,241,0.12)] flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={1.5} className="w-8 h-8">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 className="text-xl font-bold">{title}</h2>
    <p className="text-sm text-[#94a3b8] max-w-sm">
      This feature is coming in an upcoming phase. The foundation is being built — hang tight!
    </p>
  </div>
);

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Guest routes (redirect if already authenticated) */}
        <Route element={<GuestGuard />}>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Authenticated app shell */}
        <Route element={<AuthGuard minimumRole="INVESTOR" />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/stocks" element={<StockSearchPage />} />
            <Route path="/stocks/:symbol" element={<StockDetailPage />} />
            <Route path="/analysis" element={<MarketAnalysisPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />

            {/* Admin-only */}
            <Route element={<AuthGuard minimumRole="ADMIN" />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
