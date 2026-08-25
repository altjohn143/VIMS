import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { themeColors, shadows } from '../utils/theme';
import QRCode from 'react-native-qrcode-svg';
import api from '../utils/api';
import ResidentUtilityHeader from '../components/ResidentUtilityHeader';

const { width } = Dimensions.get('window');
const MAP_CANVAS_WIDTH = Math.max(width - 32, 720);
const MAP_CANVAS_HEIGHT = MAP_CANVAS_WIDTH * (1024 / 1536);
const MIN_MAP_ZOOM = 0.75;
const MAX_MAP_ZOOM = 2.25;
const MAP_ZOOM_STEP = 0.25;
const LOT_MAP_IMAGE = require('../../assets/lotbettermap.jpg');
const PUBLIC_MAP = {
  primary: '#007A18',
  primaryDark: '#003D07',
  primaryDeep: '#002F05',
  primaryLight: '#00D084',
  pageBg: '#F7F8F5',
  wash: '#EFFDF5',
  text: '#17221C',
  muted: '#5E6D64',
  border: 'rgba(0,122,24,0.16)',
};

const sortLotsNumerically = (lotList) => [...lotList].sort((a, b) => (
  (Number(a.phase) || 0) - (Number(b.phase) || 0) ||
  (Number(a.block) || 0) - (Number(b.block) || 0) ||
  (Number(a.lotNumber) || 0) - (Number(b.lotNumber) || 0)
));

