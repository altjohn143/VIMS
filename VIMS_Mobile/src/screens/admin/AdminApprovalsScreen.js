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
  RefreshControl,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';
import UserDropdownMenu from '../../components/UserDropdownMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminApprovalsScreen = ({ navigation }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState(null);
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [idImages, setIdImages] = useState({ front: null, back: null, selfie: null });
  const [idLoading, setIdLoading] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching pending approvals...');
      const response = await api.get('/users/pending-approvals');
      console.log('📦 Response:', response.data);
      
      if (response.data.success) {
        setPendingUsers(response.data.data);
        console.log(`✅ Found ${response.data.data.length} pending users`);
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      Alert.alert('Error', 'Failed to fetch pending approvals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingApprovals();
  };

  // Direct approve without confirmation
  const directApprove = async (userId) => {
    console.log('🔘 DIRECT APPROVE for user:', userId);
    setApprovingUserId(userId);
    setProcessing(true);
    try {
      console.log('📡 Sending approve request to:', `/users/${userId}/approve`);
      const response = await api.put(`/users/${userId}/approve`);
      console.log('📡 Response received:', response.data);
      
      if (response.data.success) {
        Alert.alert('Success', 'User approved successfully');
        setPendingUsers(prev => prev.filter(user => user._id !== userId));
        setShowDetailsModal(false);
        setSelectedUser(null);
        await fetchPendingApprovals();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('❌ Approval error:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to approve user');
    } finally {
      setProcessing(false);
      setApprovingUserId(null);
    }
  };

  // Approve with confirmation
  const handleApprove = async (userId) => {
    console.log('🔘 Approve button clicked for user:', userId);
    
    const userToApprove = pendingUsers.find(u => u._id === userId);
    console.log('👤 User to approve:', {
      id: userToApprove?._id,
      name: userToApprove ? `${userToApprove.firstName} ${userToApprove.lastName}` : 'Unknown',
      email: userToApprove?.email
    });
    
    Alert.alert(
      'Approve User',
      `Approve ${userToApprove?.firstName} ${userToApprove?.lastName}?`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('❌ User cancelled approval')
        },
        {
          text: 'Approve',
          onPress: () => {
            console.log('✅ User confirmed approval, calling API...');
            directApprove(userId);
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!selectedUser) return;

    Alert.alert(
      'Archive User',
      `Archive ${selectedUser.firstName} ${selectedUser.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const response = await api.delete(`/users/${selectedUser._id}`, {
                data: { reason: rejectReason || 'No reason provided' }
              });
              
              if (response.data.success) {
                Alert.alert('Success', 'User archived successfully');
                setPendingUsers(prev => prev.filter(user => user._id !== selectedUser._id));
                setShowRejectModal(false);
                setShowDetailsModal(false);
                setSelectedUser(null);
                setRejectReason('');
                await fetchPendingApprovals();
              }
            } catch (error) {
              console.error('Reject error:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to reject user');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatVerificationStatus = (s) => {
    const val = String(s || '').trim();
    if (!val) return 'pending_upload';
    return val;
  };

  const viewUploadedId = async (user) => {
    const verificationId = user?.verificationId;
    if (!verificationId) {
      Alert.alert('No ID found', 'This resident has not uploaded an ID yet.');
      return;
    }
    setIdLoading(true);
    setIdModalOpen(true);
    try {
      const res = await api.get(`/verifications/admin/${verificationId}/images`);
      if (res.data?.success) {
        setIdImages(res.data.data || { front: null, back: null, selfie: null });
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to load ID images');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to load ID images');
    } finally {
      setIdLoading(false);
    }
  };

  const renderUserCard = ({ item }) => {
    const isApproving = approvingUserId === item._id;
    const canApprove = !!item?.canApprove;
    const hasUploadedId = !!item?.hasUploadedId;
    
    return (
      <View style={[styles.userCard, shadows.small]}>
        <View style={styles.userHeader}>
          <View style={[styles.userAvatar, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.avatarText}>
              {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>

        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>{item.phone || 'No phone'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="home" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>House {item.houseNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="id-card"
              size={16}
              color={hasUploadedId ? themeColors.success : themeColors.warning}
            />
            <Text style={styles.detailText}>
              ID: {hasUploadedId ? 'uploaded' : 'not uploaded'} • Status: {formatVerificationStatus(item.verificationStatus).replace(/_/g, ' ')}
            </Text>
          </View>
          {hasUploadedId ? (
            <TouchableOpacity style={styles.viewIdLink} onPress={() => viewUploadedId(item)} disabled={idLoading}>
              <Ionicons name="image-outline" size={14} color={themeColors.primary} />
              <Text style={styles.viewIdLinkText}>View uploaded ID</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>Registered: {formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.approveButton,
              (!canApprove || processing) && styles.actionButtonDisabled,
            ]}
            onPress={() => {
              if (!canApprove) {
                Alert.alert('Cannot Approve Yet', 'Resident must upload front/back ID images first.');
                return;
              }
              directApprove(item._id);
            }}
            disabled={processing || !canApprove}
          >
            {isApproving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              setSelectedUser(item);
              setShowRejectModal(true);
            }}
            disabled={processing}
          >
            <Ionicons name="close-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>Archive</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading pending approvals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={fetchPendingApprovals} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
          <UserDropdownMenu navigation={navigation} />
        </View>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Pending Approvals</Text>
        <Text style={styles.statsValue}>{pendingUsers.length}</Text>
      </View>

      <FlatList
        data={pendingUsers}
        renderItem={renderUserCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No Pending Approvals</Text>
            <Text style={styles.emptyText}>All resident registrations have been processed</Text>
          </View>
        }
      />

      <Modal visible={idModalOpen} animationType="slide" transparent onRequestClose={() => setIdModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.idModalCard}>
            <View style={styles.idModalHeader}>
              <Text style={styles.idModalTitle}>Uploaded ID</Text>
              <TouchableOpacity onPress={() => setIdModalOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            {idLoading ? (
              <View style={{ paddingVertical: 18 }}>
                <ActivityIndicator size="large" color={themeColors.primary} />
              </View>
            ) : (
              <ScrollView>
                {idImages.front ? (
                  <>
                    <Text style={styles.idImageLabel}>Front</Text>
                    <Image source={{ uri: idImages.front }} style={styles.idImage} resizeMode="contain" />
                  </>
                ) : null}
                {idImages.back ? (
                  <>
                    <Text style={styles.idImageLabel}>Back</Text>
                    <Image source={{ uri: idImages.back }} style={styles.idImage} resizeMode="contain" />
                  </>
                ) : null}
                {idImages.selfie ? (
                  <>
                    <Text style={styles.idImageLabel}>Selfie</Text>
                    <Image source={{ uri: idImages.selfie }} style={styles.idImage} resizeMode="contain" />
                  </>
                ) : null}
                {!idImages.front && !idImages.back && !idImages.selfie ? (
                  <Text style={{ color: themeColors.textSecondary, textAlign: 'center', paddingVertical: 16 }}>
                    No images available.
                  </Text>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resident Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailAvatar}>
                  <View style={[styles.largeAvatar, { backgroundColor: themeColors.primary }]}>
                    <Text style={styles.largeAvatarText}>
                      {selectedUser.firstName?.charAt(0)}{selectedUser.lastName?.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.detailName}>{selectedUser.firstName} {selectedUser.lastName}</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDING APPROVAL</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Personal Information</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Full Name</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.firstName} {selectedUser.lastName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Role</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.role}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Residence Information</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>House Number</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.houseNumber || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Contact Information</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Email</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.email}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Phone</Text>
                    <Text style={styles.detailItemValue}>{selectedUser.phone}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Registration Details</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Registered On</Text>
                    <Text style={styles.detailItemValue}>{formatDate(selectedUser.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.approveButton]}
                    onPress={() => directApprove(selectedUser._id)}
                    disabled={processing}
                  >
                    {processing && approvingUserId === selectedUser._id ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="white" />
                        <Text style={styles.modalActionText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.rejectButton]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      setShowRejectModal(true);
                    }}
                    disabled={processing}
                  >
                    <Ionicons name="close-circle" size={20} color="white" />
                    <Text style={styles.modalActionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Archive Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Archive User</Text>
              <TouchableOpacity onPress={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.rejectContent}>
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={24} color={themeColors.warning} />
                <Text style={styles.warningText}>
                  This user will be archived and can be restored later if needed. The user will no longer have access to the system.
                </Text>
              </View>

              {selectedUser && (
                <View style={styles.userPreview}>
                  <View style={[styles.userAvatar, { backgroundColor: themeColors.primary }]}>
                    <Text style={styles.avatarText}>
                      {selectedUser.firstName?.charAt(0)}{selectedUser.lastName?.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.previewName}>{selectedUser.firstName} {selectedUser.lastName}</Text>
                    <Text style={styles.previewEmail}>{selectedUser.email}</Text>
                  </View>
                </View>
              )}

              <TextInput
                style={styles.rejectInput}
                placeholder="Reason for archiving (optional)"
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.cancelButton]}
                  onPress={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  disabled={processing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalActionText}>Archive</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  header: {
    backgroundColor: themeColors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  statsLabel: {
    fontSize: 16,
    color: themeColors.textSecondary,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: themeColors.primary,
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  userDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: themeColors.textPrimary,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  approveButton: {
    backgroundColor: themeColors.success,
  },
  rejectButton: {
    backgroundColor: themeColors.error,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  viewIdLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: themeColors.primary + '10',
  },
  viewIdLinkText: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  idModalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },
  idModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  idModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  idImageLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '800',
    color: themeColors.textSecondary,
  },
  idImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  detailAvatar: {
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '600',
  },
  detailName: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  pendingBadge: {
    backgroundColor: themeColors.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pendingBadgeText: {
    color: themeColors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 12,
  },
  detailItem: {
    marginBottom: 8,
  },
  detailItemLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginBottom: 2,
  },
  detailItemValue: {
    fontSize: 14,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  modalActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectContent: {
    paddingVertical: 10,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: themeColors.warning + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: themeColors.warning + '30',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: themeColors.warning,
    marginLeft: 8,
  },
  userPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  previewEmail: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminApprovalsScreen;