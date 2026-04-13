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
import { themeColors, shadows } from '../utils/theme';
import QRCode from 'react-native-qrcode-svg';
<<<<<<< HEAD
import UserDropdownMenu from '../components/UserDropdownMenu';
=======
import LogoutButton from '../components/LogoutButton';
import api from '../utils/api';
>>>>>>> a2315937814b40845a08a607b5edc073a9d96f14

const { width } = Dimensions.get('window');

const PublicLotMapScreen = ({ navigation }) => {
  const [selectedLot, setSelectedLot] = useState(null);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  
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

  const stats = useMemo(() => ({
    vacant: lots.filter(l => l.status === 'vacant').length,
    occupied: lots.filter(l => l.status === 'occupied').length,
    reserved: lots.filter(l => l.status === 'reserved').length,
    total: lots.length,
  }), [lots]);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const matchesStatus = filterStatus === 'all' || lot.status === filterStatus;
      const matchesSearch = searchQuery === '' || 
        String(lot.lotId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.block.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [lots, filterStatus, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLots();
  };

  const statusConfig = {
    vacant: { color: '#22c55e', bg: '#dcfce7', label: 'Vacant', icon: 'checkmark-circle' },
    occupied: { color: '#ef4444', bg: '#fee2e2', label: 'Occupied', icon: 'close-circle' },
    reserved: { color: '#f59e0b', bg: '#fef3c7', label: 'Reserved', icon: 'time' },
  };

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
    const config = statusConfig[item.status];
    
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Westville Lot Map</Text>
        <UserDropdownMenu navigation={navigation} />
      </View>

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

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
            style={[styles.filterChip, filterStatus === 'all' && styles.activeFilter]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterText, filterStatus === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          {Object.entries(statusConfig).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, filterStatus === key && styles.activeFilter]}
              onPress={() => setFilterStatus(key)}
            >
              <View style={[styles.colorDot, { backgroundColor: config.color }]} />
              <Text style={[styles.filterText, filterStatus === key && styles.activeFilterText]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mapContainer}>
          {['A', 'B', 'C', 'D', 'E'].map(block => {
            const blockLots = filteredLots.filter(l => l.block === block);
            if (blockLots.length === 0) return null;
            
            return (
              <View key={block} style={styles.blockContainer}>
                <View style={styles.blockHeader}>
                  <Text style={styles.blockTitle}>Block {block}</Text>
                  <Text style={styles.blockCount}>
                    {blockLots.filter(l => l.status === 'vacant').length} available
                  </Text>
                </View>
                <FlatList
                  data={blockLots}
                  renderItem={renderLotBox}
                  keyExtractor={(item) => String(item?._id || item?.lotId || `${item?.block || 'X'}-${item?.lotNumber || '0'}`)}
                  numColumns={4}
                  columnWrapperStyle={styles.lotRow}
                  scrollEnabled={false}
                />
              </View>
            );
          })}
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
          <Ionicons name="home" size={24} color="white" />
          <Text style={styles.registerCtaText}>Register as Resident</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ========== Lot Details Modal ========== */}
      <Modal
        visible={showLotModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLotModal(false)}
      >
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
                  <View style={[styles.lotStatusBadge, { backgroundColor: statusConfig[selectedLot.status].bg }]}>
                    <Ionicons name={statusConfig[selectedLot.status].icon} size={16} color={statusConfig[selectedLot.status].color} />
                    <Text style={[styles.lotStatusText, { color: statusConfig[selectedLot.status].color }]}>
                      {statusConfig[selectedLot.status].label}
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

                {selectedLot.price && (
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
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#f8fafc',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: themeColors.primary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
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
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeFilter: {
    backgroundColor: themeColors.primary + '20',
    borderColor: themeColors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  activeFilterText: {
    color: themeColors.primary,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
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
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: themeColors.textPrimary,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  registerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.success,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  registerCtaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
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
    backgroundColor: '#3b82f6',
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
    backgroundColor: '#3b82f6' + '30',
  },
  tourTabText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  activeTourTabText: {
    color: '#3b82f6',
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
    color: '#22c55e',
  },
  tourRegisterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
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