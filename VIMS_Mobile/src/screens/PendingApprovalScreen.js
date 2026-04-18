import React, { useState, useEffect } from 'react';
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
import LogoutButton from '../components/LogoutButton';

const PendingApprovalScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Don't navigate; AppNavigator will switch to auth stack.
          },
        },
      ]
    );
  };

  const handleCheckStatus = () => {
    Alert.alert(
      'Check Status',
      'To refresh your approval status, please log out then log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            // AppNavigator will route to Login automatically.
          },
        },
      ]
    );
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
          Hello <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>!
        </Text>

        <Text style={styles.message}>
          Your registration as a resident has been submitted successfully and is now
          waiting for admin approval. You will be able to access your account once
          an administrator reviews and approves your registration.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="checkmark-circle" size={18} color={themeColors.warning} />
            <Text style={styles.infoHeaderText}>Registration Details</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color={themeColors.textSecondary} />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={themeColors.textSecondary} />
            <Text style={styles.infoText}>{user?.phone || 'Not provided'}</Text>
          </View>

          {user?.houseNumber && (
            <View style={styles.infoRow}>
              <Ionicons name="home" size={16} color={themeColors.textSecondary} />
              <Text style={styles.infoText}>House {user.houseNumber}</Text>
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

<View style={styles.buttonContainer}>
  <LogoutButton 
    navigation={navigation} 
    color={themeColors.textSecondary} 
    size={20} 
  />
  <TouchableOpacity style={styles.checkButton} onPress={handleCheckStatus}>
    <Ionicons name="checkmark-circle" size={20} color="white" />
    <Text style={styles.checkButtonText}>Check Status</Text>
  </TouchableOpacity>
</View>

        <TouchableOpacity style={styles.contactLink} onPress={handleContactAdmin}>
          <Text style={styles.contactLinkText}>Need help? Contact admin</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>VIMS • Resident Registration System</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3a0a',
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
    width: 120,
    height: 120,
    borderRadius: 60,
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
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
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
    borderRadius: 12,
    padding: 16,
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
buttonContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 16,
},
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
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  checkButtonText: {
    color: 'white',
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