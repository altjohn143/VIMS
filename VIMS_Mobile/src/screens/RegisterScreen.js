// src/screens/RegisterScreen.js - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';

const RegisterScreen = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    selectedLot: ''
  });

  const [availableLots, setAvailableLots] = useState([]);
  const [allLots, setAllLots] = useState([]);
  const [selectedLotDetails, setSelectedLotDetails] = useState(null);
  const [loadingLots, setLoadingLots] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({ email: null, phone: null });
  const [checkingAvailability, setCheckingAvailability] = useState({ email: false, phone: false });
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapViewMode, setMapViewMode] = useState('available');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLotDropdown, setShowLotDropdown] = useState(false);

  // Fetch available lots on component mount
  useEffect(() => {
    fetchAvailableLots();
    fetchAllLots();
  }, []);

  // Check for pre-selected lot from route params (from PublicLotMap)
  useEffect(() => {
    if (route.params?.lot && route.params?.block && availableLots.length > 0) {
      const lotId = `${route.params.block}-${route.params.lot}`;
      const preSelectedLot = availableLots.find(l => l.lotId === lotId);
      if (preSelectedLot) {
        setFormData(prev => ({ ...prev, selectedLot: lotId }));
        setSelectedLotDetails(preSelectedLot);
      }
    }
  }, [route.params, availableLots]);

  const fetchAvailableLots = async () => {
    try {
      setLoadingLots(true);
      setLoadError(null);
      console.log('🔍 Fetching available lots from API...');
      
      // Try both possible endpoints
      let response;
      try {
        response = await api.get('/lots/available');
      } catch (firstError) {
        console.log('First endpoint failed, trying /lots');
        response = await api.get('/lots');
      }
      
      console.log('📦 API Response:', response.data);
      
      if (response.data.success) {
        // Filter only vacant lots
        const vacantLots = response.data.data.filter(lot => lot.status === 'vacant');
        setAvailableLots(vacantLots);
        console.log(`✅ Loaded ${vacantLots.length} available lots`);
        
        if (vacantLots.length === 0) {
          setLoadError('No vacant lots available. Please contact admin.');
        }
      } else {
        setLoadError('Failed to load lots data');
      }
    } catch (error) {
      console.error('❌ Error fetching available lots:', error);
      console.error('Error details:', error.response?.data || error.message);
      setLoadError(error.response?.data?.error || 'Failed to connect to server');
      Alert.alert('Connection Error', `Cannot load lots. Make sure backend is running at ${api.defaults.baseURL}`);
    } finally {
      setLoadingLots(false);
    }
  };

  const fetchAllLots = async () => {
    try {
      console.log('🔍 Fetching all lots from API...');
      const response = await api.get('/lots');
      console.log('📦 All lots response:', response.data);
      
      if (response.data.success) {
        setAllLots(response.data.data);
        console.log(`✅ Loaded ${response.data.data.length} total lots`);
      }
    } catch (error) {
      console.error('❌ Error fetching all lots:', error);
    }
  };

  // Email availability check
  useEffect(() => {
    const checkEmailAvailability = async () => {
      if (!formData.email || !isValidEmail(formData.email)) return;
      setCheckingAvailability(prev => ({ ...prev, email: true }));
      try {
        const response = await api.post('/auth/check-availability', { 
          type: 'email', 
          value: formData.email 
        });
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
        const response = await api.post('/auth/check-availability', { 
          type: 'phone', 
          value: formData.phone 
        });
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

  const handleChange = (field, value) => {
    let filteredValue = value;
    
    if (field === 'firstName' || field === 'lastName') {
      filteredValue = value.replace(/[^a-zA-Z\s-]/g, '');
    } else if (field === 'phone') {
      filteredValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev => ({ ...prev, [field]: filteredValue }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (field === 'selectedLot') {
      const selected = availableLots.find(lot => lot.lotId === filteredValue);
      setSelectedLotDetails(selected || null);
    }
  };

  const handleLotSelect = (lot) => {
    console.log('🎯 Lot selected:', lot);
    if (lot.status === 'vacant') {
      setFormData(prev => ({ ...prev, selectedLot: lot.lotId }));
      setSelectedLotDetails(lot);
      setShowLotDropdown(false);
      setShowMapModal(false);
      Alert.alert('Lot Selected', `You selected Lot ${lot.lotId} (${lot.sqm} sqm, ${lot.type})`);
    } else {
      Alert.alert('Not Available', `Lot ${lot.lotId} is not available for registration.`);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    } else if (availability.email === false) {
      newErrors.email = 'This email is already registered';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    } else if (availability.phone === false) {
      newErrors.phone = 'This phone number is already registered';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.selectedLot) {
      newErrors.selectedLot = 'Please select a lot';
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Validation Error', 'Please check all fields');
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        password: formData.password,
        role: 'resident',
        selectedLot: formData.selectedLot
      };

      console.log('📤 Submitting registration:', registrationData);
      const response = await api.post('/auth/register', registrationData);
      
      if (response.data.success) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityIcon = (field) => {
    if (checkingAvailability[field]) {
      return <ActivityIndicator size="small" color={themeColors.primary} />;
    }
    if (availability[field] === true) {
      return <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />;
    }
    if (availability[field] === false) {
      return <Ionicons name="close-circle" size={20} color={themeColors.error} />;
    }
    return null;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleRetryLoad = () => {
    fetchAvailableLots();
    fetchAllLots();
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={32} color="white" />
          </View>
          <View>
            <Text style={styles.subtitle}>WESTVILLE CASIMIRO HOMES</Text>
            <Text style={styles.title}>Resident Registration</Text>
          </View>
        </View>

        {/* Pre-selected lot notice */}
        {route.params?.lot && (
          <View style={styles.successAlert}>
            <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
            <Text style={styles.alertText}>
              Lot pre-selected! Block {route.params.block}, Lot {route.params.lot}
            </Text>
          </View>
        )}

        {/* Form Card */}
        <View style={[styles.formCard, shadows.medium]}>
          {/* First Name */}
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={(text) => handleChange('firstName', text)}
            />
          </View>
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={(text) => handleChange('lastName', text)}
            />
          </View>
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

          {/* Email */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {getAvailabilityIcon('email')}
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Phone */}
          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={formData.phone}
              onChangeText={(text) => handleChange('phone', text)}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {getAvailabilityIcon('phone')}
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          {/* Password */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange('confirmPassword', text)}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          {/* Lot Selection Section */}
          <Text style={styles.sectionLabel}>Select Your Lot</Text>
          
          {loadingLots ? (
            <View style={styles.loadingLotsContainer}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={styles.loadingLotsText}>Loading available lots...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={themeColors.error} />
              <Text style={styles.errorBoxText}>{loadError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetryLoad}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : availableLots.length === 0 ? (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color={themeColors.warning} />
              <Text style={styles.warningText}>No available lots found. Please contact admin.</Text>
            </View>
          ) : (
            <>
              {/* Dropdown Button */}
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowLotDropdown(true)}
              >
                <View style={styles.dropdownLeft}>
                  <Ionicons name="home" size={20} color={themeColors.textSecondary} />
                  <Text style={styles.dropdownText}>
                    {formData.selectedLot 
                      ? `${formData.selectedLot} - ${selectedLotDetails?.type || ''} (${selectedLotDetails?.sqm} sqm)`
                      : `Select a lot (${availableLots.length} available)`}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
              
              {errors.selectedLot && <Text style={styles.errorText}>{errors.selectedLot}</Text>}
              
              {/* Map Button */}
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={() => setShowMapModal(true)}
              >
                <Ionicons name="map" size={20} color={themeColors.primary} />
                <Text style={styles.mapButtonText}>View Interactive Lot Map</Text>
              </TouchableOpacity>
              
              {/* Selected Lot Details */}
              {selectedLotDetails && (
                <View style={styles.selectedLotCard}>
                  <View style={styles.selectedLotHeader}>
                    <Ionicons name="location" size={18} color={themeColors.primary} />
                    <Text style={styles.selectedLotTitle}>Selected Lot Details</Text>
                  </View>
                  <View style={styles.selectedLotGrid}>
                    <View style={styles.selectedLotItem}>
                      <Text style={styles.selectedLotLabel}>Lot ID:</Text>
                      <Text style={styles.selectedLotValue}>{selectedLotDetails.lotId}</Text>
                    </View>
                    <View style={styles.selectedLotItem}>
                      <Text style={styles.selectedLotLabel}>Type:</Text>
                      <Text style={styles.selectedLotValue}>{selectedLotDetails.type}</Text>
                    </View>
                    <View style={styles.selectedLotItem}>
                      <Text style={styles.selectedLotLabel}>Area:</Text>
                      <Text style={styles.selectedLotValue}>{selectedLotDetails.sqm} sqm</Text>
                    </View>
                    {selectedLotDetails.price && (
                      <View style={styles.selectedLotItem}>
                        <Text style={styles.selectedLotLabel}>Price:</Text>
                        <Text style={[styles.selectedLotValue, { color: themeColors.success }]}>
                          {formatCurrency(selectedLotDetails.price)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
              
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={18} color={themeColors.info} />
                <Text style={styles.infoText}>
                  Once you register, your selected lot will be reserved pending admin approval.
                </Text>
              </View>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (loading || loadingLots || availableLots.length === 0) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || loadingLots || availableLots.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Lot Dropdown Modal */}
      <Modal
        visible={showLotDropdown}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLotDropdown(false)}
      >
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Select a Lot ({availableLots.length} available)</Text>
              <TouchableOpacity onPress={() => setShowLotDropdown(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={availableLots}
              keyExtractor={(item) => item.lotId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.lotOption,
                    formData.selectedLot === item.lotId && styles.lotOptionSelected
                  ]}
                  onPress={() => handleLotSelect(item)}
                >
                  <View style={styles.lotOptionLeft}>
                    <Text style={styles.lotOptionId}>{item.lotId}</Text>
                    <Text style={styles.lotOptionType}>{item.type}</Text>
                  </View>
                  <View style={styles.lotOptionRight}>
                    <Text style={styles.lotOptionSqm}>{item.sqm} sqm</Text>
                    <Text style={[styles.lotOptionPrice, { color: themeColors.success }]}>
                      {formatCurrency(item.price)}
                    </Text>
                    {formData.selectedLot === item.lotId && (
                      <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyLotsContainer}>
                  <Text style={styles.emptyLotsText}>No available lots found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark" size={50} color="white" />
            </View>
            <Text style={styles.successTitle}>Registration Successful!</Text>
            <Text style={styles.successMessage}>
              Your account has been created successfully.{'\n\n'}
              Please wait for admin approval before you can log in.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.successButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles remain the same as your existing file...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  subtitle: {
    fontSize: 12,
    color: themeColors.textSecondary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.success + '15',
    borderWidth: 1,
    borderColor: themeColors.success + '30',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  alertText: {
    color: themeColors.success,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  errorText: {
    color: themeColors.error,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  loadingLotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingLotsText: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.error + '15',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 13,
    color: themeColors.error,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: themeColors.error,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.warning + '15',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: themeColors.warning,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    flex: 1,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  mapButtonText: {
    color: themeColors.primary,
    fontWeight: '600',
  },
  selectedLotCard: {
    backgroundColor: themeColors.primary + '08',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.primary + '20',
  },
  selectedLotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  selectedLotTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.primary,
  },
  selectedLotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedLotItem: {
    width: '50%',
    marginBottom: 8,
  },
  selectedLotLabel: {
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  selectedLotValue: {
    fontSize: 13,
    fontWeight: '500',
    color: themeColors.textPrimary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.info + '10',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: themeColors.info,
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  loginText: {
    color: themeColors.textSecondary,
    fontSize: 14,
  },
  loginButtonText: {
    color: themeColors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  lotOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  lotOptionSelected: {
    backgroundColor: themeColors.primary + '10',
  },
  lotOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lotOptionId: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  lotOptionType: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  lotOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lotOptionSqm: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  lotOptionPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyLotsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyLotsText: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeColors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  successButton: {
    backgroundColor: themeColors.success,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
  },
  successButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default RegisterScreen;