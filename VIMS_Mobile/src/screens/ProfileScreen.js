import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutButton from '../components/LogoutButton';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    houseNumber: '',
    emergencyContact: { name: '', phone: '' },
    vehicles: [{ plateNumber: '', make: '', model: '', color: '' }],
    familyMembers: [{ name: '', relationship: '', age: '', phone: '' }],
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        const response = await api.get('/users/profile');
        if (response.data.success) {
          const profileData = response.data.data;
          setFormData({
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            houseNumber: profileData.houseNumber || '',
            emergencyContact: profileData.emergencyContact || { name: '', phone: '' },
            vehicles: profileData.vehicles?.length > 0 ? profileData.vehicles : [{ plateNumber: '', make: '', model: '', color: '' }],
            familyMembers: profileData.familyMembers?.length > 0 ? profileData.familyMembers : [{ name: '', relationship: '', age: '', phone: '' }],
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await api.put('/users/profile', formData);
      if (response.data.success) {
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const addVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, { plateNumber: '', make: '', model: '', color: '' }],
    }));
  };

  const removeVehicle = (index) => {
    if (formData.vehicles.length > 1) {
      const newVehicles = formData.vehicles.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, vehicles: newVehicles }));
    }
  };

  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, { name: '', relationship: '', age: '', phone: '' }],
    }));
  };

  const removeFamilyMember = (index) => {
    if (formData.familyMembers.length > 1) {
      const newMembers = formData.familyMembers.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, familyMembers: newMembers }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
<View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="white" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Profile Settings</Text>
  <LogoutButton navigation={navigation} color="white" size={24} />
</View>

      <ScrollView style={styles.content}>
        <View style={[styles.profileCard, shadows.medium]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
          </View>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.houseNumber && <Text style={styles.userHouse}>House {user.houseNumber}</Text>}
        </View>

        <View style={[styles.section, shadows.small]}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={[styles.section, shadows.small]}>
          <Text style={styles.sectionTitle}>Security</Text>
          <TouchableOpacity style={styles.securityButton} onPress={() => setShowPasswordModal(true)}>
            <Ionicons name="lock-closed" size={20} color={themeColors.primary} />
            <Text style={styles.securityButtonText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSaveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Profile Changes</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPasswordModal} animationType="slide" transparent onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                  secureTextEntry={!showPassword.current}
                />
                <TouchableOpacity onPress={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}>
                  <Ionicons name={showPassword.current ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                  secureTextEntry={!showPassword.new}
                />
                <TouchableOpacity onPress={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}>
                  <Ionicons name={showPassword.new ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                  secureTextEntry={!showPassword.confirm}
                />
                <TouchableOpacity onPress={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}>
                  <Ionicons name={showPassword.confirm ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.changeButton]} onPress={handleChangePassword} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.changeButtonText}>Change Password</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: themeColors.primary, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  profileCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: themeColors.border },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 36, fontWeight: '600' },
  userName: { fontSize: 20, fontWeight: '600', color: themeColors.textPrimary, marginBottom: 8 },
  roleBadge: { backgroundColor: themeColors.primary + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginBottom: 8 },
  roleText: { color: themeColors.primary, fontSize: 12, fontWeight: '600' },
  userEmail: { fontSize: 14, color: themeColors.textSecondary, marginBottom: 4 },
  userHouse: { fontSize: 14, color: themeColors.textSecondary },
  section: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: themeColors.border },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: themeColors.textPrimary, marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: themeColors.textSecondary, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: themeColors.border, borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#f8fafc' },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: themeColors.textPrimary, marginLeft: 8 },
  securityButton: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: themeColors.border },
  securityButtonText: { flex: 1, fontSize: 16, color: themeColors.textPrimary, marginLeft: 12 },
  saveButton: { backgroundColor: themeColors.primary, padding: 16, borderRadius: 8, marginTop: 8, marginBottom: 32, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600', color: themeColors.textPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  modalButton: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f1f5f9', marginRight: 8 },
  cancelButtonText: { color: themeColors.textPrimary, fontSize: 16, fontWeight: '600' },
  changeButton: { backgroundColor: themeColors.primary, marginLeft: 8 },
  changeButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});

export default ProfileScreen;