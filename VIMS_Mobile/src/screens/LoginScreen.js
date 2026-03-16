import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

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
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
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
          <View style={styles.overlay}>
            <ScrollView
              contentContainerStyle={styles.landingScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.topBrandRow}>
                <View style={styles.logoCircle}>
                  <Ionicons name="business-outline" size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.brandTitle}>WESTVILLE CASIMIRO</Text>
                  <Text style={styles.brandSubtitle}>HOMES</Text>
                </View>
              </View>

              <View style={styles.heroContent}>
                <Text style={styles.heroHeading}>
                  YOUR DREAM LIFE{'\n'}
                  AWAITS IN{'\n'}
                  WESTVILLE HOMES
                </Text>

                <Text style={styles.heroDescription}>
                  Standing the test of time, Westville has grown from an innovative real
                  estate developer into a strong name in the industry, continuously
                  building quality homes and vibrant communities where families can live
                  comfortably and create a better future.
                </Text>

                <TouchableOpacity activeOpacity={0.8}>
                  <Text style={styles.readMoreText}>READ MORE</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.roleCardsContainer}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.key}
                    activeOpacity={0.88}
                    style={styles.roleCard}
                    onPress={() => setSelectedRole(role.key)}
                  >
                    <View style={styles.roleIconWrap}>
                      <Ionicons name={role.icon} size={26} color="#2E6B2E" />
                    </View>

                    <View style={styles.roleContent}>
                      <Text style={styles.roleTitle}>{role.label}</Text>
                      <Text style={styles.roleDesc}>{role.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

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
      <ScrollView contentContainerStyle={styles.loginContent} showsVerticalScrollIndicator={false}>
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

          <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.8}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In as {selectedRoleData.label}</Text>
            )}
          </TouchableOpacity>

          {selectedRole === 'resident' && (
            <View style={styles.registerSection}>
              <Text style={styles.registerText}>Don&apos;t have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 10, 0.58)',
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
    backgroundColor: '#5D983E',
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
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  heroDescription: {
    color: '#F3F3F3',
    fontSize: 14,
    lineHeight: 18,
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
    marginTop: 18,
    marginBottom: 34,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 86,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  roleIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F7F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    color: '#2E6B2E',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  roleDesc: {
    color: '#6F6F6F',
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500',
  },
  bottomContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
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
    lineHeight: 16,
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
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#2E6B2E',
    fontSize: 14,
    fontWeight: '600',
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