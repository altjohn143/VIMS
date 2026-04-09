// Register.js - Updated with country code dropdown
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
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Drawer,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  Email as EmailIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  ArrowBack as ArrowBackIcon,
  HowToReg as RegisterIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon,
  Map as MapIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from '../config/axios';
import toast from 'react-hot-toast';

// Import the LotMap component
import LotSelectionMap from '../components/LotSelectionMap';

// Country codes data
const COUNTRY_CODES = [
  { code: '+63', country: 'Philippines', flag: '🇵🇭', prefix: '63' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸', prefix: '1' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', prefix: '44' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', prefix: '61' },
  { code: '+81', country: 'Japan', flag: '🇯🇵', prefix: '81' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷', prefix: '82' },
  { code: '+86', country: 'China', flag: '🇨🇳', prefix: '86' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', prefix: '65' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾', prefix: '60' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭', prefix: '66' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳', prefix: '84' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩', prefix: '62' },
  { code: '+971', country: 'UAE', flag: '🇦🇪', prefix: '971' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', prefix: '966' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', prefix: '49' },
  { code: '+33', country: 'France', flag: '🇫🇷', prefix: '33' },
  { code: '+39', country: 'Italy', flag: '🇮🇹', prefix: '39' },
  { code: '+34', country: 'Spain', flag: '🇪🇸', prefix: '34' },
];

const EMPTY_VEHICLE = { plateNumber: '', make: '', model: '', color: '' };
const EMPTY_FAMILY_MEMBER = { name: '', relationship: '', otherRelationship: '', age: '', phone: '' };
const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Brother', 'Sister', 'Spouse', 'Son', 'Daughter', 'Grandparent', 'Other'];

const Register = () => {
  const themeColors = {
    primary: '#2d5016',
    primaryLight: '#5a8a1a',
    primaryDark: '#1a3a0a',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    border: 'rgba(45, 80, 22, 0.15)',
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+63',
    password: '',
    confirmPassword: '',
    role: 'resident',
    selectedLot: '',
    noVehicles: false,
    soloResident: false,
    vehicles: [EMPTY_VEHICLE],
    familyMembers: [EMPTY_FAMILY_MEMBER]
  });
  const [idDocs, setIdDocs] = useState({
    frontImage: null,
    backImage: null,
    selfieImage: null
  });
  const [ocrLoading, setOcrLoading] = useState(false);

  const [availableLots, setAvailableLots] = useState([]);
  const [allLots, setAllLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [selectedLotDetails, setSelectedLotDetails] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({ email: null, phone: null });
  const [checkingAvailability, setCheckingAvailability] = useState({ email: false, phone: false });
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [mapViewMode, setMapViewMode] = useState('available');

  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch all lots (for map display)
  const fetchAllLots = async () => {
    try {
      const response = await axios.get('/api/lots');
      if (response.data.success) {
        setAllLots(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching all lots:', error);
    }
  };

  // Fetch available lots on component mount
  useEffect(() => {
    const fetchAvailableLots = async () => {
      try {
        setLoadingLots(true);
        const response = await axios.get('/api/lots/available');
        if (response.data.success) {
          setAvailableLots(response.data.data);
          
          // Check if there's a pre-selected lot from URL
          const params = new URLSearchParams(location.search);
          const lot = params.get('lot');
          const block = params.get('block');
          if (lot && block) {
            const lotId = `${block}-${lot}`;
            const preSelectedLot = response.data.data.find(l => l.lotId === lotId);
            if (preSelectedLot) {
              setFormData(prev => ({ ...prev, selectedLot: lotId }));
              setSelectedLotDetails(preSelectedLot);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching available lots:', error);
      } finally {
        setLoadingLots(false);
      }
    };
    
    fetchAvailableLots();
    fetchAllLots();
  }, [location.search]);

  // Email availability check
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

  // Phone availability check
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
      case 'countryCode':
        filteredValue = value;
        break;
      default:
        filteredValue = value;
    }
    
    setFormData(prev => ({ ...prev, [name]: filteredValue }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name === 'selectedLot') {
      const selected = availableLots.find(lot => lot.lotId === filteredValue);
      setSelectedLotDetails(selected || null);
    }
    
    if ((name === 'email' && !filteredValue) || (name === 'phone' && !filteredValue)) {
      setAvailability(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleVehicleChange = (index, field, value) => {
    setFormData(prev => {
      const vehicles = [...prev.vehicles];
      vehicles[index] = { ...vehicles[index], [field]: value };
      return { ...prev, vehicles };
    });
  };

  const handleFamilyChange = (index, field, value) => {
    setFormData(prev => {
      const familyMembers = [...prev.familyMembers];
      if (field === 'phone') {
        familyMembers[index] = { ...familyMembers[index], phone: value.replace(/\D/g, '').slice(0, 10) };
      } else if (field === 'relationship' && value !== 'Other') {
        familyMembers[index] = { ...familyMembers[index], relationship: value, otherRelationship: '' };
      } else {
        familyMembers[index] = { ...familyMembers[index], [field]: value };
      }
      return { ...prev, familyMembers };
    });
  };

  const addVehicle = () => setFormData(prev => ({ ...prev, vehicles: [...prev.vehicles, EMPTY_VEHICLE] }));
  const removeVehicle = (index) =>
    setFormData(prev => ({ ...prev, vehicles: prev.vehicles.filter((_, i) => i !== index) }));
  const addFamilyMember = () =>
    setFormData(prev => ({ ...prev, familyMembers: [...prev.familyMembers, EMPTY_FAMILY_MEMBER] }));
  const removeFamilyMember = (index) =>
    setFormData(prev => ({ ...prev, familyMembers: prev.familyMembers.filter((_, i) => i !== index) }));

  // Handle lot selection from the map
  const handleLotSelectFromMap = (lot) => {
    if (lot.status === 'vacant') {
      setFormData(prev => ({ ...prev, selectedLot: lot.lotId }));
      setSelectedLotDetails(lot);
      setMapDrawerOpen(false);
      toast.success(`Lot ${lot.lotId} selected!`);
    } else {
      toast.error(`Lot ${lot.lotId} is not available for registration.`);
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
    
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^9\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Phone number must be 10 digits starting with 9 (e.g., 9662342234)';
      }
    }
    if (availability.phone === false) newErrors.phone = 'This phone number is already registered';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (!formData.selectedLot) newErrors.selectedLot = 'Please select a lot from the map or dropdown';

    formData.familyMembers.forEach((member, index) => {
      const hasData = member.name || member.relationship || member.otherRelationship || member.age || member.phone;
      if (!hasData) return;

      if (formData.soloResident) return;

      if (!member.name?.trim()) {
        newErrors[`familyName_${index}`] = 'Name is required';
      }
      if (!member.relationship?.trim()) {
        newErrors[`familyRelationship_${index}`] = 'Relationship is required';
      }
      if (member.relationship === 'Other' && !member.otherRelationship?.trim()) {
        newErrors[`familyOtherRelationship_${index}`] = 'Please specify relationship';
      }
      if (!/^9\d{9}$/.test(member.phone || '')) {
        newErrors[`familyPhone_${index}`] = 'Phone must be 10 digits starting with 9';
      }
    });
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
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
      selectedLot: formData.selectedLot,
      countryCode: formData.countryCode,
      noVehicles: formData.noVehicles,
      soloResident: formData.soloResident,
      vehicles: formData.noVehicles
        ? []
        : formData.vehicles.filter(v => v.plateNumber || v.make || v.model || v.color),
      familyMembers: formData.soloResident
        ? []
        : formData.familyMembers
        .filter(m => m.name || m.relationship || m.otherRelationship || m.age || m.phone)
        .map(m => ({
          name: m.name,
          relationship: m.relationship === 'Other' ? m.otherRelationship : m.relationship,
          age: m.age,
          phone: m.phone
        }))
    };
    
    const result = await register(registrationData);
    if (result.success) {
      try {
        if (idDocs.frontImage && idDocs.backImage) {
          const multipart = new FormData();
          multipart.append('email', registrationData.email.toLowerCase());
          multipart.append('frontImage', idDocs.frontImage);
          multipart.append('backImage', idDocs.backImage);
          if (idDocs.selfieImage) multipart.append('selfieImage', idDocs.selfieImage);
          await axios.post('/api/verifications/upload-id', multipart, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      } catch (uploadError) {
        const status = uploadError?.response?.status;
        const serverMessage =
          uploadError?.response?.data?.error ||
          uploadError?.response?.data?.message ||
          uploadError?.message;
        toast.error(
          `Registration succeeded, but ID upload failed${status ? ` (${status})` : ''}${
            serverMessage ? `: ${serverMessage}` : '.'
          }`
        );
      }
      navigate('/pending-approval');
    } else {
      setErrors(prev => ({ ...prev, submit: result.error || 'Registration failed' }));
    }
    setLoading(false);
  };

  const tryOcrAutofill = async (nextFront, nextBack) => {
    if (!nextFront || !nextBack) return;
    if (ocrLoading) return;

    setOcrLoading(true);
    try {
      const multipart = new FormData();
      multipart.append('frontImage', nextFront);
      multipart.append('backImage', nextBack);

      const res = await axios.post('/api/verifications/ocr-id', multipart, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data?.data) {
        const ocr = res.data.data;
        setFormData((prev) => ({
          ...prev,
          firstName: prev.firstName?.trim() ? prev.firstName : (ocr.firstName || prev.firstName),
          lastName: prev.lastName?.trim() ? prev.lastName : (ocr.lastName || prev.lastName)
        }));

        const conf = typeof ocr.confidence === 'number' ? ocr.confidence : null;
        toast.success(`ID scanned${conf !== null ? ` (confidence ${(conf * 100).toFixed(0)}%)` : ''}. Please review your details.`);
      }
    } catch (err) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      toast.error(`Couldn't scan ID${status ? ` (${status})` : ''}${serverMessage ? `: ${serverMessage}` : ''}`);
    } finally {
      setOcrLoading(false);
    }
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

  // Get selected country display
  const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.countryCode) || COUNTRY_CODES[0];

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
      <Container maxWidth="md">
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
              <strong>Lot pre-selected from the village map!</strong> Confirm your selection below.
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

              {/* Phone with Country Code */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  {/* Country Code Dropdown */}
                  <FormControl sx={{ width: '130px' }} size="small">
                    <InputLabel sx={{ color: themeColors.textSecondary }}>Country</InputLabel>
                    <Select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleChange}
                      label="Country"
                      sx={{
                        borderRadius: 2,
                        backgroundColor: '#f8faf5',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: themeColors.border
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: themeColors.primary
                        },
                        '& .MuiSelect-select': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 1.5
                        }
                      }}
                    >
                      {COUNTRY_CODES.map((country) => (
                        <MenuItem key={country.code} value={country.code}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{country.flag}</span>
                            <span>{country.code}</span>
                            <Typography variant="caption" sx={{ color: themeColors.textSecondary, ml: 0.5 }}>
                              ({country.country})
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Phone Number Field */}
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={!!errors.phone}
                    helperText={errors.phone || 'Enter 10 digits starting with 9 (e.g., 9662342234)'}
                    required
                    placeholder="9662342234"
                    inputProps={{ maxLength: 10, inputMode: 'numeric' }}
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
                </Box>
                <Typography variant="caption" sx={{ color: themeColors.textSecondary, mt: 0.5, display: 'block' }}>
                  {selectedCountry.flag} {selectedCountry.code} - Philippine format: Remove the leading 0 from your number (e.g., 0966-234-2234 → 9662342234)
                </Typography>
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

              {/* Lot Selection Section - Enhanced with Map Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
                    Select Your Lot
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<MapIcon />}
                    onClick={() => setMapDrawerOpen(true)}
                    sx={{
                      color: themeColors.primary,
                      textTransform: 'none',
                      '&:hover': { backgroundColor: themeColors.primary + '08' }
                    }}
                  >
                    View Map
                  </Button>
                </Box>
                
                {loadingLots ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={30} sx={{ color: themeColors.primary }} />
                    <Typography sx={{ ml: 2, color: themeColors.textSecondary }}>Loading available lots...</Typography>
                  </Box>
                ) : availableLots.length === 0 ? (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    No available lots found. Please check back later or contact admin.
                  </Alert>
                ) : (
                  <>
                    <FormControl fullWidth error={!!errors.selectedLot}>
                      <InputLabel sx={{ color: themeColors.textSecondary }}>Choose a lot</InputLabel>
                      <Select
                        name="selectedLot"
                        value={formData.selectedLot}
                        onChange={handleChange}
                        label="Choose a lot"
                        required
                        sx={{
                          borderRadius: 2,
                          backgroundColor: '#f8faf5',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: themeColors.border
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: themeColors.primary
                          }
                        }}
                      >
                        <MenuItem value="" disabled>Select an available lot</MenuItem>
                        {availableLots.map((lot) => (
                          <MenuItem key={lot.lotId} value={lot.lotId}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <span>
                                <strong>{lot.lotId}</strong> - {lot.type}
                              </span>
                              <span style={{ color: themeColors.textSecondary }}>
                                {lot.sqm} sqm
                              </span>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    {errors.selectedLot && (
                      <Typography variant="caption" sx={{ color: themeColors.error, mt: 0.5, display: 'block' }}>
                        {errors.selectedLot}
                      </Typography>
                    )}
                    
                    {/* Selected Lot Details Card */}
                    {selectedLotDetails && (
                      <Card sx={{ mt: 2, borderRadius: 2, backgroundColor: themeColors.primary + '08', border: `1px solid ${themeColors.primary}20` }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <LocationIcon sx={{ color: themeColors.primary, fontSize: 18 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: themeColors.primary }}>
                              Selected Lot Details
                            </Typography>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>Lot ID:</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedLotDetails.lotId}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>Type:</Typography>
                              <Typography variant="body2">{selectedLotDetails.type}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>Area:</Typography>
                              <Typography variant="body2">{selectedLotDetails.sqm} sqm</Typography>
                            </Grid>
                            {selectedLotDetails.price && (
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>Price:</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.primary }}>
                                  ₱{selectedLotDetails.price.toLocaleString()}
                                </Typography>
                              </Grid>
                            )}
                          </Grid>
                        </CardContent>
                      </Card>
                    )}
                    
                    <Alert 
                      severity="info" 
                      sx={{ 
                        mt: 2, 
                        borderRadius: 2,
                        backgroundColor: themeColors.info + '10',
                        border: `1px solid ${themeColors.info}30`
                      }}
                      icon={<InfoIcon />}
                    >
                      <Typography variant="caption">
                        Click "View Map" to see the interactive lot map and choose your lot visually.
                        Once you register, your selected lot will be reserved pending admin approval.
                      </Typography>
                    </Alert>
                  </>
                )}
              </Grid>

              {/* Vehicle Information */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: themeColors.textPrimary, mb: 1 }}>
                  Vehicle Information
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.noVehicles}
                      onChange={(e) => setFormData(prev => ({ ...prev, noVehicles: e.target.checked }))}
                    />
                  }
                  label="I don't have any vehicle"
                />
                {!formData.noVehicles && formData.vehicles.map((vehicle, index) => (
                  <Grid container spacing={1} key={`vehicle_${index}`} sx={{ mb: 1 }}>
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth label="Plate Number" value={vehicle.plateNumber} onChange={(e) => handleVehicleChange(index, 'plateNumber', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth label="Make" value={vehicle.make} onChange={(e) => handleVehicleChange(index, 'make', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth label="Model" value={vehicle.model} onChange={(e) => handleVehicleChange(index, 'model', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField fullWidth label="Color" value={vehicle.color} onChange={(e) => handleVehicleChange(index, 'color', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      <Button onClick={() => removeVehicle(index)} disabled={formData.vehicles.length === 1}>-</Button>
                    </Grid>
                  </Grid>
                ))}
                {!formData.noVehicles && (
                  <Button size="small" onClick={addVehicle}>Add Vehicle</Button>
                )}
              </Grid>

              {/* Family Members */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: themeColors.textPrimary, mb: 1 }}>
                  Family Members
                </Typography>
                <FormControlLabel
                  sx={{ mb: 1 }}
                  control={
                    <Checkbox
                      checked={formData.soloResident}
                      onChange={(e) => setFormData(prev => ({ ...prev, soloResident: e.target.checked }))}
                    />
                  }
                  label="I am a solo resident (no family members)"
                />
                {!formData.soloResident && formData.familyMembers.map((member, index) => (
                  <Grid container spacing={1} key={`family_${index}`} sx={{ mb: 1 }}>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Name"
                        value={member.name}
                        onChange={(e) => handleFamilyChange(index, 'name', e.target.value)}
                        error={!!errors[`familyName_${index}`]}
                        helperText={errors[`familyName_${index}`]}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth error={!!errors[`familyRelationship_${index}`]}>
                        <InputLabel>Relationship</InputLabel>
                        <Select
                          value={member.relationship}
                          label="Relationship"
                          onChange={(e) => handleFamilyChange(index, 'relationship', e.target.value)}
                        >
                          {RELATIONSHIP_OPTIONS.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    {member.relationship === 'Other' && (
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          label="Specify relationship"
                          value={member.otherRelationship}
                          onChange={(e) => handleFamilyChange(index, 'otherRelationship', e.target.value)}
                          error={!!errors[`familyOtherRelationship_${index}`]}
                          helperText={errors[`familyOtherRelationship_${index}`]}
                        />
                      </Grid>
                    )}
                    <Grid item xs={12} sm={member.relationship === 'Other' ? 1 : 2}>
                      <TextField
                        fullWidth
                        label="Age"
                        type="number"
                        value={member.age}
                        onChange={(e) => handleFamilyChange(index, 'age', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={member.relationship === 'Other' ? 2 : 3}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={member.phone}
                        onChange={(e) => handleFamilyChange(index, 'phone', e.target.value)}
                        error={!!errors[`familyPhone_${index}`]}
                        helperText={errors[`familyPhone_${index}`] || '10 digits starting with 9'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      <Button onClick={() => removeFamilyMember(index)} disabled={formData.familyMembers.length === 1}>-</Button>
                    </Grid>
                  </Grid>
                ))}
                {!formData.soloResident && (
                  <Button size="small" onClick={addFamilyMember}>Add Family Member</Button>
                )}
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 1, mb: 1, color: themeColors.textPrimary }}>
                Valid ID Verification
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: themeColors.textSecondary }}>
                Upload front and back image of a valid ID. This is required for admin verification.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Button variant="outlined" component="label" fullWidth>
                    Upload ID Front
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setIdDocs((prev) => {
                          const next = { ...prev, frontImage: file };
                          queueMicrotask(() => tryOcrAutofill(next.frontImage, next.backImage));
                          return next;
                        });
                      }}
                    />
                  </Button>
                  <Typography variant="caption">{idDocs.frontImage?.name || 'No file selected'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button variant="outlined" component="label" fullWidth>
                    Upload ID Back
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setIdDocs((prev) => {
                          const next = { ...prev, backImage: file };
                          queueMicrotask(() => tryOcrAutofill(next.frontImage, next.backImage));
                          return next;
                        });
                      }}
                    />
                  </Button>
                  <Typography variant="caption">{idDocs.backImage?.name || 'No file selected'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button variant="outlined" component="label" fullWidth>
                    Upload Selfie (Optional)
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => setIdDocs((prev) => ({ ...prev, selfieImage: e.target.files?.[0] || null }))}
                    />
                  </Button>
                  <Typography variant="caption">{idDocs.selfieImage?.name || 'No file selected'}</Typography>
                </Grid>
              </Grid>
              {ocrLoading && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: themeColors.textSecondary }}>
                  Scanning ID to autofill details…
                </Typography>
              )}
            </Grid>

            {/* Submit button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || loadingLots || availableLots.length === 0}
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

      {/* Map Drawer - Shows the interactive lot map */}
      <Drawer
        anchor="right"
        open={mapDrawerOpen}
        onClose={() => setMapDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: '80%', md: '70%', lg: '60%' },
            maxWidth: '1000px',
            borderRadius: { xs: 0, sm: '16px 0 0 16px' },
            overflow: 'hidden'
          }
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Drawer Header */}
          <Box sx={{
            p: 2,
            backgroundColor: themeColors.primary,
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MapIcon />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Select Your Lot from the Map
              </Typography>
            </Box>
            <IconButton onClick={() => setMapDrawerOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* View Toggle */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${themeColors.border}`, display: 'flex', gap: 2 }}>
            <Chip
              label="Available Lots Only"
              onClick={() => setMapViewMode('available')}
              color={mapViewMode === 'available' ? 'primary' : 'default'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="All Lots"
              onClick={() => setMapViewMode('all')}
              color={mapViewMode === 'all' ? 'primary' : 'default'}
              sx={{ cursor: 'pointer' }}
            />
          </Box>

          {/* Lot Selection Map Component */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <LotSelectionMap
              lots={mapViewMode === 'available' ? availableLots : allLots}
              selectedLotId={formData.selectedLot}
              onSelectLot={handleLotSelectFromMap}
              themeColors={themeColors}
            />
          </Box>

          {/* Footer with instruction */}
          <Box sx={{
            p: 2,
            borderTop: `1px solid ${themeColors.border}`,
            backgroundColor: themeColors.background,
            textAlign: 'center'
          }}>
            <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
              Click on any <span style={{ color: themeColors.success, fontWeight: 'bold' }}>green (vacant)</span> lot to select it for registration.
              {mapViewMode === 'available' && ' Only available lots are shown.'}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Register;