// src/App.js - Complete updated file with all routes
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, createTheme } from '@mui/material';
import { Container, CircularProgress } from '@mui/material';
import './config/axios';

import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import VisitorManagement from './pages/VisitorManagement';
import ServiceRequests from './pages/ServiceRequests';
import SecurityVisitorApproval from './pages/SecurityVisitorApproval';
import AdminVisitorManagement from './pages/AdminVisitorManagement';
import AdminVisitorReports from './pages/AdminVisitorReports';
import SecurityVisitorLogs from './pages/SecurityVisitorLogs';
import SecurityServiceRequests from './pages/SecurityServiceRequests';
import SecurityPatrolSchedule from './pages/SecurityPatrolSchedule';
import SecurityIncidents from './pages/SecurityIncidents';
import AdminServiceRequests from './pages/AdminServiceRequests';
import ProfileSettings from './pages/ProfileSettings';
import PublicLotMap from './pages/PublicLotMap';
import AdminApprovals from './pages/AdminApprovals';
import PendingApproval from './pages/PendingApproval';
import AdminUserManagement from './pages/AdminUserManagement';
import Payments from './pages/Payments';
import AdminPayments from './pages/AdminPayments';
import AdminVerificationQueue from './pages/AdminVerificationQueue';
import Notifications from './pages/Notifications';
import AdminReportSchedules from './pages/AdminReportSchedules';
import AdminReports from './pages/AdminReports';
import Announcements from './pages/Announcements';
import AdminAnnouncements from './pages/AdminAnnouncements';
import Chatbot from './pages/Chatbot';

// NEW ARCHIVE PAGES
import ArchivedUsers from './pages/ArchivedUsers';
import ArchivedAnnouncements from './pages/ArchivedAnnouncements';
import ArchivedServiceRequests from './pages/ArchivedServiceRequests';

// NEW PAYMENT PAGES
import PaymentRedirect from './pages/PaymentRedirect';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';

import { AuthProvider, useAuth } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: { main: '#3b82f6' },
    secondary: { main: '#6b7280' },
  },
});

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, currentUser, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentUser?.role === 'resident' && !currentUser?.isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }
  if (requiredRole && currentUser?.role !== requiredRole) return <Navigate to="/dashboard" replace />;

  return children;
};

const AdminRoute = ({ children }) => <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
const SecurityRoute = ({ children }) => <ProtectedRoute requiredRole="security">{children}</ProtectedRoute>;
const ResidentRoute = ({ children }) => <ProtectedRoute requiredRole="resident">{children}</ProtectedRoute>;

function App() {
  useEffect(() => {
    const removeAllAriaHidden = () => {
      document.querySelectorAll('[aria-hidden="true"]').forEach(el => el.removeAttribute('aria-hidden'));
    };
    removeAllAriaHidden();
    const observer = new MutationObserver((mutations) => {
      let shouldRemove = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          if (mutation.target.getAttribute('aria-hidden') === 'true') shouldRemove = true;
        }
      });
      if (shouldRemove) removeAllAriaHidden();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['aria-hidden'], subtree: true });
    const interval = setInterval(removeAllAriaHidden, 500);
    return () => { observer.disconnect(); clearInterval(interval); };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/lots" element={<PublicLotMap />} />
            <Route path="/pending-approval" element={<PendingApproval />} />

            {/* Main dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

            {/* Admin-only routes */}
            <Route path="/admin/service-requests" element={<AdminRoute><AdminServiceRequests /></AdminRoute>} />
            <Route path="/admin/visitor-management" element={<AdminRoute><AdminVisitorManagement /></AdminRoute>} />
            <Route path="/admin/visitor-reports" element={<AdminRoute><AdminVisitorReports /></AdminRoute>} />
            <Route path="/admin/approvals" element={<AdminRoute><AdminApprovals /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUserManagement /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
            <Route path="/admin/verifications" element={<AdminRoute><AdminVerificationQueue /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="/admin/report-schedules" element={<AdminRoute><AdminReportSchedules /></AdminRoute>} />
            <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />

            {/* NEW ARCHIVE ROUTES */}
            <Route path="/admin/archived-users" element={<AdminRoute><ArchivedUsers /></AdminRoute>} />
            <Route path="/admin/archived-announcements" element={<AdminRoute><ArchivedAnnouncements /></AdminRoute>} />
            <Route path="/admin/archived-service-requests" element={<AdminRoute><ArchivedServiceRequests /></AdminRoute>} />

            {/* Security-only routes */}
            <Route path="/security/visitor-approval" element={<SecurityRoute><SecurityVisitorApproval /></SecurityRoute>} />
            <Route path="/security/visitor-logs" element={<SecurityRoute><SecurityVisitorLogs /></SecurityRoute>} />
            <Route path="/security/service-requests" element={<SecurityRoute><SecurityServiceRequests /></SecurityRoute>} />
            <Route path="/security/schedule" element={<SecurityRoute><SecurityPatrolSchedule /></SecurityRoute>} />
            <Route path="/security/incidents" element={<SecurityRoute><SecurityIncidents /></SecurityRoute>} />

            {/* Resident-only routes */}
            <Route path="/visitors" element={<ResidentRoute><VisitorManagement /></ResidentRoute>} />
            <Route path="/service-requests" element={<ResidentRoute><ServiceRequests /></ResidentRoute>} />
            <Route path="/payments" element={<ResidentRoute><Payments /></ResidentRoute>} />
            <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/ai-assistant" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />

            {/* NEW PAYMENT ROUTES */}
            <Route path="/payment-redirect" element={<ProtectedRoute><PaymentRedirect /></ProtectedRoute>} />
            <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            <Route path="/payment-cancelled" element={<ProtectedRoute><PaymentCancelled /></ProtectedRoute>} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;