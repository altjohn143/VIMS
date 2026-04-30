import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';

const ArchivedServiceRequestsScreen = ({ navigation }) => {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadArchivedServiceRequests();
  }, []);

  const loadArchivedServiceRequests = async () => {
    try {
      const response = await api.get('/service-requests/archived');
      if (response.data?.success) {
        setServiceRequests(response.data.data);
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to load archived service requests');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load archived service requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadArchivedServiceRequests();
  };

  const handleRestore = async () => {
    if (!selectedServiceRequest) return;

    setRestoring(true);
    try {
      const response = await api.put(`/service-requests/${selectedServiceRequest._id}/restore`);
      if (response.data?.success) {
        Alert.alert('Success', 'Service request restored successfully');
        setServiceRequests(serviceRequests.filter(sr => sr._id !== selectedServiceRequest._id));
        setShowRestoreModal(false);
        setSelectedServiceRequest(null);
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to restore service request');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to restore service request');
    } finally {
      setRestoring(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return themeColors.success;
      case 'in-progress': return themeColors.primary;
      case 'assigned': return themeColors.warning;
      case 'pending': return themeColors.textSecondary;
      case 'cancelled': return themeColors.error;
      case 'rejected': return themeColors.error;
      default: return themeColors.textSecondary;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return themeColors.error;
      case 'medium': return themeColors.warning;
      case 'low': return themeColors.success;
      default: return themeColors.textSecondary;
    }
  };

  const renderServiceRequestCard = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const priorityColor = getPriorityColor(item.priority);

    return (
      <View style={[styles.card, shadows.small]}>
        <View style={styles.cardHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.requestTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.requestDescription} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>
              {item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : 'Unknown'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>
              Archived: {item.archivedAt ? format(new Date(item.archivedAt), 'MMM dd, yyyy') : 'N/A'}
            </Text>
          </View>
          {item.archivedReason && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={themeColors.textSecondary} />
              <Text style={styles.detailText} numberOfLines={2}>
                {item.archivedReason}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton]}
            onPress={() => {
              setSelectedServiceRequest(item);
              setShowRestoreModal(true);
            }}
            disabled={restoring}
          >
            <Ionicons name="refresh" size={16} color={themeColors.primary} />
            <Text style={styles.restoreButtonText}>Restore</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading archived service requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Archived Service Requests</Text>
          <Text style={styles.headerSubtitle}>Manage archived service requests</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{serviceRequests.length}</Text>
          <Text style={styles.statLabel}>Archived Requests</Text>
        </View>
      </View>

      <FlatList
        data={serviceRequests}
        renderItem={renderServiceRequestCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="build" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No archived service requests</Text>
            <Text style={styles.emptyText}>Archived service requests will appear here</Text>
          </View>
        }
      />

      {/* Restore Modal */}
      <Modal
        visible={showRestoreModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Restore Service Request</Text>
              <TouchableOpacity onPress={() => setShowRestoreModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedServiceRequest && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.warningBox}>
                  <Ionicons name="information-circle" size={24} color={themeColors.warning} />
                  <Text style={styles.warningText}>
                    This will restore the service request and make it active again.
                  </Text>
                </View>

                <View style={styles.requestPreview}>
                  <Text style={styles.previewTitle}>{selectedServiceRequest.title}</Text>
                  <Text style={styles.previewDescription} numberOfLines={4}>
                    {selectedServiceRequest.description}
                  </Text>
                  <View style={styles.previewDetails}>
                    <Text style={styles.previewDetail}>
                      Priority: <Text style={{ color: getPriorityColor(selectedServiceRequest.priority) }}>
                        {selectedServiceRequest.priority}
                      </Text>
                    </Text>
                    <Text style={styles.previewDetail}>
                      Status: <Text style={{ color: getStatusColor(selectedServiceRequest.status) }}>
                        {selectedServiceRequest.status.replace('-', ' ')}
                      </Text>
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => setShowRestoreModal(false)}
                disabled={restoring}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.restoreButton]}
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color="white" />
                    <Text style={styles.restoreActionText}>Restore</Text>
                  </>
                )}
              </TouchableOpacity>
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
  header: {
    backgroundColor: themeColors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  statCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    ...shadows.small,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  restoreButton: {
    backgroundColor: themeColors.primary + '10',
  },
  restoreButtonText: {
    color: themeColors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  loadingText: {
    marginTop: 10,
    color: themeColors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    ...shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: themeColors.warning + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: themeColors.warning,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  requestPreview: {
    backgroundColor: themeColors.background,
    borderRadius: 8,
    padding: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: themeColors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  previewDetails: {
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: 12,
  },
  previewDetail: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  restoreButton: {
    backgroundColor: themeColors.primary,
  },
  restoreActionText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ArchivedServiceRequestsScreen;