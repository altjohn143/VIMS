import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { themeColors } from '../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

const PendingApprovalScreen = ({ navigation, route }) => {
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const approvalAlertShown = useRef(false);

  const registration = route?.params?.registration;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const checkApproval = async () => {
      const email = registration?.email || user?.email;
      if (!email) return;
      try {
        const response = await api.post('/auth/pending-status', { email });
        if (response.data?.success && response.data?.data?.isApproved && !approvalAlertShown.current) {
          approvalAlertShown.current = true;
          Alert.alert('Account approved', 'Your resident account is approved. Please sign in to continue.', [{
            text: 'Go to Resident Login',
            onPress: async () => {
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          }]);
        }
      } catch (error) {
        console.warn('Unable to check pending approval status:', error?.message);
      }
    };
    checkApproval();
    const intervalId = setInterval(checkApproval, 8000);
    return () => clearInterval(intervalId);
  }, [registration?.email, user?.email, logout, navigation]);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) setUser(JSON.parse(userStr));
    } catch (error) {
      console.warn('Unable to restore pending account:', error?.message);
    }
  };

  const displayUser = registration || user;
  const idUploadError = route?.params?.idUploadError;

  const handleCheckStatus = async () => {
    const email = registration?.email || user?.email;
    if (!email) return;
    setCheckingStatus(true);
    try {
      const response = await api.post('/auth/pending-status', { email });
      const documents = response.data?.data?.documents;
      if (response.data?.data?.isApproved) {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        Alert.alert('Still pending', documents?.verified ? 'Your ID is verified. Your resident account is waiting for admin approval.' : 'Your registration is still waiting for review.');
      }
    } catch (error) {
      Alert.alert('Status unavailable', error?.response?.data?.error || 'Unable to refresh your approval status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleContactAdmin = () => {
    Alert.alert('Contact Admin', 'Email: admin@vims.com\nPlease wait for approval.');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            <Ionicons name="time" size={60} color={themeColors.warning} />
          </View>
        </View>

        <Text style={styles.title}>Pending Approval</Text>
        
        <Text style={styles.welcomeText}>
          Hello <Text style={styles.userName}>{displayUser?.firstName} {displayUser?.lastName}</Text>!
        </Text>

        <Text style={styles.message}>
          Your registration as a resident has been submitted successfully and is now
          waiting for admin approval. You will be able to access your account once
          an administrator reviews and approves your registration.
        </Text>

        {idUploadError ? <Text style={styles.errorText}>{idUploadError}</Text> : null}

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="checkmark-circle" size={18} color={themeColors.warning} />
            <Text style={styles.infoHeaderText}>Registration Details</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color={themeColors.textSecondary} />
            <Text style={styles.infoText}>{displayUser?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={themeColors.textSecondary} />
            <Text style={styles.infoText}>{displayUser?.phone || 'Not provided'}</Text>
          </View>

          {displayUser?.houseNumber && (
            <View style={styles.infoRow}>
              <Ionicons name="home" size={16} color={themeColors.textSecondary} />
              <Text style={styles.infoText}>House {displayUser.houseNumber}</Text>
            </View>
          )}
        </View>

        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>📋 What happens next?</Text>
          
          <View style={styles.stepItem}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepText}>An admin will review your registration details</Text>
          </View>
          
          <View style={styles.stepItem}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepText}>You'll be able to login once your account is approved</Text>
          </View>
          
          <View style={styles.stepItem}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepText}>This usually takes 1-2 business days</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.contactLink} onPress={handleContactAdmin}>
          <Text style={styles.contactLinkText}>Need help? Contact admin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactLink} onPress={handleCheckStatus} disabled={checkingStatus}>
          <Text style={styles.contactLinkText}>{checkingStatus ? 'Checking status…' : 'Refresh approval status'}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>VIMS • Resident Registration System</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.nav,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  userName: {
    fontWeight: '700',
    color: 'white',
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoHeaderText: {
    color: themeColors.warning,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 12,
  },
  nextStepsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  nextStepsTitle: {
    color: themeColors.warning,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    color: themeColors.warning,
    fontSize: 12,
    fontWeight: '700',
    width: 20,
  },
  stepText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    flex: 1,
  },
  redirectText: { color: themeColors.warning, fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoutButtonText: {
    color: themeColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  contactLink: {
    alignItems: 'center',
    marginBottom: 20,
  },
  contactLinkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PendingApprovalScreen;
