import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';
import LockResetIcon from '@mui/icons-material/LockReset';

const API_URL = process.env.REACT_APP_API_URL || 'https://vims-backend.onrender.com/api';

const themeColors = {
  dark: '#1E2A1E',
  primary: '#2E6B2E',
  textPrimary: '#1e293b',
  textSecondary: '#64748b'
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    setToken(tokenFromUrl);
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Password has been reset successfully! You can now log in with your new password.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.primary} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <LockResetIcon sx={{ fontSize: 48, color: themeColors.primary, mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, color: themeColors.textPrimary }}>
              Invalid Reset Link
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: themeColors.textSecondary }}>
              This password reset link is invalid or has expired. Please request a new password reset.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{
                backgroundColor: themeColors.primary,
                borderRadius: 2,
                px: 4,
                py: 1.5,
              }}
            >
              Back to Login
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.primary} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockResetIcon sx={{ fontSize: 48, color: themeColors.primary, mb: 2 }} />
            <Typography variant="h5" sx={{ color: themeColors.textPrimary }}>
              Reset Your Password
            </Typography>
            <Typography variant="body2" sx={{ color: themeColors.textSecondary, mt: 1 }}>
              Enter your new password below
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="New Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
              required
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
              required
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                backgroundColor: themeColors.primary,
                borderRadius: 2,
                py: 1.5,
                mb: 2,
                '&:hover': {
                  backgroundColor: themeColors.primaryDark,
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
            </Button>

            <Button
              fullWidth
              onClick={() => navigate('/login')}
              sx={{
                color: themeColors.textSecondary,
                borderRadius: 2,
                py: 1,
              }}
            >
              Back to Login
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword;