import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { themeColors, shadows, roleLayouts } from '../../utils/theme';

const emptyPosition = {
  left: '',
  top: '',
  width: '',
  height: '',
  rotate: '0',
  shape: 'rectangle',
};

const AdminLotMapEditorScreen = ({ navigation }) => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [selectedLot, setSelectedLot] = useState(null);
  const [form, setForm] = useState(emptyPosition);

  const loadLots = async () => {
    setLoading(true);
    try {
      const response = await api.get('/lots');
      if (!response.data?.success) throw new Error(response.data?.error || 'Failed to load lots');
      setLots(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to load lots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLots();
  }, []);

  const filteredLots = useMemo(() => {
    const search = query.trim().toLowerCase();
    return lots.filter((lot) => {
      const positioned = Boolean(lot.mapPosition?.isPositioned);
      const matchesPosition =
        positionFilter === 'all' ||
        (positionFilter === 'saved' && positioned) ||
        (positionFilter === 'unmapped' && !positioned);
      const matchesSearch =
        !search ||
        String(lot.lotId || '').toLowerCase().includes(search) ||
        String(lot.address || '').toLowerCase().includes(search);
      return matchesPosition && matchesSearch;
    });
  }, [lots, positionFilter, query]);

  const openLot = (lot) => {
    const position = lot.mapPosition || {};
    setSelectedLot(lot);
    setForm({
      left: position.left === undefined || position.left === null ? '' : String(position.left),
      top: position.top === undefined || position.top === null ? '' : String(position.top),
      width: position.width === undefined || position.width === null ? '' : String(position.width),
      height: position.height === undefined || position.height === null ? '' : String(position.height),
      rotate: position.rotate === undefined || position.rotate === null ? '0' : String(position.rotate),
      shape: position.shape || 'rectangle',
    });
  };

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const savePosition = async () => {
    if (!selectedLot?.lotId) return;
    const payload = {
      left: Number(form.left),
      top: Number(form.top),
      width: Number(form.width),
      height: Number(form.height),
      rotate: Number(form.rotate) || 0,
      shape: form.shape || 'rectangle',
    };

    if (![payload.left, payload.top, payload.width, payload.height].every(Number.isFinite)) {
      Alert.alert('Invalid Position', 'Left, top, width, and height must be numbers.');
      return;
    }

    try {
      setSaving(true);
      const response = await api.put(`/lots/${encodeURIComponent(selectedLot.lotId)}/map-position`, payload);
      if (!response.data?.success) throw new Error(response.data?.error || 'Failed to save map position');
      Alert.alert('Success', 'Map position saved');
      setSelectedLot(null);
      loadLots();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to save map position');
    } finally {
      setSaving(false);
    }
  };

  const clearPosition = async () => {
    if (!selectedLot?.lotId) return;
    Alert.alert('Clear Map Position', `Clear saved map position for ${selectedLot.lotId}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            const response = await api.delete(`/lots/${encodeURIComponent(selectedLot.lotId)}/map-position`);
            if (!response.data?.success) throw new Error(response.data?.error || 'Failed to clear map position');
            Alert.alert('Success', 'Map position cleared');
            setSelectedLot(null);
            loadLots();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to clear map position');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const exportMapData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const baseUrl = String(api.defaults.baseURL || '').replace(/\/$/, '');
      const fileUri = `${FileSystem.documentDirectory}VIMS_Lot_Map_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      const download = await FileSystem.downloadAsync(`${baseUrl}/lots/map-data/export`, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (download.status < 200 || download.status >= 300) throw new Error(`Export returned status ${download.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Share Lot Map Backup' });
      } else {
        Alert.alert('Export Complete', `Backup saved to ${fileUri}`);
      }
    } catch (error) {
      Alert.alert('Export Failed', error.message || 'Failed to export lot map data');
    }
  };

  const importMapData = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (picked.canceled) return;
      const file = picked.assets?.[0];
      if (!file?.uri) return;
      const text = await FileSystem.readAsStringAsync(file.uri);
      const payload = JSON.parse(text);
      const lotCount = Array.isArray(payload?.lots) ? payload.lots.length : 0;
      if (!lotCount) {
        Alert.alert('Invalid Backup', 'Backup file has no lots to import.');
        return;
      }
      Alert.alert('Import Lot Map Data', `Import ${lotCount} lots from this backup?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              setSaving(true);
              const response = await api.post('/lots/map-data/import', payload);
              if (!response.data?.success) throw new Error(response.data?.error || 'Failed to import backup');
              Alert.alert('Success', response.data.message || 'Lot map data imported');
              loadLots();
            } catch (error) {
              Alert.alert('Import Failed', error.response?.data?.error || error.message || 'Failed to import backup');
            } finally {
              setSaving(false);
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Import Failed', error.message || 'Failed to read backup file');
    }
  };

  const renderLot = ({ item }) => {
    const positioned = Boolean(item.mapPosition?.isPositioned);
    return (
      <TouchableOpacity style={[styles.lotCard, shadows.small]} onPress={() => openLot(item)}>
        <View style={styles.lotCardTop}>
          <View>
            <Text style={styles.lotTitle}>{item.lotId}</Text>
            <Text style={styles.lotMeta}>Phase {item.phase || 'N/A'} - Block {item.block || 'N/A'} - Lot {item.lotNumber || 'N/A'}</Text>
          </View>
          <View style={[styles.statusPill, positioned ? styles.savedPill : styles.unmappedPill]}>
            <Text style={[styles.statusPillText, positioned ? styles.savedText : styles.unmappedText]}>
              {positioned ? 'Saved' : 'Unmapped'}
            </Text>
          </View>
        </View>
        <Text style={styles.addressText}>{item.address || 'No address listed'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={21} color="white" />
          <Text style={styles.headerButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>ADMIN MAP</Text>
          <Text style={styles.headerTitle}>Lot Map Editor</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.primaryAction} onPress={loadLots} disabled={loading}>
          <Ionicons name="refresh-outline" size={18} color="white" />
          <Text style={styles.primaryActionText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={exportMapData}>
          <Ionicons name="download-outline" size={18} color={themeColors.primaryDeep} />
          <Text style={styles.secondaryActionText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={importMapData}>
          <Ionicons name="cloud-upload-outline" size={18} color={themeColors.primaryDeep} />
          <Text style={styles.secondaryActionText}>Import</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={themeColors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search lot ID or address" value={query} onChangeText={setQuery} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {[
          ['all', 'All lots'],
          ['saved', 'Saved only'],
          ['unmapped', 'Unmapped only'],
        ].map(([value, label]) => (
          <TouchableOpacity key={value} style={[styles.filterChip, positionFilter === value && styles.filterChipActive]} onPress={() => setPositionFilter(value)}>
            <Text style={[styles.filterChipText, positionFilter === value && styles.filterChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading lot map data...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLots}
          keyExtractor={(item) => item._id || item.lotId}
          renderItem={renderLot}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No lots match your filters.</Text>}
        />
      )}

      <Modal visible={!!selectedLot} animationType="slide" transparent onRequestClose={() => setSelectedLot(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editorSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedLot?.lotId || 'Lot'}</Text>
                <Text style={styles.modalSubtitle}>Map position values are percentages of the map image.</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLot(null)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {[
              ['left', 'Left'],
              ['top', 'Top'],
              ['width', 'Width'],
              ['height', 'Height'],
              ['rotate', 'Rotate'],
            ].map(([key, label]) => (
              <View style={styles.inputRow} key={key}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput style={styles.input} value={form[key]} onChangeText={(value) => updateForm(key, value)} keyboardType="decimal-pad" />
              </View>
            ))}

            <View style={styles.shapeRow}>
              {['rectangle', 'circle'].map((shape) => (
                <TouchableOpacity key={shape} style={[styles.shapeButton, form.shape === shape && styles.shapeButtonActive]} onPress={() => updateForm('shape', shape)}>
                  <Text style={[styles.shapeButtonText, form.shape === shape && styles.shapeButtonTextActive]}>{shape}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.clearButton]} onPress={clearPosition} disabled={saving}>
                <Ionicons name="trash-outline" size={18} color={themeColors.error} />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={savePosition} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="save-outline" size={18} color="white" />}
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: roleLayouts.admin.screen,
  header: { ...roleLayouts.admin.header },
  headerButton: { height: 40, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerButtonText: { color: 'white', fontSize: 11, fontWeight: '800' },
  headerCopy: { flex: 1 },
  headerEyebrow: { color: '#bbf7d0', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  headerTitle: { color: 'white', fontSize: 25, fontWeight: '900', marginTop: 2 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, padding: 16 },
  primaryAction: { height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: themeColors.primary, flexDirection: 'row', alignItems: 'center', gap: 7 },
  primaryActionText: { color: 'white', fontSize: 12, fontWeight: '900' },
  secondaryAction: { height: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: themeColors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 7 },
  secondaryActionText: { color: themeColors.primaryDeep, fontSize: 12, fontWeight: '900' },
  searchBox: { marginHorizontal: 16, minHeight: 48, borderRadius: 14, backgroundColor: 'white', borderWidth: 1, borderColor: themeColors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  searchInput: { flex: 1, marginLeft: 8, color: themeColors.textPrimary, fontSize: 14 },
  filterRow: { paddingHorizontal: 16, marginTop: 12, maxHeight: 42 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: 'white', borderWidth: 1, borderColor: themeColors.border, marginRight: 8 },
  filterChipActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  filterChipText: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '800' },
  filterChipTextActive: { color: 'white' },
  listContent: { padding: 16, paddingBottom: 36 },
  lotCard: { backgroundColor: themeColors.cardBackground, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: themeColors.border, borderLeftWidth: 4, borderLeftColor: themeColors.primary },
  lotCardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  lotTitle: { color: themeColors.textPrimary, fontSize: 16, fontWeight: '900' },
  lotMeta: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 3 },
  addressText: { color: themeColors.textSecondary, fontSize: 12, marginTop: 8 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  savedPill: { backgroundColor: themeColors.success + '18' },
  unmappedPill: { backgroundColor: themeColors.warning + '18' },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  savedText: { color: themeColors.success },
  unmappedText: { color: themeColors.warning },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: themeColors.textSecondary, fontWeight: '700' },
  emptyText: { color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  editorSheet: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  modalTitle: { color: themeColors.textPrimary, fontSize: 22, fontWeight: '900' },
  modalSubtitle: { color: themeColors.textSecondary, fontSize: 12, marginTop: 3, maxWidth: 260 },
  inputRow: { marginBottom: 12 },
  inputLabel: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 5 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, backgroundColor: '#f8fafc', paddingHorizontal: 12, color: themeColors.textPrimary, fontSize: 15 },
  shapeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  shapeButton: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, alignItems: 'center', justifyContent: 'center' },
  shapeButtonActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  shapeButtonText: { color: themeColors.textSecondary, fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  shapeButtonTextActive: { color: 'white' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  clearButton: { backgroundColor: themeColors.error + '12', borderWidth: 1, borderColor: themeColors.error + '40' },
  clearButtonText: { color: themeColors.error, fontSize: 13, fontWeight: '900' },
  saveButton: { backgroundColor: themeColors.primary },
  saveButtonText: { color: 'white', fontSize: 13, fontWeight: '900' },
});

export default AdminLotMapEditorScreen;
