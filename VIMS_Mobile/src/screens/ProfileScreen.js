import React, { useRef, useState, useEffect } from 'react';
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
  Image,
  Keyboard,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { themeColors, shadows, roleLayouts } from '../utils/theme';
import api, { getProtectedImageDataUrl } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserDropdownMenu from '../components/UserDropdownMenu';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getAuthToken } from '../utils/secureSession';
import { safeGoBack } from '../utils/navigation';

const ProfileScreen = ({ navigation }) => {
  const { updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moveOutSubmitting, setMoveOutSubmitting] = useState(false);
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
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState('');
const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [moveOutReason, setMoveOutReason] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const passwordScrollRef = useRef(null);
  const moveOutScrollRef = useRef(null);
  const moveOutSubmittingRef = useRef(false);

  const scrollModalTo = (ref, y) => {
    setTimeout(() => {
      ref.current?.scrollTo?.({ y, animated: true });
    }, 120);
  };
  const keyboardSheetStyle = Platform.OS === 'ios' && keyboardHeight > 0
    ? {
        maxHeight: Math.max(260, Dimensions.get('window').height - keyboardHeight - 18),
      }
    : null;

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentModalTitle, setDocumentModalTitle] = useState('');
  const [documentModalImage, setDocumentModalImage] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    houseNumber: '',
    emergencyContact: { name: '', phone: '' },
    vehicles: [{ plateNumber: '', make: '', model: '', color: '' }],
    familyMembers: [{ name: '', relationship: '', age: '', phone: '' }],
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState(null);
  const [documentPreviewUrls, setDocumentPreviewUrls] = useState({ front: null, back: null, selfie: null });
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const validateProfile = () => {
    const emergencyPhone = String(formData.emergencyContact?.phone || '').replace(/\D/g, '');
    if (formData.emergencyContact?.phone && emergencyPhone.length < 10) {
      return 'Please enter a valid emergency contact phone number.';
    }

    return '';
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
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
          const updatedUser = { ...userData, ...profileData };
          setUser(updatedUser);
          await updateUser(updatedUser);
          setFormData({
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            dateOfBirth: profileData.dateOfBirth || '',
            houseNumber: profileData.houseNumber || '',
            emergencyContact: profileData.emergencyContact || { name: '', phone: '' },
            vehicles: profileData.vehicles?.length > 0 ? profileData.vehicles : [{ plateNumber: '', make: '', model: '', color: '' }],
            familyMembers: profileData.familyMembers?.length > 0 ? profileData.familyMembers : [{ name: '', relationship: '', age: '', phone: '' }],
          });
          setProfilePhoto(buildProfilePhotoUrl(profileData.profilePhotoUrl || profileData.profilePhoto || userData.profilePhoto || null));
        }
      }
      
      // Load uploaded documents
      await loadUploadedDocuments();
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const arrayBufferToDataUrl = (buffer, mimeType = 'image/jpeg') => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = typeof btoa === 'function'
      ? btoa(binary)
      : typeof Buffer !== 'undefined'
      ? Buffer.from(binary, 'binary').toString('base64')
      : null;

    if (!base64) {
      throw new Error('Unable to create base64 preview data URL');
    }

    return `data:${mimeType};base64,${base64}`;
  };

  const fetchDocumentPreviewUrl = async (filename) => {
    if (!filename) return null;
    return await getProtectedImageDataUrl(`/verifications/my-files/${filename}`);
  };

  const loadDocumentPreviewUrls = async (verification) => {
    if (!verification) return;

    const previews = { front: null, back: null, selfie: null };
    const fetchers = [];

    if (verification.frontImage) {
      fetchers.push(
        fetchDocumentPreviewUrl(verification.frontImage)
          .then((url) => { previews.front = url; })
          .catch(() => {})
      );
    }
    if (verification.backImage) {
      fetchers.push(
        fetchDocumentPreviewUrl(verification.backImage)
          .then((url) => { previews.back = url; })
          .catch(() => {})
      );
    }
    if (verification.selfieImage) {
      fetchers.push(
        fetchDocumentPreviewUrl(verification.selfieImage)
          .then((url) => { previews.selfie = url; })
          .catch(() => {})
      );
    }

    await Promise.all(fetchers);
    setDocumentPreviewUrls(previews);
  };

  const loadUploadedDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await api.get('/verifications/me');
      if (response.data.success && response.data.data) {
        const verification = response.data.data;
        setUploadedDocuments({
          frontImage: verification.frontImage,
          backImage: verification.backImage,
          selfieImage: verification.selfieImage,
          status: verification.status,
          documentsVerified: verification.documentsVerified
        });
        await loadDocumentPreviewUrls(verification);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      // Don't show error alert for documents, as they might not have uploaded any yet
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleSaveProfile = async () => {
    const validationError = validateProfile();
    if (validationError) {
      Alert.alert('Invalid Profile', validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        emergencyContact: formData.emergencyContact,
        vehicles: formData.vehicles,
        familyMembers: formData.familyMembers,
      };
      const response = await api.put('/users/profile', payload);
      if (response.data.success) {
        if (selectedPhotoUri) {
          await uploadProfilePhoto(selectedPhotoUri);
          setSelectedPhotoUri(null);
        } else {
          Alert.alert('Success', 'Profile updated successfully');
        }
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const requestMoveOut = async () => {
    if (moveOutSubmittingRef.current || moveOutSubmitting || user?.moveOutStatus === 'pending' || user?.moveOutStatus === 'approved') {
      Alert.alert('Move-out Request Exists', 'You already have an active move-out request.');
      return;
    }

    if (!moveOutReason.trim()) {
      Alert.alert('Reason required', 'Please explain why you are requesting to move out.');
      return;
    }
    try {
      setMoveOutSubmitting(true);
      moveOutSubmittingRef.current = true;
      const res = await api.post('/users/move-out/request', { reason: moveOutReason.trim() });
      if (res.data?.success) {
        const updatedUser = { ...user, ...(res.data?.data || {}), moveOutStatus: 'pending' };
        setUser(updatedUser);
        await updateUser(updatedUser);
        Alert.alert('Submitted', res.data.message || 'Move-out request submitted');
        setShowMoveOutModal(false);
        setMoveOutReason('');
        await loadUserProfile();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to submit move-out request');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to submit move-out request');
    } finally {
      setMoveOutSubmitting(false);
      moveOutSubmittingRef.current = false;
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

    if (passwordData.newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])/.test(passwordData.newPassword)) {
      Alert.alert('Error', 'Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    setSaving(true);
    try {
      if (!passwordOtpSent) {
        const otpResponse = await api.post('/auth/change-password-otp/request', { currentPassword: passwordData.currentPassword });
        if (!otpResponse.data?.success) {
          Alert.alert('Incorrect Password', otpResponse.data?.error || 'The current password you entered is incorrect.');
          return;
        }
        setPasswordOtpSent(true);
        Alert.alert('Code sent', 'A six-digit verification code was sent to your email.');
        return;
      }
      if (!/^\d{6}$/.test(passwordOtp)) {
        Alert.alert('Invalid code', 'Enter the six-digit code sent to your email.');
        return;
      }
      const verification = await api.post('/auth/change-password-otp/verify', { code: passwordOtp });
      if (!verification.data?.success || !verification.data?.verificationToken) {
        Alert.alert('Invalid code', verification.data?.error || 'The verification code is invalid or expired.');
        return;
      }
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        otpVerificationToken: verification.data.verificationToken,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordOtp('');
        setPasswordOtpSent(false);
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const shareDocument = async () => {
    if (!documentModalImage) return;
    try {
      const match = String(documentModalImage).match(/^data:([^;]+);base64,(.+)$/);
      const safeTitle = documentModalTitle.replace(/\s+/g, '-').toLowerCase();
      let target;
      let mimeType = 'image/jpeg';
      if (match) {
        mimeType = match[1];
        const extension = mimeType.includes('png') ? 'png' : 'jpg';
        target = `${FileSystem.cacheDirectory}${safeTitle}.${extension}`;
        await FileSystem.writeAsStringAsync(target, match[2], { encoding: FileSystem.EncodingType.Base64 });
      } else {
        const token = await getAuthToken();
        target = `${FileSystem.cacheDirectory}${safeTitle}.jpg`;
        const result = await FileSystem.downloadAsync(documentModalImage, target, { headers: { Authorization: `Bearer ${token}` } });
        target = result.uri;
      }
      await Sharing.shareAsync(target, { mimeType, dialogTitle: `Save ${documentModalTitle}` });
    } catch (error) {
      Alert.alert('Unable to save', 'This document could not be saved or shared.');
    }
  };

  const pickProfileImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    const canceled = result.canceled || result.cancelled;
    if (canceled) {
      return;
    }

    const asset = result.assets?.[0] || result;
    if (!asset?.uri) {
      return;
    }

    setSelectedPhotoUri(asset.uri);
    if (user?.role !== 'resident') {
      await uploadProfilePhoto(asset.uri);
      setSelectedPhotoUri(null);
      return;
    }
    Alert.alert('Photo Selected', 'Click "Save Profile Changes" to apply the new photo.');
  };

  const buildProfilePhotoUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '')
      || process.env.EXPO_PUBLIC_API_URL?.replace(/\/api$/, '')
      || 'https://vims-backend.onrender.com';
    return `${baseUrl}/uploads/profile-photos/${photo}`;
  };

  const buildDocumentUrl = (filename) => {
    if (!filename) return null;
    if (/^https?:\/\//i.test(String(filename))) return filename;
    const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || '';
    return `${baseUrl}/api/verifications/my-files/${filename}`;
  };

  const buildVehicleUrl = (filename) => {
    if (!filename) return null;
    if (/^https?:\/\//i.test(String(filename))) return filename;
    const apiBaseUrl = api.defaults.baseURL || '';
    const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}/uploads/vehicle-photos/${filename}`;
  };

  const openDocumentModal = (title, imageUrl) => {
    setDocumentModalTitle(title);
    setDocumentModalImage(imageUrl);
    setShowDocumentModal(true);
  };

  const closeDocumentModal = () => {
    setShowDocumentModal(false);
    setDocumentModalTitle('');
    setDocumentModalImage(null);
  };

  const uploadProfilePhoto = async (uri) => {
    try {
      setUploadingPhoto(true);
      const filename = uri.split('/').pop() || 'profile-photo.jpg';
      const match = filename?.match(/\.(\w+)$/);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const uploadData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], filename, { type });
        uploadData.append('photo', file);
      } else {
        uploadData.append('photo', {
          uri,
          name: filename,
          type,
        });
      }

      const response = await api.post('/users/profile-photo', uploadData);

      if (response.data.success) {
        const updatedPhoto = response.data.data.profilePhotoUrl || buildProfilePhotoUrl(response.data.data.profilePhoto) || uri;
        setProfilePhoto(updatedPhoto);

        if (user) {
          const updatedUser = {
            ...user,
            profilePhoto: response.data.data.profilePhoto || updatedPhoto,
            profilePhotoUrl: response.data.data.profilePhotoUrl || updatedPhoto
          };
          setUser(updatedUser);
          updateUser(updatedUser);
        }

        Alert.alert('Success', 'Profile photo updated successfully');
      }
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
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

  const isResidentProfile = user?.role === 'resident';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.primaryDeep} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <UserDropdownMenu navigation={navigation} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.8} style={styles.avatarButton}>
              {selectedPhotoUri ? (
                <Image source={{ uri: selectedPhotoUri }} style={styles.avatar} />
              ) : profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatar} />
              ) : documentPreviewUrls.selfie ? (
                <Image source={{ uri: documentPreviewUrls.selfie }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickProfileImage} disabled={uploadingPhoto}>
              <Ionicons name="camera-outline" size={15} color={themeColors.primary} />
              <Text style={styles.photoButtonText}>{uploadingPhoto ? 'Uploading...' : 'Change Photo'}</Text>
            </TouchableOpacity>
          </View>
          {selectedPhotoUri && (
            <View style={styles.previewNotice}>
              <Ionicons name="information-circle" size={16} color={themeColors.secondary} />
              <Text style={styles.previewText}>Photo selected and ready to save</Text>
            </View>
          )}
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
            <View style={[styles.inputContainer, styles.disabledInputContainer]}>
              <Ionicons name="person" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={formData.firstName}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <View style={[styles.inputContainer, styles.disabledInputContainer]}>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={formData.lastName}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.disabledInputContainer]}>
              <Ionicons name="mail" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={formData.email}
                editable={false}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputContainer, styles.disabledInputContainer]}>
              <Ionicons name="call" size={20} color={themeColors.textSecondary} />
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={formData.phone}
                editable={false}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {!!formData.dateOfBirth && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Birthday</Text>
              <View style={[styles.inputContainer, styles.disabledInputContainer]}>
                <Ionicons name="calendar" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={formatDate(formData.dateOfBirth)}
                  editable={false}
                />
              </View>
            </View>
          )}

          {isResidentProfile && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>House Number</Text>
              <View style={[styles.inputContainer, styles.disabledInputContainer]}>
                <Ionicons name="home" size={20} color={themeColors.textSecondary} />
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={formData.houseNumber}
                  editable={false}
                />
              </View>
            </View>
          )}

        </View>

        {isResidentProfile && (
          <>
            <View style={[styles.section, shadows.small]}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <Text style={styles.label}>Contact Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={themeColors.textSecondary} />
                <TextInput style={styles.input} value={formData.emergencyContact.name} onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, name: text } }))} placeholder="Full name" />
              </View>
              <Text style={[styles.label, { marginTop: 14 }]}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={themeColors.textSecondary} />
                <TextInput style={styles.input} value={formData.emergencyContact.phone} onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, phone: text.replace(/\D/g, '').slice(0, 11) } }))} placeholder="09XXXXXXXXX" keyboardType="phone-pad" />
              </View>
            </View>

            <View style={[styles.section, shadows.small]}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Vehicles</Text>
                <TouchableOpacity style={styles.addInlineButton} onPress={addVehicle}><Ionicons name="add" size={18} color="white" /><Text style={styles.addInlineText}>Add</Text></TouchableOpacity>
              </View>
              {formData.vehicles.map((vehicle, index) => (
                <View key={index} style={styles.vehicleEditor}>
                  <View style={styles.vehicleEditorHeader}>
                    <Text style={styles.vehicleEditorTitle}>Vehicle {index + 1}</Text>
                    {formData.vehicles.length > 1 && <TouchableOpacity style={styles.removeInlineButton} onPress={() => removeVehicle(index)}><Ionicons name="trash-outline" size={16} color={themeColors.error} /><Text style={styles.removeInlineText}>Remove</Text></TouchableOpacity>}
                  </View>
                  {[
                    ['Plate number', 'plateNumber'],
                    ['Make', 'make'],
                    ['Model', 'model'],
                    ['Color', 'color'],
                  ].map(([label, key]) => (
                    <View key={key} style={styles.compactField}>
                      <Text style={styles.label}>{label}</Text>
                      <TextInput style={styles.compactInput} value={vehicle[key] || ''} onChangeText={(text) => setFormData(prev => ({ ...prev, vehicles: prev.vehicles.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === 'plateNumber' ? text.toUpperCase() : text } : item) }))} />
                    </View>
                  ))}
                  {!!vehicle.carImage && <TouchableOpacity onPress={() => openDocumentModal(`Vehicle ${index + 1}`, buildVehicleUrl(vehicle.carImage))}><Text style={styles.documentLink}>View registered vehicle photo</Text></TouchableOpacity>}
                </View>
              ))}
            </View>

            <View style={[styles.section, shadows.small]}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Family Members</Text>
                <TouchableOpacity style={styles.addInlineButton} onPress={addFamilyMember}><Ionicons name="add" size={18} color="white" /><Text style={styles.addInlineText}>Add</Text></TouchableOpacity>
              </View>
              {formData.familyMembers.map((member, index) => (
                <View key={index} style={styles.vehicleEditor}>
                  <View style={styles.vehicleEditorHeader}>
                    <Text style={styles.vehicleEditorTitle}>Family Member {index + 1}</Text>
                    {formData.familyMembers.length > 1 && <TouchableOpacity style={styles.removeInlineButton} onPress={() => removeFamilyMember(index)}><Ionicons name="trash-outline" size={16} color={themeColors.error} /><Text style={styles.removeInlineText}>Remove</Text></TouchableOpacity>}
                  </View>
                  {[
                    ['Full name', 'name', 'default'],
                    ['Relationship', 'relationship', 'default'],
                    ['Age', 'age', 'number-pad'],
                    ['Phone', 'phone', 'phone-pad'],
                  ].map(([label, key, keyboardType]) => (
                    <View key={key} style={styles.compactField}>
                      <Text style={styles.label}>{label}</Text>
                      <TextInput style={styles.compactInput} keyboardType={keyboardType} value={String(member[key] || '')} onChangeText={(text) => setFormData(prev => ({ ...prev, familyMembers: prev.familyMembers.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === 'age' || key === 'phone' ? text.replace(/\D/g, '') : text } : item) }))} />
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {/* Uploaded Documents Section */}
            <View style={[styles.section, shadows.small]}>
              <Text style={styles.sectionTitle}>Uploaded Documents</Text>
              {loadingDocuments ? (
                <View style={styles.loadingDocuments}>
                  <ActivityIndicator size="small" color={themeColors.primary} />
                  <Text style={styles.loadingDocumentsText}>Loading documents...</Text>
                </View>
              ) : uploadedDocuments ? (
                <View style={styles.documentsContainer}>
                  {uploadedDocuments.selfieImage && (
                    <View style={styles.documentItem}>
                      <Text style={styles.documentLabel}>Profile Picture</Text>
                      <TouchableOpacity 
                        style={styles.documentImageContainer}
                        onPress={() => openDocumentModal('Profile Picture', documentPreviewUrls.selfie || buildDocumentUrl(uploadedDocuments.selfieImage))}
                      >
                        <Image 
                          source={{ uri: documentPreviewUrls.selfie || buildDocumentUrl(uploadedDocuments.selfieImage) }} 
                          style={styles.documentImage} 
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <Text style={styles.documentHint}>Tap to preview</Text>
                    </View>
                  )}
                  
                  <View style={styles.documentRow}>
                    {uploadedDocuments.frontImage && (
                      <View style={styles.documentItem}>
                        <Text style={styles.documentLabel}>ID Front</Text>
                        <TouchableOpacity 
                          style={styles.documentImageContainer}
                          onPress={() => openDocumentModal('ID Front', documentPreviewUrls.front || buildDocumentUrl(uploadedDocuments.frontImage))}
                        >
                          <Image 
                            source={{ uri: documentPreviewUrls.front || buildDocumentUrl(uploadedDocuments.frontImage) }} 
                            style={styles.documentImage} 
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        <Text style={styles.documentHint}>Tap to preview</Text>
                      </View>
                    )}
                    {uploadedDocuments.backImage && (
                      <View style={styles.documentItem}>
                        <Text style={styles.documentLabel}>ID Back</Text>
                        <TouchableOpacity 
                          style={styles.documentImageContainer}
                          onPress={() => openDocumentModal('ID Back', documentPreviewUrls.back || buildDocumentUrl(uploadedDocuments.backImage))}
                        >
                          <Image 
                            source={{ uri: documentPreviewUrls.back || buildDocumentUrl(uploadedDocuments.backImage) }} 
                            style={styles.documentImage} 
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        <Text style={styles.documentHint}>Tap to preview</Text>
                      </View>
                    )}
                  </View>
               
                  <View style={styles.verificationStatus}>
                    <Ionicons 
                      name={uploadedDocuments.documentsVerified ? "checkmark-circle" : "time"} 
                      size={16} 
                      color={uploadedDocuments.documentsVerified ? themeColors.success : themeColors.warning} 
                    />
                    <Text style={[styles.verificationStatusText, { 
                      color: uploadedDocuments.documentsVerified ? themeColors.success : themeColors.warning 
                    }]}>
                      {uploadedDocuments.documentsVerified ? 'Documents Verified' : 'Verification Pending'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noDocuments}>
                  <Ionicons name="document" size={48} color={themeColors.textSecondary} />
                  <Text style={styles.noDocumentsText}>No documents uploaded yet</Text>
                  <Text style={styles.noDocumentsSubtext}>Documents are uploaded during registration</Text>
                </View>
              )}
            </View>

            <View style={[styles.section, shadows.small]}>
              <Text style={styles.sectionTitle}>Move-out</Text>
              <Text style={styles.helperText}>
                Request to vacate your lot. An admin must approve the request to update the lot and deactivate the account.
              </Text>
              <View style={styles.moveOutRow}>
                <View style={styles.moveOutStatusPill}>
                  <Text style={styles.moveOutStatusText}>
                    Status: {user?.moveOutStatus || 'none'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.moveOutButton, (moveOutSubmitting || user?.moveOutStatus === 'pending' || user?.moveOutStatus === 'approved') && styles.moveOutButtonDisabled]}
                  onPress={() => setShowMoveOutModal(true)}
                  disabled={moveOutSubmitting || user?.moveOutStatus === 'pending' || user?.moveOutStatus === 'approved'}
                >
                  {moveOutSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="exit-outline" size={16} color="white" />
                      <Text style={styles.moveOutButtonText}>Request</Text>
                    </>
                  )}
                </TouchableOpacity>
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
              {saving ? <ActivityIndicator color="white" /> : <><Ionicons name="save-outline" size={18} color="white" /><Text style={styles.saveButtonText}>Save Profile Changes</Text></>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={isResidentProfile && showPasswordModal} animationType="slide" transparent onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
            <View style={[styles.passwordModalContent, keyboardHeight > 0 && styles.keyboardRaisedSheet, keyboardSheetStyle]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={passwordScrollRef}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
                showsVerticalScrollIndicator
                nestedScrollEnabled
                scrollEnabled
                alwaysBounceVertical
                overScrollMode="always"
                contentContainerStyle={[
                  styles.passwordModalBody,
                  keyboardHeight > 0 && styles.keyboardModalBody,
                ]}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Current Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={passwordData.currentPassword}
                      onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                      secureTextEntry={!showPassword.current}
                      returnKeyType="next"
                      onFocus={() => scrollModalTo(passwordScrollRef, 0)}
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
                      returnKeyType="next"
                      onFocus={() => scrollModalTo(passwordScrollRef, 44)}
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
                      returnKeyType={passwordOtpSent ? 'next' : 'done'}
                      onFocus={() => scrollModalTo(passwordScrollRef, 132)}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}>
                      <Ionicons name={showPassword.confirm ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {passwordOtpSent && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Verification Code</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-open-outline" size={20} color={themeColors.textSecondary} />
                      <TextInput style={styles.input} value={passwordOtp} onChangeText={(text) => setPasswordOtp(text.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="6-digit code" returnKeyType="done" onFocus={() => scrollModalTo(passwordScrollRef, 210)} />
                    </View>
                    <TouchableOpacity onPress={() => { setPasswordOtpSent(false); setPasswordOtp(''); }}><Text style={styles.documentLink}>Request a new code</Text></TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowPasswordModal(false); setPasswordOtpSent(false); setPasswordOtp(''); }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.changeButton, saving && styles.modalButtonDisabled]} onPress={handleChangePassword} disabled={saving}>
                    {saving ? <ActivityIndicator color="white" /> : <Text style={styles.changeButtonText}>{passwordOtpSent ? 'Verify & Change' : 'Send Email Code'}</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showMoveOutModal} animationType="slide" transparent onRequestClose={() => setShowMoveOutModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
            <View style={[styles.moveOutModalContent, keyboardHeight > 0 && styles.keyboardRaisedSheet, keyboardSheetStyle]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Request Move-out</Text>
                <TouchableOpacity onPress={() => setShowMoveOutModal(false)}><Ionicons name="close" size={24} color={themeColors.textPrimary} /></TouchableOpacity>
              </View>
              <ScrollView
                ref={moveOutScrollRef}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.moveOutModalBody,
                  keyboardHeight > 0 && styles.keyboardModalBody,
                ]}
              >
                <Text style={styles.modalHelperText}>An administrator will review this request before your lot and account status change.</Text>
                <Text style={styles.label}>Reason</Text>
                <TextInput
                  style={styles.reasonInput}
                  value={moveOutReason}
                  onChangeText={setMoveOutReason}
                  placeholder="Explain your move-out request"
                  multiline
                  textAlignVertical="top"
                  returnKeyType="default"
                  onFocus={() => scrollModalTo(moveOutScrollRef, 0)}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowMoveOutModal(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.changeButton, (moveOutSubmitting || !moveOutReason.trim()) && styles.modalButtonDisabled]} onPress={requestMoveOut} disabled={moveOutSubmitting || !moveOutReason.trim()}>
                    {moveOutSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.changeButtonText}>Submit Request</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDocumentModal} animationType="slide" transparent onRequestClose={closeDocumentModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.documentModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{documentModalTitle}</Text>
              <TouchableOpacity onPress={closeDocumentModal}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            {documentModalImage ? (
              <View style={styles.documentViewerWrapper}>
                <Image source={{ uri: documentModalImage }} style={styles.documentViewerImage} resizeMode="contain" />
                <TouchableOpacity style={styles.shareDocumentButton} onPress={shareDocument}><Ionicons name="share-outline" size={18} color="white" /><Text style={styles.shareDocumentText}>Save or share document</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noDocuments}>
                <Text style={styles.noDocumentsText}>Unable to preview this document.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.resident.screen,
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { ...roleLayouts.resident.headerLight, width: '100%' },
  backButton: { padding: 8 },
  headerTitle: { color: themeColors.textPrimary, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  content: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24 },
  profileCard: { backgroundColor: themeColors.primaryWash, borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: themeColors.border },
  avatarContainer: { marginBottom: 8, alignItems: 'center' },
  avatar: { width: 76, height: 76, borderRadius: 24, backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 28, fontWeight: '700' },
  avatarButton: { borderRadius: 50, overflow: 'hidden' },
  photoButton: { marginTop: 8, backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: '#c7e5d4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoButtonText: { color: themeColors.primary, fontWeight: '700' },
  userName: { fontSize: 19, fontWeight: '900', color: themeColors.textPrimary, marginBottom: 6 },
  roleBadge: { backgroundColor: themeColors.accent, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginBottom: 8 },
  roleText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '800' },
  userEmail: { fontSize: 13, color: themeColors.textSecondary, marginBottom: 3 },
  userHouse: { fontSize: 13, color: themeColors.textMuted },
  section: { backgroundColor: 'white', borderRadius: 14, padding: 18, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: themeColors.primary },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: themeColors.textPrimary, marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addInlineButton: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: themeColors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  addInlineText: { color: 'white', fontWeight: '800', fontSize: 12 },
  removeInlineButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: themeColors.errorSoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  removeInlineText: { color: themeColors.error, fontWeight: '800', fontSize: 12 },
  vehicleEditor: { padding: 14, borderRadius: 14, backgroundColor: themeColors.surfaceMuted, borderWidth: 1, borderColor: themeColors.border, marginBottom: 11 },
  vehicleEditorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  vehicleEditorTitle: { color: themeColors.primaryDeep, fontWeight: '900', fontSize: 14 },
  compactField: { marginBottom: 9 },
  compactInput: { minHeight: 45, borderWidth: 1, borderColor: themeColors.borderStrong, borderRadius: 12, backgroundColor: 'white', paddingHorizontal: 12, color: themeColors.textPrimary },
  documentLink: { color: themeColors.primary, fontWeight: '800', fontSize: 12, marginTop: 8 },
  helperText: { fontSize: 12, color: themeColors.textSecondary, marginTop: -10, marginBottom: 12, lineHeight: 16 },
  modalHelperText: { fontSize: 13, color: themeColors.textSecondary, marginTop: 0, marginBottom: 14, lineHeight: 18 },
  moveOutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  moveOutStatusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: themeColors.warning + '15', borderWidth: 1, borderColor: themeColors.warning + '35' },
  moveOutStatusText: { fontSize: 12, fontWeight: '700', color: themeColors.warning, textTransform: 'capitalize' },
  moveOutButton: { backgroundColor: themeColors.warning, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, minWidth: 112, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  moveOutButtonDisabled: { opacity: 0.6 },
  moveOutButtonText: { color: 'white', fontSize: 13, fontWeight: '800' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: themeColors.textSecondary, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: themeColors.borderStrong, borderRadius: 17, paddingHorizontal: 14, backgroundColor: themeColors.surfaceMuted, minHeight: 56 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: themeColors.textPrimary, marginLeft: 8 },
  disabledInputContainer: { opacity: 0.72 },
  disabledInput: { color: themeColors.textSecondary },
  securityButton: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: themeColors.surfaceTint, borderRadius: 17, borderWidth: 1, borderColor: themeColors.border },
  securityButtonText: { flex: 1, fontSize: 16, color: themeColors.textPrimary, marginLeft: 12 },
  saveButton: { backgroundColor: themeColors.primaryDeep, padding: 17, borderRadius: 18, marginTop: 8, marginBottom: 32, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...shadows.medium },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  inlineUpdateButton: { backgroundColor: themeColors.primaryDeep, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  inlineUpdateButtonText: { color: 'white', fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  absoluteSheetHost: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  keyboardAvoidingSheet: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22 },
  passwordModalContent: { width: '100%', backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 22, maxHeight: Platform.OS === 'ios' ? '92%' : '88%' },
  passwordModalBody: { paddingBottom: Platform.OS === 'ios' ? 90 : 56 },
  moveOutModalContent: { width: '100%', backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 22, maxHeight: Platform.OS === 'ios' ? '86%' : '78%' },
  moveOutModalBody: { paddingTop: 4, paddingBottom: Platform.OS === 'ios' ? 72 : 40 },
  keyboardRaisedSheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  keyboardModalBody: { paddingBottom: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600', color: themeColors.textPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 10 },
  modalButton: { flex: 1, minHeight: 52, paddingHorizontal: 12, paddingVertical: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalButtonDisabled: { opacity: 0.55 },
  cancelButton: { backgroundColor: '#f1f5f9' },
  cancelButtonText: { color: themeColors.textPrimary, fontSize: 16, fontWeight: '600' },
  changeButton: { backgroundColor: themeColors.primary },
  changeButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  reasonInput: { minHeight: 110, borderWidth: 1, borderColor: themeColors.borderStrong, borderRadius: 14, backgroundColor: themeColors.surfaceMuted, padding: 13, color: themeColors.textPrimary },
  previewNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5f4ec', borderRadius: 8, padding: 12, marginTop: 12 },
  previewText: { fontSize: 14, color: themeColors.secondary, marginLeft: 8, fontWeight: '500' },
  loadingDocuments: { alignItems: 'center', padding: 20 },
  loadingDocumentsText: { fontSize: 14, color: themeColors.textSecondary, marginTop: 8 },
  documentsContainer: { gap: 16 },
  documentRow: { flexDirection: 'row', gap: 12 },
  documentItem: { flex: 1 },
  documentLabel: { fontSize: 14, fontWeight: '600', color: themeColors.textPrimary, marginBottom: 8 },
  documentImageContainer: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: themeColors.border },
  documentImage: { width: '100%', height: 120 },
  documentHint: { fontSize: 12, color: themeColors.textSecondary, marginTop: 6 },
  verificationStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 },
  verificationStatusText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  documentModalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 360 },
  documentViewerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  documentViewerImage: { width: '100%', height: 420, borderRadius: 16 },
  shareDocumentButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, width: '100%', paddingVertical: 12, borderRadius: 12, backgroundColor: themeColors.primaryDeep },
  shareDocumentText: { color: 'white', fontWeight: '800' },
  noDocuments: { alignItems: 'center', padding: 32 },
  noDocumentsText: { fontSize: 16, fontWeight: '600', color: themeColors.textPrimary, marginTop: 16 },
  noDocumentsSubtext: { fontSize: 14, color: themeColors.textSecondary, marginTop: 4, textAlign: 'center' },
  vehicleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  vehicleInfo: { flex: 1 },
  vehicleTitle: { fontSize: 16, fontWeight: '600', color: themeColors.textPrimary, marginBottom: 4 },
  vehiclePlate: { fontSize: 14, color: themeColors.textSecondary },
  vehicleImageContainer: { width: 80, height: 60, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: themeColors.border },
  vehicleImage: { width: '100%', height: '100%' },
});

export default ProfileScreen;
