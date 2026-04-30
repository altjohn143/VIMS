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
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../utils/api';
import { themeColors, shadows } from '../../utils/theme';

const ArchivedUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadArchivedUsers();
  }, []);

  const loadArchivedUsers = async () => {
    try {
      const response = await api.get('/users/archived');
      if (response.data?.success) {
        setUsers(response.data.data);
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to load archived users');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load archived users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadArchivedUsers();
  };

  const handleRestore = async () => {
    if (!selectedUser) return;

    setRestoring(true);
    try {
      const response = await api.put(`/users/${selectedUser._id}/restore`);
      if (response.data?.success) {
        Alert.alert('Success', 'User restored successfully');
        setUsers(users.filter(u => u._id !== selectedUser._id));
        setShowRestoreModal(false);
        setSelectedUser(null);
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to restore user');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to restore user');
    } finally {
      setRestoring(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return 'shield-checkmark';
      case 'security': return 'shield';
      case 'resident': return 'home';
      default: return 'person';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return themeColors.error;
      case 'security': return themeColors.warning;
      case 'resident': return themeColors.primary;
      default: return themeColors.textSecondary;
    }
  };

  const renderUserCard = ({ item }) => {
    const roleIcon = getRoleIcon(item.role);
    const roleColor = getRoleColor(item.role);

    return (
      <View style={[styles.card, shadows.small]}>
        <View style={styles.cardHeader}>
          <View style={[styles.roleIcon, { backgroundColor: roleColor + '20' }]}>
            <Ionicons name={roleIcon} size={20} color={roleColor} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.userRole}>{item.role}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="home-outline" size={16} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>{item.houseNumber || 'N/A'}</Text>
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
              setSelectedUser(item);
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
        <Text style={styles.loadingText}>Loading archived users...</Text>
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
          <Text style={styles.headerTitle}>Archived Users</Text>
          <Text style={styles.headerSubtitle}>Manage archived users</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Archived Users</Text>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No archived users</Text>
            <Text style={styles.emptyText}>Archived users will appear here</Text>
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
              <Text style={styles.modalTitle}>Restore User</Text>
              <TouchableOpacity onPress={() => setShowRestoreModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.warningBox}>
                  <Ionicons name="information-circle" size={24} color={themeColors.warning} />
                  <Text style={styles.warningText}>
                    This will restore the user and make them active again. They will be able to access the system.
                  </Text>
                </View>

                <View style={styles.userPreview}>
                  <View style={[styles.userAvatar, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                    <Ionicons name={getRoleIcon(selectedUser.role)} size={20} color="white" />
                  </View>
                  <View>
                    <Text style={styles.previewName}>{selectedUser.firstName} {selectedUser.lastName}</Text>
                    <Text style={styles.previewEmail}>{selectedUser.email}</Text>
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
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  userEmail: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  userRole: {
    fontSize: 12,
    color: themeColors.primary,
    textTransform: 'capitalize',
    marginTop: 2,
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
  userPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    borderRadius: 8,
    padding: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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

export default ArchivedUsersScreen;