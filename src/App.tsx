import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { SettingsProvider } from "./components/SettingsProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Transactions from "./pages/Transactions";
import AccountantReport from "./pages/AccountantReport";
import AccountantPortal from "./pages/AccountantPortal";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Products from "./pages/Products";
import Settings from "./pages/Settings";
import Insights from "./pages/Insights";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import Productivity from "./pages/Productivity";
import TimeGlance from "./pages/TimeGlance";
import WeeklyLog from "./pages/WeeklyLog";
import SubscriptionAudit from "./pages/SubscriptionAudit";
import ExpenseStory from "./pages/ExpenseStory";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";

// Configure QueryClient to disable automatic refetching on window focus
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents data from refreshing when you switch back to the tab
      staleTime: 5 * 60 * 1000,    // Keeps data "fresh" for 5 minutes to reduce unnecessary loading
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return null;
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
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Public Portal Route */}
              <Route path="/portal/:token" element={<AccountantPortal />} />
              
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/weekly-routine" element={<ProtectedRoute><WeeklyLog /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionAudit /></ProtectedRoute>} />
              <Route path="/expense-story" element={<ProtectedRoute><ExpenseStory /></ProtectedRoute>} />
              <Route path="/productivity" element={<ProtectedRoute><Productivity /></ProtectedRoute>} />
              <Route path="/time-glance" element={<ProtectedRoute><TimeGlance /></ProtectedRoute>} />
              <Route path="/accountant-report" element={<ProtectedRoute><AccountantReport /></ProtectedRoute>} />
              <Route path="/accountant-portal" element={<ProtectedRoute><AccountantPortal /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
              <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;