import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Alert,
  Divider
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  Email as EmailIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  HowToReg as RegisterIcon
} from '@mui/icons-material';
import axios from 'axios';

const Register = () => {
  const themeColors = {
    primary: '#2d5016',
    primaryLight: '#5a8a1a',
    primaryDark: '#1a3a0a',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    border: 'rgba(45, 80, 22, 0.15)',
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'resident',
    houseLot: '',
    houseBlock: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({ email: null, phone: null, house: null });
  const [checkingAvailability, setCheckingAvailability] = useState({ email: false, phone: false, house: false });

  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-fill lot & block if coming from the public lot map
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lot = params.get('lot');
    const block = params.get('block');
    if (lot || block) {
      setFormData(prev => ({
        ...prev,
        houseLot: block || prev.houseLot,
        houseBlock: lot || prev.houseBlock,
      }));
    }
  }, [location.search]);

  useEffect(() => {
    const checkEmailAvailability = async () => {
      if (!formData.email || !isValidEmail(formData.email)) return;
      setCheckingAvailability(prev => ({ ...prev, email: true }));
      try {
        const response = await axios.post('/api/auth/check-availability', { type: 'email', value: formData.email });
        setAvailability(prev => ({ ...prev, email: response.data.available }));
      } catch (error) {
        console.error('Email check error:', error);
      } finally {
        setCheckingAvailability(prev => ({ ...prev, email: false }));
      }
    };
    const timer = setTimeout(checkEmailAvailability, 500);
    return () => clearTimeout(timer);
  }, [formData.email]);

  useEffect(() => {
    const checkPhoneAvailability = async () => {
      if (!formData.phone || !/^\d{10}$/.test(formData.phone)) return;
      setCheckingAvailability(prev => ({ ...prev, phone: true }));
      try {
        const response = await axios.post('/api/auth/check-availability', { type: 'phone', value: formData.phone });
        setAvailability(prev => ({ ...prev, phone: response.data.available }));
      } catch (error) {
        console.error('Phone check error:', error);
      } finally {
        setCheckingAvailability(prev => ({ ...prev, phone: false }));
      }
    };
    const timer = setTimeout(checkPhoneAvailability, 500);
    return () => clearTimeout(timer);
  }, [formData.phone]);

  useEffect(() => {
    const checkHouseAvailability = async () => {
      if (!formData.houseLot || !formData.houseBlock) return;
      const houseNumber = `${formData.houseLot}-${formData.houseBlock}`.trim();
      setCheckingAvailability(prev => ({ ...prev, house: true }));
      try {
        const response = await axios.post('/api/auth/check-availability', { type: 'house', value: houseNumber });
        setAvailability(prev => ({ ...prev, house: response.data.available }));
      } catch (error) {
        console.error('House check error:', error);
      } finally {
        setCheckingAvailability(prev => ({ ...prev, house: false }));
      }
    };
    const timer = setTimeout(checkHouseAvailability, 500);
    return () => clearTimeout(timer);
  }, [formData.houseLot, formData.houseBlock]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;
    switch (name) {
      case 'firstName':
      case 'lastName':
        filteredValue = value.replace(/[^a-zA-Z\s-]/g, '');
        break;
      case 'phone':
        filteredValue = value.replace(/\D/g, '').slice(0, 10);
        break;
      case 'houseLot':
      case 'houseBlock':
        filteredValue = value.replace(/[^a-zA-Z0-9-]/g, '');
        break;
      default:
        filteredValue = value;
    }
    setFormData(prev => ({ ...prev, [name]: filteredValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if ((name === 'email' && !filteredValue) ||
        (name === 'phone' && !filteredValue) ||
        ((name === 'houseLot' || name === 'houseBlock') && (!formData.houseLot || !formData.houseBlock))) {
      setAvailability(prev => ({
        ...prev,
        [name === 'houseLot' || name === 'houseBlock' ? 'house' : name]: null
      }));
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    const reputableDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com', 'zoho.com', 'yandex.com', 'mail.com', 'gmx.com', 'fastmail.com'];
    const domain = email.split('@')[1];
    return reputableDomains.includes(domain.toLowerCase());
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    else if (formData.firstName.length < 2) newErrors.firstName = 'First name must be at least 2 characters';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    else if (formData.lastName.length < 2) newErrors.lastName = 'Last name must be at least 2 characters';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Please use a valid email from reputable providers';
    else if (availability.email === false) newErrors.email = 'This email is already registered';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = 'Phone number must be exactly 10 digits';
    else if (availability.phone === false) newErrors.phone = 'This phone number is already registered';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (formData.role === 'resident') {
      if (!formData.houseLot) newErrors.houseLot = 'Lot number is required';
      if (!formData.houseBlock) newErrors.houseBlock = 'Block number is required';
      if (formData.houseLot && formData.houseBlock && availability.house === false) {
        newErrors.houseLot = 'This house is already registered';
        newErrors.houseBlock = 'This house is already registered';
      }
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    if (availability.email === false || availability.phone === false ||
        (formData.role === 'resident' && availability.house === false)) {
      setErrors(prev => ({ ...prev, submit: 'Some information is already registered. Please check all fields.' }));
      return;
    }
    setLoading(true);
    const registrationData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone,
      password: formData.password,
      role: formData.role,
      houseNumber: formData.role === 'resident' ? `${formData.houseLot.trim()}-${formData.houseBlock.trim()}` : undefined
    };
    const result = await register(registrationData);
    if (result.success) {
      navigate('/login');
    } else {
      setErrors(prev => ({ ...prev, submit: result.error || 'Registration failed' }));
    }
    setLoading(false);
  };

  const getAvailabilityIcon = (field) => {
    if (checkingAvailability[field]) return <CircularProgress size={18} sx={{ color: themeColors.primary }} />;
    if (availability[field] === true) return <CheckCircle sx={{ color: themeColors.success, fontSize: 20 }} />;
    if (availability[field] === false) return <Cancel sx={{ color: themeColors.error, fontSize: 20 }} />;
    return null;
  };

  const fieldSx = {
    borderRadius: 2,
    backgroundColor: '#f8faf5',
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      '&.Mui-focused fieldset': { borderColor: themeColors.primary },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: themeColors.primary },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a3a0a 0%, #2d5016 50%, #4a7a20 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -150,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
        },
      }}
    >
      <Container maxWidth="sm">
        {/* Back button */}
        <Button
          startIcon={<ArrowBackIcon />}
          component={Link}
          to="/login"
          sx={{
            color: 'rgba(255,255,255,0.8)',
            mb: 3,
            '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
            borderRadius: 2,
            textTransform: 'none',
          }}
        >
          Back to Login
        </Button>

        {/* Header badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            <RegisterIcon sx={{ fontSize: 28, color: 'white' }} />
          </Box>
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', letterSpacing: '0.12em' }}>
              WESTVILLE CASIMIRO HOMES
            </Typography>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.3rem' }}>
              Resident Registration
            </Typography>
          </Box>
        </Box>

        {/* Registration Card */}
        <Paper
          sx={{
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.15)',
            p: { xs: 3, md: 4 },
            backgroundColor: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: themeColors.textPrimary, mb: 0.5 }}>
            Create your account
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 3 }}>
            Fill in your details to join the Westville community
          </Typography>

          {errors.submit && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {errors.submit}
            </Alert>
          )}

          {/* Show notice if lot was pre-filled from map */}
          {new URLSearchParams(location.search).get('lot') && (
            <Alert
              severity="success"
              sx={{
                mb: 2, borderRadius: 2,
                backgroundColor: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#166534',
                '& .MuiAlert-icon': { color: '#16a34a' },
              }}
            >
              <strong>Lot pre-selected from the village map!</strong> Block {new URLSearchParams(location.search).get('block')}, Lot {new URLSearchParams(location.search).get('lot')} has been filled in for you.
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* First Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  required
                  placeholder="Enter first name"
                  inputProps={{ maxLength: 50 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={fieldSx}
                />
              </Grid>

              {/* Last Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  required
                  placeholder="Enter last name"
                  inputProps={{ maxLength: 50 }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                  sx={fieldSx}
                />
              </Grid>

              {/* Email */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email || 'Use reputable providers (Gmail, Yahoo, Outlook, etc.)'}
                  required
                  placeholder="yourname@example.com"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {getAvailabilityIcon('email')}
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={fieldSx}
                />
              </Grid>

              {/* Phone */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  error={!!errors.phone}
                  helperText={errors.phone || 'Exactly 10 digits required'}
                  required
                  placeholder="9123456789"
                  inputProps={{ maxLength: 10 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {getAvailabilityIcon('phone')}
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={fieldSx}
                />
              </Grid>

              {/* Password */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password || 'Min. 8 chars with uppercase, lowercase & numbers'}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={fieldSx}
                />
              </Grid>

              {/* Confirm Password */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={fieldSx}
                />
              </Grid>

              {/* House Number */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: themeColors.textPrimary, mb: 1 }}>
                  House Number
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    label="Lot"
                    name="houseLot"
                    value={formData.houseLot}
                    onChange={handleChange}
                    error={!!errors.houseLot}
                    placeholder="A"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <HomeIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2 }
                    }}
                    sx={fieldSx}
                  />
                  <Typography sx={{ color: themeColors.textSecondary, mt: 2, fontWeight: 700, fontSize: '1.2rem' }}>-</Typography>
                  <TextField
                    fullWidth
                    label="Block"
                    name="houseBlock"
                    value={formData.houseBlock}
                    onChange={handleChange}
                    error={!!errors.houseBlock}
                    placeholder="101"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {getAvailabilityIcon('house')}
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2 }
                    }}
                    sx={fieldSx}
                  />
                </Box>
                {errors.houseLot || errors.houseBlock ? (
                  <Typography variant="caption" sx={{ color: themeColors.error, ml: 0.5, mt: 0.5, display: 'block' }}>
                    {errors.houseLot || errors.houseBlock}
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: themeColors.textSecondary, ml: 0.5, mt: 0.5, display: 'block' }}>
                    Format: Lot - Block (e.g., A - 101)
                  </Typography>
                )}
              </Grid>
            </Grid>

            {/* Submit button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                backgroundColor: themeColors.primary,
                '&:hover': { backgroundColor: themeColors.primaryDark },
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(45,80,22,0.4)',
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
            </Button>

            <Divider sx={{ my: 2.5 }}>
              <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                Already have an account?
              </Typography>
            </Divider>

            <Button
              component={Link}
              to="/login"
              fullWidth
              variant="outlined"
              sx={{
                borderColor: themeColors.primary,
                color: themeColors.primary,
                py: 1.2,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { backgroundColor: themeColors.primary + '0a' },
              }}
            >
              Sign in to existing account
            </Button>
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} Westville Casimiro Homes. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Register;