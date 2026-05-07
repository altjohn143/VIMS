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
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';
import UserDropdownMenu from '../../components/UserDropdownMenu';

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
  const [createOpen, setCreateOpen] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'security',
    assignedPhases: '',
    assignedAreas: '',
    patrolSchedule: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    residents: 0,
    admin: 0,
    security: 0,
    approved: 0,
    pending: 0,
    active: 0,
    inactive: 0,
    moveOut: 0,
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
          moveOut: allUsers.filter(u => u.role === 'resident' && u.moveOutStatus === 'pending').length,
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
      if (statusFilter === 'moveout') {
        filtered = filtered.filter(u => u.role === 'resident' && u.moveOutStatus === 'pending');
      } else {
        filtered = filtered.filter(user => user.isActive === isActive);
      }
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

  const handleMoveOutDecision = async (user, action) => {
    if (!user) return;
    Alert.alert(
      action === 'approve' ? 'Approve move-out' : 'Deny move-out',
      `Resident: ${user.firstName} ${user.lastName}\nHouse: ${user.houseNumber || 'N/A'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Deny',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const url =
                action === 'approve'
                  ? `/users/${user._id}/move-out/approve`
                  : `/users/${user._id}/move-out/deny`;
              const res = await api.put(url, { notes: action === 'approve' ? 'Move-out approved by admin' : 'Move-out request denied' });
              if (res.data?.success) {
                Alert.alert('Success', res.data.message || `Move-out ${action}d`);
                fetchUsers();
              } else {
                Alert.alert('Error', res.data?.error || 'Failed to update move-out');
              }
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || 'Failed to update move-out');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleArchiveUser = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const response = await api.delete(`/users/${selectedUser._id}`, {
        data: { reason: deleteReason },
      });
      if (response.data.success) {
        Alert.alert('Success', 'User archived successfully');
        setShowDeleteModal(false);
        setShowDetailsModal(false);
        setSelectedUser(null);
        setDeleteReason('');
        fetchUsers();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to archive user');
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

          {isResident && item.moveOutStatus === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveMoveOutButton]}
                onPress={() => handleMoveOutDecision(item, 'approve')}
              >
                <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
                <Text style={[styles.actionButtonText, { color: themeColors.success }]}>Move-out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.denyMoveOutButton]}
                onPress={() => handleMoveOutDecision(item, 'deny')}
              >
                <Ionicons name="close-circle" size={20} color={themeColors.warning} />
                <Text style={[styles.actionButtonText, { color: themeColors.warning }]}>Deny</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              setSelectedUser(item);
              setShowDeleteModal(true);
            }}
          >
            <Ionicons name="trash" size={20} color={themeColors.error} />
            <Text style={[styles.actionButtonText, { color: themeColors.error }]}>Archive</Text>
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
    <TouchableOpacity onPress={() => setCreateOpen(true)} style={styles.createButton}>
      <Ionicons name="add" size={24} color="white" />
    </TouchableOpacity>
    <TouchableOpacity onPress={fetchUsers} style={styles.refreshButton}>
      <Ionicons name="refresh" size={24} color="white" />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => navigation.navigate('ArchivedUsers')}
      style={styles.archivedButton}
    >
      <Ionicons name="archive" size={24} color="white" />
    </TouchableOpacity>
    <UserDropdownMenu navigation={navigation} />
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
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'moveout' && styles.activeFilter]}
            onPress={() => setStatusFilter(statusFilter === 'moveout' ? 'all' : 'moveout')}
          >
            <View style={[styles.statusDot, { backgroundColor: themeColors.warning }]} />
            <Text style={[styles.filterText, statusFilter === 'moveout' && styles.activeFilterText]}>
              Move-out ({stats.moveOut})
            </Text>
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

      <Modal
        visible={createOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !createProcessing && setCreateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Staff User</Text>
              <TouchableOpacity onPress={() => !createProcessing && setCreateOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.formRow}>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  value={newUserData.firstName}
                  onChangeText={(text) => setNewUserData((prev) => ({ ...prev, firstName: text }))}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  value={newUserData.lastName}
                  onChangeText={(text) => setNewUserData((prev) => ({ ...prev, lastName: text }))}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newUserData.email}
                  onChangeText={(text) => setNewUserData((prev) => ({ ...prev, email: text }))}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                  value={newUserData.phone}
                  onChangeText={(text) => setNewUserData((prev) => ({ ...prev, phone: text }))}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry
                  value={newUserData.password}
                  onChangeText={(text) => setNewUserData((prev) => ({ ...prev, password: text }))}
                />
              </View>
              <View style={styles.formRow}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newUserData.role}
                    onValueChange={(value) => setNewUserData((prev) => ({ ...prev, role: value }))}
                  >
                    <Picker.Item label="Security" value="security" />
                    <Picker.Item label="Admin" value="admin" />
                  </Picker>
                </View>
              </View>
              {newUserData.role === 'security' && (
                <>
                  <View style={styles.formRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="Assigned Phases (1,2)"
                      value={newUserData.assignedPhases}
                      onChangeText={(text) => setNewUserData((prev) => ({ ...prev, assignedPhases: text }))}
                    />
                  </View>
                  <View style={styles.formRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="Assigned Areas (Phase 1, Phase 2)"
                      value={newUserData.assignedAreas}
                      onChangeText={(text) => setNewUserData((prev) => ({ ...prev, assignedAreas: text }))}
                    />
                  </View>
                  <View style={styles.formRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="Patrol Schedule"
                      value={newUserData.patrolSchedule}
                      onChangeText={(text) => setNewUserData((prev) => ({ ...prev, patrolSchedule: text }))}
                    />
                  </View>
                </>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    if (!createProcessing) {
                      setCreateOpen(false);
                      setNewUserData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        password: '',
                        role: 'security',
                        assignedPhases: '',
                        assignedAreas: '',
                        patrolSchedule: ''
                      });
                    }
                  }}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, createProcessing && styles.disabled]}
                  onPress={async () => {
                    if (createProcessing) return;
                    const { firstName, lastName, email, phone, password, role } = newUserData;
                    if (!firstName || !lastName || !email || !phone || !password || !role) {
                      return Alert.alert('Validation', 'Please complete all required fields');
                    }
                    setCreateProcessing(true);
                    try {
                      const response = await api.post('/users', {
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        email: email.trim(),
                        phone: phone.trim(),
                        password,
                        role,
                        assignedPhases: newUserData.assignedPhases
                          .split(',')
                          .map((item) => Number(item.trim()))
                          .filter((item) => Number.isInteger(item) && item > 0),
                        assignedAreas: newUserData.assignedAreas
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean),
                        patrolSchedule: newUserData.patrolSchedule.trim()
                      });
                      if (response.data.success) {
                        Alert.alert('Success', 'Staff account created successfully');
                        setCreateOpen(false);
                        setNewUserData({
                          firstName: '',
                          lastName: '',
                          email: '',
                          phone: '',
                          password: '',
                          role: 'security',
                          assignedPhases: '',
                          assignedAreas: '',
                          patrolSchedule: ''
                        });
                        fetchUsers();
                      } else {
                        Alert.alert('Error', response.data.error || 'Unable to create staff account');
                      }
                    } catch (error) {
                      Alert.alert('Error', error.response?.data?.error || 'Failed to create staff account');
                    } finally {
                      setCreateProcessing(false);
                    }
                  }}
                >
                  <Text style={styles.primaryText}>{createProcessing ? 'Saving…' : 'Create User'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
                    <Text style={[styles.modalActionText, { color: themeColors.error }]}>Archive</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Archive Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Archive User</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.deleteContent}>
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={24} color={themeColors.warning} />
                <Text style={styles.warningText}>
                  This user will be archived and can be restored later if needed. The user will no longer have access to the system.
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
                placeholder="Reason for archiving (optional)"
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
                  onPress={handleArchiveUser}
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
  createButton: {
    padding: 8,
    marginRight: 4,
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
  archivedButton: {
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
  approveMoveOutButton: {
    // inherits
  },
  denyMoveOutButton: {
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
  createModalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: themeColors.textPrimary,
  },
  formRow: {
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: themeColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: themeColors.textSecondary,
    fontWeight: '700',
  },
  primaryText: {
    color: 'white',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
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