import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CameraAlt as CameraIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Email as EmailIcon,
  VerifiedUser as VerifiedUserIcon,
  Lock as LockIcon,
  LockReset as LockResetIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Logout as LogoutIcon,
  DirectionsCar as CarIcon,
  FamilyRestroom as FamilyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const ProfileSettings = () => {
  // Dashboard Theme Colors from Login
  const themeColors = {
    primary: '#2224be',
    primaryLight: '#2224be',
    primaryDark: '#2224be',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#f8fafc',
    cardBackground: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    border: 'rgba(99, 102, 241, 0.1)'
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    houseNumber: '',
    emergencyContact: {
      name: '',
      phone: ''
    },
    vehicles: [{ plateNumber: '', make: '', model: '', color: '' }],
    familyMembers: [{ name: '', relationship: '', age: '', phone: '' }]
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          navigate('/login');
          return;
        }

        console.log('Fetching profile for user:', currentUser.id);
        
        const token = localStorage.getItem('token') || currentUser.token || '';
        
        console.log('Using token:', token ? 'Token exists' : 'No token');
        
        const response = await fetch('/api/users/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-user-data': JSON.stringify({ id: currentUser.id })
          }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Profile data:', data);
        
        if (data.success) {
          const userData = data.data;
          setUser(userData);
          setFormData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: userData.phone || '',
            houseNumber: userData.houseNumber || '',
            emergencyContact: userData.emergencyContact || { name: '', phone: '' },
            vehicles: userData.vehicles?.length > 0 ? userData.vehicles : [{ plateNumber: '', make: '', model: '', color: '' }],
            familyMembers: userData.familyMembers?.length > 0 ? userData.familyMembers : [{ name: '', relationship: '', age: '', phone: '' }]
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        console.error('Error details:', error.message);
        toast.error('Failed to load profile data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [getCurrentUser, navigate]);

  // Profile Functions
  const handleInputChange = (e, section, index) => {
    const { name, value } = e.target;
    
    if (section === 'main') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (section === 'emergencyContact') {
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [name]: value
        }
      }));
    } else if (section === 'vehicles') {
      const updatedVehicles = [...formData.vehicles];
      updatedVehicles[index] = {
        ...updatedVehicles[index],
        [name]: value
      };
      setFormData(prev => ({
        ...prev,
        vehicles: updatedVehicles
      }));
    } else if (section === 'familyMembers') {
      const updatedMembers = [...formData.familyMembers];
      updatedMembers[index] = {
        ...updatedMembers[index],
        [name]: value
      };
      setFormData(prev => ({
        ...prev,
        familyMembers: updatedMembers
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAddVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, { plateNumber: '', make: '', model: '', color: '' }]
    }));
  };

  const handleRemoveVehicle = (index) => {
    if (formData.vehicles.length > 1) {
      const updatedVehicles = formData.vehicles.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        vehicles: updatedVehicles
      }));
    }
  };

  const handleAddFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, { name: '', relationship: '', age: '', phone: '' }]
    }));
  };

  const handleRemoveFamilyMember = (index) => {
    if (formData.familyMembers.length > 1) {
      const updatedMembers = formData.familyMembers.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        familyMembers: updatedMembers
      }));
    }
  };

  const validateProfileForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    return newErrors;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateProfileForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put('/api/users/profile', formData);
      
      if (response.data.success) {
        toast.success('Profile updated successfully!');
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Password Functions
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    if (name === 'newPassword') {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return themeColors.success;
    if (passwordStrength >= 50) return themeColors.warning;
    if (passwordStrength >= 25) return themeColors.error;
    return themeColors.textSecondary;
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength >= 75) return 'Strong';
    if (passwordStrength >= 50) return 'Medium';
    if (passwordStrength >= 25) return 'Weak';
    return 'Very Weak';
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validatePasswordForm();
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        handleClosePasswordDialog();
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      toast.error(errorMessage);
      
      if (error.response?.data?.error?.includes('current')) {
        setPasswordErrors(prev => ({
          ...prev,
          currentPassword: 'Current password is incorrect'
        }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPasswordDialog = () => {
    setChangePasswordOpen(true);
  };

  const handleClosePasswordDialog = () => {
    setChangePasswordOpen(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordStrength(0);
    setPasswordErrors({});
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: themeColors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: themeColors.background
      }}
    >
      {/* TOP NAVIGATION BAR */}
      <AppBar position="static" sx={{ bgcolor: themeColors.primary, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Profile Settings
          </Typography>

          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <SecurityIcon sx={{
              fontSize: 48,
              color: themeColors.primary,
              backgroundColor: themeColors.primary + '15',
              p: 1,
              borderRadius: 2
            }} />
            <Box>
              <Typography variant="h4" component="h1" sx={{ 
                fontWeight: 700,
                color: themeColors.textPrimary,
                background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.primaryLight})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Profile Settings
              </Typography>
              <Typography variant="body1" sx={{ color: themeColors.textSecondary }}>
                Update your personal information and security settings
              </Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Left Column - Basic Info & Profile Picture */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3, 
              mb: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: `1px solid ${themeColors.border}`,
              backgroundColor: themeColors.cardBackground
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: themeColors.primary,
                      fontSize: '2.5rem',
                      mb: 2,
                      boxShadow: `0 4px 12px ${themeColors.primary}40`
                    }}
                  >
                    {user?.firstName?.charAt(0)}
                    {user?.lastName?.charAt(0)}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      bgcolor: 'white',
                      '&:hover': { bgcolor: 'grey.100' },
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    <CameraIcon />
                  </IconButton>
                </Box>
                <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Chip
                  icon={<VerifiedUserIcon />}
                  label={user?.role?.toUpperCase()}
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  {user?.email}
                </Typography>
                {user?.houseNumber && (
                  <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                    House {user.houseNumber}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 3, borderColor: themeColors.border }} />

              {/* Account Status */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                  Account Status
                </Typography>
                <Chip
                  label={user?.isApproved ? 'APPROVED' : 'PENDING APPROVAL'}
                  color={user?.isApproved ? 'success' : 'warning'}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" sx={{ color: themeColors.textSecondary, display: 'block', mt: 1 }}>
                  Member since {new Date(user?.createdAt).toLocaleDateString()}
                </Typography>
              </Box>

              <Divider sx={{ my: 3, borderColor: themeColors.border }} />

              {/* Security Section */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, fontWeight: 600 }}>
                  <SecurityIcon />
                  Security
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<LockResetIcon />}
                  onClick={handleOpenPasswordDialog}
                  sx={{ 
                    mt: 1,
                    borderRadius: 2,
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                    '&:hover': {
                      borderColor: themeColors.primaryDark,
                      backgroundColor: themeColors.primary + '08'
                    }
                  }}
                >
                  Change Password
                </Button>
              </Box>
            </Paper>

            {/* Quick Stats */}
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: `1px solid ${themeColors.border}`,
              backgroundColor: themeColors.cardBackground
            }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                Profile Completion
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>Basic Info</Typography>
                  <Typography variant="body2" sx={{ color: themeColors.success, fontWeight: 600 }}>100%</Typography>
                </Box>
                <Box sx={{ width: '100%', height: 6, bgcolor: themeColors.border, borderRadius: 3 }}>
                  <Box sx={{ width: '100%', height: '100%', bgcolor: themeColors.success, borderRadius: 3 }} />
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>Contact Details</Typography>
                  <Typography variant="body2" sx={{ color: formData.emergencyContact.name ? themeColors.success : themeColors.warning, fontWeight: 600 }}>
                    {formData.emergencyContact.name ? '100%' : '50%'}
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', height: 6, bgcolor: themeColors.border, borderRadius: 3 }}>
                  <Box 
                    sx={{ 
                      width: formData.emergencyContact.name ? '100%' : '50%', 
                      height: '100%', 
                      bgcolor: formData.emergencyContact.name ? themeColors.success : themeColors.warning, 
                      borderRadius: 3 
                    }} 
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column - Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: `1px solid ${themeColors.border}`,
              backgroundColor: themeColors.cardBackground
            }}>
              <form onSubmit={handleProfileSubmit}>
                {/* Basic Information */}
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, fontWeight: 600 }}>
                  <PersonIcon />
                  Basic Information
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange(e, 'main')}
                      error={!!errors.firstName}
                      helperText={errors.firstName}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: themeColors.textSecondary }} />
                          </InputAdornment>
                        ),
                        sx: {
                          borderRadius: 2,
                          backgroundColor: '#f8fafc',
                          '&.Mui-focused': {
                            borderColor: themeColors.primary,
                            boxShadow: `0 0 0 3px ${themeColors.primary}20`
                          }
                        }
                      }}
                      InputLabelProps={{
                        sx: {
                          color: themeColors.textSecondary,
                          '&.Mui-focused': {
                            color: themeColors.primary
                          }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange(e, 'main')}
                      error={!!errors.lastName}
                      helperText={errors.lastName}
                      required
                      InputProps={{
                        sx: {
                          borderRadius: 2,
                          backgroundColor: '#f8fafc',
                          '&.Mui-focused': {
                            borderColor: themeColors.primary,
                            boxShadow: `0 0 0 3px ${themeColors.primary}20`
                          }
                        }
                      }}
                      InputLabelProps={{
                        sx: {
                          color: themeColors.textSecondary,
                          '&.Mui-focused': {
                            color: themeColors.primary
                          }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange(e, 'main')}
                      error={!!errors.email}
                      helperText={errors.email}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon sx={{ color: themeColors.textSecondary }} />
                          </InputAdornment>
                        ),
                        sx: {
                          borderRadius: 2,
                          backgroundColor: '#f8fafc',
                          '&.Mui-focused': {
                            borderColor: themeColors.primary,
                            boxShadow: `0 0 0 3px ${themeColors.primary}20`
                          }
                        }
                      }}
                      InputLabelProps={{
                        sx: {
                          color: themeColors.textSecondary,
                          '&.Mui-focused': {
                            color: themeColors.primary
                          }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange(e, 'main')}
                      error={!!errors.phone}
                      helperText={errors.phone}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon sx={{ color: themeColors.textSecondary }} />
                          </InputAdornment>
                        ),
                        sx: {
                          borderRadius: 2,
                          backgroundColor: '#f8fafc',
                          '&.Mui-focused': {
                            borderColor: themeColors.primary,
                            boxShadow: `0 0 0 3px ${themeColors.primary}20`
                          }
                        }
                      }}
                      InputLabelProps={{
                        sx: {
                          color: themeColors.textSecondary,
                          '&.Mui-focused': {
                            color: themeColors.primary
                          }
                        }
                      }}
                    />
                  </Grid>
                  {user?.role === 'resident' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="House Number"
                        name="houseNumber"
                        value={formData.houseNumber}
                        onChange={(e) => handleInputChange(e, 'main')}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <HomeIcon sx={{ color: themeColors.textSecondary }} />
                            </InputAdornment>
                          ),
                          sx: {
                            borderRadius: 2,
                            backgroundColor: '#f8fafc',
                            readOnly: true
                          }
                        }}
                        InputLabelProps={{
                          sx: {
                            color: themeColors.textSecondary
                          }
                        }}
                        helperText="House number cannot be changed. Contact admin for modifications."
                      />
                    </Grid>
                  )}
                </Grid>

                <Divider sx={{ my: 3, borderColor: themeColors.border }} />

                {/* Emergency Contact */}
                <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                  Emergency Contact
                </Typography>
                <Alert severity="info" sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: themeColors.info + '15',
                  border: `1px solid ${themeColors.info}30`
                }}>
                  Please provide an emergency contact person. This information is crucial for emergencies.
                </Alert>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Contact Name"
                      name="name"
                      value={formData.emergencyContact.name}
                      onChange={(e) => handleInputChange(e, 'emergencyContact')}
                      placeholder="Full name of emergency contact"
                      InputProps={{
                        sx: {
                          borderRadius: 2,
                          backgroundColor: '#f8fafc',
                          '&.Mui-focused': {
                            borderColor: themeColors.primary,
                            boxShadow: `0 0 0 3px ${themeColors.primary}20`
                          }
                        }
                      }}
                      InputLabelProps={{
                        sx: {
                          color: themeColors.textSecondary,
                          '&.Mui-focused': {
                            color: themeColors.primary
                          }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Contact Phone"
                      name="phone"
                      value={formData.emergencyContact.phone}
                      onChange={(e) => handleInputChange(e, 'emergencyContact')}
                      placeholder="Phone number"
                      InputProps={{
                        sx: {
                          borderRadius: 2,
                          backgroundColor: '#f8fafc',
                          '&.Mui-focused': {
                            borderColor: themeColors.primary,
                            boxShadow: `0 0 0 3px ${themeColors.primary}20`
                          }
                        }
                      }}
                      InputLabelProps={{
                        sx: {
                          color: themeColors.textSecondary,
                          '&.Mui-focused': {
                            color: themeColors.primary
                          }
                        }
                      }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3, borderColor: themeColors.border }} />

                {/* Vehicles */}
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, fontWeight: 600 }}>
                  <CarIcon />
                  Registered Vehicles
                </Typography>
                {formData.vehicles.map((vehicle, index) => (
                  <Card key={index} variant="outlined" sx={{ 
                    mb: 2, 
                    p: 2,
                    borderRadius: 2,
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                          Vehicle {index + 1}
                        </Typography>
                        {formData.vehicles.length > 1 && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemoveVehicle(index)}
                            sx={{ 
                              borderRadius: 1,
                              textTransform: 'none'
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Plate Number"
                            name="plateNumber"
                            value={vehicle.plateNumber}
                            onChange={(e) => handleInputChange(e, 'vehicles', index)}
                            placeholder="ABC-123"
                            InputProps={{
                              sx: {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                color: themeColors.textSecondary
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Make"
                            name="make"
                            value={vehicle.make}
                            onChange={(e) => handleInputChange(e, 'vehicles', index)}
                            placeholder="Toyota, Honda, etc."
                            InputProps={{
                              sx: {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                color: themeColors.textSecondary
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Model"
                            name="model"
                            value={vehicle.model}
                            onChange={(e) => handleInputChange(e, 'vehicles', index)}
                            placeholder="Camry, Civic, etc."
                            InputProps={{
                              sx: {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                color: themeColors.textSecondary
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Color"
                            name="color"
                            value={vehicle.color}
                            onChange={(e) => handleInputChange(e, 'vehicles', index)}
                            placeholder="Red, Blue, Black, etc."
                            InputProps={{
                              sx: {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                color: themeColors.textSecondary
                              }
                            }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outlined"
                  onClick={handleAddVehicle}
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                    '&:hover': {
                      borderColor: themeColors.primaryDark,
                      backgroundColor: themeColors.primary + '08'
                    }
                  }}
                >
                  Add Another Vehicle
                </Button>

                <Divider sx={{ my: 3, borderColor: themeColors.border }} />

                {/* Family Members */}
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, fontWeight: 600 }}>
                  <FamilyIcon />
                  Family Members
                </Typography>
                {formData.familyMembers.map((member, index) => (
                  <Card key={index} variant="outlined" sx={{ 
                    mb: 2, 
                    p: 2,
                    borderRadius: 2,
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                          Family Member {index + 1}
                        </Typography>
                        {formData.familyMembers.length > 1 && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemoveFamilyMember(index)}
                            sx={{ 
                              borderRadius: 1,
                              textTransform: 'none'
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Full Name"
                            name="name"
                            value={member.name}
                            onChange={(e) => handleInputChange(e, 'familyMembers', index)}
                            placeholder="Full name"
                            InputProps={{
                              sx: {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                color: themeColors.textSecondary
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Relationship"
                            name="relationship"
                            value={member.relationship}
                            onChange={(e) => handleInputChange(e, 'familyMembers', index)}
                            placeholder="Spouse, Child, Parent, etc."
                            InputProps={{
                              sx: {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                color: themeColors.textSecondary
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Age"
                            name="age"
                            type="number"
                            value={member.age}
                            onChange={(e) => handleInputChange(e, 'familyMembers', index)}
                            placeholder="Age"
                            InputProps={{
                              sx: {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                color: themeColors.textSecondary
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Phone"
                            name="phone"
                            value={member.phone}
                            onChange={(e) => handleInputChange(e, 'familyMembers', index)}
                            placeholder="Phone number"
                            InputProps={{
                              sx: {
                                borderRadius: 2,
                                backgroundColor: '#f8fafc'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                color: themeColors.textSecondary
                              }
                            }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outlined"
                  onClick={handleAddFamilyMember}
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                    '&:hover': {
                      borderColor: themeColors.primaryDark,
                      backgroundColor: themeColors.primary + '08'
                    }
                  }}
                >
                  Add Another Family Member
                </Button>

                {/* Submit Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    sx={{ 
                      px: 4,
                      borderRadius: 2,
                      bgcolor: themeColors.primary,
                      '&:hover': {
                        bgcolor: themeColors.primaryDark
                      },
                      fontWeight: 600
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </Box>
              </form>
            </Paper>
          </Grid>
        </Grid>

        {/* Change Password Dialog */}
        <Dialog
          open={changePasswordOpen}
          onClose={handleClosePasswordDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              backgroundColor: themeColors.cardBackground
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 600, 
            color: themeColors.textPrimary,
            borderBottom: `1px solid ${themeColors.border}`,
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <LockResetIcon />
            Change Password
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ 
              mb: 2,
              borderRadius: 2,
              backgroundColor: themeColors.info + '15',
              border: `1px solid ${themeColors.info}30`
            }}>
              After changing your password, you will be logged out from all other devices except this one.
            </Alert>

            <form id="password-form" onSubmit={handlePasswordSubmit}>
              {/* Current Password */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                  Current Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  error={!!passwordErrors.currentPassword}
                  helperText={passwordErrors.currentPassword}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: themeColors.textSecondary }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility('current')}
                          edge="end"
                          aria-label={showPassword.current ? 'hide password' : 'show password'}
                          sx={{
                            color: themeColors.textSecondary,
                            '&:hover': {
                              color: themeColors.primary
                            }
                          }}
                        >
                          {showPassword.current ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      backgroundColor: '#f8fafc',
                      '&.Mui-focused': {
                        borderColor: themeColors.primary,
                        boxShadow: `0 0 0 3px ${themeColors.primary}20`
                      }
                    }
                  }}
                  InputLabelProps={{
                    sx: {
                      color: themeColors.textSecondary,
                      '&.Mui-focused': {
                        color: themeColors.primary
                      }
                    }
                  }}
                />
              </Box>

              {/* New Password */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                  New Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword.new ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  error={!!passwordErrors.newPassword}
                  helperText={passwordErrors.newPassword}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockResetIcon sx={{ color: themeColors.textSecondary }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility('new')}
                          edge="end"
                          aria-label={showPassword.new ? 'hide password' : 'show password'}
                          sx={{
                            color: themeColors.textSecondary,
                            '&:hover': {
                              color: themeColors.primary
                            }
                          }}
                        >
                          {showPassword.new ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      backgroundColor: '#f8fafc',
                      '&.Mui-focused': {
                        borderColor: themeColors.primary,
                        boxShadow: `0 0 0 3px ${themeColors.primary}20`
                      }
                    }
                  }}
                  InputLabelProps={{
                    sx: {
                      color: themeColors.textSecondary,
                      '&.Mui-focused': {
                        color: themeColors.primary
                      }
                    }
                  }}
                />
                
                {/* Password Strength Indicator */}
                {passwordData.newPassword && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>Password Strength</Typography>
                      <Typography variant="caption" sx={{ color: getPasswordStrengthColor(), fontWeight: 600 }}>
                        {getPasswordStrengthText()} ({passwordStrength}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={passwordStrength} 
                      sx={{ 
                        height: 4, 
                        borderRadius: 2,
                        backgroundColor: themeColors.border,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getPasswordStrengthColor(),
                          borderRadius: 2
                        }
                      }} 
                    />
                  </Box>
                )}
              </Box>

              {/* Confirm New Password */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                  Confirm New Password
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  error={!!passwordErrors.confirmPassword}
                  helperText={passwordErrors.confirmPassword}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockResetIcon sx={{ color: themeColors.textSecondary }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility('confirm')}
                          edge="end"
                          aria-label={showPassword.confirm ? 'hide password' : 'show password'}
                          sx={{
                            color: themeColors.textSecondary,
                            '&:hover': {
                              color: themeColors.primary
                            }
                          }}
                        >
                          {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      backgroundColor: '#f8fafc',
                      '&.Mui-focused': {
                        borderColor: themeColors.primary,
                        boxShadow: `0 0 0 3px ${themeColors.primary}20`
                      }
                    }
                  }}
                  InputLabelProps={{
                    sx: {
                      color: themeColors.textSecondary,
                      '&.Mui-focused': {
                        color: themeColors.primary
                      }
                    }
                  }}
                />
              </Box>
            </form>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={handleClosePasswordDialog} 
              disabled={saving}
              sx={{
                color: themeColors.textSecondary,
                '&:hover': {
                  backgroundColor: themeColors.primary + '08'
                },
                borderRadius: 2
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="password-form" 
              variant="contained" 
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <LockResetIcon />}
              sx={{ 
                borderRadius: 2,
                bgcolor: themeColors.primary,
                '&:hover': {
                  bgcolor: themeColors.primaryDark
                },
                fontWeight: 600
              }}
            >
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ProfileSettings;