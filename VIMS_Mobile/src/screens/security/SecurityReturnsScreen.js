import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows } from '../../utils/theme';
import api from '../../utils/api';
import { format } from 'date-fns';

const SecurityReturnsScreen = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reservations');
      if (response.data.success) {
        setReservations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching reservation returns:', error);
      Alert.alert('Error', 'Failed to load return requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'return_initiated':
        return { label: 'Return ready', color: themeColors.secondary, icon: 'arrow-undo' };
      case 'borrowed':
        return { label: 'Borrowed', color: themeColors.warning, icon: 'time' };
      case 'returned':
        return { label: 'Returned', color: themeColors.info, icon: 'checkmark-circle' };
      default:
        return { label: status, color: themeColors.textSecondary, icon: 'information-circle' };
    }
  };

  const formatItems = (reservation) => {
    if (reservation.items && reservation.items.length > 0) {
      return reservation.items.map((item) => `${item.resourceName} (x${item.quantity})`).join(', ');
    }
    return reservation.resourceName || 'Unknown item';
  };

  const handleConfirmReceipt = (reservationId) => {
    Alert.alert(
      'Confirm receipt',
      'Are you sure you want to confirm receipt of these returned items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setProcessingId(reservationId);
            try {
              const response = await api.put(`/reservations/${reservationId}/confirm-receipt`);
              if (response.data.success) {
                Alert.alert('Success', response.data.message || 'Return receipt confirmed');
                fetchReservations();
              }
            } catch (error) {
              console.error('Error confirming receipt:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to confirm receipt');
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.title}>Return Requests</Text>
      <Text style={styles.subtitle}>Security can confirm item receipt when residents bring returns to the desk.</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No return requests found.</Text>
        </View>
      ) : (
        reservations.map((reservation) => {
          const statusInfo = getStatusInfo(reservation.status);
          const isProcessing = processingId === reservation._id;
          return (
            <View key={reservation._id} style={[styles.card, shadows.small]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{reservation.reservedBy?.firstName} {reservation.reservedBy?.lastName}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusInfo.color + '20' }]}> 
                  <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} style={styles.statusIcon} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="cube" size={16} color={themeColors.textSecondary} />
                <Text style={styles.detailText}>{formatItems(reservation)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={16} color={themeColors.textSecondary} />
                <Text style={styles.detailText}>{formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}</Text>
              </View>
              {reservation.returnInitiatedAt && (
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color={themeColors.textSecondary} />
                  <Text style={styles.detailText}>Return requested: {formatDate(reservation.returnInitiatedAt)}</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
                  disabled={isProcessing || reservation.status === 'returned'}
                  onPress={() => handleConfirmReceipt(reservation._id)}
                >
                  <Text style={styles.actionButtonText}>{reservation.status === 'return_initiated' ? 'Confirm Return' : 'Confirm Receipt'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#f3f5f7'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: themeColors.textSecondary,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 8,
    color: themeColors.textSecondary,
    flex: 1,
    fontSize: 14,
  },
  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default SecurityReturnsScreen;
