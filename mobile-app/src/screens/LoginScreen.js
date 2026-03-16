import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const themeColors = {
  primary: '#2224be',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e5e7eb'
};

const API_BASE_URL = 'http://localhost:5000/api';

const LoginScreen = ({ navigation }) => {
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const roles = [
    { 
      key: 'admin', 
      label: 'ADMIN', 
      description: 'Manages system, residents, and community',
      icon: 'shield-account',
      color: '#2224be'
    },
    { 
      key: 'resident', 
      label: 'RESIDENT', 
      description: 'Access personal info and services',
      icon: 'home',
      color: '#10b981'
    },
    { 
      key: 'security', 
      label: 'SECURITY', 
      description: 'Monitor entries and keep community safe',
      icon: 'security',
      color: '#f59e0b'
    },
  ];

  React.useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const saved = await AsyncStorage.getItem('vims_saved_login');
      if (saved) {
        const { email, role } = JSON.parse(saved);
        setEmail(email);
        setRole(role);
        setRememberMe(true);
      }
    } catch (err) {
      console.log('Error loading saved credentials:', err);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
          role: role || 'resident'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresApproval) {
          Alert.alert(
            'Account Pending',
            'Your account is awaiting admin approval. Please check back later.',
            [{ text: 'OK' }]
          );
        } else {
          setError(data.error || 'Login failed');
        }
        return;
      }

      if (rememberMe) {
        await AsyncStorage.setItem('vims_saved_login', JSON.stringify({
          email,
          role: role || 'resident'
        }));
      } else {
        await AsyncStorage.removeItem('vims_saved_login');
      }

      await AsyncStorage.setItem('vims_token', data.token);
      await AsyncStorage.setItem('vims_user', JSON.stringify(data.user));

      if (data.user.role === 'admin') {
        navigation.replace('Dashboard');
      } else if (data.user.role === 'security') {
        navigation.replace('Dashboard');
      } else {
        navigation.replace('Dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail.toLowerCase() })
      });

      Alert.alert(
        'Password Reset',
        'If your email is registered, you will receive a password reset link.',
        [{ text: 'OK' }]
      );

      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to process request');
    } finally {
      setForgotLoading(false);
    }
  };

  // Role Selection Screen
  if (!role) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Icon name="home-city" size={50} color={themeColors.primary} />
            <Text style={styles.headerTitle}>Welcome to VIMS</Text>
            <Text style={styles.headerSubtitle}>Visitor & Service Management System</Text>
          </View>

          <View style={styles.rolesContainer}>
            {roles.map((roleItem) => (
              <TouchableOpacity
                key={roleItem.key}
                style={[styles.roleCard, { borderLeftColor: roleItem.color }]}
                onPress={() => setRole(roleItem.key)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={roleItem.icon} 
                  size={32} 
                  color={roleItem.color}
                  style={styles.roleIcon}
                />
                <View style={styles.roleContent}>
                  <Text style={styles.roleTitle}>{roleItem.label}</Text>
                  <Text style={styles.roleDescription}>{roleItem.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Key Features</Text>
            {[
              { icon: 'shield-check', text: 'Secure Authentication' },
              { icon: 'qrcode', text: 'QR Code Management' },
              { icon: 'wrench', text: 'Service Requests' },
              { icon: 'account-multiple', text: 'Visitor Management' }
            ].map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <Icon name={feature.icon} size={18} color={themeColors.primary} />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Login Form Screen
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            setRole(null);
            setEmail('');
            setPassword('');
            setError('');
          }}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.loginHeader}>
          <Text style={styles.loginTitle}>Login as {role.charAt(0).toUpperCase() + role.slice(1)}</Text>
          <Text style={styles.loginSubtitle}>Enter your credentials to continue</Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={18} color={themeColors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color={themeColors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={themeColors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              editable={!loading}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color={themeColors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={themeColors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color={themeColors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity 
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <Icon 
              name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'} 
              size={20} 
              color={themeColors.primary}
            />
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size={20} />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signupLink}>Register here</Text>
          </TouchableOpacity>
        </View>

        {showForgotPassword && (
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Forgot Password</Text>
                <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
                  <Icon name="close" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                Enter your email address and we'll send you a password reset link.
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="your@email.com"
                placeholderTextColor={themeColors.textSecondary}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!forgotLoading}
              />

              <TouchableOpacity
                style={[styles.modalButton, forgotLoading && styles.loginButtonDisabled]}
                onPress={handleForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator color="white" size={18} />
                ) : (
                  <Text style={styles.modalButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowForgotPassword(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  rolesContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  roleIcon: {
    marginRight: 16,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  roleDescription: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(34, 36, 190, 0.05)',
    marginHorizontal: 20,
    borderRadius: 12,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginLeft: 12,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: themeColors.primary,
    fontWeight: '600',
  },
  loginHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  loginSubtitle: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.error,
  },
  errorText: {
    fontSize: 13,
    color: themeColors.error,
    marginLeft: 12,
    flex: 1,
  },
  inputGroup: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    height: 50,
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    color: themeColors.textPrimary,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberMeText: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: themeColors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginHorizontal: 20,
    height: 52,
    backgroundColor: themeColors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signupText: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    color: themeColors.primary,
    fontWeight: '700',
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  modalDescription: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
    fontSize: 14,
    color: themeColors.textPrimary,
  },
  modalButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
});

export default LoginScreen;