import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
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
    houseLot: '',
    houseBlock: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({
    email: null,
    phone: null,
    house: null,
  });

  useEffect(() => {
    if (route.params?.lot || route.params?.block) {
      setFormData(prev => ({
        ...prev,
        houseLot: route.params.block || prev.houseLot,
        houseBlock: route.params.lot || prev.houseBlock,
      }));
    }
  }, [route.params]);

  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || !isValidEmail(formData.email)) return;
      try {
        const response = await api.post('/auth/check-availability', {
          type: 'email',
          value: formData.email,
        });
        setAvailability(prev => ({ ...prev, email: response.data.available }));
      } catch (error) {
        console.error('Email check error:', error);
      }
    };
    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [formData.email]);

  useEffect(() => {
    const checkPhone = async () => {
      if (!formData.phone || !/^\d{10}$/.test(formData.phone)) return;
      try {
        const response = await api.post('/auth/check-availability', {
          type: 'phone',
          value: formData.phone,
        });
        setAvailability(prev => ({ ...prev, phone: response.data.available }));
      } catch (error) {
        console.error('Phone check error:', error);
      }
    };
    const timer = setTimeout(checkPhone, 500);
    return () => clearTimeout(timer);
  }, [formData.phone]);

  useEffect(() => {
    const checkHouse = async () => {
      if (!formData.houseLot || !formData.houseBlock) return;
      const houseNumber = `${formData.houseLot}-${formData.houseBlock}`;
      try {
        const response = await api.post('/auth/check-availability', {
          type: 'house',
          value: houseNumber,
        });
        setAvailability(prev => ({ ...prev, house: response.data.available }));
      } catch (error) {
        console.error('House check error:', error);
      }
    };
    const timer = setTimeout(checkHouse, 500);
    return () => clearTimeout(timer);
  }, [formData.houseLot, formData.houseBlock]);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (field, value) => {
    let filteredValue = value;
    
    if (field === 'firstName' || field === 'lastName') {
      filteredValue = value.replace(/[^a-zA-Z\s-]/g, '');
    } else if (field === 'phone') {
      filteredValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'houseLot' || field === 'houseBlock') {
      filteredValue = value.replace(/[^a-zA-Z0-9-]/g, '');
    }

    setFormData(prev => ({ ...prev, [field]: filteredValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    if (field === 'email' || field === 'phone' || field === 'houseLot' || field === 'houseBlock') {
      const availabilityField = field === 'houseLot' || field === 'houseBlock' ? 'house' : field;
      setAvailability(prev => ({ ...prev, [availabilityField]: null }));
    }
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

    if (!formData.houseLot) {
      newErrors.houseLot = 'Lot number is required';
    }
    if (!formData.houseBlock) {
      newErrors.houseBlock = 'Block number is required';
    }
    if (formData.houseLot && formData.houseBlock && availability.house === false) {
      newErrors.houseLot = 'This house is already registered';
      newErrors.houseBlock = 'This house is already registered';
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

    if (
      availability.email === false ||
      availability.phone === false ||
      availability.house === false
    ) {
      Alert.alert('Error', 'Some information is already registered');
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
        houseNumber: `${formData.houseLot.trim()}-${formData.houseBlock.trim()}`,
      };

      const response = await api.post('/auth/register', registrationData);
      
      if (response.data.success) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created. Please wait for admin approval.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityIcon = (field) => {
    if (availability[field] === true) {
      return <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />;
    }
    if (availability[field] === false) {
      return <Ionicons name="close-circle" size={20} color={themeColors.error} />;
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
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
            <Text style={styles.alertText}>
              Lot pre-selected! Block {route.params.block}, Lot {route.params.lot}
            </Text>
          </View>
        )}

        <View style={[styles.form, shadows.medium]}>
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Ionicons name="person" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={formData.firstName}
                onChangeText={(text) => handleChange('firstName', text)}
              />
            </View>
            {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={formData.lastName}
                onChangeText={(text) => handleChange('lastName', text)}
              />
            </View>
            {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
          </View>

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
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

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
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

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
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

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
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

          <Text style={styles.sectionLabel}>House Number</Text>
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Ionicons name="home" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Lot (e.g., A)"
                value={formData.houseLot}
                onChangeText={(text) => handleChange('houseLot', text)}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <TextInput
                style={styles.input}
                placeholder="Block (e.g., 101)"
                value={formData.houseBlock}
                onChangeText={(text) => handleChange('houseBlock', text)}
              />
              {getAvailabilityIcon('house')}
            </View>
          </View>
          {(errors.houseLot || errors.houseBlock) ? (
            <Text style={styles.errorText}>{errors.houseLot || errors.houseBlock}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
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
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  row: {
    marginBottom: 8,
  },
  halfWidth: {
    width: '100%',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
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
  submitButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
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
});

export default RegisterScreen;