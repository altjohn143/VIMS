// src/screens/RegisterScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  StatusBar,
  Image,
  ImageBackground
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../config/apiConfig';

const { width } = Dimensions.get('window');

const themeColors = {
  primary: '#2224be',
  primaryLight: '#2224be',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e5e7eb'
};

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    houseLot: '',
    houseBlock: ''
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [bgImageError, setBgImageError] = useState(false);

  const handleInputChange = useCallback((field, value) => {
    let filteredValue = value;
    
    switch(field) {
      case 'firstName':
      case 'lastName':
        filteredValue = value.replace(/[^a-zA-Z\s-]/g, '');
        break;
      case 'phone':
        filteredValue = value.replace(/\D/g, '').slice(0, 11);
        break;
      case 'houseLot':
      case 'houseBlock':
        filteredValue = value.replace(/[^a-zA-Z0-9-]/g, '');
        break;
      default:
        filteredValue = value;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: filteredValue
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  const validateField = useCallback((field, value) => {
    switch(field) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) return 'This field is required';
        if (value.length < 2) return 'Must be at least 2 characters';
        return '';
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email';
        return '';
      
      case 'phone':
        if (!value.trim()) return 'Phone is required';
        if (value.length < 10) return 'Must be at least 10 digits';
        return '';
      
      case 'password':
        if (!value.trim()) return 'Password is required';
        if (value.length < 8) return 'Must be at least 8 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Must contain uppercase, lowercase, and number';
        }
        return '';
      
      case 'confirmPassword':
        if (!value.trim()) return 'Please confirm password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      
      case 'houseLot':
      case 'houseBlock':
        if (!value.trim()) return 'This field is required';
        return '';
      
      default:
        return '';
    }
  }, [formData.password]);

  const handleBlur = useCallback((field) => {
    const value = formData[field];
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }, [formData, validateField]);

  const checkAvailability = async (field, value) => {
    try {
      console.log('Checking availability:', field, value);
      const response = await fetch(`${API_CONFIG.forceNetworkIP}/auth/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: field, value })
      });

      const data = await response.json();
      console.log('Availability response:', data);
      return data.available;
    } catch (error) {
      console.error('Availability check error:', error);
      return true; // Assume available if check fails
    }
  };

  const handleRegister = useCallback(async () => {
    const newErrors = {};
    
    // Validate all fields
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    
    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }

    setLoading(true);

    try {
      // Check email availability
      const emailAvailable = await checkAvailability('email', formData.email);
      if (!emailAvailable) {
        setErrors(prev => ({ ...prev, email: 'Email already registered' }));
        setLoading(false);
        return;
      }

      // Check phone availability
      const phoneAvailable = await checkAvailability('phone', formData.phone);
      if (!phoneAvailable) {
        setErrors(prev => ({ ...prev, phone: 'Phone number already registered' }));
        setLoading(false);
        return;
      }

      // Check house availability
      const houseNumber = `${formData.houseLot.trim()}-${formData.houseBlock.trim()}`;
      const houseAvailable = await checkAvailability('house', houseNumber);
      if (!houseAvailable) {
        setErrors(prev => ({ ...prev, houseLot: 'House number already registered' }));
        setLoading(false);
        return;
      }

      // Prepare registration data
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        password: formData.password,
        role: 'resident',
        houseNumber: houseNumber
      };

      console.log('Registering with:', registrationData);

      const response = await fetch(`${API_CONFIG.forceNetworkIP}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.success) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created! You can now login with your credentials.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                navigation.navigate('Login', { email: formData.email });
              }
            }
          ]
        );
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData, agreedToTerms, navigation, validateField]);

  const TermsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showTermsModal}
      onRequestClose={() => setShowTermsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Terms and Conditions</Text>
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.modalText}>
              1. You must be a resident of the village to register.{'\n\n'}
              2. All information provided must be accurate and verifiable.{'\n\n'}
              3. Your account requires admin approval before full access.{'\n\n'}
              4. You are responsible for maintaining the confidentiality of your account.{'\n\n'}
              5. The system administrators reserve the right to revoke access for violations.{'\n\n'}
              6. Emergency contact information is required for safety purposes.{'\n\n'}
              7. By registering, you agree to comply with all village rules and regulations.
            </Text>
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setAgreedToTerms(false);
                setShowTermsModal(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.acceptButton]}
              onPress={() => {
                setAgreedToTerms(true);
                setShowTermsModal(false);
              }}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Image Background */}
        {!bgImageError ? (
          <ImageBackground
            source={require('../assets/toppovhomes.jpg')}
            style={styles.header}
            resizeMode="cover"
            onError={(error) => {
              console.log('Background image failed to load:', error.nativeEvent.error);
              setBgImageError(true);
            }}
          >
            {/* Semi-transparent overlay */}
            <View style={styles.headerOverlay}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-left" size={24} color="white" />
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  {!imageError ? (
                    <Image 
                      source={require('../assets/village-logo.png')}
                      style={styles.logoImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('Logo image failed to load:', error.nativeEvent.error);
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <Icon name="account-plus" size={40} color="white" />
                  )}
                </View>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join VIMS Community</Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          // Fallback gradient if image fails to load
          <LinearGradient
            colors={[themeColors.primary, '#1a1a9e']}
            style={styles.header}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                {!imageError ? (
                  <Image 
                    source={require('../assets/village-logo.png')}
                    style={styles.logoImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('Logo image failed to load:', error.nativeEvent.error);
                      setImageError(true);
                    }}
                  />
                ) : (
                  <Icon name="account-plus" size={40} color="white" />
                )}
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join VIMS Community</Text>
            </View>
          </LinearGradient>
        )}

        {/* Registration Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Registration Form</Text>

          {/* Name Fields */}
          <View style={styles.row}>
            <View style={[styles.column, { marginRight: 8 }]}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <View style={[styles.inputContainer, errors.firstName && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  placeholderTextColor="#9ca3af"
                  value={formData.firstName}
                  onChangeText={(text) => handleInputChange('firstName', text)}
                  onBlur={() => handleBlur('firstName')}
                  maxLength={50}
                  editable={!loading}
                />
              </View>
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>
            
            <View style={[styles.column, { marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Last Name *</Text>
              <View style={[styles.inputContainer, errors.lastName && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Doe"
                  placeholderTextColor="#9ca3af"
                  value={formData.lastName}
                  onChangeText={(text) => handleInputChange('lastName', text)}
                  onBlur={() => handleBlur('lastName')}
                  maxLength={50}
                  editable={!loading}
                />
              </View>
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <Icon name="email-outline" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={[styles.input, { paddingLeft: 12 }]}
                placeholder="john.doe@example.com"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                onBlur={() => handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
              <Icon name="phone-outline" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={[styles.input, { paddingLeft: 12 }]}
                placeholder="09123456789"
                placeholderTextColor="#9ca3af"
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                onBlur={() => handleBlur('phone')}
                keyboardType="phone-pad"
                maxLength={11}
                editable={!loading}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password *</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Icon name="lock-outline" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={[styles.input, { paddingLeft: 12 }]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                onBlur={() => handleBlur('password')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            <Text style={styles.helperText}>Minimum 8 characters with uppercase, lowercase, and number</Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password *</Text>
            <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
              <Icon name="lock-check-outline" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={[styles.input, { paddingLeft: 12 }]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                onBlur={() => handleBlur('confirmPassword')}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                <Icon
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* House Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>House Number *</Text>
            <View style={styles.houseRow}>
              <View style={[styles.houseInputContainer, errors.houseLot && styles.inputError]}>
                <TextInput
                  style={styles.houseInput}
                  placeholder="Lot"
                  placeholderTextColor="#9ca3af"
                  value={formData.houseLot}
                  onChangeText={(text) => handleInputChange('houseLot', text)}
                  onBlur={() => handleBlur('houseLot')}
                  editable={!loading}
                />
              </View>
              <Text style={styles.houseSeparator}>-</Text>
              <View style={[styles.houseInputContainer, errors.houseBlock && styles.inputError]}>
                <TextInput
                  style={styles.houseInput}
                  placeholder="Block"
                  placeholderTextColor="#9ca3af"
                  value={formData.houseBlock}
                  onChangeText={(text) => handleInputChange('houseBlock', text)}
                  onBlur={() => handleBlur('houseBlock')}
                  editable={!loading}
                />
              </View>
            </View>
            {(errors.houseLot || errors.houseBlock) && (
              <Text style={styles.errorText}>{errors.houseLot || errors.houseBlock}</Text>
            )}
            <Text style={styles.helperText}>Format: Lot-Block (e.g., A-101)</Text>
          </View>

          {/* Terms Agreement */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              disabled={loading}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Icon name="check" size={16} color="white" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => setShowTermsModal(true)}
                >
                  Terms and Conditions
                </Text>
              </Text>
            </TouchableOpacity>
            {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-outline" size={18} color={themeColors.primary} />
            <Text style={styles.infoText}>
              Resident accounts require admin approval. You'll receive an email once approved.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>VIMS Registration • Version 2.0</Text>
          <Text style={styles.footerSubtext}>Secure Village Management</Text>
        </View>

        <TermsModal />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    width: '100%',
    height: 260, // Slightly smaller than login screen
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 36, 190, 0.5)', // Semi-transparent overlay with theme color
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    padding: 8,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Slight background for better visibility
    borderRadius: 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 90, // Slightly smaller than login screen
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 5,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 13,
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  formContainer: {
    padding: 24,
    marginTop: -20,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 20,
    marginHorizontal: 16,
    elevation: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 56,
  },
  inputError: {
    borderColor: themeColors.error,
    backgroundColor: '#fef2f2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: themeColors.textPrimary,
    height: '100%',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    color: themeColors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  houseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  houseInputContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 56,
    justifyContent: 'center',
  },
  houseInput: {
    fontSize: 16,
    color: themeColors.textPrimary,
    paddingHorizontal: 16,
    height: '100%',
    textAlign: 'center',
  },
  houseSeparator: {
    fontSize: 18,
    color: themeColors.textSecondary,
    marginHorizontal: 8,
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  termsText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: themeColors.primary,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginText: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  loginLink: {
    color: themeColors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    marginLeft: 12,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 11,
    color: themeColors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: themeColors.primary,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegisterScreen;