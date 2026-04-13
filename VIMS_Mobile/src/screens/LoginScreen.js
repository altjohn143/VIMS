import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { themeColors, shadows } from '../utils/theme';

const HERO_ABOUT_FULL =
  'Standing the test of time, Westville has grown from an innovative real estate developer into a strong name in the industry, continuously building quality homes and vibrant communities where families can live comfortably and create a better future.';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [heroAboutExpanded, setHeroAboutExpanded] = useState(false);

  const { login } = useAuth();

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
      const result = await login(email, password);

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
        navigation.replace('DashboardTab');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseLots = () => {
    navigation.navigate('PublicLots');
  };

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
          {/* Overlay for better text readability */}
          <View style={styles.gradientOverlay}>
            <ScrollView
              contentContainerStyle={styles.landingScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Brand Row */}
              <View style={styles.topBrandRow}>
                <View style={styles.logoCircle}>
                  <Ionicons name="business-outline" size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.brandTitle}>WESTVILLE CASIMIRO</Text>
                  <Text style={styles.brandSubtitle}>HOMES</Text>
                </View>
              </View>

              {/* Hero */}
              <View style={styles.heroContent}>
                <Text style={styles.heroHeading}>
                  YOUR DREAM LIFE{'\n'}AWAITS IN{'\n'}WESTVILLE HOMES
                </Text>

                {heroAboutExpanded ? (
                  <Text style={styles.heroDescription}>{HERO_ABOUT_FULL}</Text>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setHeroAboutExpanded((v) => !v)}
                >
                  <Text style={styles.readMoreText}>
                    {heroAboutExpanded ? 'READ LESS' : 'READ MORE'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Role Cards */}
              <View style={styles.roleCardsContainer}>
                {roles.map((role) => (
                  <Pressable
                    key={role.key}
                    onPress={() => setSelectedRole(role.key)}
                    style={({ pressed, hovered }) => [
                      styles.roleCard,
                      Platform.OS === 'web' && styles.roleCardWeb,
                      hovered && styles.roleCardHovered,
                      pressed && styles.roleCardPressed,
                    ]}
                  >
                    <View style={styles.roleIconWrap}>
                      <Ionicons name={role.icon} size={26} color="#d1fae5" />
                    </View>
                    <View style={styles.roleContent}>
                      <Text style={styles.roleTitle}>{role.label}</Text>
                      <Text style={styles.roleDesc}>{role.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.45)" />
                  </Pressable>
                ))}
              </View>

              {/* Bottom Section */}
              <View style={styles.bottomContent}>
                <Text style={styles.bottomHeading}>HOUSE AND LOT</Text>
                <Text style={styles.bottomDescription}>
                  Westville&apos;s communities are located in accessible and desirable
                  neighborhoods, offering comfortable living spaces and outdoor areas
                  perfect for relaxation and family time.
                </Text>

                <TouchableOpacity
                  style={styles.browseLotsButton}
                  onPress={handleBrowseLots}
                  activeOpacity={0.88}
                >
                  <Ionicons name="search-outline" size={20} color="#2E6B2E" />
                  <Text style={styles.browseLotsText}>BROWSE AVAILABLE LOTS</Text>
                </TouchableOpacity>
              </View>

              {/* ✅ Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  © 2024 Westville Casimiro Homes. All rights reserved.
                </Text>
                <Text style={styles.footerContact}>📍 Bacoor, Cavite, Philippines</Text>
              </View>
            </ScrollView>
          </View>
        </ImageBackground>
      </View>
    );
  }

  const selectedRoleData = roles.find((r) => r.key === selectedRole);

  return (
    <KeyboardAvoidingView
      style={styles.loginContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6F3" />
      <ScrollView
        contentContainerStyle={styles.loginContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedRole(null)}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={themeColors.textPrimary} />
          <Text style={styles.backText}>Back to Role Selection</Text>
        </TouchableOpacity>

        <View style={styles.loginHeader}>
          <View style={styles.loginIconContainer}>
            <Ionicons name={selectedRoleData.icon} size={34} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.loginSubtitle}>WESTVILLE CASIMIRO HOMES</Text>
            {/* ✅ Fixed: consistent casing */}
            <Text style={styles.loginTitle}>{selectedRoleData.label} LOGIN</Text>
          </View>
        </View>

        <View style={[styles.formContainer, shadows.medium]}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={themeColors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={themeColors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={themeColors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={themeColors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={themeColors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* ✅ Forgot Password styled as green link */}
          <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.8}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* ✅ Fixed: consistent button text casing */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>
                Sign in as {selectedRoleData.label.charAt(0) + selectedRoleData.label.slice(1).toLowerCase()}
              </Text>
            )}
          </TouchableOpacity>

          {selectedRole === 'resident' && (
            <View style={styles.registerSection}>
              <Text style={styles.registerText}>Don&apos;t have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.8}
              >
                <Text style={styles.registerLink}>Register as Resident</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1E2A1E',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    opacity: 0.95,
  },

  // ✅ Gradient overlay replaces plain overlay
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 10, 0.60)',
  },

  landingScrollContent: {
    paddingTop: 52,
    paddingBottom: 36,
    paddingHorizontal: 18,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 42,
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    color: '#F4F4F4',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.4,
  },
  heroContent: {
    marginBottom: 26,
  },
  heroHeading: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  heroDescription: {
    color: '#F3F3F3',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: '96%',
    marginBottom: 12,
    fontWeight: '500',
  },
  readMoreText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  roleCardsContainer: {
    marginBottom: 34,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    minHeight: 86,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  roleCardWeb: {
    cursor: 'pointer',
    transition:
      'background-color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease',
  },
  roleCardHovered: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.5)',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    transform: [{ scale: 1.015 }],
  },
  roleCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  roleIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  roleDesc: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500',
  },
  bottomContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  bottomHeading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomDescription: {
    color: '#F0F0F0',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 330,
    fontWeight: '500',
  },
  browseLotsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 20,
    minWidth: 250,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  browseLotsText: {
    color: '#2E6B2E',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
    letterSpacing: 0.3,
  },

  // ✅ Footer
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerContact: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Login screen styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#F4F6F3',
  },
  loginContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  loginIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2E6B2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  loginSubtitle: {
    fontSize: 12,
    color: themeColors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: '600',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: themeColors.textPrimary,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9E0D3',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: '#F8FAF7',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  // ✅ Forgot Password is now clearly a green link
  forgotPasswordText: {
    color: '#2E6B2E',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#2E6B2E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  // ✅ Fixed button text casing handled in JSX
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    flexWrap: 'wrap',
  },
  registerText: {
    color: themeColors.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: '#2E6B2E',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  },
});

export default LoginScreen;