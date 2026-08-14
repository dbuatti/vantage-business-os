import { lazy, Suspense, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { SettingsProvider } from "./components/SettingsProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import PageLoading from "./components/PageLoading";

const Settings = lazy(() => import("./pages/Settings"));
const Insights = lazy(() => import("./pages/Insights"));
const MasterTracker = lazy(() => import("./pages/MasterTracker"));
const Ledger = lazy(() => import("./pages/Ledger"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Performance = lazy(() => import("./pages/Performance"));
const TaxCenter = lazy(() => import("./pages/TaxCenter"));
const AccountantPortal = lazy(() => import("./pages/AccountantPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Configure QueryClient to disable automatic refetching on window focus
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents data from refreshing when you switch back to the tab
      staleTime: 5 * 60 * 1000,    // Keeps data "fresh" for 5 minutes to reduce unnecessary fetching
    },
  },
});

const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/login$/, "Login"],
  [/^\/portal\//, "Accountant Portal"],
  [/^\/$/, "Command Center"],
  [/^\/master-tracker$/, "Master Tracker"],
  [/^\/finance$/, "Ledger"],
  [/^\/contacts$/, "Contacts"],
  [/^\/insights$/, "AI Insights"],
  [/^\/performance$/, "Performance"],
  [/^\/tax$/, "Tax Center"],
  [/^\/settings$/, "Settings"],
];

const PageTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const match = ROUTE_TITLES.find(([re]) => re.test(pathname));
    document.title = match
      ? `${match[1]} | Vantage`
      : "Vantage | The Intelligent Business OS";
  }, [pathname]);
  return null;
};

const LoadingFallback = () => <PageLoading label="Loading Vantage" />;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return <LoadingFallback />;
  if (!session) return <Navigate to="/login" />;
  
  return <DashboardLayout>{children}</DashboardLayout>;
};

const FadeIn = ({ children }: { children: React.ReactNode }) => (
  <div className="animate-fade-in">{children}</div>
);

// Redirects that rewrite retired routes to their consolidated hubs.
const SmartRedirect = ({ to, map }: { to: string; map?: (params: URLSearchParams) => string }) => {
  const location = useLocation();
  const target = map ? map(new URLSearchParams(location.search)) : to;
  return <Navigate to={target} replace />;
};

const RedirectToClient = () => {
  const { id } = useParams();
  return <Navigate to={`/contacts?client=${id}`} replace />;
};

const RedirectToInvoice = () => {
  const { id } = useParams();
  return <Navigate to={`/contacts?view=invoices&invoice=${id}`} replace />;
};

const RedirectToTicket = () => {
  const { id } = useParams();
  return <Navigate to={`/contacts?view=tickets&ticket=${id}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ErrorBoundary>
              <PageTitle />
              <Routes>
                <Route path="/login" element={<Suspense fallback={<LoadingFallback />}><FadeIn><Login /></FadeIn></Suspense>} />
                
                <Route path="/portal/:token" element={<Suspense fallback={<LoadingFallback />}><FadeIn><AccountantPortal /></FadeIn></Suspense>} />
                
                <Route path="/" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Index /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/finance" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Ledger /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Contacts /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/insights" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Insights /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/master-tracker" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><MasterTracker /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/performance" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Performance /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/tax" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><TaxCenter /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Settings /></FadeIn></Suspense></ProtectedRoute>} />

                {/* Retired route redirects */}
                <Route path="/transactions" element={<SmartRedirect to="/finance" map={(p) => p.get("tab") === "planning" ? "/finance?view=budgets" : "/finance"} />} />
                <Route path="/subscriptions" element={<SmartRedirect to="/finance?view=subscriptions" />} />
                <Route path="/weekly-routine" element={<SmartRedirect to="/finance?view=weekly" />} />
                <Route path="/clients" element={<SmartRedirect to="/contacts" />} />
                <Route path="/clients/:id" element={<RedirectToClient />} />
                <Route path="/invoices" element={<SmartRedirect to="/contacts?view=invoices" />} />
                <Route path="/invoices/:id" element={<RedirectToInvoice />} />
                <Route path="/products" element={<SmartRedirect to="/contacts?view=catalog" />} />
                <Route path="/tickets" element={<SmartRedirect to="/contacts?view=tickets" />} />
                <Route path="/tickets/:id" element={<RedirectToTicket />} />
                <Route path="/expense-story" element={<SmartRedirect to="/insights?tab=narrative" />} />
                <Route path="/time-glance" element={<SmartRedirect to="/insights?tab=time" />} />
                <Route path="/productivity" element={<SmartRedirect to="/performance" />} />
                <Route path="/project-roi" element={<SmartRedirect to="/performance?view=roi" />} />
                <Route path="/tax-averaging" element={<SmartRedirect to="/tax" />} />
                <Route path="/accountant-report" element={<SmartRedirect to="/tax?view=report" />} />
                <Route path="/accountant-portal" element={<SmartRedirect to="/tax?view=portal" />} />
                <Route path="/export" element={<SmartRedirect to="/tax?view=export" />} />
                
                <Route path="*" element={<Suspense fallback={<LoadingFallback />}><FadeIn><NotFound /></FadeIn></Suspense>} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;