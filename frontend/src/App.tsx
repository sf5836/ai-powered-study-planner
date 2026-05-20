import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import PageWrapper from "./components/layout/PageWrapper";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import PageLoadingSpinner from "./components/ui/PageLoadingSpinner";
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { useAuthStore } from "./store/authStore";
import { useUserStore } from "./stores/userStore";

const DashboardPage = lazy(() => import("./pages/Dashboard"));
const SessionPage = lazy(() => import("./pages/Session"));
const PlannerPage = lazy(() => import("./pages/Planner"));
const ReportsPage = lazy(() => import("./pages/Reports"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const LoginPage = lazy(() => import("./pages/auth/Login"));
const SignupPage = lazy(() => import("./pages/auth/Signup"));

function ProtectedLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-lightBg dark:bg-[#0D1B40]">
      <TopBar onMobileMenuToggle={() => setMobileOpen((prev) => !prev)} />
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <PageWrapper>
        <Outlet />
      </PageWrapper>
    </div>
  );
}

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <ProtectedLayout /> : <Navigate to="/auth/login" replace />;
}

function App() {
  const authUser = useAuthStore((state) => state.user);
  useRealtimeSync();

  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const userStore = useUserStore.getState();
    userStore.setName(authUser.fullName || "User");
    userStore.setEmail(authUser.email || "");
  }, [authUser]);

  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
