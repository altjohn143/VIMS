// src/screens/RegisterScreen.js
import React, { useState, useEffect } from 'react';
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
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';

const { width: screenWidth } = Dimensions.get('window');

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
  const [mapZoom, setMapZoom] = useState(1);
  const [selectedMapLot, setSelectedMapLot] = useState(null);
  const [showLotInfo, setShowLotInfo] = useState(false);

  useEffect(() => {
    fetchLots();
  }, []);

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

  const fetchLots = async () => {
    try {
      setLoadingLots(true);
      setLoadError(null);
      const response = await api.get('/lots');
      
      if (response.data.success) {
        const allLotsData = response.data.data;
        setAllLots(allLotsData);
        const vacantLots = allLotsData.filter(lot => lot.status === 'vacant');
        setAvailableLots(vacantLots);
        
        if (vacantLots.length === 0) {
          setLoadError('No vacant lots available. Please contact admin.');
        }
      } else {
        setLoadError('Failed to load lots data');
      }
    } catch (error) {
      setLoadError(error.response?.data?.error || 'Failed to connect to server');
      Alert.alert('Connection Error', `Cannot load lots. Make sure backend is running.`);
    } finally {
      setLoadingLots(false);
    }
  };

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
    if (lot.status === 'vacant') {
      setFormData(prev => ({ ...prev, selectedLot: lot.lotId }));
      setSelectedLotDetails(lot);
      setShowLotDropdown(false);
      setShowMapModal(false);
      setShowLotInfo(false);
      Alert.alert('Lot Selected', `You selected Lot ${lot.lotId} (${lot.sqm} sqm, ${lot.type})`);
    } else {
      Alert.alert('Not Available', `Lot ${lot.lotId} is not available for registration.`);
    }
  };

  useEffect(() => {
    const checkEmailAvailability = async () => {
      if (!formData.email || !isValidEmail(formData.email)) return;
      setCheckingAvailability(prev => ({ ...prev, email: true }));
      try {
        const response = await api.post('/auth/check-availability', { type: 'email', value: formData.email });
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
        const response = await api.post('/auth/check-availability', { type: 'phone', value: formData.phone });
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

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    else if (formData.firstName.length < 2) newErrors.firstName = 'First name must be at least 2 characters';

    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    else if (formData.lastName.length < 2) newErrors.lastName = 'Last name must be at least 2 characters';

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Please enter a valid email';
    else if (availability.email === false) newErrors.email = 'This email is already registered';

    if (!formData.phone) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = 'Phone number must be exactly 10 digits';
    else if (availability.phone === false) newErrors.phone = 'This phone number is already registered';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (!formData.selectedLot) newErrors.selectedLot = 'Please select a lot';

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

      const response = await api.post('/auth/register', registrationData);
      
      if (response.data.success) {
        setShowSuccessModal(true);
      }
    } catch (error) {
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

  const statusConfig = {
    vacant: { color: '#22c55e', bg: '#dcfce7', label: 'Vacant', border: '#16a34a' },
    occupied: { color: '#ef4444', bg: '#fee2e2', label: 'Occupied', border: '#dc2626' },
    reserved: { color: '#f59e0b', bg: '#fef3c7', label: 'Reserved', border: '#d97706' },
  };

  const getStatusConfig = (status) => statusConfig[status] || statusConfig.vacant;

  const displayLots = mapViewMode === 'available' ? availableLots : allLots;
  const lotsByBlock = displayLots.reduce((acc, lot) => {
    if (!acc[lot.block]) acc[lot.block] = [];
    acc[lot.block].push(lot);
    return acc;
  }, {});

  Object.keys(lotsByBlock).forEach(block => {
    lotsByBlock[block].sort((a, b) => a.lotNumber - b.lotNumber);
  });

  const sortedBlocks = Object.keys(lotsByBlock).sort();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={32} color="white" />
          </View>
          <View>
            <Text style={styles.subtitle}>WESTVILLE CASIMIRO HOMES</Text>
            <Text style={styles.title}>Resident Registration</Text>
          </View>
        </View>

        {route.params?.lot && (
          <View style={styles.successAlert}>
            <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
            <Text style={styles.alertText}>Lot pre-selected! Block {route.params.block}, Lot {route.params.lot}</Text>
          </View>
        )}

        <View style={[styles.formCard, shadows.medium]}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="First Name" value={formData.firstName} onChangeText={(text) => handleChange('firstName', text)} />
          </View>
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Last Name" value={formData.lastName} onChangeText={(text) => handleChange('lastName', text)} />
          </View>
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Email Address" value={formData.email} onChangeText={(text) => handleChange('email', text)} keyboardType="email-address" autoCapitalize="none" />
            {getAvailabilityIcon('email')}
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Phone Number" value={formData.phone} onChangeText={(text) => handleChange('phone', text)} keyboardType="phone-pad" maxLength={10} />
            {getAvailabilityIcon('phone')}
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Password" value={formData.password} onChangeText={(text) => handleChange('password', text)} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Confirm Password" value={formData.confirmPassword} onChangeText={(text) => handleChange('confirmPassword', text)} secureTextEntry={!showConfirmPassword} />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

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
              <TouchableOpacity style={styles.retryButton} onPress={fetchLots}>
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
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowLotDropdown(true)}>
                <View style={styles.dropdownLeft}>
                  <Ionicons name="home" size={20} color={themeColors.textSecondary} />
                  <Text style={styles.dropdownText}>
                    {formData.selectedLot ? `${formData.selectedLot} - ${selectedLotDetails?.type || ''}` : `Select a lot (${availableLots.length} available)`}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
              
              {errors.selectedLot && <Text style={styles.errorText}>{errors.selectedLot}</Text>}
              
              <TouchableOpacity style={styles.mapButton} onPress={() => setShowMapModal(true)}>
                <Ionicons name="map" size={20} color={themeColors.primary} />
                <Text style={styles.mapButtonText}>View Interactive Lot Map</Text>
              </TouchableOpacity>
              
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
                  </View>
                </View>
              )}
              
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={18} color={themeColors.info} />
                <Text style={styles.infoText}>Once you register, your selected lot will be reserved pending admin approval.</Text>
              </View>
            </>
          )}

          <TouchableOpacity style={[styles.submitButton, (loading || loadingLots || availableLots.length === 0) && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading || loadingLots || availableLots.length === 0}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Lot Dropdown Modal */}
      <Modal visible={showLotDropdown} animationType="slide" transparent onRequestClose={() => setShowLotDropdown(false)}>
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Select a Lot ({availableLots.length} available)</Text>
              <TouchableOpacity onPress={() => setShowLotDropdown(false)}><Ionicons name="close" size={24} color={themeColors.textPrimary} /></TouchableOpacity>
            </View>
            <FlatList
              data={availableLots}
              keyExtractor={(item) => item.lotId}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.lotOption, formData.selectedLot === item.lotId && styles.lotOptionSelected]} onPress={() => handleLotSelect(item)}>
                  <View style={styles.lotOptionLeft}>
                    <Text style={styles.lotOptionId}>{item.lotId}</Text>
                    <Text style={styles.lotOptionType}>{item.type}</Text>
                  </View>
                  <View style={styles.lotOptionRight}>
                    <Text style={styles.lotOptionSqm}>{item.sqm} sqm</Text>
                    {formData.selectedLot === item.lotId && <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Interactive Lot Map Modal */}
      <Modal visible={showMapModal} animationType="slide" onRequestClose={() => setShowMapModal(false)}>
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.mapModalBack}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Select Your Lot</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.mapViewToggle}>
            <TouchableOpacity style={[styles.mapToggleButton, mapViewMode === 'available' && styles.mapToggleActive]} onPress={() => setMapViewMode('available')}>
              <Text style={[styles.mapToggleText, mapViewMode === 'available' && styles.mapToggleActiveText]}>Available Lots Only</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mapToggleButton, mapViewMode === 'all' && styles.mapToggleActive]} onPress={() => setMapViewMode('all')}>
              <Text style={[styles.mapToggleText, mapViewMode === 'all' && styles.mapToggleActiveText]}>All Lots</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={() => setMapZoom(z => Math.min(1.5, z + 0.1))}>
              <Ionicons name="add" size={20} color={themeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} onPress={() => setMapZoom(z => Math.max(0.6, z - 0.1))}>
              <Ionicons name="remove" size={20} color={themeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} onPress={() => setMapZoom(1)}>
              <Ionicons name="refresh" size={20} color={themeColors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendScroll}>
            <View style={styles.legendContainer}>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <View key={key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 2 }]} />
                  <Text style={styles.legendText}>{cfg.label}</Text>
                </View>
              ))}
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2d501640', borderColor: '#2d5016', borderWidth: 2 }]} />
                <Text style={styles.legendText}>Selected</Text>
              </View>
            </View>
          </ScrollView>

          <ScrollView contentContainerStyle={styles.mapContent} showsVerticalScrollIndicator={false}>
            <View style={{ transform: [{ scale: mapZoom }] }}>
              <View style={styles.entranceRoad}>
                <Text style={styles.entranceRoadText}>← MAIN ENTRANCE ROAD →</Text>
              </View>

              {sortedBlocks.map((block) => {
                const blockLots = lotsByBlock[block] || [];
                const vacantCount = blockLots.filter(l => l.status === 'vacant').length;
                return (
                  <View key={block} style={styles.mapBlockContainer}>
                    <View style={styles.mapBlockHeader}>
                      <View style={styles.mapBlockTitleBox}>
                        <Text style={styles.mapBlockTitle}>BLOCK {block}</Text>
                      </View>
                      {vacantCount > 0 && (
                        <View style={styles.mapBlockAvailableBadge}>
                          <Text style={styles.mapBlockAvailableText}>{vacantCount} available</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.mapRoadStrip} />
                    <View style={styles.mapLotsGrid}>
                      {blockLots.map((lot) => {
                        const cfg = getStatusConfig(lot.status);
                        const isSelected = formData.selectedLot === lot.lotId;
                        const isAvailable = lot.status === 'vacant';
                        const lotSize = Math.max(50, Math.min(70, 55 * mapZoom));
                        return (
                          <TouchableOpacity
                            key={lot.lotId}
                            style={[styles.mapLotTile, { width: lotSize, height: lotSize * 0.8, backgroundColor: isSelected ? cfg.color + '40' : cfg.bg, borderColor: isSelected ? themeColors.primary : cfg.border, opacity: isAvailable ? 1 : 0.6 }]}
                            onPress={() => { if (isAvailable) { setSelectedMapLot(lot); setShowLotInfo(true); } else { Alert.alert('Not Available', `Lot ${lot.lotId} is ${lot.status}`); } }}
                            disabled={!isAvailable}
                          >
                            <Text style={[styles.mapLotNumber, { color: cfg.border, fontSize: Math.max(10, 12 * mapZoom) }]}>{lot.lotNumber}</Text>
                            {mapZoom >= 0.8 && <Text style={[styles.mapLotSqm, { fontSize: Math.max(8, 10 * mapZoom) }]}>{lot.sqm}m²</Text>}
                            {isSelected && <View style={styles.mapSelectedBadge}><Ionicons name="checkmark" size={12} color="white" /></View>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Lot Info Modal */}
      <Modal visible={showLotInfo} transparent animationType="slide" onRequestClose={() => setShowLotInfo(false)}>
        <View style={styles.lotInfoOverlay}>
          <View style={styles.lotInfoModal}>
            <View style={styles.lotInfoHeader}>
              <Text style={styles.lotInfoTitle}>Lot Details</Text>
              <TouchableOpacity onPress={() => setShowLotInfo(false)}><Ionicons name="close" size={24} color={themeColors.textPrimary} /></TouchableOpacity>
            </View>
            {selectedMapLot && (
              <ScrollView>
                <View style={styles.lotInfoContent}>
                  <Text style={styles.lotInfoId}>Lot {selectedMapLot.lotNumber} - Block {selectedMapLot.block}</Text>
                  <View style={[styles.lotInfoBadge, { backgroundColor: getStatusConfig(selectedMapLot.status).bg }]}>
                    <Text style={[styles.lotInfoBadgeText, { color: getStatusConfig(selectedMapLot.status).color }]}>{getStatusConfig(selectedMapLot.status).label}</Text>
                  </View>
                  <Text style={styles.lotInfoAddress}>{selectedMapLot.address}</Text>
                  <View style={styles.lotInfoGrid}>
                    <View style={styles.lotInfoItem}><Text style={styles.lotInfoLabel}>Type</Text><Text style={styles.lotInfoValue}>{selectedMapLot.type}</Text></View>
                    <View style={styles.lotInfoItem}><Text style={styles.lotInfoLabel}>Area</Text><Text style={styles.lotInfoValue}>{selectedMapLot.sqm} sqm</Text></View>
                  </View>
                  <View style={styles.lotInfoActions}>
                    <TouchableOpacity style={[styles.lotInfoButton, styles.lotSelectButton]} onPress={() => { handleLotSelect(selectedMapLot); setShowLotInfo(false); setShowMapModal(false); }}>
                      <Text style={styles.lotSelectButtonText}>Select This Lot</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}><Ionicons name="checkmark" size={50} color="white" /></View>
            <Text style={styles.successTitle}>Registration Successful!</Text>
            <Text style={styles.successMessage}>Your account has been created successfully.{'\n\n'}Please wait for admin approval before you can log in.</Text>
            <TouchableOpacity style={styles.successButton} onPress={() => { setShowSuccessModal(false); navigation.navigate('Login'); }}>
              <Text style={styles.successButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  scrollContent: { padding: 20, paddingTop: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { color: themeColors.textPrimary, fontSize: 16, marginLeft: 8 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  iconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  subtitle: { fontSize: 12, color: themeColors.textSecondary, letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', color: themeColors.textPrimary },
  successAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.success + '15', borderWidth: 1, borderColor: themeColors.success + '30', borderRadius: 8, padding: 12, marginBottom: 20 },
  alertText: { color: themeColors.success, fontSize: 14, marginLeft: 8, flex: 1 },
  formCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: themeColors.border },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: themeColors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 8, backgroundColor: '#f8fafc' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: themeColors.textPrimary },
  errorText: { color: themeColors.error, fontSize: 12, marginBottom: 8, marginLeft: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: themeColors.textPrimary, marginBottom: 8, marginTop: 16 },
  loadingLotsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  loadingLotsText: { fontSize: 14, color: themeColors.textSecondary },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.error + '15', padding: 12, borderRadius: 8, gap: 8, marginBottom: 12 },
  errorBoxText: { flex: 1, fontSize: 13, color: themeColors.error },
  retryButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: themeColors.error, borderRadius: 6 },
  retryButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.warning + '15', padding: 12, borderRadius: 8, gap: 8 },
  warningText: { flex: 1, fontSize: 13, color: themeColors.warning },
  dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: themeColors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f8fafc', marginBottom: 8 },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dropdownText: { fontSize: 14, color: themeColors.textPrimary, flex: 1 },
  mapButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: themeColors.primary, borderRadius: 8, paddingVertical: 12, gap: 8, marginBottom: 12 },
  mapButtonText: { color: themeColors.primary, fontWeight: '600' },
  selectedLotCard: { backgroundColor: themeColors.primary + '08', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: themeColors.primary + '20' },
  selectedLotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  selectedLotTitle: { fontSize: 13, fontWeight: '600', color: themeColors.primary },
  selectedLotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  selectedLotItem: { width: '50%', marginBottom: 8 },
  selectedLotLabel: { fontSize: 11, color: themeColors.textSecondary },
  selectedLotValue: { fontSize: 13, fontWeight: '500', color: themeColors.textPrimary },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.info + '10', padding: 12, borderRadius: 8, gap: 8, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12, color: themeColors.info },
  submitButton: { backgroundColor: themeColors.primary, borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  loginLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: themeColors.border },
  loginText: { color: themeColors.textSecondary, fontSize: 14 },
  loginButtonText: { color: themeColors.primary, fontSize: 14, fontWeight: '600', marginLeft: 4 },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dropdownModal: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  dropdownModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  dropdownModalTitle: { fontSize: 18, fontWeight: '600', color: themeColors.textPrimary },
  lotOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  lotOptionSelected: { backgroundColor: themeColors.primary + '10' },
  lotOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lotOptionId: { fontSize: 16, fontWeight: '600', color: themeColors.textPrimary },
  lotOptionType: { fontSize: 13, color: themeColors.textSecondary },
  lotOptionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lotOptionSqm: { fontSize: 13, color: themeColors.textSecondary },
  mapModalContainer: { flex: 1, backgroundColor: '#0f2a04' },
  mapModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.primary },
  mapModalBack: { padding: 8 },
  mapModalTitle: { fontSize: 18, fontWeight: '600', color: 'white' },
  mapViewToggle: { flexDirection: 'row', padding: 12, gap: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
  mapToggleButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  mapToggleActive: { backgroundColor: themeColors.primary },
  mapToggleText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  mapToggleActiveText: { color: 'white', fontWeight: '600' },
  zoomControls: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  zoomButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  legendScroll: { maxHeight: 50, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
  legendContainer: { flexDirection: 'row', gap: 16, paddingVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  mapContent: { padding: 12 },
  entranceRoad: { marginBottom: 16, padding: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  entranceRoadText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 },
  mapBlockContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mapBlockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  mapBlockTitleBox: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  mapBlockTitle: { fontSize: 12, fontWeight: '800', color: 'white', letterSpacing: 1 },
  mapBlockAvailableBadge: { backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  mapBlockAvailableText: { fontSize: 10, color: '#4ade80', fontWeight: '700' },
  mapRoadStrip: { height: 3, marginBottom: 12, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  mapLotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mapLotTile: { borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2, position: 'relative' },
  mapLotNumber: { fontWeight: '700' },
  mapLotSqm: { opacity: 0.7 },
  mapSelectedBadge: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' },
  lotInfoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  lotInfoModal: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  lotInfoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  lotInfoTitle: { fontSize: 18, fontWeight: '600', color: themeColors.textPrimary },
  lotInfoContent: { padding: 20 },
  lotInfoId: { fontSize: 20, fontWeight: '700', color: themeColors.textPrimary, marginBottom: 8 },
  lotInfoBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginBottom: 12 },
  lotInfoBadgeText: { fontSize: 12, fontWeight: '600' },
  lotInfoAddress: { fontSize: 14, color: themeColors.textSecondary, marginBottom: 16 },
  lotInfoGrid: { flexDirection: 'row', marginBottom: 16 },
  lotInfoItem: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginHorizontal: 4 },
  lotInfoLabel: { fontSize: 11, color: themeColors.textSecondary, marginBottom: 4 },
  lotInfoValue: { fontSize: 15, fontWeight: '600', color: themeColors.textPrimary },
  lotInfoActions: { marginTop: 8 },
  lotInfoButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  lotSelectButton: { backgroundColor: themeColors.success },
  lotSelectButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  successModal: { backgroundColor: 'white', borderRadius: 20, padding: 30, width: '85%', alignItems: 'center' },
  successIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: themeColors.success, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: themeColors.textPrimary, marginBottom: 10, textAlign: 'center' },
  successMessage: { fontSize: 14, color: themeColors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  successButton: { backgroundColor: themeColors.success, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, width: '100%' },
  successButtonText: { color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

export default RegisterScreen;