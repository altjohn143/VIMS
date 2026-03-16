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
    { key: 'resident', label: 'RESIDENT', icon: 'home', description: 'Access personal information, community updates, and services.' },
    { key: 'admin', label: 'ADMIN', icon: 'shield', description: 'Manage the system, resident records, and community information.' },
    { key: 'security', label: 'SECURITY', icon: 'lock-closed', description: 'Monitor entries and help keep the community safe.' },
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
      <ScrollView style={styles.container}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>WESTVILLE CASIMIRO</Text>
          <Text style={styles.heroSubtitle}>HOMES</Text>
        </View>

        <View style={styles.rolesSection}>
          <Text style={styles.sectionTitle}>Select Your Role</Text>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.key}
              style={[styles.roleCard, shadows.small]}
              onPress={() => setSelectedRole(role.key)}
            >
              <View style={styles.roleIconContainer}>
                <Ionicons name={role.icon} size={30} color={themeColors.primary} />
              </View>
              <View style={styles.roleContent}>
                <Text style={styles.roleLabel}>{role.label}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.browseLotsButton}
            onPress={handleBrowseLots}
          >
            <Ionicons name="map" size={20} color={themeColors.primary} />
            <Text style={styles.browseLotsText}>Browse Available Lots</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const selectedRoleData = roles.find(r => r.key === selectedRole);

  return (
    <KeyboardAvoidingView
      style={styles.loginContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.loginContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedRole(null)}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          <Text style={styles.backText}>Back to Role Selection</Text>
        </TouchableOpacity>

        <View style={styles.loginHeader}>
          <View style={styles.loginIconContainer}>
            <Ionicons name={selectedRoleData.icon} size={40} color="white" />
          </View>
          <View>
            <Text style={styles.loginSubtitle}>WESTVILLE CASIMIRO HOMES</Text>
            <Text style={styles.loginTitle}>{selectedRoleData.label} Login</Text>
          </View>
        </View>

        <View style={[styles.formContainer, shadows.medium]}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
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
            <Ionicons name="key" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={themeColors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In as {selectedRoleData.label}</Text>
            )}
          </TouchableOpacity>

          {selectedRole === 'resident' && (
            <View style={styles.registerSection}>
              <Text style={styles.registerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
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
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  heroSection: {
    backgroundColor: themeColors.primary,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 16,
  },
  heroText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 22,
  },
  rolesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  roleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: themeColors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    color: themeColors.textSecondary,
    lineHeight: 16,
  },
  browseLotsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  browseLotsText: {
    color: themeColors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  loginContent: {
    flexGrow: 1,
    padding: 20,
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
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  loginIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  loginSubtitle: {
    fontSize: 12,
    color: themeColors.textSecondary,
    letterSpacing: 1,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  formContainer: {
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
    marginBottom: 16,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: themeColors.primary,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  registerText: {
    color: themeColors.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: themeColors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default LoginScreen;