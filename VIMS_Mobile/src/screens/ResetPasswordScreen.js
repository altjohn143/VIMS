import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';

const isStrongPassword = (password) =>
  /^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])/.test(password);

const ResetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const requestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      Alert.alert(
        'Password Reset',
        response.data?.message || 'If your email is registered, you will receive a six-digit reset code.'
      );
      setCode('');
      setResetToken('');
      setStep(2);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!email.trim() || !/^\d{6}$/.test(code.trim())) {
      Alert.alert('Invalid code', 'Enter your email and the six-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password/verify-otp', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Invalid verification code.');
      }
      setResetToken(response.data.resetToken);
      setStep(3);
      Alert.alert('Email verified', 'You can now set your new password.');
    } catch (error) {
      Alert.alert('Verification failed', error.response?.data?.error || error.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!resetToken) {
      Alert.alert('Verify first', 'Please verify your reset code before setting a new password.');
      return;
    }
    if (!isStrongPassword(password)) {
      Alert.alert(
        'Weak password',
        'Password must be 8-128 characters and contain uppercase, lowercase, number, and special character.'
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please re-enter the same password.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword: password,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to reset password.');
      }
      Alert.alert('Password reset successful', 'You can now log in with your new password.', [
        { text: 'Back to Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      Alert.alert('Reset failed', error.response?.data?.error || error.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')}>
          <Ionicons name="arrow-back" size={22} color={themeColors.textPrimary} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={32} color="white" />
          </View>
          <Text style={styles.eyebrow}>WESTVILLE CASIMIRO HOMES</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Request a reset code, verify it, then create your new password.</Text>
        </View>

        <View style={[styles.card, shadows.medium]}>
          <View style={styles.stepRow}>
            {[
              { number: 1, label: 'Email' },
              { number: 2, label: 'Verify' },
              { number: 3, label: 'Password' },
            ].map((item) => (
              <View key={item.number} style={styles.stepItem}>
                <View style={[styles.stepCircle, step >= item.number && styles.stepCircleActive]}>
                  <Text style={[styles.stepNumber, step >= item.number && styles.stepNumberActive]}>{item.number}</Text>
                </View>
                <Text style={[styles.stepLabel, step >= item.number && styles.stepLabelActive]}>{item.label}</Text>
              </View>
            ))}
          </View>

          {step === 1 && (
            <>
              <Text style={styles.sectionTitle}>Step 1 of 3: Provide email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={19} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Registered email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={styles.secondaryButton} onPress={requestCode} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Send Reset Code</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.sectionTitle}>Step 2 of 3: Verify email OTP</Text>
              <Text style={styles.helper}>Enter the six-digit code sent to {email.trim().toLowerCase()}.</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={19} color={themeColors.textSecondary} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  value={code}
                  onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <TouchableOpacity style={styles.secondaryButton} onPress={verifyCode} disabled={loading}>
                <Text style={styles.secondaryButtonText}>{resetToken ? 'Code Verified' : 'Verify Code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={() => { setCode(''); setResetToken(''); setStep(1); }} disabled={loading}>
                <Text style={styles.linkButtonText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.sectionTitle}>Step 3 of 3: Set new password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={19} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((value) => !value)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={19} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.helper}>Use at least 8 characters with uppercase, lowercase, number, and special character.</Text>

              <TouchableOpacity style={[styles.primaryButton, (!resetToken || loading) && styles.disabled]} onPress={resetPassword} disabled={!resetToken || loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Reset Password</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  content: { padding: 20, paddingTop: 52, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  backText: { color: themeColors.textPrimary, fontSize: 15, fontWeight: '700' },
  header: { alignItems: 'center', marginBottom: 22 },
  iconCircle: { width: 66, height: 66, borderRadius: 24, backgroundColor: themeColors.primaryDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  eyebrow: { color: themeColors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: themeColors.textPrimary, fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: themeColors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  card: { backgroundColor: 'white', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: themeColors.border },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  stepItem: { flex: 1, alignItems: 'center' },
  stepCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: themeColors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.surfaceMuted },
  stepCircleActive: { backgroundColor: themeColors.primaryDeep, borderColor: themeColors.primaryDeep },
  stepNumber: { color: themeColors.textSecondary, fontWeight: '900' },
  stepNumberActive: { color: 'white' },
  stepLabel: { marginTop: 6, color: themeColors.textSecondary, fontSize: 11, fontWeight: '800' },
  stepLabelActive: { color: themeColors.primaryDeep },
  sectionTitle: { color: themeColors.textPrimary, fontSize: 15, fontWeight: '900', marginBottom: 10 },
  inputWrapper: { minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: themeColors.borderStrong, backgroundColor: themeColors.surfaceMuted, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  input: { flex: 1, color: themeColors.textPrimary, fontSize: 15, paddingVertical: 12 },
  codeInput: { letterSpacing: 8, textAlign: 'center', fontSize: 20, fontWeight: '800' },
  helper: { color: themeColors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  divider: { height: 1, backgroundColor: themeColors.border, marginVertical: 18 },
  primaryButton: { backgroundColor: themeColors.primaryDeep, borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '900' },
  secondaryButton: { borderRadius: 14, borderWidth: 1, borderColor: themeColors.primary, minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.primary + '10' },
  secondaryButtonText: { color: themeColors.primary, fontSize: 14, fontWeight: '900' },
  linkButton: { alignItems: 'center', marginTop: 14 },
  linkButtonText: { color: themeColors.textSecondary, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});

export default ResetPasswordScreen;
