import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const HERO_ABOUT_FULL =
  'Standing the test of time, Westville has grown from an innovative real estate developer into a strong name in the industry, continuously building quality homes and vibrant communities where families can live comfortably and create a better future.';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [heroAboutExpanded, setHeroAboutExpanded] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuth();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.95)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedRole) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(cardScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      cardScaleAnim.setValue(0.95);
    }
  }, [selectedRole]);

  const showModal = () => {
    setShowForgotPassword(true);
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: 0.9,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowForgotPassword(false);
      setForgotEmail('');
    });
  };

  const roles = [
    {
      key: 'admin',
      label: 'ADMIN',
      icon: 'settings-outline',
      description: 'Manages the system, resident records, and community information.',
    },
    {
      key: 'resident',
      label: 'RESIDENT',
      icon: 'home-outline',
      description: 'Access personal information, community updates, and services.',
    },
    {
      key: 'security',
      label: 'SECURITY',
      icon: 'shield-checkmark-outline',
      description: 'Monitor entries and help keep the community safe.',
    },
  ];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password, selectedRole);

      if (!result.success) {
        if (result.error?.includes('pending admin approval') || result.requiresApproval) {
          Alert.alert(
            'Account Pending Approval',
            'Your account is waiting for admin approval. You will be notified once approved.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.replace('PendingApproval');
                },
              },
            ]
          );
        } else {
          Alert.alert('Login Failed', result.error || 'Invalid credentials');
        }
      } else {
        const userData = result.user;
        if (userData?.role === 'resident' && !userData.isApproved) {
          Alert.alert(
            'Account Pending Approval',
            'Your account is waiting for admin approval. Please wait for approval before logging in.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.replace('PendingApproval');
                },
              },
            ]
          );
          return;
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
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
      const response = await fetch('https://vims-backend.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail.toLowerCase() })
      });

      const data = await response.json();

      Alert.alert(
        'Password Reset',
        data.message || 'If your email is registered, you will receive a password reset link.',
        [{ text: 'OK' }]
      );

      hideModal();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to process request');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBrowseLots = () => {
    navigation.navigate('PublicLots');
  };

  // ============================================================
  // ROLE SELECTION SCREEN (Glassmorphism - Clean)
  // ============================================================
  if (!selectedRole) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ImageBackground
          source={require('../../assets/westville.jpg')}
          resizeMode="cover"
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <View style={styles.gradientOverlay}>
            <ScrollView
              contentContainerStyle={styles.landingScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Brand Header */}
              <View style={styles.topBrandRow}>
                <View style={styles.logoCircle}>
                  <Ionicons name="business-outline" size={22} color="#ffffff" />
                </View>
                <Text style={styles.brandTitle}>WESTVILLE CASIMIRO HOMES</Text>
              </View>

              {/* Hero Section */}
              <View style={styles.heroContent}>
                <Text style={styles.heroHeading}>
                  YOUR DREAM LIFE{'\n'}AWAITS IN WESTVILLE HOMES
                </Text>

                {heroAboutExpanded && (
                  <Text style={styles.heroDescription}>{HERO_ABOUT_FULL}</Text>
                )}

                <TouchableOpacity onPress={() => setHeroAboutExpanded(!heroAboutExpanded)}>
                  <Text style={styles.readMoreText}>
                    READ {heroAboutExpanded ? 'LESS' : 'MORE'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Role Cards - Clean Glass Effect */}
              <View style={styles.roleSection}>
                <View style={styles.roleCardsContainer}>
                  {roles.map((role) => (
                    <Pressable
                      key={role.key}
                      onPress={() => setSelectedRole(role.key)}
                      style={({ pressed }) => [
                        styles.glassCard,
                        pressed && styles.glassCardPressed,
                      ]}
                    >
                      <View style={styles.glassCardInner}>
                        <View style={styles.roleIconWrap}>
                          <Ionicons name={role.icon} size={28} color="#FFFFFF" />
                        </View>
                        <View style={styles.roleContent}>
                          <Text style={styles.roleTitle}>{role.label}</Text>
                          <Text style={styles.roleDesc}>{role.description}</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Bottom Section */}
              <View style={styles.bottomContent}>
                <Text style={styles.bottomHeading}>HOUSE AND LOT</Text>
                <Text style={styles.bottomDescription}>
                  Westville's communities are located in accessible and desirable
                  neighborhoods, offering comfortable living spaces and outdoor areas
                  perfect for relaxation and family time.
                </Text>

                <TouchableOpacity
                  style={styles.browseLotsButton}
                  onPress={handleBrowseLots}
                  activeOpacity={0.85}
                >
                  <Ionicons name="search-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.browseLotsText}>BROWSE AVAILABLE LOTS</Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  © 2024 Westville Casimiro Homes. All rights reserved.
                </Text>
                <Text style={styles.footerContact}>Bacoor, Cavite, Philippines</Text>
              </View>
            </ScrollView>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // ============================================================
  // LOGIN SCREEN (Premium Glassmorphism - Clean & Upgraded)
  // ============================================================
  const selectedRoleData = roles.find((r) => r.key === selectedRole);

  return (
    <KeyboardAvoidingView
      style={styles.loginContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ImageBackground
        source={require('../../assets/westville.jpg')}
        resizeMode="cover"
        style={styles.loginBgImage}
        imageStyle={styles.loginBgImageStyle}
      >
        <View style={styles.loginGradientOverlay}>
          {/* Back Button - Clean */}
          <TouchableOpacity
            style={styles.backButtonFloat}
            onPress={() => setSelectedRole(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backTextFloat}>Back to Role Selection</Text>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.loginScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.loginContentWrapper,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Brand Header - Clean Minimal */}
              <View style={styles.loginBrandContainer}>
                <View style={styles.loginLogoCircle}>
                  <Ionicons name="business-outline" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.loginBrandTextContainer}>
                  <Text style={styles.loginBrandTitle}>WESTVILLE CASIMIRO</Text>
                  <Text style={styles.loginBrandSubtitle}>HOMES</Text>
                </View>
              </View>

              {/* Role Label - Clean Typography */}
              <Text style={styles.roleLoginLabel}>{selectedRoleData.label} LOGIN</Text>

              {/* Premium Glass Login Card - Upgraded */}
              <Animated.View style={[styles.glassPremiumCard, { transform: [{ scale: cardScaleAnim }] }]}>
                {/* Email Field */}
                <View style={styles.inputField}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.glassInputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#6B8F6B" />
                    <TextInput
                      style={styles.glassInput}
                      placeholder="your@email.com"
                      placeholderTextColor="#A0B8A0"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputField}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.glassInputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#6B8F6B" />
                    <TextInput
                      style={styles.glassInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#A0B8A0"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#6B8F6B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Forgot Password Link - Clean */}
                <TouchableOpacity 
                  style={styles.forgotPasswordContainer} 
                  onPress={showModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Sign In Button - Clean with subtle gradient effect */}
                <TouchableOpacity
                  style={[styles.signInButton, loading && styles.signInButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.signInButtonText}>
                      Sign in as {selectedRoleData.label.charAt(0) + selectedRoleData.label.slice(1).toLowerCase()}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Register Section for Resident - Clean */}
                {selectedRole === 'resident' && (
                  <View style={styles.registerSection}>
                    <Text style={styles.registerText}>Don't have an account?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                      <Text style={styles.registerLink}>Register as Resident</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </ScrollView>
        </View>
      </ImageBackground>

      {/* Glassmorphism Forgot Password Modal - Clean */}
      {showForgotPassword && (
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: modalOpacityAnim,
            },
          ]}
        >
          <Animated.View 
            style={[
              styles.glassModalContent,
              { transform: [{ scale: modalScaleAnim }] },
            ]}
          >
            <View style={styles.modalIconCircle}>
              <Ionicons name="key-outline" size={30} color="#2E6B2E" />
            </View>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your registered email address and we'll send you a password reset link.
            </Text>
            
            <View style={styles.glassModalInputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#6B8F6B" />
              <TextInput
                style={styles.glassModalInput}
                placeholder="Email Address"
                placeholderTextColor="#A0B8A0"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={hideModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton, forgotLoading && styles.sendButtonDisabled]}
                onPress={handleForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // ==================== GLOBAL / SHARED ====================
  screen: {
    flex: 1,
    backgroundColor: '#0A1F0A',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    opacity: 0.95,
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 8, 0.5)',
  },

  // ==================== ROLE SELECTION SCREEN - CLEAN GLASS ====================
  landingScrollContent: {
    paddingTop: 52,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 35,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 107, 46, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#2E6B2E',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroContent: {
    marginBottom: 30,
  },
  heroHeading: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  heroDescription: {
    color: '#F0F0F0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  readMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleSection: {
    marginBottom: 32,
  },
  roleCardsContainer: {
    gap: 12,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  glassCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  glassCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  roleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(46, 107, 46, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 3,
  },
  roleDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11.5,
    lineHeight: 15,
  },
  bottomContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  bottomHeading: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  bottomDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 22,
    maxWidth: 320,
  },
  browseLotsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E6B2E',
    borderRadius: 40,
    paddingVertical: 13,
    paddingHorizontal: 26,
    gap: 8,
    shadowColor: '#2E6B2E',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  browseLotsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginBottom: 3,
  },
  footerContact: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500',
  },

  // ==================== LOGIN SCREEN - CLEAN & UPGRADED ====================
  loginContainer: {
    flex: 1,
  },
  loginBgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loginBgImageStyle: {
    opacity: 0.92,
  },
  loginGradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 8, 0.65)',
  },
  backButtonFloat: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  backTextFloat: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 110,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  loginContentWrapper: {
    width: '100%',
  },
  loginBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(46, 107, 46, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  loginBrandTextContainer: {
    alignItems: 'flex-start',
  },
  loginBrandTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  loginBrandSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  roleLoginLabel: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 28,
  },
  glassPremiumCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 28,
    padding: 26,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  inputField: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A674A',
    marginBottom: 6,
    marginLeft: 4,
  },
  glassInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF7',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8E0',
    gap: 10,
  },
  glassInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E2A1E',
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 28,
    marginTop: 4,
  },
  forgotPasswordText: {
    color: '#2E6B2E',
    fontSize: 13,
    fontWeight: '700',
  },
  signInButton: {
    backgroundColor: '#2E6B2E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#2E6B2E',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDF2EA',
    gap: 4,
  },
  registerText: {
    color: '#6B8F6B',
    fontSize: 13,
  },
  registerLink: {
    color: '#2E6B2E',
    fontSize: 13,
    fontWeight: '800',
  },

  // ==================== MODAL - CLEAN GLASS ====================
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassModalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    padding: 24,
    width: width > 500 ? 420 : '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },
  modalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E8F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E2A1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B8F6B',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  glassModalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF7',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8E0',
    width: '100%',
    gap: 10,
  },
  glassModalInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E2A1E',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F3EF',
  },
  cancelButtonText: {
    color: '#6B8F6B',
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#2E6B2E',
  },
  sendButtonDisabled: {
    backgroundColor: '#9BB89B',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoginScreen;