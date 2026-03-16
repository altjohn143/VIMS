// ProfileSettingsScreen.js - Enhanced Responsive Design with Larger Fonts and Bigger Header
import React, { useState, useEffect, useCallback } from 'react';
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
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions with larger base sizes
const responsiveFont = (size) => {
  const scale = Math.min(width, height) / 375;
  // Increased minimum scale to ensure fonts aren't too small
  return Math.round(size * Math.max(Math.min(scale, 1.5), 1.1));
};

const responsiveWidth = (percentage) => {
  return (width * percentage) / 100;
};

const responsiveHeight = (percentage) => {
  return (height * percentage) / 100;
};

// Theme colors (consistent with Dashboard)
const themeColors = {
  primary: '#2224be',
  primaryLight: '#4a4bd1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e5e7eb'
};

import { API_CONFIG } from '../config/apiConfig';
const API_URL = API_CONFIG.forceNetworkIP;

const ProfileSettingsScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    emergencyContact: {
      name: '',
      phone: ''
    },
    vehicles: [{ plateNumber: '', make: '', model: '', color: '' }],
    familyMembers: [{ name: '', relationship: '', age: '', phone: '' }]
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'vehicles', 'family'

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('vims_token');
      const storedUser = await AsyncStorage.getItem('vims_user');
      
      if (!token || !storedUser) {
        Alert.alert('Error', 'Please login first');
        navigation.replace('Login');
        return;
      }

      const userObj = JSON.parse(storedUser);
      setUser(userObj);
      
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-data': JSON.stringify({ id: userObj.id }),
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const userData = data.data;
        setUser(userData);
        setFormData({
          phone: userData.phone || '',
          emergencyContact: userData.emergencyContact || { name: '', phone: '' },
          vehicles: userData.vehicles?.length > 0 ? userData.vehicles : [{ plateNumber: '', make: '', model: '', color: '' }],
          familyMembers: userData.familyMembers?.length > 0 ? userData.familyMembers : [{ name: '', relationship: '', age: '', phone: '' }]
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  };

  const handleInputChange = (field, value, section, index) => {
    if (section === 'main') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (section === 'emergencyContact') {
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else if (section === 'vehicles') {
      const updatedVehicles = [...formData.vehicles];
      updatedVehicles[index] = {
        ...updatedVehicles[index],
        [field]: value
      };
      setFormData(prev => ({
        ...prev,
        vehicles: updatedVehicles
      }));
    } else if (section === 'familyMembers') {
      const updatedMembers = [...formData.familyMembers];
      updatedMembers[index] = {
        ...updatedMembers[index],
        [field]: value
      };
      setFormData(prev => ({
        ...prev,
        familyMembers: updatedMembers
      }));
    }

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAddVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, { plateNumber: '', make: '', model: '', color: '' }]
    }));
  };

  const handleRemoveVehicle = (index) => {
    if (formData.vehicles.length > 1) {
      const updatedVehicles = formData.vehicles.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        vehicles: updatedVehicles
      }));
    }
  };

  const handleAddFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, { name: '', relationship: '', age: '', phone: '' }]
    }));
  };

  const handleRemoveFamilyMember = (index) => {
    if (formData.familyMembers.length > 1) {
      const updatedMembers = formData.familyMembers.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        familyMembers: updatedMembers
      }));
    }
  };

  const validateProfileForm = () => {
    const newErrors = {};

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    return newErrors;
  };

  const handleProfileSubmit = async () => {
    const validationErrors = validateProfileForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('vims_token');
      const userStr = await AsyncStorage.getItem('vims_user');
      const userObj = JSON.parse(userStr);

      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-data': JSON.stringify({ id: userObj.id }),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setUser(data.data);
        await AsyncStorage.setItem('vims_user', JSON.stringify(data.data));
      } else {
        Alert.alert('Error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));

    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    if (field === 'newPassword') {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return '#10b981';
    if (passwordStrength >= 50) return '#f59e0b';
    if (passwordStrength >= 25) return '#ef4444';
    return '#6b7280';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength >= 75) return 'Strong';
    if (passwordStrength >= 50) return 'Medium';
    if (passwordStrength >= 25) return 'Weak';
    return 'Very Weak';
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handlePasswordSubmit = async () => {
    const validationErrors = validatePasswordForm();
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      Alert.alert('Validation Error', 'Please fix the errors before changing password.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('vims_token');
      const userStr = await AsyncStorage.getItem('vims_user');
      const userObj = JSON.parse(userStr);

      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-data': JSON.stringify({ id: userObj.id }),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'Password changed successfully!');
        setChangePasswordModal(false);
        resetPasswordForm();
      } else {
        const errorMsg = data.error || 'Failed to change password';
        Alert.alert('Error', errorMsg);
        
        if (errorMsg.includes('current')) {
          setPasswordErrors(prev => ({
            ...prev,
            currentPassword: 'Current password is incorrect'
          }));
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const resetPasswordForm = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordStrength(0);
    setPasswordErrors({});
    setShowPassword({
      current: false,
      new: false,
      confirm: false
    });
  };

  const PasswordModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={changePasswordModal}
      onRequestClose={() => {
        setChangePasswordModal(false);
        resetPasswordForm();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon name="lock-reset" size={24} color="white" />
              </View>
              <Text style={styles.modalTitle}>Change Password</Text>
            </View>
            
            <View style={styles.modalInfoCard}>
              <Icon name="information-outline" size={20} color={themeColors.info} />
              <Text style={styles.modalInfoText}>
                After changing your password, you will be logged out from all other devices except this one.
              </Text>
            </View>

            <View style={styles.modalInputSection}>
              <Text style={styles.modalInputLabel}>Current Password</Text>
              <View style={[styles.modalInputContainer, passwordErrors.currentPassword && styles.inputError]}>
                <Icon name="lock-outline" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter current password"
                  placeholderTextColor="#9ca3af"
                  value={passwordData.currentPassword}
                  onChangeText={(text) => handlePasswordChange('currentPassword', text)}
                  secureTextEntry={!showPassword.current}
                  editable={!saving}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                  disabled={saving}
                >
                  <Icon
                    name={showPassword.current ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {passwordErrors.currentPassword && (
                <Text style={styles.errorText}>{passwordErrors.currentPassword}</Text>
              )}
            </View>

            <View style={styles.modalInputSection}>
              <Text style={styles.modalInputLabel}>New Password</Text>
              <View style={[styles.modalInputContainer, passwordErrors.newPassword && styles.inputError]}>
                <Icon name="lock-reset" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  value={passwordData.newPassword}
                  onChangeText={(text) => handlePasswordChange('newPassword', text)}
                  secureTextEntry={!showPassword.new}
                  editable={!saving}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                  disabled={saving}
                >
                  <Icon
                    name={showPassword.new ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              
              {passwordData.newPassword && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View
                      style={[
                        styles.passwordStrengthFill,
                        {
                          width: `${passwordStrength}%`,
                          backgroundColor: getPasswordStrengthColor()
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: getPasswordStrengthColor() }]}>
                    {getPasswordStrengthText()}
                  </Text>
                </View>
              )}
              {passwordErrors.newPassword && (
                <Text style={styles.errorText}>{passwordErrors.newPassword}</Text>
              )}
            </View>

            <View style={styles.modalInputSection}>
              <Text style={styles.modalInputLabel}>Confirm New Password</Text>
              <View style={[styles.modalInputContainer, passwordErrors.confirmPassword && styles.inputError]}>
                <Icon name="lock-check-outline" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9ca3af"
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => handlePasswordChange('confirmPassword', text)}
                  secureTextEntry={!showPassword.confirm}
                  editable={!saving}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                  disabled={saving}
                >
                  <Icon
                    name={showPassword.confirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {passwordErrors.confirmPassword && (
                <Text style={styles.errorText}>{passwordErrors.confirmPassword}</Text>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setChangePasswordModal(false);
                  resetPasswordForm();
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handlePasswordSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="lock-reset" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>Update</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const ProfileMenuModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showProfileMenu}
      onRequestClose={() => setShowProfileMenu(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowProfileMenu(false)}
      >
        <View style={styles.profileMenu}>
          <View style={styles.profileMenuHeader}>
            <View style={styles.profileMenuAvatar}>
              <Text style={styles.profileMenuAvatarText}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Text>
            </View>
            <Text style={styles.profileMenuName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.profileMenuEmail}>{user?.email}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              navigation.navigate('ProfileSettings');
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: `${themeColors.primary}10` }]}>
              <Icon name="cog" size={20} color={themeColors.primary} />
            </View>
            <Text style={styles.profileMenuText}>Profile Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              navigation.navigate('Help');
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: `${themeColors.info}10` }]}>
              <Icon name="help-circle" size={20} color={themeColors.info} />
            </View>
            <Text style={styles.profileMenuText}>Help Center</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              Alert.alert('About', 'VIMS Mobile v2.0\nVillage Information Management System');
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: `${themeColors.warning}10` }]}>
              <Icon name="information" size={20} color={themeColors.warning} />
            </View>
            <Text style={styles.profileMenuText}>About App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.profileMenuItem, styles.logoutMenuItem]}
            onPress={handleLogout}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: `${themeColors.error}10` }]}>
              <Icon name="logout" size={20} color={themeColors.error} />
            </View>
            <Text style={[styles.profileMenuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Mobile Tab Navigation
  const renderMobileTabs = () => (
    <View style={styles.mobileTabs}>
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'profile' && styles.mobileTabActive]}
        onPress={() => setActiveTab('profile')}
      >
        <Icon 
          name="account" 
          size={20} 
          color={activeTab === 'profile' ? themeColors.primary : themeColors.textSecondary} 
        />
        <Text style={[
          styles.mobileTabText,
          activeTab === 'profile' && styles.mobileTabTextActive
        ]}>Profile</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'vehicles' && styles.mobileTabActive]}
        onPress={() => setActiveTab('vehicles')}
      >
        <Icon 
          name="car" 
          size={20} 
          color={activeTab === 'vehicles' ? themeColors.primary : themeColors.textSecondary} 
        />
        <Text style={[
          styles.mobileTabText,
          activeTab === 'vehicles' && styles.mobileTabTextActive
        ]}>Vehicles</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'family' && styles.mobileTabActive]}
        onPress={() => setActiveTab('family')}
      >
        <Icon 
          name="account-group" 
          size={20} 
          color={activeTab === 'family' ? themeColors.primary : themeColors.textSecondary} 
        />
        <Text style={[
          styles.mobileTabText,
          activeTab === 'family' && styles.mobileTabTextActive
        ]}>Family</Text>
      </TouchableOpacity>
    </View>
  );

  const handleLogout = async () => {
    const performLogout = async () => {
      try {
        await AsyncStorage.multiRemove(['vims_user', 'vims_token']);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes", 
          onPress: performLogout
        }
      ]
    );
  };

  if (loading && !initialLoadComplete) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />
      
      {/* ===== ENHANCED HEADER WITH BIGGER DESIGN (Matching Dashboard) ===== */}
      <LinearGradient
        colors={[themeColors.primary, '#1a1a9e']}
        style={styles.header}
      >
        {/* Decorative elements */}
        <View style={styles.headerDecoration1} />
        <View style={styles.headerDecoration2} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Profile Settings</Text>
            <Text style={styles.headerSubtitle}>Update your information</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => setShowProfileMenu(true)}
            style={styles.profileButton}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* User quick info */}
        <View style={styles.headerUserInfo}>
          <Text style={styles.headerUserName}>{user?.firstName} {user?.lastName}</Text>
          <View style={styles.headerRoleBadge}>
            <Text style={styles.headerRoleText}>{user?.role?.toUpperCase() || 'RESIDENT'}</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            {/* PROFILE CARD - Matching Dashboard */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={[themeColors.primary, '#1a1a9e']}
                style={styles.profileGradient}
              >
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatarLarge}>
                    <Text style={styles.profileAvatarLargeText}>
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.profileTextContainer}>
                    <Text style={styles.profileName}>
                      {user?.firstName || user?.email?.split('@')[0] || 'User'} {user?.lastName || ''}
                    </Text>
                    <View style={[styles.roleBadge, { backgroundColor: themeColors.primary }]}>
                      <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.profileEmail} numberOfLines={1} ellipsizeMode="tail">
                      {user?.email}
                    </Text>
                    {user?.houseNumber && (
                      <Text style={styles.profileHouse}>House {user.houseNumber}</Text>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* SECURITY SECTION */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: `${themeColors.primary}10` }]}>
                  <Icon name="security" size={20} color={themeColors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Security</Text>
              </View>
              <TouchableOpacity
                style={styles.securityButton}
                onPress={() => setChangePasswordModal(true)}
              >
                <Icon name="lock-reset" size={20} color={themeColors.primary} />
                <Text style={styles.securityButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>

            {/* Mobile Tabs */}
            {renderMobileTabs()}

            {/* PROFILE FORM */}
            <View style={styles.formCard}>
              {activeTab === 'profile' && (
                <>
                  <Text style={styles.formTitle}>Profile Information</Text>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                      <Icon name="phone-outline" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter phone number"
                        placeholderTextColor="#9ca3af"
                        value={formData.phone}
                        onChangeText={(text) => handleInputChange('phone', text, 'main')}
                        keyboardType="phone-pad"
                        maxLength={10}
                        editable={!saving}
                      />
                    </View>
                    {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                  </View>

                  <Text style={styles.subSectionTitle}>Emergency Contact</Text>
                  <View style={styles.infoBox}>
                    <Icon name="information-outline" size={16} color={themeColors.info} />
                    <Text style={styles.infoText}>
                      Please provide an emergency contact person. This information is crucial for emergencies.
                    </Text>
                  </View>

                  <View style={styles.twoColumnInput}>
                    <View style={[styles.columnInput, { marginRight: responsiveWidth(2) }]}>
                      <Text style={styles.inputLabel}>Contact Name</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.input}
                          placeholder="Full name"
                          placeholderTextColor="#9ca3af"
                          value={formData.emergencyContact.name}
                          onChangeText={(text) => handleInputChange('name', text, 'emergencyContact')}
                          editable={!saving}
                        />
                      </View>
                    </View>
                    <View style={[styles.columnInput, { marginLeft: responsiveWidth(2) }]}>
                      <Text style={styles.inputLabel}>Contact Phone</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.input}
                          placeholder="Phone number"
                          placeholderTextColor="#9ca3af"
                          value={formData.emergencyContact.phone}
                          onChangeText={(text) => handleInputChange('phone', text, 'emergencyContact')}
                          keyboardType="phone-pad"
                          editable={!saving}
                        />
                      </View>
                    </View>
                  </View>
                </>
              )}

              {activeTab === 'vehicles' && (
                <>
                  <Text style={styles.formTitle}>Registered Vehicles</Text>
                  {formData.vehicles.map((vehicle, index) => (
                    <View key={index} style={styles.vehicleCard}>
                      <View style={styles.vehicleHeader}>
                        <View style={styles.vehicleHeaderLeft}>
                          <View style={[styles.vehicleIconContainer, { backgroundColor: `${themeColors.primary}10` }]}>
                            <Icon name="car" size={18} color={themeColors.primary} />
                          </View>
                          <Text style={styles.vehicleTitle}>Vehicle {index + 1}</Text>
                        </View>
                        {formData.vehicles.length > 1 && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveVehicle(index)}
                            disabled={saving}
                          >
                            <Icon name="close-circle" size={22} color={themeColors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <View style={styles.twoColumnInput}>
                        <View style={[styles.columnInput, { marginRight: responsiveWidth(2) }]}>
                          <Text style={styles.inputLabel}>Plate Number</Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="ABC-123"
                              placeholderTextColor="#9ca3af"
                              value={vehicle.plateNumber}
                              onChangeText={(text) => handleInputChange('plateNumber', text, 'vehicles', index)}
                              editable={!saving}
                            />
                          </View>
                        </View>
                        <View style={[styles.columnInput, { marginLeft: responsiveWidth(2) }]}>
                          <Text style={styles.inputLabel}>Make</Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Toyota"
                              placeholderTextColor="#9ca3af"
                              value={vehicle.make}
                              onChangeText={(text) => handleInputChange('make', text, 'vehicles', index)}
                              editable={!saving}
                            />
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.twoColumnInput}>
                        <View style={[styles.columnInput, { marginRight: responsiveWidth(2) }]}>
                          <Text style={styles.inputLabel}>Model</Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Camry"
                              placeholderTextColor="#9ca3af"
                              value={vehicle.model}
                              onChangeText={(text) => handleInputChange('model', text, 'vehicles', index)}
                              editable={!saving}
                            />
                          </View>
                        </View>
                        <View style={[styles.columnInput, { marginLeft: responsiveWidth(2) }]}>
                          <Text style={styles.inputLabel}>Color</Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Red"
                              placeholderTextColor="#9ca3af"
                              value={vehicle.color}
                              onChangeText={(text) => handleInputChange('color', text, 'vehicles', index)}
                              editable={!saving}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                  
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddVehicle}
                    disabled={saving}
                  >
                    <Icon name="plus" size={20} color={themeColors.primary} />
                    <Text style={styles.addButtonText}>Add Another Vehicle</Text>
                  </TouchableOpacity>
                </>
              )}

              {activeTab === 'family' && (
                <>
                  <Text style={styles.formTitle}>Family Members</Text>
                  {formData.familyMembers.map((member, index) => (
                    <View key={index} style={styles.familyCard}>
                      <View style={styles.familyHeader}>
                        <View style={styles.familyHeaderLeft}>
                          <View style={[styles.familyIconContainer, { backgroundColor: `${themeColors.primary}10` }]}>
                            <Icon name="account" size={18} color={themeColors.primary} />
                          </View>
                          <Text style={styles.familyTitle}>Family Member {index + 1}</Text>
                        </View>
                        {formData.familyMembers.length > 1 && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveFamilyMember(index)}
                            disabled={saving}
                          >
                            <Icon name="close-circle" size={22} color={themeColors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <View style={styles.twoColumnInput}>
                        <View style={[styles.columnInput, { marginRight: responsiveWidth(2) }]}>
                          <Text style={styles.inputLabel}>Full Name</Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Full name"
                              placeholderTextColor="#9ca3af"
                              value={member.name}
                              onChangeText={(text) => handleInputChange('name', text, 'familyMembers', index)}
                              editable={!saving}
                            />
                          </View>
                        </View>
                        <View style={[styles.columnInput, { marginLeft: responsiveWidth(2) }]}>
                          <Text style={styles.inputLabel}>Relationship</Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Spouse, Child, etc."
                              placeholderTextColor="#9ca3af"
                              value={member.relationship}
                              onChangeText={(text) => handleInputChange('relationship', text, 'familyMembers', index)}
                              editable={!saving}
                            />
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.twoColumnInput}>
                        <View style={[styles.columnInput, { marginRight: responsiveWidth(2) }]}>
                          <Text style={styles.inputLabel}>Age</Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Age"
                              placeholderTextColor="#9ca3af"
                              value={member.age}
                              onChangeText={(text) => handleInputChange('age', text, 'familyMembers', index)}
                              keyboardType="numeric"
                              editable={!saving}
                            />
                          </View>
                        </View>
                        <View style={[styles.columnInput, { marginLeft: responsiveWidth(2) }]}>
                          <Text style={styles.inputLabel}>Phone</Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={styles.input}
                              placeholder="Phone number"
                              placeholderTextColor="#9ca3af"
                              value={member.phone}
                              onChangeText={(text) => handleInputChange('phone', text, 'familyMembers', index)}
                              keyboardType="phone-pad"
                              editable={!saving}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                  
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddFamilyMember}
                    disabled={saving}
                  >
                    <Icon name="plus" size={20} color={themeColors.primary} />
                    <Text style={styles.addButtonText}>Add Another Family Member</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* SAVE BUTTON - Always visible */}
              <TouchableOpacity
                style={[styles.saveProfileButton, saving && styles.buttonDisabled]}
                onPress={handleProfileSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="content-save" size={20} color="#fff" />
                    <Text style={styles.saveProfileButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PasswordModal />
      <ProfileMenuModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: responsiveFont(18),
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  // ===== ENHANCED HEADER STYLES (Matching Dashboard) =====
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 12,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecoration1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerDecoration2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: responsiveFont(28),
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: responsiveFont(16),
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  profileAvatarText: {
    color: themeColors.primary,
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerUserName: {
    fontSize: responsiveFont(16),
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
  headerRoleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerRoleText: {
    color: 'white',
    fontSize: responsiveFont(12),
    fontWeight: '600',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentContainer: {
    padding: responsiveWidth(4),
  },
  profileCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  profileGradient: {
    padding: responsiveWidth(4),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarLarge: {
    width: responsiveWidth(22),
    height: responsiveWidth(22),
    borderRadius: responsiveWidth(11),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsiveWidth(3),
    elevation: 4,
  },
  profileAvatarLargeText: {
    color: themeColors.primary,
    fontSize: responsiveFont(28),
    fontWeight: 'bold',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: responsiveFont(22),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  roleText: {
    color: 'white',
    fontSize: responsiveFont(13),
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: responsiveFont(16),
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  profileHouse: {
    fontSize: responsiveFont(16),
    color: 'rgba(255, 255, 255, 0.9)',
  },
  sectionCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  subSectionTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  securityButtonText: {
    color: themeColors.primary,
    fontSize: responsiveFont(18),
    fontWeight: '600',
    marginLeft: 8,
  },
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: themeColors.border,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  mobileTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(2),
    borderRadius: 26,
  },
  mobileTabActive: {
    backgroundColor: `${themeColors.primary}10`,
  },
  mobileTabText: {
    fontSize: responsiveFont(15),
    color: themeColors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  mobileTabTextActive: {
    color: themeColors.primary,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  formTitle: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: responsiveFont(15),
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    height: 50,
  },
  inputError: {
    borderColor: themeColors.error,
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: responsiveFont(16),
    color: themeColors.textPrimary,
    height: '100%',
    paddingVertical: 0,
  },
  errorText: {
    color: themeColors.error,
    fontSize: responsiveFont(14),
    marginTop: 4,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoText: {
    flex: 1,
    fontSize: responsiveFont(14),
    color: '#0369a1',
    marginLeft: 8,
    lineHeight: 20,
  },
  twoColumnInput: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  columnInput: {
    flex: 1,
  },
  vehicleCard: {
    backgroundColor: themeColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  vehicleTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  removeButton: {
    padding: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  addButtonText: {
    color: themeColors.primary,
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginLeft: 8,
  },
  familyCard: {
    backgroundColor: themeColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  familyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  familyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  familyTitle: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  saveProfileButton: {
    backgroundColor: themeColors.primary,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
    elevation: 2,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveProfileButtonText: {
    color: '#fff',
    fontSize: responsiveFont(18),
    fontWeight: '600',
    marginLeft: 8,
  },
  eyeButton: {
    padding: 8,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: themeColors.border,
    borderRadius: 2,
    marginRight: 12,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: responsiveFont(14),
    color: themeColors.textSecondary,
    fontWeight: '500',
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
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  modalInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  modalInfoText: {
    flex: 1,
    fontSize: responsiveFont(15),
    color: '#0369a1',
    marginLeft: 10,
    lineHeight: 20,
  },
  modalInputSection: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    height: 54,
  },
  modalInput: {
    flex: 1,
    fontSize: responsiveFont(16),
    color: themeColors.textPrimary,
    height: '100%',
    paddingVertical: 0,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: responsiveFont(18),
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: themeColors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: responsiveFont(18),
    fontWeight: '600',
    marginLeft: 8,
  },
  profileMenu: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  profileMenuHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    marginBottom: 8,
  },
  profileMenuAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileMenuAvatarText: {
    color: 'white',
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
  },
  profileMenuName: {
    fontSize: responsiveFont(22),
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  profileMenuEmail: {
    fontSize: responsiveFont(16),
    color: themeColors.textSecondary,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileMenuText: {
    fontSize: responsiveFont(18),
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: themeColors.error,
  },
});

export default ProfileSettingsScreen;