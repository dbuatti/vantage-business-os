import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { SettingsProvider } from "./components/SettingsProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import { Loader2 } from "lucide-react";

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

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return <LoadingFallback />;
  if (!session) return <Navigate to="/login" />;
  
  return <DashboardLayout>{children}</DashboardLayout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Suspense fallback={<LoadingFallback />}><Login /></Suspense>} />
              
              {/* Public Portal Route */}
              <Route path="/portal/:token" element={<Suspense fallback={<LoadingFallback />}><AccountantPortal /></Suspense>} />
              
              <Route path="/" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Index /></Suspense></ProtectedRoute>} />
              <Route path="/master-tracker" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><MasterTracker /></Suspense></ProtectedRoute>} />
              <Route path="/tax-averaging" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><TaxAveraging /></Suspense></ProtectedRoute>} />
              <Route path="/weekly-routine" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><WeeklyLog /></Suspense></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Transactions /></Suspense></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Insights /></Suspense></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><SubscriptionAudit /></Suspense></ProtectedRoute>} />
              <Route path="/expense-story" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><ExpenseStory /></Suspense></ProtectedRoute>} />
              <Route path="/productivity" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Productivity /></Suspense></ProtectedRoute>} />
              <Route path="/project-roi" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><ProjectROI /></Suspense></ProtectedRoute>} />
              <Route path="/time-glance" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><TimeGlance /></Suspense></ProtectedRoute>} />
              <Route path="/export" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><ExportCenter /></Suspense></ProtectedRoute>} />
              <Route path="/accountant-report" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><AccountantReport /></Suspense></ProtectedRoute>} />
              <Route path="/accountant-portal" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><AccountantPortal /></Suspense></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Clients /></Suspense></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><ClientDetail /></Suspense></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Invoices /></Suspense></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><InvoiceDetail /></Suspense></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Products /></Suspense></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Tickets /></Suspense></ProtectedRoute>} />
              <Route path="/tickets/:id" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><TicketDetail /></Suspense></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<LoadingFallback />}><Settings /></Suspense></ProtectedRoute>} />
              
              <Route path="*" element={<Suspense fallback={<LoadingFallback />}><NotFound /></Suspense>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;