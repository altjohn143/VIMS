import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';
import api from '../../utils/api';
import { safeGoBack } from '../../utils/navigation';

const STATUS_OPTIONS = ['all', 'vacant', 'occupied', 'reserved'];

const isPlacedLot = (lot) => Boolean(lot?.mapPosition?.isPositioned);

const getStatusStyle = (status) => {
  switch (status) {
    case 'vacant':
      return { color: themeColors.success, bg: themeColors.success + '18', icon: 'checkmark-circle-outline' };
    case 'occupied':
      return { color: themeColors.error, bg: themeColors.error + '18', icon: 'home-outline' };
    case 'reserved':
      return { color: themeColors.warning, bg: themeColors.warning + '18', icon: 'time-outline' };
    default:
      return { color: themeColors.textSecondary, bg: themeColors.surfaceMuted, icon: 'ellipse-outline' };
  }
};

const AdminLotManagementScreen = ({ navigation }) => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [selectedLot, setSelectedLot] = useState(null);

  const loadLots = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get('/lots');
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to load lots.');
      }
      const lotsData = Array.isArray(response.data.data) ? response.data.data : [];
      setLots(lotsData.filter(isPlacedLot));
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to load lots.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLots();
  }, []);

  const phases = useMemo(() => {
    const values = [...new Set(lots.map((lot) => lot.phase).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
    return ['all', ...values];
  }, [lots]);

  const stats = useMemo(() => ({
    total: lots.length,
    vacant: lots.filter((lot) => lot.status === 'vacant').length,
    occupied: lots.filter((lot) => lot.status === 'occupied').length,
    reserved: lots.filter((lot) => lot.status === 'reserved').length,
  }), [lots]);

  const filteredLots = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lots.filter((lot) => {
      const residentName = `${lot.occupiedBy?.firstName || ''} ${lot.occupiedBy?.lastName || ''}`.trim().toLowerCase();
      const matchesSearch = !q ||
        String(lot.lotId || '').toLowerCase().includes(q) ||
        String(lot.address || '').toLowerCase().includes(q) ||
        residentName.includes(q);
      const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
      const matchesPhase = phaseFilter === 'all' || String(lot.phase) === String(phaseFilter);
      return matchesSearch && matchesStatus && matchesPhase;
    });
  }, [lots, search, statusFilter, phaseFilter]);

  const renderStat = (label, value, color, icon) => (
    <View style={[styles.statCard, shadows.small]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderLotCard = (lot) => {
    const status = getStatusStyle(lot.status);
    return (
      <TouchableOpacity key={lot._id || lot.lotId} style={[styles.lotCard, shadows.small]} onPress={() => setSelectedLot(lot)}>
        <View style={styles.lotTopRow}>
          <View style={styles.lotIconWrap}>
            <Ionicons name="map-outline" size={22} color={themeColors.primary} />
          </View>
          <View style={styles.lotTitleWrap}>
            <Text style={styles.lotTitle}>{lot.lotId || `Lot ${lot.lotNumber || 'N/A'}`}</Text>
            <Text style={styles.lotSubtitle}>Phase {lot.phase || 'N/A'} • Block {lot.block || lot.phaseBlock || 'N/A'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={13} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{lot.status || 'unknown'}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={15} color={themeColors.textSecondary} />
          <Text style={styles.detailText}>{lot.address || 'No address listed'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{lot.type || 'Lot'} • {lot.sqm || 0} sqm</Text>
          {lot.price ? <Text style={styles.metaText}>₱{Number(lot.price).toLocaleString('en-PH')}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack(navigation)}>
          <Ionicons name="arrow-back" size={24} color={themeColors.primaryDeep} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>ADMIN MODULE</Text>
          <Text style={styles.headerTitle}>Lot Management</Text>
          <Text style={styles.headerSubtitle}>Monitor lot inventory, ownership, and availability.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => loadLots(true)}>
            <Ionicons name="refresh" size={22} color={themeColors.primaryDeep} />
            <Text style={styles.headerButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading lots...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLots(true)} />}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            {renderStat('Total', stats.total, themeColors.primary, 'business-outline')}
            {renderStat('Vacant', stats.vacant, themeColors.success, 'checkmark-circle-outline')}
            {renderStat('Occupied', stats.occupied, themeColors.error, 'home-outline')}
            {renderStat('Reserved', stats.reserved, themeColors.warning, 'time-outline')}
          </ScrollView>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={19} color={themeColors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lot ID, address, or resident"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                  {status === 'all' ? 'All Status' : status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Phase</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {phases.map((phase) => (
              <TouchableOpacity
                key={String(phase)}
                style={[styles.filterChip, String(phaseFilter) === String(phase) && styles.filterChipActive]}
                onPress={() => setPhaseFilter(phase)}
              >
                <Text style={[styles.filterChipText, String(phaseFilter) === String(phase) && styles.filterChipTextActive]}>
                  {phase === 'all' ? 'All Phases' : `Phase ${phase}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Lot Records</Text>
            <Text style={styles.listCount}>{filteredLots.length} shown</Text>
          </View>

          {filteredLots.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={54} color={themeColors.textSecondary} />
              <Text style={styles.emptyTitle}>No lots found</Text>
              <Text style={styles.emptyText}>Adjust the search or filters and try again.</Text>
            </View>
          ) : (
            filteredLots.map(renderLotCard)
          )}
        </ScrollView>
      )}

      <Modal visible={!!selectedLot} animationType="slide" transparent onRequestClose={() => setSelectedLot(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedLot?.lotId || 'Lot Details'}</Text>
                <Text style={styles.modalSubtitle}>{selectedLot?.address || 'No address listed'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLot(null)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            {selectedLot ? (
              <View>
                {[
                  ['Status', selectedLot.status || 'N/A'],
                  ['Phase', selectedLot.phase || 'N/A'],
                  ['Block', selectedLot.block || selectedLot.phaseBlock || 'N/A'],
                  ['Lot Number', selectedLot.lotNumber || 'N/A'],
                  ['Type', selectedLot.type || 'N/A'],
                  ['Area', `${selectedLot.sqm || 0} sqm`],
                  ['Price', selectedLot.price ? `₱${Number(selectedLot.price).toLocaleString('en-PH')}` : 'N/A'],
                  ['Resident', selectedLot.occupiedBy ? `${selectedLot.occupiedBy.firstName || ''} ${selectedLot.occupiedBy.lastName || ''}`.trim() : 'None'],
                ].map(([label, value]) => (
                  <View key={label} style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>{label}</Text>
                    <Text style={styles.modalDetailValue}>{value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.admin.screen,
  header: { backgroundColor: themeColors.cardBackground, paddingTop: 44, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: themeColors.border, flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  backButton: { position: 'absolute', top: 44, left: 16, width: 40, height: 40, borderRadius: 12, backgroundColor: themeColors.accent, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  headerActionButton: { flexDirection: 'row', height: 38, width: 126, paddingHorizontal: 10, borderRadius: 12, backgroundColor: themeColors.accent, alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerButton: { flexDirection: 'row', height: 38, width: 104, paddingHorizontal: 10, borderRadius: 12, backgroundColor: themeColors.accent, alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerButtonText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  headerTextWrap: { width: '100%', paddingLeft: 50, minHeight: 42, justifyContent: 'center' },
  headerEyebrow: { color: themeColors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  headerTitle: { color: themeColors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 2 },
  headerSubtitle: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 2, lineHeight: 17 },
  content: { padding: 16, paddingBottom: 36 },
  statsRow: { paddingBottom: 14, gap: 10 },
  statCard: { width: 112, backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: themeColors.border },
  statValue: { color: themeColors.textPrimary, fontSize: 23, fontWeight: '900', marginTop: 8 },
  statLabel: { color: themeColors.textSecondary, fontSize: 11, fontWeight: '800', marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 14, minHeight: 52, borderWidth: 1, borderColor: themeColors.border, marginBottom: 14 },
  searchInput: { flex: 1, color: themeColors.textPrimary, fontSize: 15, marginLeft: 8 },
  filterLabel: { color: themeColors.textPrimary, fontSize: 13, fontWeight: '900', marginBottom: 8 },
  chipScroll: { marginBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'white', borderWidth: 1, borderColor: themeColors.border, marginRight: 8 },
  filterChipActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  filterChipText: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  filterChipTextActive: { color: 'white' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 10 },
  listTitle: { color: themeColors.textPrimary, fontSize: 18, fontWeight: '900' },
  listCount: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '800' },
  lotCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: themeColors.border, borderLeftWidth: 4, borderLeftColor: themeColors.primary },
  lotTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  lotIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: themeColors.primary + '12', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  lotTitleWrap: { flex: 1 },
  lotTitle: { color: themeColors.textPrimary, fontSize: 17, fontWeight: '900' },
  lotSubtitle: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  detailText: { flex: 1, color: themeColors.textSecondary, fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  metaText: { color: themeColors.textPrimary, fontSize: 12, fontWeight: '800' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: themeColors.textSecondary, fontSize: 14, fontWeight: '700' },
  emptyState: { backgroundColor: 'white', borderRadius: 12, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: themeColors.border },
  emptyTitle: { color: themeColors.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 12 },
  emptyText: { color: themeColors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '82%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  modalTitle: { color: themeColors.textPrimary, fontSize: 22, fontWeight: '900' },
  modalSubtitle: { color: themeColors.textSecondary, fontSize: 12, marginTop: 3, maxWidth: 260 },
  modalDetailRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: themeColors.border },
  modalDetailLabel: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '800' },
  modalDetailValue: { color: themeColors.textPrimary, fontSize: 15, fontWeight: '800', marginTop: 3 },
});

export default AdminLotManagementScreen;
