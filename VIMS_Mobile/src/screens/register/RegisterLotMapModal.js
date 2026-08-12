import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { themeColors } from '../../utils/theme';

const { width } = Dimensions.get('window');
const MAP_CANVAS_WIDTH = Math.max(width - 24, 720);
const MAP_CANVAS_HEIGHT = MAP_CANVAS_WIDTH * (1024 / 1536);
const MIN_MAP_ZOOM = 0.75;
const MAX_MAP_ZOOM = 2.25;
const MAP_ZOOM_STEP = 0.25;
const LOT_MAP_IMAGE = require('../../../assets/lotbettermap.jpg');

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
  const [selectedPhase, setSelectedPhase] = useState('all');

  const statusConfig = useMemo(
    () => ({
      vacant: { color: '#22c55e', bg: '#dcfce7', label: 'Vacant', border: '#16a34a' },
      occupied: { color: '#ef4444', bg: '#fee2e2', label: 'Occupied', border: '#dc2626' },
      reserved: { color: '#f59e0b', bg: '#fef3c7', label: 'Reserved', border: '#d97706' },
    }),
    []
  );

  const getStatusConfig = (status) => statusConfig[status] || statusConfig.vacant;

  const mappedLots = useMemo(() => {
    const sourceLots = mapViewMode === 'available' ? availableLots : allLots;
    return sourceLots.filter((lot) => {
      const position = lot.mapPosition;
      return position?.isPositioned &&
        [position.left, position.top, position.width, position.height]
          .map(Number)
          .every(Number.isFinite) &&
        Number(position.width) > 0 &&
        Number(position.height) > 0;
    });
  }, [allLots, availableLots, mapViewMode]);

  const phases = useMemo(() => {
    const phaseSet = new Set();
    mappedLots.forEach(lot => {
      if (lot.phase != null) phaseSet.add(Number(lot.phase));
    });
    return Array.from(phaseSet).sort((a, b) => a - b);
  }, [mappedLots]);

  const phaseFilteredLots = useMemo(() => {
    return selectedPhase === 'all'
      ? mappedLots
      : mappedLots.filter(lot => Number(lot.phase || 1) === Number(selectedPhase));
  }, [mappedLots, selectedPhase]);

  const updateMapZoom = (nextZoom) => {
    setMapZoom(Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Number(nextZoom.toFixed(2)))));
  };

  const handleLotPress = (lot) => {
    if (lot.status !== 'vacant') {
      Alert.alert('Not Available', `Lot ${lot.lotId} is ${lot.status}`);
      return;
    }
    setSelectedMapLot(lot);
    setShowLotInfo(true);
  };

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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.phaseToggleRow}
          >
            <TouchableOpacity
              style={[styles.phaseBtn, selectedPhase === 'all' && styles.phaseBtnActive]}
              onPress={() => setSelectedPhase('all')}
            >
              <Text style={[styles.phaseBtnText, selectedPhase === 'all' && styles.phaseBtnTextActive]}>
                All phases
              </Text>
            </TouchableOpacity>
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
          </ScrollView>
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
          <TouchableOpacity style={styles.zoomBtn} onPress={() => updateMapZoom(mapZoom + MAP_ZOOM_STEP)}>
            <Ionicons name="add" size={20} color={themeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => updateMapZoom(mapZoom - MAP_ZOOM_STEP)}>
            <Ionicons name="remove" size={20} color={themeColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setMapZoom(1)}>
            <Ionicons name="refresh" size={20} color={themeColors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.mapHelp}>Swipe to explore the actual lot map. Tap a green lot to select it.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.mapScrollContent}>
            <View
              style={[
                styles.mapCanvas,
                {
                  width: MAP_CANVAS_WIDTH * mapZoom,
                  height: MAP_CANVAS_HEIGHT * mapZoom,
                },
              ]}
            >
              <Image source={LOT_MAP_IMAGE} style={styles.mapPlanImage} resizeMode="contain" />
              {phaseFilteredLots.map((lot) => {
                const cfg = getStatusConfig(lot.status);
                const position = lot.mapPosition;
                const isSelected = selectedLotId === lot.lotId;

                return (
                  <TouchableOpacity
                    key={lot.lotId || lot._id}
                    activeOpacity={0.75}
                    onPress={() => handleLotPress(lot)}
                    style={[
                      styles.mapLotSquare,
                      {
                        left: `${Number(position.left)}%`,
                        top: `${Number(position.top)}%`,
                        width: `${Number(position.width)}%`,
                        height: `${Number(position.height)}%`,
                        borderColor: isSelected ? '#ffffff' : cfg.border,
                        backgroundColor: `${cfg.color}38`,
                        opacity: lot.status === 'vacant' ? 1 : 0.55,
                        transform: [{ rotate: `${Number(position.rotate) || 0}deg` }],
                      },
                      isSelected && styles.activeMapLotSquare,
                    ]}
                  >
                    <Text
                      style={[
                        styles.mapLotLabel,
                        {
                          color: isSelected ? '#ffffff' : cfg.border,
                          fontSize: Math.max(7, Math.min(13, 9 * mapZoom)),
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {lot.lotNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          {phaseFilteredLots.length === 0 ? (
            <View style={styles.emptyMap}>
              <Text style={styles.emptyMapText}>No positioned lots found for this view.</Text>
            </View>
          ) : null}
        </ScrollView>

        {showLotInfo && (
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
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f2a04' },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  phaseToggleRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
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
  mapHelp: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  mapScrollContent: { backgroundColor: '#020617' },
  mapCanvas: { position: 'relative', overflow: 'hidden', backgroundColor: '#dbe4e8' },
  mapPlanImage: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  mapLotSquare: { position: 'absolute', borderWidth: 1, borderRadius: 2, minWidth: 3, minHeight: 3, alignItems: 'center', justifyContent: 'center' },
  activeMapLotSquare: { borderWidth: 2, elevation: 5 },
  mapLotLabel: { fontWeight: '900', textAlign: 'center', includeFontPadding: false },
  emptyMap: { marginTop: 12, borderRadius: 12, padding: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  emptyMapText: { color: '#cbd5e1', fontWeight: '800', textAlign: 'center' },
  infoOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, elevation: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
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

