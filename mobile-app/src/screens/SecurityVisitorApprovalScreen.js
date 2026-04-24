import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../../config';

const SecurityVisitorApprovalScreen = ({ navigation, route }) => {
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [securityNotes, setSecurityNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const API_BASE_URL = Config.getApiUrl();
  
  useEffect(() => {
    loadUserData();
  }, []);
  
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('vims_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        if (parsedUser.role !== 'security') {
          Alert.alert('Access Denied', 'You do not have permission to access this page.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
          return;
        }
        
        fetchPendingVisitors();
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      navigation.replace('Login');
    }
  };
  
  const fetchPendingVisitors = async () => {
    if (fetchLoading) return;
    
    setFetchLoading(true);
    setError(null);
    
    try {
      const token = await AsyncStorage.getItem('vims_token');
      
      const response = await axios.get(`${API_BASE_URL}/visitors/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data?.success === true) {
        setPendingVisitors(response.data.data || []);
      } else {
        const errorMsg = response.data?.error || 'Server returned unsuccessful response';
        setError(errorMsg);
        setPendingVisitors([]);
      }
    } catch (error) {
      let errorMsg = 'Network error';
      if (error.response) {
        errorMsg = error.response.data?.error || `Server error ${error.response.status}`;
      } else if (error.request) {
        errorMsg = 'No response from server';
      } else {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      setPendingVisitors([]);
    } finally {
      setFetchLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPendingVisitors();
  }, []);
  
  const handleApprove = async () => {
    if (!selectedVisitor) return;
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('vims_token');
      
      const response = await axios.put(
        `${API_BASE_URL}/visitors/${selectedVisitor._id}/approve`,
        { securityNotes },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Visitor approved successfully!');
        setApproveModalVisible(false);
        setSecurityNotes('');
        await fetchPendingVisitors();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to approve visitor');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!selectedVisitor) return;
    
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('vims_token');
      
      const response = await axios.put(
        `${API_BASE_URL}/visitors/${selectedVisitor._id}/reject`,
        { rejectionReason },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        Alert.alert('Success', 'Visitor request rejected');
        setRejectModalVisible(false);
        setRejectionReason('');
        await fetchPendingVisitors();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject visitor');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  const getVisitorItemColor = (index) => {
    const colors = ['#fff5f5', '#f0f9ff', '#f0fdf4', '#fefce8', '#faf5ff'];
    return colors[index % colors.length];
  };
  
  const renderVisitorCard = ({ item, index }) => (
    <View style={[styles.visitorCard, { backgroundColor: getVisitorItemColor(index) }]}>
      <View style={styles.visitorHeader}>
        <View style={styles.visitorNameContainer}>
          <Text style={styles.visitorName}>{item.visitorName}</Text>
          <View style={styles.statusBadge}>
            <Icon name="clock-outline" size={14} color="#f59e0b" />
            <Text style={styles.statusText}>PENDING</Text>
          </View>
        </View>
        
        <View style={styles.residentInfo}>
          <Icon name="home" size={16} color="#6b7280" />
          <Text style={styles.residentText}>
            Visiting: {item.residentId?.firstName} {item.residentId?.lastName}
          </Text>
        </View>
        
        {item.residentId?.houseNumber && (
          <Text style={styles.houseText}>House: {item.residentId.houseNumber}</Text>
        )}
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.visitorDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Icon name="phone" size={16} color="#6b7280" />
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{item.visitorPhone}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Icon name="car" size={16} color="#6b7280" />
            <Text style={styles.detailLabel}>Vehicle:</Text>
            <Text style={styles.detailValue}>{item.vehicleNumber || 'Not specified'}</Text>
          </View>
        </View>
        
        <View style={styles.detailItem}>
          <Icon name="note-text" size={16} color="#6b7280" />
          <Text style={styles.detailLabel}>Purpose:</Text>
          <Text style={[styles.detailValue, { flex: 1 }]}>{item.purpose}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Icon name="calendar-arrow-right" size={16} color="#6b7280" />
            <Text style={styles.detailLabel}>Arrival:</Text>
            <Text style={styles.detailValue}>{formatDate(item.expectedArrival)}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Icon name="calendar-arrow-left" size={16} color="#6b7280" />
            <Text style={styles.detailLabel}>Departure:</Text>
            <Text style={styles.detailValue}>{formatDate(item.expectedDeparture)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => {
            setSelectedVisitor(item);
            setApproveModalVisible(true);
          }}
        >
          <Icon name="check-circle" size={20} color="#10b981" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => {
            setSelectedVisitor(item);
            setRejectModalVisible(true);
          }}
        >
          <Icon name="close-circle" size={20} color="#ef4444" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
 
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (user.role !== 'security') {
    return (
      <View style={styles.accessDeniedContainer}>
        <Icon name="security" size={64} color="#ef4444" />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          You do not have permission to access this page.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f59e0b" barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Icon name="security" size={28} color="#f59e0b" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.title}>Visitor Approval</Text>
              <Text style={styles.subtitle}>Approve or reject visitor requests</Text>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBadge}>
            <Icon name="clock-outline" size={18} color="#f59e0b" />
            <Text style={styles.statText}>{pendingVisitors.length} Pending</Text>
          </View>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={fetchLoading || loading}
          >
            <Icon name="refresh" size={20} color="#f59e0b" />
            <Text style={styles.refreshText}>
              {fetchLoading ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}
      </View>

      {fetchLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading visitor requests...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorStateContainer}>
          <Icon name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorStateTitle}>Error Loading Visitors</Text>
          <Text style={styles.errorStateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : pendingVisitors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="shield-check" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No pending visitor requests</Text>
          <Text style={styles.emptyText}>
            All visitor requests have been processed
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingVisitors}
          renderItem={renderVisitorCard}
          keyExtractor={item => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#f59e0b']}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={approveModalVisible}
        onRequestClose={() => setApproveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Approve Visitor Request</Text>
            
            <Text style={styles.modalSubtitle}>
              Approving visitor: <Text style={styles.modalHighlight}>{selectedVisitor?.visitorName}</Text>
            </Text>
            
            <Text style={styles.modalText}>
              Visiting: {selectedVisitor?.residentId?.firstName} {selectedVisitor?.residentId?.lastName}
            </Text>
            
            <Text style={styles.inputLabel}>Security Notes (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Add any notes for security records..."
              value={securityNotes}
              onChangeText={setSecurityNotes}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setApproveModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleApprove}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmModalButtonText}>Approve Visitor</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={rejectModalVisible}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Visitor Request</Text>
            
            <Text style={styles.modalSubtitle}>
              Rejecting visitor: <Text style={styles.modalHighlight}>{selectedVisitor?.visitorName}</Text>
            </Text>
            
            <Text style={styles.modalText}>
              Visiting: {selectedVisitor?.residentId?.firstName} {selectedVisitor?.residentId?.lastName}
            </Text>
            
            <Text style={styles.inputLabel}>Rejection Reason *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Please provide a reason for rejection..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectConfirmModalButton]}
                onPress={handleReject}
                disabled={loading || !rejectionReason.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.rejectConfirmModalButtonText}>Reject Visitor</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#f59e0b',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  userName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  visitorCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  visitorHeader: {
    marginBottom: 8,
  },
  visitorNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  residentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  residentText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  houseText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  visitorDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
    marginRight: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#1f2937',
    flexShrink: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  approveButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 16,
    marginBottom: 8,
  },
  errorStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 8,
  },
  modalHighlight: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmModalButton: {
    backgroundColor: '#10b981',
  },
  rejectConfirmModalButton: {
    backgroundColor: '#ef4444',
  },
  cancelModalButtonText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectConfirmModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SecurityVisitorApprovalScreen;