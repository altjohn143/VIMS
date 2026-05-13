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
    Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { themeColors, shadows } from '../utils/theme';
import api, { getProtectedImageDataUrl } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserDropdownMenu from '../components/UserDropdownMenu';

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
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentModalTitle, setDocumentModalTitle] = useState('');
  const [documentModalImage, setDocumentModalImage] = useState(null);

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
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState(null);
  const [documentPreviewUrls, setDocumentPreviewUrls] = useState({ front: null, back: null, selfie: null });
  const [loadingDocuments, setLoadingDocuments] = useState(false);

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
    setSaving(true);
    try {
      const response = await api.put('/users/profile', formData);
      if (response.data.success) {
        if (selectedPhotoUri) {
          await uploadProfilePhoto(selectedPhotoUri);
          setSelectedPhotoUri(null);
        } else {
          Alert.alert('Success', 'Profile updated successfully');
        }
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const requestMoveOut = async () => {
    Alert.alert(
      'Request move-out',
      'This will notify the admin to review your move-out request. Once approved, your lot will be set to vacant and your account will be deactivated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setMoveOutSubmitting(true);
              const res = await api.post('/users/move-out/request', { reason: '' });
              if (res.data?.success) {
                Alert.alert('Submitted', res.data.message || 'Move-out request submitted');
                await loadUserProfile();
              } else {
                Alert.alert('Error', res.data?.error || 'Failed to submit move-out request');
              }
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || 'Failed to submit move-out request');
            } finally {
              setMoveOutSubmitting(false);
            }
          }
        }
      ]
    );
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
    const baseUrl = api.defaults.baseURL?.replace(/\/api$/, '') || '';
    return `${baseUrl}/api/verifications/my-files/${filename}`;
  };

  const buildVehicleUrl = (filename) => {
    if (!filename) return null;
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
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

        {/* Vehicles Section */}
        {formData.vehicles && formData.vehicles.length > 0 && formData.vehicles.some(v => v.plateNumber || v.make || v.model || v.color) && (
          <View style={[styles.section, shadows.small]}>
            <Text style={styles.sectionTitle}>Vehicles</Text>
            {formData.vehicles.map((vehicle, index) => (
              (vehicle.plateNumber || vehicle.make || vehicle.model || vehicle.color) && (
                <View key={index} style={styles.vehicleItem}>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleTitle}>
                      {vehicle.make} {vehicle.model} {vehicle.color && `(${vehicle.color})`}
                    </Text>
                    {vehicle.plateNumber && (
                      <Text style={styles.vehiclePlate}>Plate: {vehicle.plateNumber}</Text>
                    )}
                  </View>
                  {vehicle.carImage && (
                    <TouchableOpacity 
                      style={styles.vehicleImageContainer}
                      onPress={() => openDocumentModal(`Vehicle ${index + 1}`, buildVehicleUrl(vehicle.carImage))}
                    >
                      <Image 
                        source={{ uri: buildVehicleUrl(vehicle.carImage) }} 
                        style={styles.vehicleImage} 
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )
            ))}
          </View>
        )}

        {user?.role === 'resident' && (
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
                onPress={requestMoveOut}
                disabled={moveOutSubmitting || user?.moveOutStatus === 'pending' || user?.moveOutStatus === 'approved'}
              >
                {moveOutSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.moveOutButtonText}>Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  container: { flex: 1, backgroundColor: themeColors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: themeColors.primary, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  backButton: { padding: 8 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '600' },
  content: { paddingTop: 24, paddingHorizontal: 16, paddingBottom: 24 },
  profileCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  avatarContainer: { marginBottom: 12, alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 36, fontWeight: '600' },
  avatarButton: { borderRadius: 50, overflow: 'hidden' },
  photoButton: { marginTop: 12, backgroundColor: '#e5f4ec', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#c7e5d4' },
  photoButtonText: { color: themeColors.primary, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '600', color: themeColors.textPrimary, marginBottom: 8 },
  roleBadge: { backgroundColor: themeColors.primary + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginBottom: 8 },
  roleText: { color: themeColors.primary, fontSize: 12, fontWeight: '600' },
  userEmail: { fontSize: 14, color: themeColors.textSecondary, marginBottom: 4 },
  userHouse: { fontSize: 14, color: themeColors.textSecondary },
  section: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: themeColors.textPrimary, marginBottom: 16 },
  helperText: { fontSize: 12, color: themeColors.textSecondary, marginTop: -10, marginBottom: 12, lineHeight: 16 },
  moveOutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  moveOutStatusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: themeColors.warning + '15', borderWidth: 1, borderColor: themeColors.warning + '35' },
  moveOutStatusText: { fontSize: 12, fontWeight: '700', color: themeColors.warning, textTransform: 'capitalize' },
  moveOutButton: { backgroundColor: themeColors.warning, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, minWidth: 92, alignItems: 'center' },
  moveOutButtonDisabled: { opacity: 0.6 },
  moveOutButtonText: { color: 'white', fontSize: 13, fontWeight: '800' },
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