import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppLayout from './components/layout/AppLayout';
import NotificationModal from './components/ui/NotificationModal';
import ErrorBoundary from './components/ui/ErrorBoundary';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import ResumeBuilder from './pages/resume-builder/ResumeBuilder';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Profile from './pages/Profile';
import KYCVerification from './pages/KYCVerification';
import AdminDashboard from './pages/AdminDashboard';
import RecruiterPanel from './pages/recruiter/RecruiterPanel';
import PricingCheckout from './pages/subscription/PricingCheckout';
import NotFound from './pages/NotFound';

// Protected Route Guard
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAuthenticated, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route
        path="/"
        element={
          <AppLayout>
            <Home />
          </AppLayout>
        }
      />
      <Route
        path="/login"
        element={
          <AppLayout>
            <Login />
          </AppLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AppLayout>
            <Register />
          </AppLayout>
        }
      />
      <Route
        path="/jobs"
        element={
          <AppLayout>
            <Jobs />
          </AppLayout>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <AppLayout>
            <JobDetail />
          </AppLayout>
        }
      />
      <Route
        path="/pricing"
        element={
          <AppLayout>
            <PricingCheckout />
          </AppLayout>
        }
      />
      <Route
        path="/subscription"
        element={<Navigate to="/pricing" replace />}
      />

      {/* Protected Pages */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout requireSidebar={true}>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/jobs"
        element={
          <ProtectedRoute>
            <AppLayout requireSidebar={true}>
              <Dashboard defaultTab="matches" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/resumes"
        element={
          <ProtectedRoute>
            <AppLayout requireSidebar={true}>
              <ResumeUpload />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/resume-builder"
        element={
          <ProtectedRoute>
            <AppLayout requireSidebar={false}>
              <ResumeBuilder />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/builder"
        element={<Navigate to="/resume-builder" replace />}
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout requireSidebar={true}>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc"
        element={
          <ProtectedRoute>
            <AppLayout requireSidebar={true}>
              <KYCVerification />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Protected Pages */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute>
            <AppLayout requireSidebar={true}>
              <RecruiterPanel />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout requireSidebar={true}>
              <AdminDashboard defaultTab="overview" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/overview"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout requireSidebar={true}>
              <AdminDashboard defaultTab="overview" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/kyc"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout requireSidebar={true}>
              <AdminDashboard defaultTab="kyc" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout requireSidebar={true}>
              <AdminDashboard defaultTab="payments" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings/payment"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout requireSidebar={true}>
              <AdminDashboard defaultTab="payment-settings" />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/plans"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout requireSidebar={true}>
              <AdminDashboard defaultTab="plans" />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route
        path="*"
        element={
          <AppLayout>
            <NotFound />
          </AppLayout>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <ErrorBoundary title="Application failed to load">
              <AppRoutes />
              <NotificationModal />
            </ErrorBoundary>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
