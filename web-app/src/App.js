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
import PublicLotMap from './pages/PublicLotMap';
import PendingApproval from './pages/PendingApproval';
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

            {/* Main dashboard and embedded dashboard modules */}
            <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Navigate to="/dashboard/profile" replace /></ProtectedRoute>} />

            {/* Admin-only routes */}
            <Route path="/admin/service-requests" element={<AdminRoute><Navigate to="/dashboard/admin/service-requests" replace /></AdminRoute>} />
            <Route path="/admin/reservations" element={<AdminRoute><Navigate to="/dashboard/admin/reservations" replace /></AdminRoute>} />
            <Route path="/admin/visitor-management" element={<AdminRoute><Navigate to="/dashboard/admin/visitor-management" replace /></AdminRoute>} />
            <Route path="/admin/visitor-reports" element={<AdminRoute><Navigate to="/dashboard/admin/visitor-reports" replace /></AdminRoute>} />
            <Route path="/admin/approvals" element={<AdminRoute><Navigate to="/dashboard/admin/approvals" replace /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><Navigate to="/dashboard/admin/users" replace /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><Navigate to="/dashboard/admin/payments" replace /></AdminRoute>} />
            <Route path="/admin/verifications" element={<AdminRoute><Navigate to="/dashboard/admin/verifications" replace /></AdminRoute>} />
            <Route path="/admin/report-schedules" element={<AdminRoute><Navigate to="/dashboard/admin/reservations" replace /></AdminRoute>} />
            <Route path="/admin/announcements" element={<AdminRoute><Navigate to="/dashboard/admin/announcements" replace /></AdminRoute>} />
            <Route path="/admin/lot-management" element={<AdminRoute><Navigate to="/dashboard/admin/lot-management" replace /></AdminRoute>} />

            {/* NEW ARCHIVE ROUTES */}
            <Route path="/admin/archived-users" element={<AdminRoute><Navigate to="/dashboard/admin/archived-users" replace /></AdminRoute>} />
            <Route path="/admin/archived-announcements" element={<AdminRoute><Navigate to="/dashboard/admin/archived-announcements" replace /></AdminRoute>} />
            <Route path="/admin/archived-service-requests" element={<AdminRoute><Navigate to="/dashboard/admin/archived-service-requests" replace /></AdminRoute>} />

            {/* Security-only routes */}
            <Route path="/security/visitor-approval" element={<SecurityRoute><Navigate to="/dashboard/security/visitor-approval" replace /></SecurityRoute>} />
            <Route path="/security/visitor-logs" element={<SecurityRoute><Navigate to="/dashboard/security/visitor-logs" replace /></SecurityRoute>} />
            <Route path="/security/service-requests" element={<SecurityRoute><Navigate to="/dashboard/security/service-requests" replace /></SecurityRoute>} />
            <Route path="/security/schedule" element={<SecurityRoute><Navigate to="/dashboard/security/schedule" replace /></SecurityRoute>} />
            <Route path="/security/incidents" element={<SecurityRoute><Navigate to="/dashboard/security/incidents" replace /></SecurityRoute>} />

            {/* Resident-only routes */}
            <Route path="/reservations" element={<ResidentRoute><Navigate to="/dashboard/reservations" replace /></ResidentRoute>} />
            <Route path="/visitors" element={<ResidentRoute><Navigate to="/dashboard/visitors" replace /></ResidentRoute>} />
            <Route path="/service-requests" element={<ResidentRoute><Navigate to="/dashboard/service-requests" replace /></ResidentRoute>} />
            <Route path="/payments" element={<ResidentRoute><Navigate to="/dashboard/payments" replace /></ResidentRoute>} />
            <Route path="/announcements" element={<ProtectedRoute><Navigate to="/dashboard/announcements" replace /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Navigate to="/dashboard/notifications" replace /></ProtectedRoute>} />
            <Route path="/ai-assistant" element={<ProtectedRoute><Navigate to="/dashboard/ai-assistant" replace /></ProtectedRoute>} />

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