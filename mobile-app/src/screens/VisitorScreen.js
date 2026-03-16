// VisitorScreen.js - Responsive Design matching Dashboard
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

const themeColors = {
  primary: '#2224be',
  primaryLight: '#4a4bd1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e5e7eb'
};

const API_URL = API_CONFIG.forceNetworkIP;

const VisitorScreen = ({ navigation }) => {
  const [visitors, setVisitors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    visitorName: '',
    visitorPhone: '',
    vehicleNumber: '',
    purpose: '',
    expectedArrival: '',
    expectedDeparture: ''
  });

  useEffect(() => {
    loadUserData();
    loadVisitors();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('vims_token');
      const storedUser = await AsyncStorage.getItem('vims_user');
      
      if (!token || !storedUser) {
        navigation.replace('Login');
        return;
      }
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = async () => {
    const performLogout = async () => {
      try {
        await AsyncStorage.multiRemove(['vims_user', 'vims_token']);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes", 
          onPress: performLogout
        }
      ]
    );
  };

  const loadVisitors = async () => {
    setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem('vims_token');
      const response = await fetch(`${API_URL}/visitors/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setVisitors(data.data || []);
      } else {
        // If endpoint doesn't exist yet, just show empty array
        setVisitors([]);
        console.log('Visitors endpoint not available yet');
      }
    } catch (error) {
      console.log('Error loading visitors:', error);
      setVisitors([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.visitorName.trim()) {
      Alert.alert('Error', 'Visitor name is required');
      return;
    }
    if (!formData.visitorPhone.trim()) {
      Alert.alert('Error', 'Visitor phone is required');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('vims_token');
      const response = await fetch(`${API_URL}/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Visitor pass created successfully');
        setModalVisible(false);
        setFormData({
          visitorName: '',
          visitorPhone: '',
          vehicleNumber: '',
          purpose: '',
          expectedArrival: '',
          expectedDeparture: ''
        });
        loadVisitors();
      } else {
        Alert.alert('Error', data.error || 'Failed to create visitor pass');
      }
    } catch (error) {
      console.log('Error creating visitor:', error);
      Alert.alert('Info', 'Visitor pass feature is coming soon!');
      setModalVisible(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#f59e0b';   
      case 'approved': return '#10b981';  
      case 'rejected': return '#ef4444';   
      case 'active': return '#3b82f6';    
      case 'completed': return '#8b5cf6';  
      case 'cancelled': return '#6b7280';  
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return 'clock-outline';
      case 'approved': return 'check-circle-outline';
      case 'rejected': return 'close-circle-outline';
      case 'active': return 'login';
      case 'completed': return 'check-all';
      case 'cancelled': return 'cancel';
      default: return 'help-circle-outline';
    }
  };

  const handleViewQRCode = async (visitorId) => {
    try {
      const token = await AsyncStorage.getItem('vims_token');
      
      const response = await fetch(`${API_URL}/visitors/${visitorId}/qr`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        navigation.navigate('QRCodeDisplay', {
          visitor: data.data.visitor,
          residentName: data.data.residentName,
          residentHouse: data.data.residentHouse,
          qrCodeUrl: data.data.qrCodeUrl
        });
      } else {
        Alert.alert('Info', 'QR Code feature coming soon!');
      }
    } catch (error) {
      console.error('Error viewing QR code:', error);
      Alert.alert('Info', 'QR Code feature coming soon!');
    }
  };

  const ProfileMenuModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showProfileMenu}
      onRequestClose={() => setShowProfileMenu(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowProfileMenu(false)}
      >
        <View style={styles.profileMenu}>
          <View style={styles.profileMenuHeader}>
            <View style={styles.profileMenuAvatar}>
              <Text style={styles.profileMenuAvatarText}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Text>
            </View>
            <Text style={styles.profileMenuName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.profileMenuEmail}>{user?.email}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              navigation.navigate('ProfileSettings');
            }}
          >
            <Icon name="cog" size={22} color={themeColors.textPrimary} />
            <Text style={styles.profileMenuText}>Profile Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              Alert.alert('About', 'VIMS Mobile v2.0\nVillage Information Management System');
            }}
          >
            <Icon name="information" size={22} color={themeColors.textPrimary} />
            <Text style={styles.profileMenuText}>About App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.profileMenuItem, styles.logoutMenuItem]}
            onPress={handleLogout}
          >
            <Icon name="logout" size={22} color={themeColors.error} />
            <Text style={[styles.profileMenuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderVisitorItem = ({ item }) => (
    <View style={styles.visitorCard}>
      <View style={styles.visitorHeader}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status || 'pending') }]} />
        <Text style={styles.visitorName}>{item.visitorName || 'Unknown Visitor'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status || 'pending')}20` }]}>
          <Icon name={getStatusIcon(item.status || 'pending')} size={14} color={getStatusColor(item.status || 'pending')} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status || 'pending') }]}>
            {(item.status || 'pending').toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.visitorPhone}>
        <Icon name="phone-outline" size={14} color={themeColors.textSecondary} /> {item.visitorPhone || 'No phone'}
      </Text>
      
      {item.rejectionReason && item.status === 'rejected' ? (
        <View style={styles.rejectionContainer}>
          <Icon name="alert-circle" size={14} color={themeColors.error} />
          <Text style={styles.rejectionText}> {item.rejectionReason}</Text>
        </View>
      ) : null}
      
      {item.purpose ? (
        <Text style={styles.purpose}>
          <Icon name="information-outline" size={14} color={themeColors.textSecondary} /> {item.purpose}
        </Text>
      ) : null}
      
      {item.vehicleNumber ? (
        <Text style={styles.vehicle}>
          <Icon name="car" size={14} color={themeColors.textSecondary} /> Vehicle: {item.vehicleNumber}
        </Text>
      ) : null}
      
      <View style={styles.visitorFooter}>
        <View style={styles.timeContainer}>
          <Icon name="clock-outline" size={14} color={themeColors.textSecondary} />
          <Text style={styles.time}>
            {item.expectedArrival ? new Date(item.expectedArrival).toLocaleDateString() : 'No date'}
          </Text>
        </View>

        {(item.status === 'approved' || item.status === 'active') ? (
          <TouchableOpacity 
            style={styles.qrButton}
            onPress={() => handleViewQRCode(item._id)}
          >
            <Icon name="qrcode" size={18} color={themeColors.primary} />
            <Text style={styles.qrButtonText}>QR</Text>
          </TouchableOpacity>
        ) : item.status === 'pending' ? (
          <View style={styles.pendingStatus}>
            <Icon name="clock-outline" size={16} color={themeColors.warning} />
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading visitors...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />
      
      {/* HEADER - Matching Dashboard style */}
      <LinearGradient
        colors={[themeColors.primary, '#1a1a9e']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Visitor Passes</Text>
            <Text style={styles.headerSubtitle}>Manage your visitors</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => setShowProfileMenu(true)}
            style={styles.profileButton}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                {user?.lastName?.charAt(0) || ''}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Cards - Horizontal Scroll */}
      <View style={styles.statsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{visitors.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {visitors.filter(v => v.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {visitors.filter(v => v.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {visitors.filter(v => v.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={visitors}
        renderItem={renderVisitorItem}
        keyExtractor={item => item._id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadVisitors} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-group" size={64} color={themeColors.border} />
            <Text style={styles.emptyText}>No visitor passes yet</Text>
            <Text style={styles.emptySubText}>Tap the + button to create your first visitor pass</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Icon name="plus" size={20} color="white" />
              <Text style={styles.emptyButtonText}>Create Pass</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Create Pass Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="account-plus" size={24} color={themeColors.primary} />
              <Text style={styles.modalTitle}>Create Visitor Pass</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Visitor Name *</Text>
                <View style={styles.inputContainer}>
                  <Icon name="account-outline" size={20} color={themeColors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter visitor name"
                    placeholderTextColor="#9ca3af"
                    value={formData.visitorName}
                    onChangeText={text => setFormData({...formData, visitorName: text})}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Visitor Phone *</Text>
                <View style={styles.inputContainer}>
                  <Icon name="phone-outline" size={20} color={themeColors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor="#9ca3af"
                    value={formData.visitorPhone}
                    onChangeText={text => setFormData({...formData, visitorPhone: text})}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Number (Optional)</Text>
                <View style={styles.inputContainer}>
                  <Icon name="car" size={20} color={themeColors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter vehicle number"
                    placeholderTextColor="#9ca3af"
                    value={formData.vehicleNumber}
                    onChangeText={text => setFormData({...formData, vehicleNumber: text})}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Purpose of Visit</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <Icon name="information-outline" size={20} color={themeColors.textSecondary} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter purpose"
                    placeholderTextColor="#9ca3af"
                    value={formData.purpose}
                    onChangeText={text => setFormData({...formData, purpose: text})}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Icon name="information-outline" size={18} color={themeColors.primary} />
                <Text style={styles.infoText}>
                  Visitor passes require security approval before use. You'll receive a QR code once approved.
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmit}
                >
                  <Icon name="check" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Create Pass</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ProfileMenuModal />
    </SafeAreaView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  profileAvatarText: {
    color: themeColors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsWrapper: {
    paddingVertical: 12,
  },
  statsContainer: {
    paddingHorizontal: 16,
  },
  statCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  visitorCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    elevation: 2,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  visitorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  visitorPhone: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 4,
  },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  rejectionText: {
    fontSize: 12,
    color: themeColors.error,
    flex: 1,
  },
  purpose: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 4,
  },
  vehicle: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginBottom: 8,
  },
  visitorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 4,
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: themeColors.warning,
    marginLeft: 4,
    fontWeight: '500',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qrButtonText: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: themeColors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    flex: 1,
    marginLeft: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: themeColors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    marginLeft: 8,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: themeColors.background,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    elevation: 2,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cancelButtonText: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  profileMenu: {
    backgroundColor: themeColors.cardBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  profileMenuHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    marginBottom: 8,
  },
  profileMenuAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileMenuAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileMenuName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  profileMenuEmail: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  profileMenuText: {
    fontSize: 16,
    color: themeColors.textPrimary,
    marginLeft: 16,
    fontWeight: '500',
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: themeColors.error,
  },
});

export default VisitorScreen;