// src/App.js - Complete updated file with all routes
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, createTheme } from '@mui/material';
import { Container, CircularProgress } from '@mui/material';
import axios from 'axios';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VisitorManagement from './pages/VisitorManagement';
import ServiceRequests from './pages/ServiceRequests';
import SecurityVisitorApproval from './pages/SecurityVisitorApproval';
import AdminVisitorManagement from './pages/AdminVisitorManagement';
import SecurityVisitorLogs from './pages/SecurityVisitorLogs';
import AdminServiceRequests from './pages/AdminServiceRequests';
import ProfileSettings from './pages/ProfileSettings';
import PublicLotMap from './pages/PublicLotMap';
import AdminApprovals from './pages/AdminApprovals';
import PendingApproval from './pages/PendingApproval';
import AdminUserManagement from './pages/AdminUserManagement';
import Payments from './pages/Payments';
import AdminPayments from './pages/AdminPayments';

// NEW PAYMENT PAGES
import PaymentRedirect from './pages/PaymentRedirect';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';

import { AuthProvider } from './context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'https://vims-backend.onrender.com/api';
axios.defaults.baseURL = API_URL;

const theme = createTheme({
  palette: {
    primary: { main: '#3b82f6' },
    secondary: { main: '#6b7280' },
  },
});

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          
          if (parsedUser.role === 'resident' && !parsedUser.isApproved) {
            console.log('User not approved, redirecting to pending');
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
          
          try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setIsAuthenticated(true);
          } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/dashboard" replace />;

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
            <Route path="/lots" element={<PublicLotMap />} />
            <Route path="/pending-approval" element={<PendingApproval />} />

            {/* Main dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

            {/* Admin-only routes */}
            <Route path="/admin/service-requests" element={<AdminRoute><AdminServiceRequests /></AdminRoute>} />
            <Route path="/admin/visitor-management" element={<AdminRoute><AdminVisitorManagement /></AdminRoute>} />
            <Route path="/admin/approvals" element={<AdminRoute><AdminApprovals /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUserManagement /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />

            {/* Security-only routes */}
            <Route path="/security/visitor-approval" element={<SecurityRoute><SecurityVisitorApproval /></SecurityRoute>} />
            <Route path="/security/visitor-logs" element={<SecurityRoute><SecurityVisitorLogs /></SecurityRoute>} />

            {/* Resident-only routes */}
            <Route path="/visitors" element={<ResidentRoute><VisitorManagement /></ResidentRoute>} />
            <Route path="/service-requests" element={<ResidentRoute><ServiceRequests /></ResidentRoute>} />
            <Route path="/payments" element={<ResidentRoute><Payments /></ResidentRoute>} />

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