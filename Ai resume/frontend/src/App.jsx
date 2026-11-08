import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppLayout from './components/layout/AppLayout';
import DashboardLayout from './components/layout/DashboardLayout';
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
import ShortlistedCandidates from './pages/recruiter/ShortlistedCandidates';
import CandidateInquiries from './pages/recruiter/CandidateInquiries';
import CandidateMessages from './pages/candidate/CandidateMessages';
import PricingCheckout from './pages/subscription/PricingCheckout';
import VerifyTalent from './pages/public/VerifyTalent';
import CompanyProfile from './pages/public/CompanyProfile';
import CompanyProfileSettings from './pages/recruiter/CompanyProfileSettings';
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
          <AppLayout requireSidebar={true}>
            <Jobs />
          </AppLayout>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <AppLayout requireSidebar={true}>
            <JobDetail />
          </AppLayout>
        }
      />
      <Route
        path="/find-jobs"
        element={<Navigate to="/candidate/jobs" replace />}
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
      {/* Public Cryptographic Credential Verification */}
      <Route path="/verify-talent/:badgeId" element={<VerifyTalent />} />
      {/* Public Employer Branding & Company Profile */}
      <Route
        path="/company/:companyId"
        element={
          <AppLayout requireSidebar={false}>
            <CompanyProfile />
          </AppLayout>
        }
      />

      {/* Protected Pages */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/jobs"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard defaultTab="matches" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/jobs"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Jobs />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/jobs/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <JobDetail />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gap-analyzer"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard defaultTab="gap-analyzer" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analyzer"
        element={<Navigate to="/gap-analyzer" replace />}
      />
      <Route
        path="/resumes"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ResumeUpload />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/resume-builder"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ResumeBuilder />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/live-resume-builder"
        element={<Navigate to="/resume-builder" replace />}
      />
      <Route
        path="/builder"
        element={<Navigate to="/resume-builder" replace />}
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/messages"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CandidateMessages />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={<Navigate to="/candidate/messages" replace />}
      />
      <Route
        path="/candidate/applications"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard defaultTab="tracker" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/tracker"
        element={<Navigate to="/candidate/applications" replace />}
      />
      <Route
        path="/applications"
        element={<Navigate to="/candidate/applications" replace />}
      />
      <Route
        path="/kyc"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <KYCVerification />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Protected Pages */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <RecruiterPanel />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/shortlisted"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ShortlistedCandidates />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/inquiries"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CandidateInquiries />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/company-profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CompanyProfileSettings />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/company"
        element={<Navigate to="/recruiter/company-profile" replace />}
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
              <AdminDashboard defaultTab="overview" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/overview"
        element={
          <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
              <AdminDashboard defaultTab="overview" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/kyc"
        element={
          <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
              <AdminDashboard defaultTab="kyc" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
              <AdminDashboard defaultTab="payments" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings/payment"
        element={
          <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
              <AdminDashboard defaultTab="payment-settings" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/plans"
        element={
          <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
              <AdminDashboard defaultTab="plans" />
            </DashboardLayout>
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
