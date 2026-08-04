import { lazy, Suspense, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { SettingsProvider } from "./components/SettingsProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import PageLoading from "./components/PageLoading";

const Transactions = lazy(() => import("./pages/Transactions"));
const AccountantReport = lazy(() => import("./pages/AccountantReport"));
const AccountantPortal = lazy(() => import("./pages/AccountantPortal"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Products = lazy(() => import("./pages/Products"));
const Settings = lazy(() => import("./pages/Settings"));
const Insights = lazy(() => import("./pages/Insights"));
const Tickets = lazy(() => import("./pages/Tickets"));
const TicketDetail = lazy(() => import("./pages/TicketDetail"));
const Productivity = lazy(() => import("./pages/Productivity"));
const ProjectROI = lazy(() => import("./pages/ProjectROI"));
const TimeGlance = lazy(() => import("./pages/TimeGlance"));
const WeeklyLog = lazy(() => import("./pages/WeeklyLog"));
const SubscriptionAudit = lazy(() => import("./pages/SubscriptionAudit"));
const ExpenseStory = lazy(() => import("./pages/ExpenseStory"));
const MasterTracker = lazy(() => import("./pages/MasterTracker"));
const TaxAveraging = lazy(() => import("./pages/TaxAveraging"));
const ExportCenter = lazy(() => import("./pages/ExportCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Configure QueryClient to disable automatic refetching on window focus
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents data from refreshing when you switch back to the tab
      staleTime: 5 * 60 * 1000,    // Keeps data "fresh" for 5 minutes to reduce unnecessary loading
    },
  },
});

const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/login$/, "Login"],
  [/^\/portal\//, "Accountant Portal"],
  [/^\/$/, "Command Center"],
  [/^\/master-tracker$/, "Master Tracker"],
  [/^\/tax-averaging$/, "Tax Averaging"],
  [/^\/weekly-routine$/, "Weekly Routine"],
  [/^\/transactions$/, "Transactions"],
  [/^\/insights$/, "AI Insights"],
  [/^\/subscriptions$/, "Subscriptions"],
  [/^\/expense-story$/, "Expense Story"],
  [/^\/productivity$/, "Productivity"],
  [/^\/project-roi$/, "Project ROI"],
  [/^\/time-glance$/, "Time Glance"],
  [/^\/export$/, "Export Center"],
  [/^\/accountant-report$/, "Accountant Report"],
  [/^\/accountant-portal$/, "Accountant Portal"],
  [/^\/clients\/.+/, "Client Details"],
  [/^\/clients$/, "Clients"],
  [/^\/invoices\/.+/, "Invoice Details"],
  [/^\/invoices$/, "Invoices"],
  [/^\/products$/, "Catalog"],
  [/^\/tickets\/.+/, "Ticket Details"],
  [/^\/tickets$/, "Tickets"],
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
                <Route path="/master-tracker" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><MasterTracker /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/tax-averaging" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><TaxAveraging /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/weekly-routine" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><WeeklyLog /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Transactions /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/insights" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Insights /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/subscriptions" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><SubscriptionAudit /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/expense-story" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><ExpenseStory /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/productivity" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Productivity /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/project-roi" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><ProjectROI /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/time-glance" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><TimeGlance /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/export" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><ExportCenter /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/accountant-report" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><AccountantReport /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/accountant-portal" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><AccountantPortal /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Clients /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/clients/:id" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><ClientDetail /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Invoices /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/invoices/:id" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><InvoiceDetail /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Products /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/tickets" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Tickets /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/tickets/:id" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><TicketDetail /></FadeIn></Suspense></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><FadeIn><Settings /></FadeIn></Suspense></ProtectedRoute>} />
                
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