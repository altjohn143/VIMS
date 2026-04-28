import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../../utils/theme';

// Extracted from RegisterScreen to keep it light.
export default function RegisterLotMapModal({
  visible,
  onClose,
  allLots,
  availableLots,
  selectedLotId,
  onSelectLot,
}) {
  const [mapViewMode, setMapViewMode] = useState('available'); // available | all
  const [mapZoom, setMapZoom] = useState(1);
  const [selectedMapLot, setSelectedMapLot] = useState(null);
  const [showLotInfo, setShowLotInfo] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(1);

  const statusConfig = useMemo(
    () => ({
      vacant: { color: '#22c55e', bg: '#dcfce7', label: 'Vacant', border: '#16a34a' },
      occupied: { color: '#ef4444', bg: '#fee2e2', label: 'Occupied', border: '#dc2626' },
      reserved: { color: '#f59e0b', bg: '#fef3c7', label: 'Reserved', border: '#d97706' },
    }),
    []
  );

  const getStatusConfig = (status) => statusConfig[status] || statusConfig.vacant;

  const displayLots = mapViewMode === 'available' ? availableLots : allLots;

  // Get phases available
  const phases = useMemo(() => {
    const phaseSet = new Set();
    displayLots.forEach(lot => {
      if (lot.phase) phaseSet.add(lot.phase);
    });
    return Array.from(phaseSet).sort((a, b) => a - b);
  }, [displayLots]);

  // Filter lots by selected phase
  const phaseFilteredLots = useMemo(() => {
    return displayLots.filter(lot => (lot.phase || 1) === selectedPhase);
  }, [displayLots, selectedPhase]);

  const { sortedBlocks, lotsByBlock } = useMemo(() => {
    const by = phaseFilteredLots.reduce((acc, lot) => {
      if (!acc[lot.block]) acc[lot.block] = [];
      acc[lot.block].push(lot);
      return acc;
    }, {});
    Object.keys(by).forEach((block) => by[block].sort((a, b) => a.lotNumber - b.lotNumber));
    return { sortedBlocks: Object.keys(by).sort(), lotsByBlock: by };
  }, [phaseFilteredLots]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Your Lot</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Phase Selection */}
        {phases.length > 0 && (
          <View style={styles.phaseToggleRow}>
            {phases.map(phase => (
              <TouchableOpacity
                key={phase}
                style={[styles.phaseBtn, selectedPhase === phase && styles.phaseBtnActive]}
                onPress={() => setSelectedPhase(phase)}
              >
                <Text style={[styles.phaseBtnText, selectedPhase === phase && styles.phaseBtnTextActive]}>
                  Phase {phase}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mapViewMode === 'available' && styles.toggleBtnActive]}
            onPress={() => setMapViewMode('available')}
          >
            <Text style={[styles.toggleText, mapViewMode === 'available' && styles.toggleTextActive]}>Available</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mapViewMode === 'all' && styles.toggleBtnActive]}
            onPress={() => setMapViewMode('all')}
          >
            <Text style={[styles.toggleText, mapViewMode === 'all' && styles.toggleTextActive]}>All Lots</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.zoomRow}>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setMapZoom((z) => Math.min(1.5, z + 0.1))}>
            <Ionicons name="add" size={20} color={themeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setMapZoom((z) => Math.max(0.6, z - 0.1))}>
            <Ionicons name="remove" size={20} color={themeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setMapZoom(1)}>
            <Ionicons name="refresh" size={20} color={themeColors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={{ transform: [{ scale: mapZoom }] }}>
            {sortedBlocks.map((block) => {
              const blockLots = lotsByBlock[block] || [];
              const vacantCount = blockLots.filter((l) => l.status === 'vacant').length;
              return (
                <View key={block} style={styles.block}>
                  <View style={styles.blockHeader}>
                    <Text style={styles.blockTitle}>BLOCK {block}</Text>
                    {vacantCount > 0 ? <Text style={styles.blockBadge}>{vacantCount} available</Text> : null}
                  </View>
                  <View style={styles.grid}>
                    {blockLots.map((lot) => {
                      const cfg = getStatusConfig(lot.status);
                      const isSelected = selectedLotId === lot.lotId;
                      const isAvailable = lot.status === 'vacant';
                      const tile = Math.max(50, Math.min(70, 55 * mapZoom));
                      return (
                        <TouchableOpacity
                          key={lot.lotId}
                          style={[
                            styles.tile,
                            {
                              width: tile,
                              height: tile * 0.8,
                              backgroundColor: isSelected ? cfg.color + '40' : cfg.bg,
                              borderColor: isSelected ? themeColors.primary : cfg.border,
                              opacity: isAvailable ? 1 : 0.55,
                            },
                          ]}
                          onPress={() => {
                            if (!isAvailable) {
                              Alert.alert('Not Available', `Lot ${lot.lotId} is ${lot.status}`);
                              return;
                            }
                            setSelectedMapLot(lot);
                            setShowLotInfo(true);
                          }}
                          disabled={!isAvailable}
                        >
                          <Text style={[styles.tileNum, { color: cfg.border }]}>{lot.lotNumber}</Text>
                          {isSelected ? (
                            <View style={styles.selBadge}>
                              <Ionicons name="checkmark" size={12} color="white" />
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <Modal visible={showLotInfo} transparent animationType="slide" onRequestClose={() => setShowLotInfo(false)}>
          <View style={styles.infoOverlay}>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Text style={styles.infoTitle}>Lot Details</Text>
                <TouchableOpacity onPress={() => setShowLotInfo(false)}>
                  <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
              </View>
              {selectedMapLot ? (
                <View style={styles.infoBody}>
                  <Text style={styles.infoId}>Lot {selectedMapLot.lotNumber} - Block {selectedMapLot.block}</Text>
                  <Text style={styles.infoSub}>{selectedMapLot.type} • {selectedMapLot.sqm} sqm</Text>
                  {selectedMapLot.phase && (
                    <Text style={styles.infoPhase}>Phase {selectedMapLot.phase}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => {
                      onSelectLot(selectedMapLot);
                      setShowLotInfo(false);
                      onClose();
                    }}
                  >
                    <Text style={styles.selectBtnText}>Select This Lot</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f2a04' },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  phaseToggleRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: 'rgba(0,0,0,0.3)', overflow: 'scroll' },
  phaseBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  phaseBtnActive: { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
  phaseBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  phaseBtnTextActive: { color: 'white' },
  toggleRow: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: themeColors.primary },
  toggleText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '800' },
  toggleTextActive: { color: 'white' },
  zoomRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  zoomBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 12 },
  block: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  blockTitle: { color: 'white', fontWeight: '900', letterSpacing: 1, fontSize: 12 },
  blockBadge: { color: '#4ade80', fontWeight: '900', fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, position: 'relative' },
  tileNum: { fontWeight: '900' },
  selBadge: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: themeColors.primary, alignItems: 'center', justifyContent: 'center' },
  infoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  infoCard: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  infoTitle: { fontSize: 16, fontWeight: '900', color: themeColors.textPrimary },
  infoBody: { padding: 16 },
  infoId: { fontSize: 18, fontWeight: '900', color: themeColors.textPrimary },
  infoSub: { marginTop: 6, fontSize: 13, fontWeight: '700', color: themeColors.textSecondary },
  infoPhase: { marginTop: 4, fontSize: 12, fontWeight: '600', color: themeColors.primary },
  selectBtn: { marginTop: 14, backgroundColor: themeColors.success, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  selectBtnText: { color: 'white', fontWeight: '900' },
});

