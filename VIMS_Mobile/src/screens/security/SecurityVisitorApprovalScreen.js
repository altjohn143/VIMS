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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';
import SecurityUtilityHeader from '../../components/SecurityUtilityHeader';

const SecurityVisitorApprovalScreen = ({ navigation }) => {
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [securityNotes, setSecurityNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReasonError, setRejectionReasonError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingVisitors();
  }, []);

  const fetchPendingVisitors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/visitors/pending');
      if (response.data.success) {
        setPendingVisitors(response.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch pending visitors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingVisitors();
  };

  const handleApprove = async () => {
    if (!selectedVisitor) return;

    setProcessing(true);
    try {
      const response = await api.put(`/visitors/${selectedVisitor._id}/approve`, {
        securityNotes,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Visitor approved successfully');
        setShowApproveModal(false);
        setSecurityNotes('');
        setPendingVisitors(prev => prev.filter(v => v._id !== selectedVisitor._id));
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to approve visitor');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVisitor) return;

    if (!rejectionReason.trim()) {
      setRejectionReasonError('Provide a reason for rejection.');
      Alert.alert('Reason Required', 'Please provide a reason for rejection.');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.put(`/visitors/${selectedVisitor._id}/reject`, {
        rejectionReason,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Visitor rejected');
        setShowRejectModal(false);
        setRejectionReason('');
        setRejectionReasonError('');
        setPendingVisitors(prev => prev.filter(v => v._id !== selectedVisitor._id));
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject visitor');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  const renderVisitorCard = ({ item }) => {
    const resident = item.residentId;

    return (
      <View style={[styles.visitorCard, shadows.small]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.visitorName}>{item.visitorName}</Text>
            <Text style={styles.visitorPhone}>{item.visitorPhone}</Text>
          </View>
          <View style={styles.pendingBadge}>
            <Ionicons name="time" size={14} color={themeColors.warning} />
            <Text style={styles.pendingText}>PENDING</Text>
          </View>
        </View>

        <View style={styles.residentInfo}>
          <Ionicons name="home" size={16} color={themeColors.textSecondary} />
          <Text style={styles.residentText}>
            {resident?.firstName} {resident?.lastName} • House {resident?.houseNumber}
          </Text>
        </View>

        <View style={styles.purposeContainer}>
          <Ionicons name="document-text" size={16} color={themeColors.textSecondary} />
          <Text style={styles.purposeText}>{item.purpose}</Text>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={14} color={themeColors.textSecondary} />
            <Text style={styles.detailLabel}>Arrival:</Text>
            <Text style={styles.detailValue}>{formatDate(item.expectedArrival)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={14} color={themeColors.textSecondary} />
            <Text style={styles.detailLabel}>Departure:</Text>
            <Text style={styles.detailValue}>{formatDate(item.expectedDeparture)}</Text>
          </View>
          {item.vehicleNumber && (
            <View style={styles.detailItem}>
              <Ionicons name="car" size={14} color={themeColors.textSecondary} />
              <Text style={styles.detailLabel}>Vehicle:</Text>
              <Text style={styles.detailValue}>{item.vehicleNumber}</Text>
            </View>
          )}
          {item.numberOfCompanions > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="people" size={14} color={themeColors.textSecondary} />
              <Text style={styles.detailLabel}>Companions:</Text>
              <Text style={styles.detailValue}>{item.numberOfCompanions}</Text>
            </View>
          )}
        </View>

        {item.specialNotes && (
          <View style={styles.specialNotes}>
            <Ionicons name="alert-circle" size={16} color={themeColors.warning} />
            <Text style={styles.specialNotesText}>{item.specialNotes}</Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => {
              setSelectedVisitor(item);
              setShowApproveModal(true);
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              setSelectedVisitor(item);
              setRejectionReason('');
              setRejectionReasonError('');
              setShowRejectModal(true);
            }}
          >
            <Ionicons name="close-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SecurityUtilityHeader
        navigation={navigation}
        title="Visitor Approvals"
        subtitle="Review and process pending visitor requests."
        actions={[{ label: 'Refresh', icon: 'refresh', onPress: fetchPendingVisitors, primary: true }]}
      />

      <View style={styles.statsCard}>
        <Ionicons name="time" size={24} color={themeColors.warning} />
        <View>
          <Text style={styles.statsLabel}>Pending Approvals</Text>
          <Text style={styles.statsValue}>{pendingVisitors.length}</Text>
        </View>
      </View>

      <FlatList
        data={pendingVisitors}
        renderItem={renderVisitorCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No Pending Approvals</Text>
            <Text style={styles.emptyText}>All visitor requests have been processed</Text>
          </View>
        }
      />

      {/* Approve Modal */}
      <Modal
        visible={showApproveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApproveModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Approve Visitor</Text>
              <TouchableOpacity onPress={() => setShowApproveModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedVisitor && (
              <View>
                <View style={styles.modalVisitorInfo}>
                  <Text style={styles.modalVisitorName}>{selectedVisitor.visitorName}</Text>
                  <Text style={styles.modalVisitorDetails}>
                    Visiting: {selectedVisitor.residentId?.firstName} {selectedVisitor.residentId?.lastName}
                  </Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Security Notes (Optional)"
                  value={securityNotes}
                  onChangeText={setSecurityNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowApproveModal(false)}
                    disabled={processing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.approveButton]}
                    onPress={handleApprove}
                    disabled={processing}
                  >
                    {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalButtonText}>Approve</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Visitor</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedVisitor && (
              <View>
                <View style={styles.modalVisitorInfo}>
                  <Text style={styles.modalVisitorName}>{selectedVisitor.visitorName}</Text>
                  <Text style={styles.modalVisitorDetails}>
                    Visiting: {selectedVisitor.residentId?.firstName} {selectedVisitor.residentId?.lastName}
                  </Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Rejection Reason *"
                  value={rejectionReason}
                  onChangeText={(value) => {
                    setRejectionReason(value);
                    if (value.trim()) setRejectionReasonError('');
                  }}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {!!rejectionReasonError && (
                  <Text style={styles.validationText}>{rejectionReasonError}</Text>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowRejectModal(false)}
                    disabled={processing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectButton]}
                    onPress={handleReject}
                    disabled={processing}
                  >
                    {processing ? <ActivityIndicator color="white" /> : <Text style={styles.modalButtonText}>Reject</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.security.screen,
  header: { ...roleLayouts.security.header, flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
  headerTextWrap: { width: '100%' },
  headerEyebrow: { color: themeColors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  headerTitle: { color: 'white', fontSize: 26, lineHeight: 32, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '700', marginTop: 3, lineHeight: 17 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headerActionButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 38, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerButtonText: { color: 'white', fontSize: 11, fontWeight: '800' },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceTint,
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  statsLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginLeft: 12,
    fontWeight: '800',
  },
  statsValue: {
    fontSize: 26,
    fontWeight: '900',
    color: themeColors.primaryDeep,
    marginLeft: 12,
  },
  listContainer: {
    padding: 16,
  },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  visitorPhone: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.warning + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  pendingText: {
    color: themeColors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  residentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  residentText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  purposeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  purposeText: {
    flex: 1,
    fontSize: 14,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  detailsGrid: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 13,
    color: themeColors.textSecondary,
    marginLeft: 6,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 13,
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  specialNotes: {
    flexDirection: 'row',
    backgroundColor: themeColors.warning + '10',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  specialNotesText: {
    flex: 1,
    fontSize: 13,
    color: themeColors.warning,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: themeColors.success,
  },
  rejectButton: {
    backgroundColor: themeColors.error,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 24,
    margin: 16,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceTint,
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
    maxHeight: '86%',
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
  modalVisitorInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalVisitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalVisitorDetails: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  validationText: {
    color: themeColors.error,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SecurityVisitorApprovalScreen;