const PublicLotMapScreen = ({ navigation }) => {
  const [selectedLot, setSelectedLot] = useState(null);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [mapZoom, setMapZoom] = useState(1);
  
  // TOUR STATE
  const [tourPhotoIndex, setTourPhotoIndex] = useState(0);
  const [activeTourTab, setActiveTourTab] = useState('outside');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const fetchLots = async () => {
    try {
      setLoadError(null);
      const res = await api.get('/lots');
      if (res.data?.success) {
        setLots(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setLoadError(res.data?.error || 'Failed to load lots');
      }
    } catch (e) {
      setLoadError(e?.response?.data?.error || 'Failed to load lots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  const mappedLots = useMemo(() => lots.filter((lot) => {
    const position = lot.mapPosition;
    return position?.isPositioned &&
      [position.left, position.top, position.width, position.height]
        .map(Number)
        .every(Number.isFinite) &&
      Number(position.width) > 0 &&
      Number(position.height) > 0;
  }), [lots]);

  const selectedPhaseLots = useMemo(() => (
    selectedPhase === 'all'
      ? mappedLots
      : mappedLots.filter((lot) => Number(lot.phase || 1) === Number(selectedPhase))
  ), [mappedLots, selectedPhase]);

  const stats = useMemo(() => ({
    vacant: selectedPhaseLots.filter(l => l.status === 'vacant').length,
    occupied: selectedPhaseLots.filter(l => l.status === 'occupied').length,
    reserved: selectedPhaseLots.filter(l => l.status === 'reserved').length,
    amenity: selectedPhaseLots.filter(l => l.status === 'amenity').length,
    total: selectedPhaseLots.length,
  }), [selectedPhaseLots]);

  const filteredLots = useMemo(() => {
    return sortLotsNumerically(mappedLots.filter((lot) => {
      const matchesStatus = filterStatus === 'all' || lot.status === filterStatus;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = query === '' ||
        String(lot.lotId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(lot.phase || '').toLowerCase().includes(query) ||
        String(lot.block || '').toLowerCase().includes(query) ||
        String(lot.lotNumber || '').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    }));
  }, [mappedLots, filterStatus, searchQuery]);

  const phases = useMemo(() => {
    const phaseSet = new Set();
    mappedLots.forEach(lot => {
      if (lot.phase != null) phaseSet.add(Number(lot.phase));
    });
    const phaseArray = Array.from(phaseSet).sort((a, b) => a - b);
    return phaseArray.length ? phaseArray : [1];
  }, [mappedLots]);

  useEffect(() => {
    if (selectedPhase !== 'all' && phases.length > 0 && !phases.includes(selectedPhase)) {
      setSelectedPhase('all');
    }
  }, [phases, selectedPhase]);

  const phaseFilteredLots = useMemo(() => {
    const lotsForPhase = selectedPhase === 'all'
      ? filteredLots
      : filteredLots.filter(lot => Number(lot.phase || 1) === Number(selectedPhase));
    return sortLotsNumerically(lotsForPhase);
  }, [filteredLots, selectedPhase]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLots();
  };

  const statusConfig = {
    vacant: { color: '#00D084', bg: '#dcfce7', border: '#00A85A', label: 'Vacant', icon: 'checkmark-circle' },
    occupied: { color: '#ef4444', bg: '#fee2e2', border: '#dc2626', label: 'Occupied', icon: 'close-circle' },
    reserved: { color: '#f59e0b', bg: '#fef3c7', border: '#d97706', label: 'Reserved', icon: 'time' },
    amenity: { color: '#64748b', bg: '#e2e8f0', border: '#94a3b8', label: 'Community Amenity', icon: 'business' },
  };

  const getStatusConfig = (status) => statusConfig[status] || statusConfig.reserved;

  const updateMapZoom = (nextZoom) => {
    setMapZoom(Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Number(nextZoom.toFixed(2)))));
  };

  const zoomIn = () => updateMapZoom(mapZoom + MAP_ZOOM_STEP);
  const zoomOut = () => updateMapZoom(mapZoom - MAP_ZOOM_STEP);
  const resetZoom = () => updateMapZoom(1);

  // VIRTUAL TOUR PHOTO CATEGORIES
  const tourPhotoCategories = {
    outside: {
      label: 'Outside',
      emoji: '🏠',
      photos: [
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80',
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80',
      ],
    },
    inside: {
      label: 'Inside',
      emoji: '🛋️',
      photos: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=80',
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=80',
        'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&q=80',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
      ],
    },
    surroundings: {
      label: 'Surroundings',
      emoji: '🌳',
      photos: [
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80',
        'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=400&q=80',
        'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=400&q=80',
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80',
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80',
        'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80',
      ],
    },
  };

  // TOUR HELPER FUNCTIONS
  const getTourPhotos = () => {
    return tourPhotoCategories[activeTourTab]?.photos || [];
  };

  const handleTourTabChange = (tabKey) => {
    setActiveTourTab(tabKey);
    setTourPhotoIndex(0);
    setIsAutoPlaying(false);
  };

  const handleTourNextPhoto = () => {
    const photos = getTourPhotos();
    setTourPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const handleTourPrevPhoto = () => {
    const photos = getTourPhotos();
    setTourPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleStartTour = (lot) => {
    if (lot?.status === 'amenity') return;
    setSelectedLot(lot);
    setShowLotModal(false);
    setShowTourModal(true);
    setActiveTourTab('outside');
    setTourPhotoIndex(0);
    setIsAutoPlaying(true);
  };

  const handleCloseTour = () => {
    setShowTourModal(false);
    setIsAutoPlaying(false);
    setActiveTourTab('outside');
    setTourPhotoIndex(0);
  };

  // AUTOPLAY EFFECT
  useEffect(() => {
    if (!isAutoPlaying || !showTourModal) {
      return;
    }
    
    const interval = setInterval(() => {
      handleTourNextPhoto();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isAutoPlaying, showTourModal, activeTourTab]);

  const handleLotPress = (lot) => {
    if (lot?.status === 'amenity') return;
    setSelectedLot(lot);
    setShowLotModal(true);
  };

  const handleRegister = () => {
    if (selectedLot) {
      navigation.navigate('Register', {
        block: selectedLot.block,
        lot: selectedLot.lotNumber,
      });
    }
    setShowLotModal(false);
  };

  const renderLotBox = ({ item }) => {
    const config = getStatusConfig(item.status);
    
    return (
      <TouchableOpacity
        style={[styles.lotBox, { backgroundColor: config.bg, borderColor: config.color }]}
        onPress={() => handleLotPress(item)}
        disabled={item.status !== 'vacant'}
      >
        <Text style={[styles.lotNumber, { color: config.color }]}>{item.lotNumber}</Text>
        <Text style={[styles.lotSqm, { color: config.color }]}>{item.sqm}m²</Text>
        {item.status === 'vacant' && (
          <View style={styles.vacantIndicator}>
            <Ionicons name="checkmark-circle" size={12} color={config.color} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return loading ? (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={themeColors.primary} />
    </View>
  ) : (
    <View style={styles.container}>
      <ResidentUtilityHeader
        navigation={navigation}
        eyebrow="VILLAGE LOTS"
        title="Westville Lot Map"
        subtitle="Browse availability and lot details"
      />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={themeColors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lot (e.g., A-3)"
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        {loadError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={themeColors.error} />
            <Text style={styles.errorBannerText}>{loadError}</Text>
            <TouchableOpacity onPress={fetchLots} style={styles.errorBannerBtn}>
              <Text style={styles.errorBannerBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Lots</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: statusConfig.vacant.color }]}>{stats.vacant}</Text>
            <Text style={styles.statLabel}>Vacant</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: statusConfig.occupied.color }]}>{stats.occupied}</Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: statusConfig.reserved.color }]}>{stats.reserved}</Text>
            <Text style={styles.statLabel}>Reserved</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.activeFilterShell]}
            onPress={() => setFilterStatus('all')}
          >
            {filterStatus === 'all' ? (
              <LinearGradient
                colors={[PUBLIC_MAP.primaryDark, PUBLIC_MAP.primary, PUBLIC_MAP.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeChipGradient}
              >
                <Text style={[styles.filterText, styles.activeFilterText]}>All</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.filterText}>All</Text>
            )}
          </TouchableOpacity>
          {Object.entries(statusConfig).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, filterStatus === key && styles.activeFilterShell]}
              onPress={() => setFilterStatus(key)}
            >
              {filterStatus === key ? (
                <LinearGradient
                  colors={[PUBLIC_MAP.primaryDark, PUBLIC_MAP.primary, PUBLIC_MAP.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeChipGradient}
                >
                  <View style={[styles.colorDot, styles.activeColorDot, { backgroundColor: config.color }]} />
                  <Text style={[styles.filterText, styles.activeFilterText]}>
                    {config.label}
                  </Text>
                </LinearGradient>
              ) : (
                <>
                  <View style={[styles.colorDot, { backgroundColor: config.color }]} />
                  <Text style={styles.filterText}>
                    {config.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.phaseRow}>
          <TouchableOpacity style={[styles.phaseChip, selectedPhase === 'all' && styles.activePhaseShell]} onPress={() => setSelectedPhase('all')}>
            {selectedPhase === 'all' ? (
              <LinearGradient
                colors={[PUBLIC_MAP.primaryDark, PUBLIC_MAP.primary, PUBLIC_MAP.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeChipGradient}
              >
                <Text style={[styles.phaseText, styles.activePhaseText]}>All phases</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.phaseText}>All phases</Text>
            )}
          </TouchableOpacity>
          {phases.map((phase) => (
            <TouchableOpacity
              key={phase}
              style={[styles.phaseChip, selectedPhase === phase && styles.activePhaseShell]}
              onPress={() => setSelectedPhase(phase)}
            >
              {selectedPhase === phase ? (
                <LinearGradient
                  colors={[PUBLIC_MAP.primaryDark, PUBLIC_MAP.primary, PUBLIC_MAP.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeChipGradient}
                >
                  <Text style={[styles.phaseText, styles.activePhaseText]}>
                    Phase {phase}
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.phaseText}>
                  Phase {phase}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mapSection}>
          <LinearGradient
            colors={[PUBLIC_MAP.primaryDeep, PUBLIC_MAP.primaryDark, PUBLIC_MAP.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mapSectionHeader}
          >
            <View>
              <Text style={styles.mapSectionTitle}>
                {selectedPhase === 'all' ? 'ALL PHASES' : `PHASE ${selectedPhase}`}
              </Text>
              <Text style={styles.mapSectionSubtitle}>
                Swipe to explore. Use zoom controls to inspect lot positions.
              </Text>
            </View>
            <Text style={styles.mapResultCount}>{phaseFilteredLots.length} shown</Text>
          </LinearGradient>

          <View style={styles.mapZoomBar}>
            <TouchableOpacity
              style={[styles.mapZoomButton, mapZoom <= MIN_MAP_ZOOM && styles.mapZoomButtonDisabled]}
              onPress={zoomOut}
              disabled={mapZoom <= MIN_MAP_ZOOM}
              accessibilityLabel="Zoom map out"
            >
              <LinearGradient
                colors={[PUBLIC_MAP.primaryDark, PUBLIC_MAP.primary, PUBLIC_MAP.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mapZoomGradient}
              >
                <Ionicons name="remove" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapZoomReset}
              onPress={resetZoom}
              accessibilityLabel="Reset map zoom"
            >
              <Text style={styles.mapZoomText}>{Math.round(mapZoom * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mapZoomButton, mapZoom >= MAX_MAP_ZOOM && styles.mapZoomButtonDisabled]}
              onPress={zoomIn}
              disabled={mapZoom >= MAX_MAP_ZOOM}
              accessibilityLabel="Zoom map in"
            >
              <LinearGradient
                colors={[PUBLIC_MAP.primaryDark, PUBLIC_MAP.primary, PUBLIC_MAP.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mapZoomGradient}
              >
                <Ionicons name="add" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.mapScrollContent}
          >
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
                const isAmenity = lot.status === 'amenity';
                const isSelected = selectedLot?.lotId === lot.lotId;

                return (
                  <TouchableOpacity
                    key={lot.lotId || lot._id}
                    accessibilityLabel={`Phase ${lot.phase}, Block ${lot.block}, Lot ${lot.lotNumber}, ${cfg.label}`}
                    activeOpacity={isAmenity ? 1 : 0.7}
                    onPress={() => handleLotPress(lot)}
                    style={[
                      styles.mapLotSquare,
                      {
                        left: `${Number(position.left)}%`,
                        top: `${Number(position.top)}%`,
                        width: `${Number(position.width)}%`,
                        height: `${Number(position.height)}%`,
                        borderColor: isSelected && !isAmenity ? '#ffffff' : cfg.border,
                        backgroundColor: isAmenity ? 'rgba(100,116,139,0.28)' : `${cfg.color}38`,
                        transform: [{ rotate: `${Number(position.rotate) || 0}deg` }],
                        opacity: isAmenity ? 0.72 : 1,
                      },
                      isSelected && !isAmenity && styles.activeMapLotSquare,
                    ]}
                  >
                    <Text
                      style={[
                        styles.mapLotLabel,
                        {
                          color: isSelected && !isAmenity ? '#ffffff' : cfg.color,
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
        </View>

        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Legend:</Text>
          {Object.entries(statusConfig).map(([key, config]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: config.color }]} />
              <Text style={styles.legendText}>{config.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.registerCta} onPress={() => navigation.navigate('Register')}>
          <LinearGradient
            colors={[PUBLIC_MAP.primaryDark, PUBLIC_MAP.primary, PUBLIC_MAP.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.registerCtaGradient}
          >
            <Ionicons name="home" size={24} color="white" />
            <Text style={styles.registerCtaText}>Register as Resident</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ========== Lot Details Sheet ========== */}
      {showLotModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lot Details</Text>
              <TouchableOpacity onPress={() => setShowLotModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedLot && (
              <ScrollView>
                <View style={styles.lotDetailHeader}>
                  <Text style={styles.lotDetailTitle}>
                    Lot {selectedLot.lotNumber} - Block {selectedLot.block}
                  </Text>
                  <View style={[styles.lotStatusBadge, { backgroundColor: getStatusConfig(selectedLot.status).bg }]}>
                    <Ionicons name={getStatusConfig(selectedLot.status).icon} size={16} color={getStatusConfig(selectedLot.status).color} />
                    <Text style={[styles.lotStatusText, { color: getStatusConfig(selectedLot.status).color }]}>
                      {getStatusConfig(selectedLot.status).label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.lotAddress}>{selectedLot.address}</Text>

                <View style={styles.lotDetailGrid}>
                  <View style={styles.lotDetailItem}>
                    <Text style={styles.lotDetailLabel}>Type</Text>
                    <Text style={styles.lotDetailValue}>{selectedLot.type}</Text>
                  </View>
                  <View style={styles.lotDetailItem}>
                    <Text style={styles.lotDetailLabel}>Area</Text>
                    <Text style={styles.lotDetailValue}>{selectedLot.sqm} sqm</Text>
                  </View>
                </View>

                {selectedLot.status !== 'amenity' && selectedLot.price && (
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>₱{(selectedLot.price / 1000000).toFixed(2)}M</Text>
                    <Text style={styles.priceNote}>from</Text>
                  </View>
                )}

                {selectedLot.features && selectedLot.features.length > 0 && (
                  <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Features</Text>
                    <View style={styles.featureList}>
                      {selectedLot.features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={16} color={statusConfig.vacant.color} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.lotActions}>
                  {selectedLot.status === 'vacant' && (
                    <TouchableOpacity
                      style={[styles.lotButton, styles.tourButton]}
                      onPress={() => handleStartTour(selectedLot)}
                    >
                      <Ionicons name="play" size={20} color="white" />
                      <Text style={styles.lotButtonText}>Virtual Tour</Text>
                    </TouchableOpacity>
                  )}
                  {selectedLot.status === 'vacant' && (
                    <TouchableOpacity
                      style={[styles.lotButton, styles.registerButton]}
                      onPress={handleRegister}
                    >
                      <Ionicons name="home" size={20} color="white" />
                      <Text style={styles.lotButtonText}>Register</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedLot.status === 'occupied' && (
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>Occupied - Contact Admin</Text>
                  </View>
                )}

                {selectedLot.status === 'reserved' && (
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>Reserved - Contact Admin</Text>
                  </View>
                )}

                {selectedLot.status === 'amenity' && (
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>Community Amenity - Not available for registration or virtual tour</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* ========== VIRTUAL TOUR MODAL ========== */}
      <Modal
        visible={showTourModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseTour}
      >
        <View style={styles.tourContainer}>
          {/* Tour Header */}
          <View style={styles.tourHeader}>
            <TouchableOpacity
              onPress={handleCloseTour}
              style={styles.tourCloseButton}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.tourTitle}>
              {selectedLot && `Block ${selectedLot.block} - Lot ${selectedLot.lotNumber}`}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Image Container */}
          <View style={styles.tourImageContainer}>
            <Image
              source={{ uri: getTourPhotos()[tourPhotoIndex] }}
              style={styles.tourImage}
            />
            
            {/* Left Navigation Arrow */}
            <TouchableOpacity
              style={styles.tourNavLeft}
              onPress={() => {
                setIsAutoPlaying(false);
                handleTourPrevPhoto();
              }}
            >
              <Ionicons name="chevron-back" size={32} color="white" />
            </TouchableOpacity>

            {/* Right Navigation Arrow */}
            <TouchableOpacity
              style={styles.tourNavRight}
              onPress={() => {
                setIsAutoPlaying(false);
                handleTourNextPhoto();
              }}
            >
              <Ionicons name="chevron-forward" size={32} color="white" />
            </TouchableOpacity>

            {/* Image Overlay */}
            <View style={styles.tourImageOverlay}>
              <Text style={styles.tourLotInfo}>
                {tourPhotoCategories[activeTourTab]?.label}
              </Text>
              <View style={styles.tourPhotoCounter}>
                <Text style={styles.tourPhotoText}>
                  {tourPhotoIndex + 1} / {getTourPhotos().length}
                </Text>
              </View>
            </View>
          </View>

          {/* Tour Tabs */}
          <View style={styles.tourTabs}>
            {Object.entries(tourPhotoCategories).map(([key, category]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tourTab,
                  activeTourTab === key && styles.activeTourTab,
                ]}
                onPress={() => handleTourTabChange(key)}
              >
                <Text style={{ fontSize: 18, marginRight: 4 }}>{category.emoji}</Text>
                <Text
                  style={[
                    styles.tourTabText,
                    activeTourTab === key && styles.activeTourTabText,
                  ]}
                  numberOfLines={1}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tour Info Section */}
          {selectedLot && (
            <ScrollView style={styles.tourInfo}>
              <Text style={styles.tourInfoTitle}>Property Details</Text>
              
              <View style={styles.tourInfoGrid}>
                <View style={styles.tourInfoItem}>
                  <Text style={styles.tourInfoLabel}>Block</Text>
                  <Text style={styles.tourInfoValue}>{selectedLot.block}</Text>
                </View>
                <View style={styles.tourInfoItem}>
                  <Text style={styles.tourInfoLabel}>Lot Number</Text>
                  <Text style={styles.tourInfoValue}>{selectedLot.lotNumber}</Text>
                </View>
                <View style={styles.tourInfoItem}>
                  <Text style={styles.tourInfoLabel}>Area</Text>
                  <Text style={styles.tourInfoValue}>{selectedLot.sqm} sqm</Text>
                </View>
                <View style={styles.tourInfoItem}>
                  <Text style={styles.tourInfoLabel}>Type</Text>
                  <Text style={styles.tourInfoValue}>{selectedLot.type}</Text>
                </View>
                {selectedLot.price && (
                  <View style={styles.tourInfoItem}>
                    <Text style={styles.tourInfoLabel}>Price</Text>
                    <Text style={[styles.tourInfoValue, styles.tourPrice]}>
                      ₱{(selectedLot.price / 1000000).toFixed(2)}M
                    </Text>
                  </View>
                )}
              </View>

              {selectedLot.status === 'vacant' && (
                <TouchableOpacity
                  style={styles.tourRegisterButton}
                  onPress={() => {
                    handleCloseTour();
                    handleRegister();
                  }}
                >
                  <Ionicons name="home" size={20} color="white" />
                  <Text style={styles.tourRegisterText}>Register for This Lot</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PUBLIC_MAP.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: themeColors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    borderRadius: 18,
    height: 48,
    borderWidth: 1,
    borderColor: PUBLIC_MAP.border,
    ...shadows.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: themeColors.textPrimary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.error + '12',
    borderWidth: 1,
    borderColor: themeColors.error + '25',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorBannerText: { flex: 1, color: themeColors.error, fontWeight: '700', fontSize: 12 },
  errorBannerBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: themeColors.error, borderRadius: 8 },
  errorBannerBtnText: { color: 'white', fontWeight: '900', fontSize: 12 },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: PUBLIC_MAP.pageBg,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PUBLIC_MAP.border,
    ...shadows.small,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: themeColors.primaryDeep,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: PUBLIC_MAP.border,
  },
  activeFilterShell: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  activeChipGradient: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  activeFilterText: {
    color: 'white',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeColorDot: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  phaseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  phaseChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: PUBLIC_MAP.border,
    marginRight: 8,
    marginBottom: 8,
  },
  activePhaseShell: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  activePhaseText: {
    color: 'white',
  },
  mapSection: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: PUBLIC_MAP.border,
    ...shadows.medium,
  },
  mapSectionHeader: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapSectionTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  mapSectionSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    marginTop: 3,
  },
  mapResultCount: {
    color: PUBLIC_MAP.primaryLight,
    fontSize: 11,
    fontWeight: '900',
  },
  mapZoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  mapZoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapZoomGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapZoomButtonDisabled: {
    opacity: 0.4,
  },
  mapZoomReset: {
    minWidth: 64,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PUBLIC_MAP.wash,
    borderWidth: 1,
    borderColor: PUBLIC_MAP.border,
  },
  mapZoomText: {
    color: PUBLIC_MAP.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  mapScrollContent: {
    backgroundColor: '#EFFDF5',
  },
  mapCanvas: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F7F8F5',
  },
  mapPlanImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  mapLotSquare: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 3,
    minWidth: 3,
    minHeight: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMapLotSquare: {
    borderWidth: 2,
    elevation: 5,
    shadowColor: PUBLIC_MAP.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  mapLotLabel: {
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  mapContainer: {
    marginBottom: 24,
  },
  blockContainer: {
    marginBottom: 20,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  blockCount: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  lotRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lotBox: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  lotNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  lotSqm: {
    fontSize: 10,
    marginTop: 4,
  },
  vacantIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  legendContainer: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PUBLIC_MAP.border,
    padding: 14,
    ...shadows.small,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    color: PUBLIC_MAP.primaryDeep,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: PUBLIC_MAP.muted,
    fontWeight: '700',
  },
  registerCta: {
    borderRadius: 999,
    marginBottom: 20,
    overflow: 'hidden',
    ...shadows.medium,
  },
  registerCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  registerCtaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    elevation: 20,
    backgroundColor: 'white',
    paddingTop: 60,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  lotDetailHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  lotDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  lotStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  lotStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  lotAddress: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  lotDetailGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  lotDetailItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  lotDetailLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginBottom: 4,
  },
  lotDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  priceContainer: {
    backgroundColor: themeColors.success + '10',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.success + '30',
  },
  priceLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: themeColors.success,
  },
  priceNote: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  featuresContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginBottom: 8,
  },
  featureList: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: themeColors.textPrimary,
    marginLeft: 8,
  },
  lotActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  lotButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
  },
  tourButton: {
    backgroundColor: '#007A18',
  },
  registerButton: {
    backgroundColor: themeColors.success,
  },
  lotButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  qrContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },

  // ========== VIRTUAL TOUR STYLES ==========
  tourContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  tourHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tourCloseButton: {
    padding: 8,
  },
  tourTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  tourImageContainer: {
    height: 320,
    position: 'relative',
    backgroundColor: '#000',
  },
  tourImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tourNavLeft: {
    position: 'absolute',
    left: 16,
    top: '50%',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourNavRight: {
    position: 'absolute',
    right: 16,
    top: '50%',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tourLotInfo: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tourPhotoCounter: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tourPhotoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  tourTabs: {
    flexDirection: 'row',
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  tourTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activeTourTab: {
    backgroundColor: '#007A18' + '30',
  },
  tourTabText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  activeTourTabText: {
    color: '#007A18',
    fontWeight: '600',
  },
  tourInfo: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tourInfoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tourInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tourInfoItem: {
    width: '50%',
    marginBottom: 16,
    paddingRight: 8,
  },
  tourInfoLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  tourInfoValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tourPrice: {
    color: '#00D084',
  },
  tourRegisterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D084',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  tourRegisterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PublicLotMapScreen;
