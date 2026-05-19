import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./hooks/useAuth";
import { NotificationProvider } from "./context/NotificationContext";
import Navbar from "./components/shared/Navbar";
import Auth from "./pages/Auth";
import DashboardPage from "./pages/DashboardPage";
import SearchPage from "./pages/SearchPage";
import LeadsPage from "./pages/LeadsPage";
import OnlinePage from "./pages/OnlinePage";
import PipelinePage from "./pages/PipelinePage";
import ProfilePage from "./pages/ProfilePage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  return user ? children : <Navigate to="/auth" replace />;
}

function AppShell({ children }) {
  return (
    <NotificationProvider>
      <Navbar />
      <main>{children}</main>
      <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        PitchLocal &copy; 2026
      </footer>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        {/* Public */}
        <Route path="/auth" element={<Auth />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell><DashboardPage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <AppShell><SearchPage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/leads"
          element={
            <ProtectedRoute>
              <AppShell><LeadsPage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/online"
          element={
            <ProtectedRoute>
              <AppShell><OnlinePage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pipeline"
          element={
            <ProtectedRoute>
              <AppShell><PipelinePage /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppShell><ProfilePage /></AppShell>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
