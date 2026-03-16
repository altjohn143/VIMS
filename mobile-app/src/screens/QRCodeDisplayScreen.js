import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

// Base dimensions for 430x932 screen
const BASE_WIDTH = 430;
const BASE_HEIGHT = 932;

// Scaling functions
const scaleWidth = (size) => (width / BASE_WIDTH) * size;
const scaleHeight = (size) => (height / BASE_HEIGHT) * size;
const moderateScale = (size, factor = 0.5) => size + (scaleWidth(size) - size) * factor;

// For responsive font sizes
const scaleFont = (size) => {
  const scaleFactor = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  return size * scaleFactor;
};

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

const QRCodeDisplayScreen = ({ route, navigation }) => {
  const { 
    visitor, 
    residentName, 
    residentHouse, 
    qrCodeUrl 
  } = route.params || {};

  if (!qrCodeUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuButton}>
            <Ionicons name="arrow-back" size={moderateScale(28)} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>QR Code</Text>
          </View>
          
          <View style={styles.profileButton} />
        </View>

        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={moderateScale(64)} color={themeColors.error} />
          <Text style={styles.errorText}>No QR code data available</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={themeColors.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuButton}>
          <Ionicons name="arrow-back" size={moderateScale(28)} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Visitor QR Code</Text>
          <Text style={styles.headerSubtitle}>Scan at gate</Text>
        </View>
        
        <View style={styles.profileButton} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.qrContainer}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Scan at Security Gate</Text>

            <View style={styles.qrImageContainer}>
              {qrCodeUrl ? (
                <Image 
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('Image load error:', error.nativeEvent.error);
                    Alert.alert('Error', 'Could not load QR code image');
                  }}
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Icon name="qrcode" size={moderateScale(100)} color={themeColors.border} />
                  <Text style={styles.qrPlaceholderText}>QR Code Loading...</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.qrInstructions}>
              Show this QR code to security personnel at the gate
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Visitor Information</Text>
          
          <View style={styles.detailCard}>
            <DetailRow 
              icon="account" 
              label="Visitor Name" 
              value={visitor?.visitorName || 'N/A'} 
            />
            <DetailRow 
              icon="phone" 
              label="Phone" 
              value={visitor?.visitorPhone || 'N/A'} 
            />
            <DetailRow 
              icon="car" 
              label="Vehicle" 
              value={visitor?.vehicleNumber || 'Not specified'} 
            />
            <DetailRow 
              icon="note-text" 
              label="Purpose" 
              value={visitor?.purpose || 'N/A'} 
            />
            <DetailRow 
              icon="clock" 
              label="Arrival" 
              value={visitor?.expectedArrival ? 
                new Date(visitor.expectedArrival).toLocaleString() : 'N/A'} 
            />
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Resident Information</Text>
          
          <View style={styles.detailCard}>
            <DetailRow 
              icon="home" 
              label="Resident" 
              value={residentName || 'N/A'} 
            />
            <DetailRow 
              icon="office-building" 
              label="House Number" 
              value={residentHouse || 'N/A'} 
            />
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Icon name="information" size={moderateScale(20)} color={themeColors.primary} />
              <Text style={styles.statusTitle}>Current Status</Text>
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusValue}>
                {visitor?.status ? visitor.status.toUpperCase() : 'UNKNOWN'}
              </Text>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(visitor?.status) }
              ]}>
                <Text style={styles.statusBadgeText}>
                  {visitor?.status || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              Alert.alert('Info', 'QR code sharing would be implemented here');
            }}
          >
            <Icon name="share-variant" size={moderateScale(20)} color={themeColors.primary} />
            <Text style={styles.actionButtonText}>Share QR Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.printButton]}
            onPress={() => {
              Alert.alert('Info', 'Print functionality would be implemented here');
            }}
          >
            <Icon name="printer" size={moderateScale(20)} color="white" />
            <Text style={[styles.actionButtonText, styles.printButtonText]}>
              Print Pass
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Icon name="information-outline" size={moderateScale(16)} color={themeColors.textSecondary} />
          <Text style={styles.helpText}>
            This QR code is valid for one-time use. Security will scan it to verify visitor identity.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconContainer}>
      <Icon name={icon} size={moderateScale(18)} color={themeColors.textSecondary} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const getStatusColor = (status) => {
  switch(status) {
    case 'approved': return themeColors.success;
    case 'pending': return themeColors.warning;
    case 'active': return themeColors.primary;
    case 'completed': return '#8b5cf6';
    case 'rejected': return themeColors.error;
    default: return themeColors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleWidth(20),
  },
  errorText: {
    fontSize: moderateScale(18),
    color: themeColors.textPrimary,
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(24),
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    backgroundColor: themeColors.primary,
    elevation: 4,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  menuButton: {
    padding: scaleWidth(8),
    marginRight: scaleWidth(8),
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: scaleHeight(2),
  },
  profileButton: {
    width: scaleWidth(40),
  },
  content: {
    paddingBottom: scaleHeight(40),
  },
  qrContainer: {
    padding: scaleWidth(20),
  },
  qrCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(24),
    alignItems: 'center',
    elevation: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  qrTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: scaleHeight(20),
  },
  qrImageContainer: {
    width: scaleWidth(250),
    height: scaleWidth(250),
    backgroundColor: 'white',
    borderRadius: scaleWidth(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleHeight(20),
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    marginTop: scaleHeight(12),
    fontSize: moderateScale(14),
    color: themeColors.textSecondary,
  },
  qrInstructions: {
    fontSize: moderateScale(14),
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: scaleHeight(8),
  },
  detailsContainer: {
    paddingHorizontal: scaleWidth(20),
    marginBottom: scaleHeight(16),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: scaleHeight(12),
  },
  detailCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(12),
    borderBottomWidth: 1,
    borderBottomColor: themeColors.background,
  },
  detailIconContainer: {
    width: scaleWidth(32),
    height: scaleWidth(32),
    borderRadius: scaleWidth(16),
    backgroundColor: themeColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleWidth(12),
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateScale(12),
    color: themeColors.textSecondary,
    marginBottom: scaleHeight(2),
  },
  detailValue: {
    fontSize: moderateScale(14),
    color: themeColors.textPrimary,
    fontWeight: '500',
  },
  statusContainer: {
    paddingHorizontal: scaleWidth(20),
    marginBottom: scaleHeight(20),
  },
  statusCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: scaleWidth(12),
    padding: scaleWidth(16),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(12),
  },
  statusTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginLeft: scaleWidth(8),
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusValue: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: themeColors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: scaleWidth(20),
  },
  statusBadgeText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scaleWidth(20),
    marginBottom: scaleHeight(20),
    gap: scaleWidth(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: scaleHeight(14),
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  printButton: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  actionButtonText: {
    color: themeColors.primary,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginLeft: scaleWidth(8),
  },
  printButtonText: {
    color: 'white',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    marginHorizontal: scaleWidth(20),
    padding: scaleWidth(16),
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  helpText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: '#0369a1',
    marginLeft: scaleWidth(8),
    lineHeight: scaleHeight(16),
  },
  backButton: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: scaleWidth(32),
    paddingVertical: scaleHeight(12),
    borderRadius: scaleWidth(8),
  },
  backButtonText: {
    color: 'white',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
});

export default QRCodeDisplayScreen;