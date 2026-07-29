import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/context/StoreContext";
import { AuthProvider, useAuth, UserRole } from "@/context/AuthContext";
import { WebSocketProvider } from "@/context/WebSocketProvider";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import POSPage from "@/pages/POSPage";
import InventoryPage from "@/pages/InventoryPage";
import ReportsPage from "@/pages/ReportsPage";
import VATPage from "@/pages/VATPage";
import PumpProductsPage from "@/pages/PumpProductsPage";
import PumpDetailPage from "@/pages/PumpDetailPage";
import FieldWorkPage from "@/pages/FieldWorkPage";
import FinanceCenterPage from "@/pages/FinanceCenterPage";
import PeachtreePage from "@/pages/PeachtreePage";
import UserAccountsPage from "@/pages/UserAccountsPage";
import DedicatedInboxPage from "@/pages/DedicatedInboxPage";
import TeamChatPage from "@/pages/TeamChatPage";

// HR Pages
import HRDashboard from "@/components/hr/pages/Dashboard";
import Workers from "@/components/hr/pages/Workers";
import FingerprintRegistration from "@/components/hr/pages/FingerprintRegistration";
import AttendanceScan from "@/components/hr/pages/AttendanceScan";
import HRReports from "@/components/hr/pages/Reports";
import HRSettings from "@/components/hr/pages/Settings";

import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { initFinanceStore } from "@/lib/finance-hub-store";
import { installOfflineQueueAutoFlush } from "@/lib/offline-queue";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: UserRole[];
}) {
  const { hasAccess } = useAuth();

  if (!hasAccess(roles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthenticatedApp() {
  const { isAuthenticated, authReady } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      initFinanceStore();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    return installOfflineQueueAutoFlush();
  }, [isAuthenticated]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute roles={["manager", "finance", "storekeeper", "fieldwork", "attendance"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inbox"
          element={
            <ProtectedRoute roles={["manager", "finance", "storekeeper", "fieldwork", "attendance"]}>
              <DedicatedInboxPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute roles={["manager", "finance", "storekeeper", "fieldwork", "attendance"]}>
              <TeamChatPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos"
          element={
            <ProtectedRoute roles={["manager", "storekeeper", "finance"]}>
              <POSPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute roles={["manager", "storekeeper", "finance", "fieldwork"]}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["manager", "finance"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vat"
          element={
            <ProtectedRoute roles={["manager", "finance"]}>
              <VATPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pumps"
          element={
            <ProtectedRoute roles={["manager", "fieldwork", "ttl", "sales", "technician", "storekeeper", "finance"]}>
              <PumpProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pumps/:id"
          element={
            <ProtectedRoute roles={["manager", "fieldwork", "ttl", "sales", "technician", "storekeeper", "finance"]}>
              <PumpDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fieldwork"
          element={
            <ProtectedRoute roles={["manager", "fieldwork", "ttl", "sales", "technician", "finance"]}>
              <FieldWorkPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fieldwork/:section"
          element={
            <ProtectedRoute roles={["manager", "fieldwork", "ttl", "sales", "technician", "finance"]}>
              <FieldWorkPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance"
          element={
            <ProtectedRoute roles={["manager", "finance"]}>
              <FinanceCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/:section"
          element={
            <ProtectedRoute roles={["manager", "finance"]}>
              <FinanceCenterPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/peachtree"
          element={
            <ProtectedRoute roles={["manager", "finance"]}>
              <PeachtreePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute roles={["manager"]}>
              <UserAccountsPage />
            </ProtectedRoute>
          }
        />

        {/* HR & Attendance Routes */}
        <Route path="/hr/dashboard" element={<ProtectedRoute roles={["manager"]}><HRDashboard /></ProtectedRoute>} />
        <Route path="/hr/workers" element={<ProtectedRoute roles={["manager"]}><Workers /></ProtectedRoute>} />
        <Route path="/hr/registration" element={<ProtectedRoute roles={["manager"]}><FingerprintRegistration /></ProtectedRoute>} />
        <Route path="/hr/scan" element={<ProtectedRoute roles={["manager", "attendance"]}><AttendanceScan /></ProtectedRoute>} />
        <Route path="/hr/reports" element={<ProtectedRoute roles={["manager"]}><HRReports /></ProtectedRoute>} />
        <Route path="/hr/settings" element={<ProtectedRoute roles={["manager"]}><HRSettings /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-left" />
      <AuthProvider>
        <WebSocketProvider>
          <StoreProvider>
            <HashRouter>
              <AuthenticatedApp />
            </HashRouter>
          </StoreProvider>
        </WebSocketProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
