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
    primary: '#166534',
    primaryLight: '#22c55e',
    primaryDark: '#14532d',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#f3f5f7',
    cardBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
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
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [moveOutDialogOpen, setMoveOutDialogOpen] = useState(false);
  const [moveOutReason, setMoveOutReason] = useState('');
  const [moveOutSubmitting, setMoveOutSubmitting] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const { getCurrentUser, logout, refreshUser, updateUser } = useAuth();
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

        const response = await axios.get('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        const data = response.data;
        console.log('Profile data:', data);
        
        if (data.success) {
          const userData = data.data;
          setUser(userData);
          setProfilePhoto(userData.profilePhotoUrl || null);
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

        try {
          const verificationResponse = await axios.get('/api/verifications/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (verificationResponse.data?.success) {
            const verificationData = verificationResponse.data.data;
            setVerificationStatus(verificationData?.status || null);
            setUploadedDocuments({
              frontImage: verificationData?.frontImage,
              backImage: verificationData?.backImage,
              selfieImage: verificationData?.selfieImage,
              status: verificationData?.status,
              documentsVerified: verificationData?.documentsVerified
            });
          }
        } catch (verificationError) {
          setVerificationStatus(null);
          setUploadedDocuments(null);
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

  const submitMoveOutRequest = async () => {
    if (!user) return;
    try {
      setMoveOutSubmitting(true);
      const token = localStorage.getItem('token') || '';
      const res = await axios.post(
        '/api/users/move-out/request',
        { reason: moveOutReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        toast.success(res.data.message || 'Move-out request submitted');
        setMoveOutDialogOpen(false);
        setMoveOutReason('');
        const refreshed = await axios.get('/api/users/profile', { headers: { Authorization: `Bearer ${token}` } });
        if (refreshed.data?.success) setUser(refreshed.data.data);
      } else {
        toast.error(res.data?.error || 'Failed to submit move-out request');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to submit move-out request');
    } finally {
      setMoveOutSubmitting(false);
    }
  };

  const handleProfilePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('photo', file);

      const response = await axios.post('/api/users/profile-photo', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const updatedProfileUrl = response.data.data.profilePhotoUrl;
        const updatedProfilePhoto = response.data.data.profilePhoto;
        const updatedUser = {
          ...(user || {}),
          profilePhoto: updatedProfilePhoto,
          profilePhotoUrl: updatedProfileUrl || (updatedProfilePhoto ? `/uploads/profile-photos/${updatedProfilePhoto}` : null)
        };

        setProfilePhoto(updatedProfileUrl || (updatedProfilePhoto ? `/uploads/profile-photos/${updatedProfilePhoto}` : null));
        setUser(updatedUser);
        if (updateUser) {
          await updateUser(updatedUser);
        }
        if (refreshUser) {
          const refreshed = await refreshUser();
          setUser(refreshed);
        }
        toast.success('Profile photo updated successfully');
      }
    } catch (error) {
      console.error('Profile photo upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const buildDocumentUrl = (filename) => {
    if (!filename) return null;
    return `/api/verifications/my-files/${filename}`;
  };

  const openPreview = (imageUrl, title) => {
    setPreviewImage(imageUrl);
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewImage(null);
    setPreviewTitle('');
  };

  const handleDownload = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          background: `
            radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
            radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
            ${themeColors.background}
          `,
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
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `,
        '@keyframes fadeUpSoft': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      {/* TOP NAVIGATION BAR */}
      <AppBar
        position="sticky"
        sx={{
          bgcolor: 'rgba(255,255,255,0.92)',
          color: themeColors.textPrimary,
          backdropFilter: 'blur(14px)',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.06)',
          borderBottom: `1px solid ${themeColors.border}`
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            sx={{
              mr: 2,
              color: themeColors.primary,
              borderRadius: 2.5,
              bgcolor: 'rgba(34, 197, 94, 0.14)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.24)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Profile Settings
          </Typography>

          <Button 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              color: themeColors.primary,
              borderRadius: 2.5,
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: 'rgba(34, 197, 94, 0.12)',
              '&:hover': {
                backgroundColor: 'rgba(34, 197, 94, 0.22)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Paper
          sx={{
            mb: 4,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#fff',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
            boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)',
            animation: 'fadeUpSoft .45s ease-out'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <SecurityIcon sx={{ fontSize: 44, color: '#bef264' }} />
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#fff' }}>
                Profile Settings
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Update your personal information and security settings
              </Typography>
            </Box>
          </Box>
          {verificationStatus && (
            <Alert
              severity={verificationStatus === 'approved' ? 'success' : verificationStatus === 'rejected' ? 'error' : 'info'}
              sx={{ mt: 1.5, borderRadius: 2 }}
            >
              ID Verification Status: <strong>{verificationStatus}</strong>
            </Alert>
          )}
        </Paper>

        <Grid container spacing={3}>
          {/* Left Column - Basic Info & Profile Picture */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: '20px', 
              mb: 3,
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
              border: `1px solid ${themeColors.border}`,
              backgroundColor: themeColors.cardBackground
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    src={profilePhoto}
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
                    component="label"
                    disabled={uploadingPhoto}
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      bgcolor: 'white',
                      '&:hover': { bgcolor: 'grey.100' },
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      opacity: uploadingPhoto ? 0.6 : 1
                    }}
                  >
                    {uploadingPhoto ? (
                      <CircularProgress size={20} />
                    ) : (
                      <CameraIcon />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleProfilePhotoUpload}
                    />
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

              {/* Move-out (Residents) */}
              {user?.role === 'resident' && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, fontWeight: 600 }}>
                    <HomeIcon />
                    Move-out
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                    Request to vacate your lot. An admin must approve the request to update the lot and deactivate the account.
                  </Typography>

                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Chip
                      size="small"
                      label={`Status: ${user?.moveOutStatus || 'none'}`}
                      sx={{
                        bgcolor: (user?.moveOutStatus === 'pending' ? themeColors.warning : user?.moveOutStatus === 'approved' ? themeColors.success : themeColors.border) + '15',
                        color: user?.moveOutStatus === 'pending' ? themeColors.warning : user?.moveOutStatus === 'approved' ? themeColors.success : themeColors.textSecondary,
                        fontWeight: 700,
                        textTransform: 'capitalize'
                      }}
                    />
                    <Button
                      variant="outlined"
                      disabled={!user?.isApproved || !user?.isActive || user?.moveOutStatus === 'pending' || user?.moveOutStatus === 'approved'}
                      onClick={() => setMoveOutDialogOpen(true)}
                      sx={{
                        borderRadius: 2.5,
                        borderColor: themeColors.warning,
                        color: themeColors.warning,
                        textTransform: 'none',
                        fontWeight: 800,
                        '&:hover': { backgroundColor: themeColors.warning + '08' }
                      }}
                    >
                      Request move-out
                    </Button>
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 3, borderColor: themeColors.border }} />

              {/* Uploaded Documents Section */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, fontWeight: 600 }}>
                  <PersonIcon />
                  Uploaded Documents
                </Typography>
                
                {uploadedDocuments ? (
                  <Box sx={{ mt: 2 }}>
                    {uploadedDocuments.selfieImage && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.textPrimary, mb: 1 }}>
                          Profile Picture
                        </Typography>
                        <Box
                          component="img"
                          src={buildDocumentUrl(uploadedDocuments.selfieImage)}
                          alt="Profile Picture"
                          sx={{
                            width: '100%',
                            maxWidth: 200,
                            height: 150,
                            objectFit: 'cover',
                            borderRadius: 2,
                            border: `1px solid ${themeColors.border}`,
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              transform: 'scale(1.02)',
                              boxShadow: `0 4px 12px rgba(22, 163, 74, 0.2)`
                            }
                          }}
                          onClick={() => openPreview(buildDocumentUrl(uploadedDocuments.selfieImage), 'Profile Picture')}
                        />
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {uploadedDocuments.frontImage && (
                        <Box sx={{ flex: 1, minWidth: 150 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.textPrimary, mb: 1 }}>
                            ID Front
                          </Typography>
                          <Box
                            component="img"
                            src={buildDocumentUrl(uploadedDocuments.frontImage)}
                            alt="ID Front"
                            sx={{
                              width: '100%',
                              height: 120,
                              objectFit: 'cover',
                              borderRadius: 2,
                              border: `1px solid ${themeColors.border}`,
                              cursor: 'pointer',
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              '&:hover': {
                                transform: 'scale(1.02)',
                                boxShadow: `0 4px 12px rgba(22, 163, 74, 0.2)`
                              }
                            }}
                            onClick={() => openPreview(buildDocumentUrl(uploadedDocuments.frontImage), 'ID Front')}
                          />
                        </Box>
                      )}
                      
                      {uploadedDocuments.backImage && (
                        <Box sx={{ flex: 1, minWidth: 150 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.textPrimary, mb: 1 }}>
                            ID Back
                          </Typography>
                          <Box
                            component="img"
                            src={buildDocumentUrl(uploadedDocuments.backImage)}
                            alt="ID Back"
                            sx={{
                              width: '100%',
                              height: 120,
                              objectFit: 'cover',
                              borderRadius: 2,
                              border: `1px solid ${themeColors.border}`,
                              cursor: 'pointer',
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              '&:hover': {
                                transform: 'scale(1.02)',
                                boxShadow: `0 4px 12px rgba(22, 163, 74, 0.2)`
                              }
                            }}
                            onClick={() => openPreview(buildDocumentUrl(uploadedDocuments.backImage), 'ID Back')}
                          />
                        </Box>
                      )}
                    </Box>
                    
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedUserIcon 
                        sx={{ 
                          color: uploadedDocuments.documentsVerified ? themeColors.success : themeColors.warning,
                          fontSize: 18
                        }} 
                      />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: uploadedDocuments.documentsVerified ? themeColors.success : themeColors.warning,
                          fontWeight: 600
                        }}
                      >
                        {uploadedDocuments.documentsVerified ? 'Documents Verified' : 'Verification Pending'}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <PersonIcon sx={{ fontSize: 48, color: themeColors.textSecondary, mb: 1 }} />
                    <Typography variant="body1" sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                      No documents uploaded yet
                    </Typography>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, mt: 0.5 }}>
                      Documents are uploaded during registration
                    </Typography>
                  </Box>
                )}
              </Box>

              <Dialog
                open={previewOpen}
                onClose={closePreview}
                maxWidth="md"
                fullWidth
                PaperProps={{
                  sx: {
                    borderRadius: 3,
                    backgroundColor: themeColors.cardBackground,
                    overflow: 'hidden'
                  }
                }}
              >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  {previewTitle}
                  <Button onClick={closePreview} variant="text" sx={{ textTransform: 'none' }}>
                    Close
                  </Button>
                </DialogTitle>
                <DialogContent sx={{ p: 0, backgroundColor: themeColors.background }}>
                  {previewImage && (
                    <Box
                      component="img"
                      src={previewImage}
                      alt={previewTitle}
                      sx={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '75vh',
                        objectFit: 'contain',
                        backgroundColor: themeColors.paperBackground
                      }}
                    />
                  )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleDownload(previewImage, previewTitle.replace(/\s+/g, '_'))}
                    sx={{ textTransform: 'none' }}
                  >
                    Download
                  </Button>
                  <Button onClick={closePreview} variant="contained" sx={{ textTransform: 'none' }}>
                    Close
                  </Button>
                </DialogActions>
              </Dialog>

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
                    borderRadius: 2.5,
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                    textTransform: 'none',
                    fontWeight: 700,
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

            {/* Move-out Request Dialog */}
            <Dialog open={moveOutDialogOpen} onClose={() => !moveOutSubmitting && setMoveOutDialogOpen(false)} fullWidth maxWidth="sm">
              <DialogTitle sx={{ fontWeight: 800 }}>Request move-out</DialogTitle>
              <DialogContent>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 2 }}>
                  This will notify the admin to review your request. Once approved, your lot will be set to vacant and your account will be deactivated.
                </Typography>
                <TextField
                  fullWidth
                  label="Reason (optional)"
                  value={moveOutReason}
                  onChange={(e) => setMoveOutReason(e.target.value)}
                  multiline
                  minRows={3}
                />
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setMoveOutDialogOpen(false)} disabled={moveOutSubmitting} sx={{ textTransform: 'none' }}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={submitMoveOutRequest}
                  disabled={moveOutSubmitting}
                  sx={{ bgcolor: themeColors.warning, '&:hover': { bgcolor: '#d97706' }, textTransform: 'none', fontWeight: 800 }}
                >
                  {moveOutSubmitting ? 'Submitting…' : 'Submit request'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Quick Stats */}
            <Paper sx={{ 
              p: 3, 
              borderRadius: '20px',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
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
              borderRadius: '20px',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
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
                    borderRadius: 2.5,
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                    textTransform: 'none',
                    fontWeight: 700,
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
                    borderRadius: 2.5,
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                    textTransform: 'none',
                    fontWeight: 700,
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
                      borderRadius: 2.5,
                      textTransform: 'none',
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