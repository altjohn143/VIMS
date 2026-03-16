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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';
import LogoutButton from '../../components/LogoutButton';

const AdminUserManagementScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    residents: 0,
    admin: 0,
    security: 0,
    approved: 0,
    pending: 0,
    active: 0,
    inactive: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        const allUsers = response.data.data;
        setUsers(allUsers);
        
        // Calculate stats
        setStats({
          total: allUsers.length,
          residents: allUsers.filter(u => u.role === 'resident').length,
          admin: allUsers.filter(u => u.role === 'admin').length,
          security: allUsers.filter(u => u.role === 'security').length,
          approved: allUsers.filter(u => u.isApproved).length,
          pending: allUsers.filter(u => !u.isApproved && u.role === 'resident').length,
          active: allUsers.filter(u => u.isActive).length,
          inactive: allUsers.filter(u => !u.isActive).length,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query) ||
        user.houseNumber?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleStatus = async (user) => {
    Alert.alert(
      `${user.isActive ? 'Deactivate' : 'Activate'} User`,
      `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.isActive ? 'Deactivate' : 'Activate',
          onPress: async () => {
            setProcessing(true);
            try {
              const response = await api.put(`/users/${user._id}/status`, {
                isActive: !user.isActive,
              });
              if (response.data.success) {
                Alert.alert('Success', `User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
                fetchUsers();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to update user status');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const response = await api.delete(`/users/${selectedUser._id}`, {
        data: { reason: deleteReason },
      });
      if (response.data.success) {
        Alert.alert('Success', 'User deleted successfully');
        setShowDeleteModal(false);
        setShowDetailsModal(false);
        setSelectedUser(null);
        setDeleteReason('');
        fetchUsers();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete user');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return 'shield';
      case 'security': return 'lock-closed';
      default: return 'person';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return themeColors.primary;
      case 'security': return themeColors.success;
      default: return themeColors.info;
    }
  };

  const renderUserCard = ({ item }) => {
    const roleColor = getRoleColor(item.role);
    const isResident = item.role === 'resident';

    return (
      <TouchableOpacity
        style={[styles.userCard, shadows.small]}
        onPress={() => {
          setSelectedUser(item);
          setShowDetailsModal(true);
        }}
      >
        <View style={styles.userHeader}>
          <View style={[styles.userAvatar, { backgroundColor: roleColor }]}>
            <Ionicons name={getRoleIcon(item.role)} size={20} color="white" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[
            styles.statusDot,
            { backgroundColor: item.isActive ? themeColors.success : themeColors.error }
          ]} />
        </View>

        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="call" size={14} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>{item.phone || 'No phone'}</Text>
          </View>
          {item.houseNumber && (
            <View style={styles.detailRow}>
              <Ionicons name="home" size={14} color={themeColors.textSecondary} />
              <Text style={styles.detailText}>House {item.houseNumber}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={14} color={themeColors.textSecondary} />
            <Text style={styles.detailText}>Joined {formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.userFooter}>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{item.role}</Text>
          </View>
          {isResident && (
            <View style={[
              styles.approvalBadge,
              { backgroundColor: item.isApproved ? themeColors.success + '20' : themeColors.warning + '20' }
            ]}>
              <Text style={[
                styles.approvalText,
                { color: item.isApproved ? themeColors.success : themeColors.warning }
              ]}>
                {item.isApproved ? 'Approved' : 'Pending'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.statusButton]}
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons
              name={item.isActive ? 'pause-circle' : 'play-circle'}
              size={20}
              color={item.isActive ? themeColors.error : themeColors.success}
            />
            <Text style={[styles.actionButtonText, { color: item.isActive ? themeColors.error : themeColors.success }]}>
              {item.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              setSelectedUser(item);
              setShowDeleteModal(true);
            }}
          >
            <Ionicons name="trash" size={20} color={themeColors.error} />
            <Text style={[styles.actionButtonText, { color: themeColors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
<View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="white" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>User Management</Text>
  <View style={styles.headerRight}>
    <TouchableOpacity onPress={fetchUsers} style={styles.refreshButton}>
      <Ionicons name="refresh" size={24} color="white" />
    </TouchableOpacity>
    <LogoutButton navigation={navigation} color="white" size={24} />
  </View>
</View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.residents}</Text>
            <Text style={styles.statLabel}>Residents</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.admin}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.security}</Text>
            <Text style={styles.statLabel}>Security</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.success }]}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.warning }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.success }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: themeColors.error }]}>{stats.inactive}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={themeColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, roleFilter === 'all' && styles.activeFilter]}
            onPress={() => setRoleFilter('all')}
          >
            <Text style={[styles.filterText, roleFilter === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, roleFilter === 'resident' && styles.activeFilter]}
            onPress={() => setRoleFilter('resident')}
          >
            <Text style={[styles.filterText, roleFilter === 'resident' && styles.activeFilterText]}>Residents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, roleFilter === 'admin' && styles.activeFilter]}
            onPress={() => setRoleFilter('admin')}
          >
            <Text style={[styles.filterText, roleFilter === 'admin' && styles.activeFilterText]}>Admins</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, roleFilter === 'security' && styles.activeFilter]}
            onPress={() => setRoleFilter('security')}
          >
            <Text style={[styles.filterText, roleFilter === 'security' && styles.activeFilterText]}>Security</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'active' && styles.activeFilter]}
            onPress={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          >
            <View style={[styles.statusDot, { backgroundColor: themeColors.success }]} />
            <Text style={[styles.filterText, statusFilter === 'active' && styles.activeFilterText]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'inactive' && styles.activeFilter]}
            onPress={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
          >
            <View style={[styles.statusDot, { backgroundColor: themeColors.error }]} />
            <Text style={[styles.filterText, statusFilter === 'inactive' && styles.activeFilterText]}>Inactive</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color={themeColors.textSecondary} />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters</Text>
          </View>
        }
      />

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
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView>
                <View style={styles.detailAvatar}>
                  <View style={[styles.largeAvatar, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                    <Ionicons name={getRoleIcon(selectedUser.role)} size={40} color="white" />
                  </View>
                  <Text style={styles.detailName}>{selectedUser.firstName} {selectedUser.lastName}</Text>
                  <View style={styles.detailBadges}>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedUser.role) + '20' }]}>
                      <Text style={[styles.roleText, { color: getRoleColor(selectedUser.role) }]}>
                        {selectedUser.role}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: selectedUser.isActive ? themeColors.success + '20' : themeColors.error + '20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: selectedUser.isActive ? themeColors.success : themeColors.error }
                      ]}>
                        {selectedUser.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    {selectedUser.role === 'resident' && (
                      <View style={[
                        styles.approvalBadge,
                        { backgroundColor: selectedUser.isApproved ? themeColors.success + '20' : themeColors.warning + '20' }
                      ]}>
                        <Text style={[
                          styles.approvalText,
                          { color: selectedUser.isApproved ? themeColors.success : themeColors.warning }
                        ]}>
                          {selectedUser.isApproved ? 'Approved' : 'Pending'}
                        </Text>
                      </View>
                    )}
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
                    <Text style={styles.detailItemValue}>{selectedUser.phone || 'Not provided'}</Text>
                  </View>
                </View>

                {selectedUser.houseNumber && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Residence</Text>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailItemLabel}>House Number</Text>
                      <Text style={styles.detailItemValue}>{selectedUser.houseNumber}</Text>
                    </View>
                  </View>
                )}

                {selectedUser.emergencyContact?.name && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Emergency Contact</Text>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailItemLabel}>Name</Text>
                      <Text style={styles.detailItemValue}>{selectedUser.emergencyContact.name}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailItemLabel}>Phone</Text>
                      <Text style={styles.detailItemValue}>{selectedUser.emergencyContact.phone}</Text>
                    </View>
                  </View>
                )}

                {selectedUser.vehicles?.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Vehicles ({selectedUser.vehicles.length})</Text>
                    {selectedUser.vehicles.map((vehicle, index) => (
                      <View key={index} style={styles.vehicleItem}>
                        <Ionicons name="car" size={16} color={themeColors.primary} />
                        <Text style={styles.vehicleText}>
                          {vehicle.plateNumber} - {vehicle.make} {vehicle.model} ({vehicle.color})
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedUser.familyMembers?.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Family Members ({selectedUser.familyMembers.length})</Text>
                    {selectedUser.familyMembers.map((member, index) => (
                      <View key={index} style={styles.familyItem}>
                        <Text style={styles.familyName}>{member.name}</Text>
                        <Text style={styles.familyDetails}>
                          {member.relationship} • {member.age} yrs • {member.phone}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Account Details</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Member Since</Text>
                    <Text style={styles.detailItemValue}>{formatDate(selectedUser.createdAt)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>Last Updated</Text>
                    <Text style={styles.detailItemValue}>{formatDate(selectedUser.updatedAt)}</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.statusButton]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      handleToggleStatus(selectedUser);
                    }}
                  >
                    <Ionicons
                      name={selectedUser.isActive ? 'pause-circle' : 'play-circle'}
                      size={20}
                      color={selectedUser.isActive ? themeColors.error : themeColors.success}
                    />
                    <Text style={[styles.modalActionText, { color: selectedUser.isActive ? themeColors.error : themeColors.success }]}>
                      {selectedUser.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.deleteButton]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Ionicons name="trash" size={20} color={themeColors.error} />
                    <Text style={[styles.modalActionText, { color: themeColors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete User</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.deleteContent}>
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={24} color={themeColors.error} />
                <Text style={styles.warningText}>
                  This action cannot be undone. The user will be permanently deleted.
                </Text>
              </View>

              {selectedUser && (
                <View style={styles.userPreview}>
                  <View style={[styles.userAvatar, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                    <Ionicons name={getRoleIcon(selectedUser.role)} size={20} color="white" />
                  </View>
                  <View>
                    <Text style={styles.previewName}>{selectedUser.firstName} {selectedUser.lastName}</Text>
                    <Text style={styles.previewEmail}>{selectedUser.email}</Text>
                  </View>
                </View>
              )}

              <TextInput
                style={styles.deleteInput}
                placeholder="Reason for deletion (optional)"
                value={deleteReason}
                onChangeText={setDeleteReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.cancelButton]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeleteReason('');
                  }}
                  disabled={processing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.deleteButton]}
                  onPress={handleDeleteUser}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalActionText}>Delete</Text>
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
  statsScroll: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  statCard: {
    alignItems: 'center',
    marginRight: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: themeColors.textSecondary,
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  activeFilter: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  filterText: {
    fontSize: 13,
    color: themeColors.textPrimary,
  },
  activeFilterText: {
    color: 'white',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  userDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
    color: themeColors.textPrimary,
  },
  userFooter: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  approvalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  approvalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusButton: {
    // inherits
  },
  deleteButton: {
    // inherits
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
  detailName: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  detailBadges: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
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
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    paddingBottom: 4,
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
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleText: {
    fontSize: 13,
    color: themeColors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  familyItem: {
    marginBottom: 8,
  },
  familyName: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  familyDetails: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 10,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteContent: {
    paddingVertical: 10,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: themeColors.error + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: themeColors.error + '30',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: themeColors.error,
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
  deleteInput: {
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

export default AdminUserManagementScreen;