import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, IconButton,
  TextField, InputAdornment, Alert, CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  HowToReg as RegisterIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Photo banks ─────────────────────────────────────────────────────────────
const OUTSIDE_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1400&q=85', caption: 'Front Facade' },
  { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&q=85', caption: 'Side Elevation' },
  { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=85', caption: 'Garden & Driveway' },
  { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&q=85', caption: 'Rear View' },
  { url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1400&q=85', caption: 'Main Entrance' },
  { url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1400&q=85', caption: 'Night Exterior' },
];

const INSIDE_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&q=85', caption: 'Living Room' },
  { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&q=85', caption: 'Modern Kitchen' },
  { url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1400&q=85', caption: 'Master Bedroom' },
  { url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1400&q=85', caption: 'Bathroom' },
  { url: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1400&q=85', caption: 'Dining Area' },
  { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1400&q=85', caption: 'Second Bedroom' },
];

const SURROUNDINGS_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1400&q=85', caption: 'Village Street View' },
  { url: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1400&q=85', caption: 'Neighborhood Park' },
  { url: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=1400&q=85', caption: 'Community Amenities' },
  { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1400&q=85', caption: 'Aerial Overview' },
  { url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=85', caption: 'Nearby Commercial Area' },
  { url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1400&q=85', caption: 'Green Spaces' },
];

const VIEW_TABS = [
  { key: 'outside',      label: 'Outside',      emoji: '🏠', photos: OUTSIDE_PHOTOS,      color: '#4ade80', desc: 'Exterior & garden views' },
  { key: 'inside',       label: 'Inside',       emoji: '🛋️', photos: INSIDE_PHOTOS,       color: '#60a5fa', desc: 'Interior rooms & layout' },
  { key: 'surroundings', label: 'Surroundings', emoji: '🌳', photos: SURROUNDINGS_PHOTOS, color: '#fbbf24', desc: 'Neighborhood & amenities' },
];

const STATUS_CONFIG = {
  vacant:   { color: '#22c55e', bg: '#dcfce7', label: 'Vacant',   border: '#16a34a' },
  occupied: { color: '#ef4444', bg: '#fee2e2', label: 'Occupied', border: '#dc2626' },
  reserved: { color: '#f59e0b', bg: '#fef3c7', label: 'Reserved', border: '#d97706' },
};

const MAP_CENTER = [14.4435299, 120.9667736];
const BLOCK_CENTER_COORDS = {
  1: [14.441389, 120.970833],
  2: [14.442778, 120.967778],
  3: [14.440278, 120.969167],
  4: [14.443, 120.9683],
  5: [14.4415, 120.9672],
};

const BLOCK_LAYOUTS = {
  1: { center: BLOCK_CENTER_COORDS[1], rows: 4, cols: 5, orientation: 'horizontal', latStep: 0.000225, lngStep: 0.00028 },
  2: { center: BLOCK_CENTER_COORDS[2], rows: 5, cols: 4, orientation: 'vertical', latStep: 0.00020, lngStep: 0.00030 },
  3: { center: BLOCK_CENTER_COORDS[3], rows: 4, cols: 5, orientation: 'horizontal', latStep: 0.000240, lngStep: 0.00023 },
  4: { center: BLOCK_CENTER_COORDS[4], rows: 4, cols: 5, orientation: 'horizontal', latStep: 0.000210, lngStep: 0.00026 },
  5: { center: BLOCK_CENTER_COORDS[5], rows: 5, cols: 4, orientation: 'vertical', latStep: 0.000210, lngStep: 0.00029 },
};

const generateLotsFromAPI = (apiLots) => {
  if (!apiLots || apiLots.length === 0) return [];
  
  return apiLots.map(lot => ({
    id: lot.lotId,
    phase: lot.phase,
    block: lot.block,
    lotNumber: lot.lotNumber,
    status: lot.status,
    type: lot.type,
    sqm: lot.sqm,
    price: lot.price,
    address: lot.address,
    features: lot.features || [],
    photoSeed: lot.photoSeed || 0,
    occupiedBy: lot.occupiedBy
  }));
};

// ─── Virtual Tour Viewer ──────────────────────────────────────────────────────
const VirtualTourViewer = ({ lot, onClose, onRegister }) => {
  const [activeTab, setActiveTab] = useState('outside');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const intervalRef = useRef(null);

  const tabData = VIEW_TABS.find(t => t.key === activeTab) || VIEW_TABS[0];

  // Offset by lot seed so photos vary per lot
  const photos = tabData.photos.map((_, i) =>
    tabData.photos[(i + (lot.photoSeed || 0)) % tabData.photos.length]
  );
  const currentPhoto = photos[photoIndex] || photos[0];

  const changePhoto = useCallback((newIndex) => {
    if (transitioning) return;
    setTransitioning(true);
    setImageLoaded(false);
    setTimeout(() => { 
      setPhotoIndex(newIndex); 
      setTransitioning(false); 
    }, 200);
  }, [transitioning]);

  const goNext = useCallback(() => {
    changePhoto((photoIndex + 1) % photos.length);
  }, [changePhoto, photoIndex, photos.length]);

  const goPrev = useCallback(() => {
    changePhoto((photoIndex - 1 + photos.length) % photos.length);
  }, [changePhoto, photoIndex, photos.length]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(goNext, 3200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, goNext]);

  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    setPhotoIndex(0);
    setImageLoaded(false);
    setIsPlaying(false);
  }, []);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  const cfg = STATUS_CONFIG[lot.status] || STATUS_CONFIG.vacant;

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 1400,
      backgroundColor: 'rgba(0,0,0,0.95)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        px: { xs: 2, md: 4 }, py: 1.5,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={onClose} size="small" sx={{
            color: 'white', backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
          }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1 }}>
              🎥 Virtual Tour — {lot.id}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.68rem' }}>
              {lot.address}
            </Typography>
          </Box>
          <Chip label={cfg.label} size="small" sx={{
            backgroundColor: cfg.color + '22', color: cfg.color,
            border: `1px solid ${cfg.color}45`, fontWeight: 700, fontSize: '0.65rem',
            display: { xs: 'none', sm: 'flex' },
          }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {lot.status === 'vacant' && (
            <Button variant="contained" size="small" onClick={onRegister}
              startIcon={<RegisterIcon />}
              sx={{
                backgroundColor: '#3b82f6', color: 'white', fontWeight: 700,
                borderRadius: 5, textTransform: 'none', fontSize: '0.75rem',
                '&:hover': { backgroundColor: '#2563eb' },
                display: { xs: 'none', sm: 'flex' },
              }}>
              Register for This Lot
            </Button>
          )}
          <IconButton onClick={onClose} size="small"
            sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Main Photo Area */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Box component="img"
          src={currentPhoto.url}
          alt={currentPhoto.caption}
          onLoad={() => setImageLoaded(true)}
          sx={{
            width: '100%', height: '100%',
            objectFit: isFullscreen ? 'contain' : 'cover',
            opacity: transitioning || !imageLoaded ? 0 : 1,
            transition: 'opacity 0.3s ease',
            position: 'absolute', inset: 0,
            backgroundColor: '#050d02',
          }}
        />

        {(!imageLoaded || transitioning) && (
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, #0a1a05 25%, #111f08 50%, #0a1a05 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.3s infinite linear',
            '@keyframes shimmer': {
              '0%': { backgroundPosition: '200% 0' },
              '100%': { backgroundPosition: '-200% 0' },
            },
          }} />
        )}

        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.45) 100%)',
        }} />

        <IconButton onClick={goPrev} sx={{
          position: 'absolute', left: { xs: 8, md: 24 }, top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(0,0,0,0.5)', color: 'white',
          border: '1px solid rgba(255,255,255,0.15)',
          width: { xs: 42, md: 56 }, height: { xs: 42, md: 56 },
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)', transform: 'translateY(-50%) scale(1.07)' },
          transition: 'all 0.18s',
        }}>
          <PrevIcon sx={{ fontSize: { xs: 22, md: 30 } }} />
        </IconButton>

        <IconButton onClick={goNext} sx={{
          position: 'absolute', right: { xs: 8, md: 24 }, top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(0,0,0,0.5)', color: 'white',
          border: '1px solid rgba(255,255,255,0.15)',
          width: { xs: 42, md: 56 }, height: { xs: 42, md: 56 },
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)', transform: 'translateY(-50%) scale(1.07)' },
          transition: 'all 0.18s',
        }}>
          <NextIcon sx={{ fontSize: { xs: 22, md: 30 } }} />
        </IconButton>

        {/* Bottom info bar */}
        <Box sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          px: { xs: 2, md: 5 }, py: { xs: 2, md: 3 },
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2,
        }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: tabData.color,
                boxShadow: `0 0 10px ${tabData.color}`,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }} />
              <Typography sx={{ color: tabData.color, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em' }}>
                {tabData.label.toUpperCase()} VIEW
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem' }}>
                · {tabData.desc}
              </Typography>
            </Box>

            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.5rem' }, mb: 1 }}>
              {currentPhoto.caption}
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.7, alignItems: 'center' }}>
              {photos.map((_, i) => (
                <Box key={i} onClick={() => changePhoto(i)} sx={{
                  width: i === photoIndex ? 22 : 6, height: 6, borderRadius: 3,
                  backgroundColor: i === photoIndex ? tabData.color : 'rgba(255,255,255,0.25)',
                  cursor: 'pointer', transition: 'all 0.25s ease',
                  '&:hover': { backgroundColor: tabData.color + '99' },
                }} />
              ))}
              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', ml: 1 }}>
                {photoIndex + 1} / {photos.length}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <IconButton onClick={() => setIsPlaying(p => !p)} size="small" sx={{
              backgroundColor: isPlaying ? tabData.color : 'rgba(255,255,255,0.12)',
              color: isPlaying ? '#052e16' : 'white',
              border: `1px solid ${isPlaying ? tabData.color : 'rgba(255,255,255,0.18)'}`,
              '&:hover': { backgroundColor: tabData.color, color: '#052e16' },
              transition: 'all 0.2s',
            }}>
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
            </IconButton>
            <IconButton onClick={() => setIsFullscreen(f => !f)} size="small" sx={{
              backgroundColor: 'rgba(255,255,255,0.12)', color: 'white',
              border: '1px solid rgba(255,255,255,0.18)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
            }}>
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        {/* Thumbnail filmstrip */}
        <Box sx={{
          position: 'absolute', bottom: 80, left: '50%',
          transform: 'translateX(-50%)',
          display: { xs: 'none', lg: 'flex' },
          gap: 1, px: 2, py: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          borderRadius: 3, backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {photos.map((photo, i) => (
            <Box key={i} onClick={() => changePhoto(i)} sx={{
              width: 60, height: 40, borderRadius: 1.5, overflow: 'hidden',
              cursor: 'pointer', flexShrink: 0,
              border: i === photoIndex ? `2px solid ${tabData.color}` : '2px solid rgba(255,255,255,0.1)',
              opacity: i === photoIndex ? 1 : 0.5,
              transition: 'all 0.2s',
              '&:hover': { opacity: 1, transform: 'scale(1.08)' },
            }}>
              <Box component="img"
                src={photo.url.replace('w=1400', 'w=120')}
                alt={photo.caption}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* View Tabs */}
      <Box sx={{
        backgroundColor: 'rgba(5,14,2,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
      }}>
        {VIEW_TABS.map((tab) => (
          <Box key={tab.key} onClick={() => handleTabChange(tab.key)} sx={{
            flex: 1, py: { xs: 1.4, md: 2 },
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3,
            cursor: 'pointer', position: 'relative',
            borderTop: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
            backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.04)' : 'transparent',
            transition: 'all 0.2s',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
          }}>
            <Typography sx={{ fontSize: { xs: '1.4rem', md: '1.7rem' }, lineHeight: 1 }}>
              {tab.emoji}
            </Typography>
            <Typography sx={{
              fontSize: { xs: '0.62rem', md: '0.75rem' }, fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? tab.color : 'rgba(255,255,255,0.38)',
              letterSpacing: '0.05em', transition: 'color 0.2s',
            }}>
              {tab.label}
            </Typography>
            {activeTab === tab.key && (
              <Typography sx={{
                fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)',
                display: { xs: 'none', md: 'block' },
              }}>
                {tab.desc}
              </Typography>
            )}
          </Box>
        ))}

        <Box sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center', gap: 3, px: 4,
          borderLeft: '1px solid rgba(255,255,255,0.07)', ml: 1,
        }}>
          {[
            { l: 'Area',  v: `${lot.sqm} sqm` },
            { l: 'Type',  v: lot.type },
            ...(lot.price ? [{ l: 'From', v: `₱${(lot.price / 1000000).toFixed(1)}M` }] : []),
          ].map(({ l, v }) => (
            <Box key={l} sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.58rem', letterSpacing: '0.1em' }}>
                {l.toUpperCase()}
              </Typography>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>{v}</Typography>
            </Box>
          ))}
          {lot.status === 'vacant' && (
            <Button variant="contained" onClick={onRegister} size="small"
              sx={{
                backgroundColor: '#3b82f6', color: 'white', fontWeight: 700,
                borderRadius: 5, textTransform: 'none', fontSize: '0.72rem', ml: 1,
                '&:hover': { backgroundColor: '#2563eb' },
              }}>
              Register
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};


// ─── Side Detail Panel ────────────────────────────────────────────────────────
const LotDetailPanel = ({ lot, onClose, onRegister, onTour }) => {
  if (!lot) return null;
  const cfg = STATUS_CONFIG[lot.status] || STATUS_CONFIG.vacant;

  return (
    <Box sx={{
      position: 'fixed', right: 0, top: 0, bottom: 0,
      width: { xs: '100vw', sm: 360 }, zIndex: 300,
      background: 'linear-gradient(170deg, #0d2205 0%, #1a3a0a 100%)',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '-12px 0 50px rgba(0,0,0,0.55)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.22s ease',
      '@keyframes slideIn': {
        from: { transform: 'translateX(100%)' },
        to:   { transform: 'translateX(0)' },
      },
    }}>
      {/* Preview image */}
      <Box sx={{ height: 200, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <Box component="img"
          src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=700&q=80"
          alt="House"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, #0d2205 100%)',
        }} />
        <IconButton onClick={onClose} size="small" sx={{
          position: 'absolute', top: 10, right: 10,
          backgroundColor: 'rgba(0,0,0,0.55)', color: 'white',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
        }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Chip label={cfg.label} size="small" sx={{
          position: 'absolute', top: 10, left: 10,
          backgroundColor: cfg.color + '28', color: cfg.color,
          border: `1px solid ${cfg.color}55`, fontWeight: 700, fontSize: '0.68rem',
        }} />
      </Box>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.35rem', mb: 0.3 }}>
          Lot {lot.lotNumber} — Block {lot.block}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.73rem', mb: 2.5 }}>
          {lot.address}
        </Typography>

        {/* Stats grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2.5 }}>
          {[
            { l: 'Lot Area', v: `${lot.sqm} sqm`, e: '📐' },
            { l: 'Type',     v: lot.type,          e: '🏠' },
            { l: 'Block',    v: `Block ${lot.block}`, e: '🗺️' },
            { l: 'Lot No.', v: `Lot ${lot.lotNumber}`, e: '🔢' },
          ].map(({ l, v, e }) => (
            <Box key={l} sx={{
              p: 1.5, borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem', mb: 0.3 }}>
                {e} {l}
              </Typography>
              <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>{v}</Typography>
            </Box>
          ))}
        </Box>

        {/* Price */}
        {lot.price && (
          <Box sx={{
            p: 2, borderRadius: 2, mb: 2.5, textAlign: 'center',
            backgroundColor: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
          }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.62rem', mb: 0.3 }}>
              STARTING PRICE
            </Typography>
            <Typography sx={{ color: '#60a5fa', fontWeight: 800, fontSize: '1.45rem' }}>
              ₱{lot.price.toLocaleString()}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.62rem' }}>
              Contact admin for final pricing & terms
            </Typography>
          </Box>
        )}

        {/* Features */}
        {lot.features && lot.features.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 2 }}>
            {lot.features.map(f => (
              <Chip key={f} label={f} size="small" sx={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.6)', fontSize: '0.62rem',
                border: '1px solid rgba(255,255,255,0.09)',
              }} />
            ))}
          </Box>
        )}

        {/* Occupied info */}
        {lot.status === 'occupied' && lot.occupiedBy && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Typography variant="caption" sx={{ color: '#ef4444' }}>
              This lot is already occupied and not available for registration.
            </Typography>
          </Alert>
        )}

        <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', lineHeight: 1.65, mt: 2 }}>
          To claim this lot, register as a resident. Your selected lot will be reserved pending admin approval.
        </Typography>
      </Box>

      {/* Action buttons */}
      <Box sx={{
        px: 3, pb: 3, pt: 2,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', gap: 1.2,
      }}>
        <Button fullWidth variant="outlined"
          onClick={() => onTour(lot)}
          sx={{
            borderColor: 'rgba(255,255,255,0.18)', color: 'white',
            borderRadius: 2, textTransform: 'none', fontWeight: 600,
            py: 1.1, fontSize: '0.88rem',
            '&:hover': { borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.04)' },
          }}>
          🎥 &nbsp; Start Virtual Tour
        </Button>
        {lot.status === 'vacant' && (
          <Button fullWidth variant="contained"
            startIcon={<RegisterIcon />}
            onClick={onRegister}
            sx={{
              backgroundColor: '#3b82f6', color: 'white', fontWeight: 700,
              borderRadius: 2, textTransform: 'none', py: 1.2, fontSize: '0.9rem',
              '&:hover': { backgroundColor: '#2563eb' },
              boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
            }}>
            Register for This Lot
          </Button>
        )}
      </Box>
    </Box>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PublicLotMap = () => {
  const navigate = useNavigate();
  const [allLots, setAllLots] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [tourLot, setTourLot] = useState(null);
  const [mapZoom, setMapZoom] = useState(17);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(1);

  // Fetch lots from API
  useEffect(() => {
    const fetchLots = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/lots');
        if (response.data.success) {
          const lots = generateLotsFromAPI(response.data.data);
          setAllLots(lots);
        } else {
          setError('Failed to load lots data');
        }
      } catch (error) {
        console.error('Error fetching lots:', error);
        setError(error.response?.data?.error || 'Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLots();
  }, []);

  const stats = useMemo(() => ({
    vacant:   allLots.filter(l => l.status === 'vacant').length,
    occupied: allLots.filter(l => l.status === 'occupied').length,
    reserved: allLots.filter(l => l.status === 'reserved').length,
    total:    allLots.length,
  }), [allLots]);

  const phaseFilteredLots = useMemo(() => {
    const s = search.toLowerCase();
    return allLots.filter((lot) => {
      const matchesPhase = (lot.phase || 1) === selectedPhase;
      const matchesStatus = filterStatus === 'all' || lot.status === filterStatus;
      const matchesSearch = !s || lot.id.toLowerCase().includes(s) || lot.block.toLowerCase().includes(s);
      return matchesPhase && matchesStatus && matchesSearch;
    });
  }, [allLots, filterStatus, search, selectedPhase]);

  const lotCoordinates = useMemo(() => {
    const coords = {};
    const blockLots = {};

    phaseFilteredLots.forEach((lot) => {
      if (!blockLots[lot.block]) blockLots[lot.block] = [];
      blockLots[lot.block].push(lot);
    });

    Object.entries(blockLots).forEach(([block, lots]) => {
      lots.sort((a, b) => a.lotNumber - b.lotNumber);
      const layout = BLOCK_LAYOUTS[block] || {
        center: BLOCK_CENTER_COORDS[block] || MAP_CENTER,
        rows: 4,
        cols: 5,
        orientation: 'horizontal',
        latStep: 0.00024,
        lngStep: 0.00028,
      };

      const startLat = -(layout.orientation === 'horizontal' ? ((layout.rows - 1) / 2) * layout.latStep : ((layout.cols - 1) / 2) * layout.latStep);
      const startLng = -(layout.orientation === 'horizontal' ? ((layout.cols - 1) / 2) * layout.lngStep : ((layout.rows - 1) / 2) * layout.lngStep);

      lots.forEach((lot, index) => {
        const row = Math.floor(index / layout.cols);
        const col = index % layout.cols;
        const lat = layout.center[0] + startLat + (layout.orientation === 'horizontal' ? row * layout.latStep : col * layout.latStep);
        const lng = layout.center[1] + startLng + (layout.orientation === 'horizontal' ? col * layout.lngStep : row * layout.lngStep);
        coords[lot.id] = [lat, lng];
      });
    });

    return coords;
  }, [phaseFilteredLots]);

  const lotBoxes = useMemo(() => {
    const boxes = [];
    const blockLots = {};

    phaseFilteredLots.forEach((lot) => {
      if (!blockLots[lot.block]) blockLots[lot.block] = [];
      blockLots[lot.block].push(lot);
    });

    Object.entries(blockLots).forEach(([block, lots]) => {
      lots.sort((a, b) => a.lotNumber - b.lotNumber);
      const layout = BLOCK_LAYOUTS[block] || {
        center: BLOCK_CENTER_COORDS[block] || MAP_CENTER,
        rows: 4,
        cols: 5,
        orientation: 'horizontal',
        latStep: 0.00024,
        lngStep: 0.00028,
      };

      const topLeftLat = layout.center[0] + (layout.orientation === 'horizontal'
        ? ((layout.rows - 1) / 2) * layout.latStep
        : ((layout.cols - 1) / 2) * layout.latStep);
      const topLeftLng = layout.center[1] - (layout.orientation === 'horizontal'
        ? ((layout.cols - 1) / 2) * layout.lngStep
        : ((layout.rows - 1) / 2) * layout.lngStep);

      lots.forEach((lot, index) => {
        const row = Math.floor(index / layout.cols);
        const col = index % layout.cols;

        const lotLat = topLeftLat - (layout.orientation === 'horizontal' ? row * layout.latStep : col * layout.latStep);
        const lotLng = topLeftLng + (layout.orientation === 'horizontal' ? col * layout.lngStep : row * layout.lngStep);

        const north = lotLat;
        const south = lotLat - layout.latStep;
        const west = lotLng;
        const east = lotLng + layout.lngStep;
        boxes.push({ lot, bounds: [[north, west], [south, east]] });
      });
    });

    return boxes;
  }, [phaseFilteredLots]);

  const handleRegister = (lot) => {
    const l = lot || selectedLot;
    if (l && l.status === 'vacant') {
      navigate(`/register?lot=${l.lotNumber}&block=${l.block}`);
    } else if (l && l.status !== 'vacant') {
      alert('This lot is not available for registration.');
    }
  };

  const vacantLots = allLots.filter(l => l.status === 'vacant');
  const featuredLots = vacantLots.slice(0, 3);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(160deg, #07101f 0%, #10203a 40%, #1c2f48 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
        <Typography sx={{ color: 'white' }}>Loading village map...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(160deg, #07101f 0%, #10203a 40%, #1c2f48 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ backgroundColor: '#2563eb' }}>
          Retry
        </Button>
      </Box>
    );
  }

  // Group lots by phase and block, then filter by selected phase
  const lotsByPhaseAndBlock = allLots.reduce((acc, lot) => {
    const phase = lot.phase || 1;
    if (!acc[phase]) acc[phase] = {};
    if (!acc[phase][lot.block]) acc[phase][lot.block] = [];
    acc[phase][lot.block].push(lot);
    return acc;
  }, {});

  // Sort lots within each block
  Object.keys(lotsByPhaseAndBlock).forEach(phase => {
    Object.keys(lotsByPhaseAndBlock[phase]).forEach(block => {
      lotsByPhaseAndBlock[phase][block].sort((a, b) => a.lotNumber - b.lotNumber);
    });
  });

  // Get phases and filter lots by selected phase
  const phases = Object.keys(lotsByPhaseAndBlock).map(Number).sort((a, b) => a - b);
  const markerRadius = 14;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #07101f 0%, #10203a 40%, #1c2f48 100%)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Top bar */}
      <Box sx={{
        px: { xs: 2, md: 4 }, py: 1.8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky', top: 0, zIndex: 200,
        backgroundColor: 'rgba(7,18,32,0.95)', backdropFilter: 'blur(10px)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'none', borderRadius: 2,
              '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.07)' } }}>
            Back
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.2)',
            }}>
              <HomeIcon sx={{ fontSize: 16, color: 'white' }} />
            </Box>
            <Box>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.1 }}>
                WESTVILLE CASIMIRO HOMES
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.08em' }}>
                INTERACTIVE LOT MAP + VIRTUAL TOUR
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField size="small" placeholder="Search (e.g. A-3)" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 16 }} />
              </InputAdornment>,
              sx: {
                color: 'white', borderRadius: 2, fontSize: '0.76rem',
                backgroundColor: 'rgba(255,255,255,0.08)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.16)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.28)' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
            }}
            inputProps={{ style: { color: 'white', fontSize: '0.76rem' } }}
            sx={{ width: { xs: 140, md: 200 }, display: { xs: 'none', sm: 'flex' } }}
          />
          <Button component={Link} to="/register" variant="contained" size="small"
            sx={{
              backgroundColor: '#3b82f6', borderRadius: 5, textTransform: 'none',
              fontWeight: 600, fontSize: '0.75rem', px: 2,
              '&:hover': { backgroundColor: '#2563eb' },
            }}>
            Register as Resident
          </Button>
        </Box>
      </Box>

      {/* Phase Selector */}
      {phases.length > 1 && (
        <Box sx={{
          px: { xs: 2, md: 4 }, py: 1.5,
          display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(15,23,42,0.85)',
        }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', mr: 1 }}>
            PHASE:
          </Typography>
          {phases.map(phase => (
            <Button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              variant={selectedPhase === phase ? 'contained' : 'outlined'}
              size="small"
              sx={{
                minWidth: 60,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: selectedPhase === phase ? '#3b82f6' : 'transparent',
                borderColor: selectedPhase === phase ? '#3b82f6' : 'rgba(255,255,255,0.25)',
                color: selectedPhase === phase ? 'white' : 'rgba(255,255,255,0.75)',
                '&:hover': {
                  backgroundColor: selectedPhase === phase ? '#2563eb' : 'rgba(255,255,255,0.08)',
                  borderColor: selectedPhase === phase ? '#2563eb' : 'rgba(255,255,255,0.35)',
                },
              }}
            >
              Phase {phase}
            </Button>
          ))}
        </Box>
      )}

      {/* Filter bar */}
      <Box sx={{
        px: { xs: 2, md: 4 }, py: 1.2,
        display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(15,23,42,0.82)',
      }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.68rem', mr: 0.5 }}>
          {stats.total} total lots
        </Typography>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Box key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.7,
              px: 1.4, py: 0.4, borderRadius: 5, cursor: 'pointer',
              border: `1.5px solid ${filterStatus === key ? cfg.color : 'rgba(255,255,255,0.1)'}`,
              backgroundColor: filterStatus === key ? cfg.color + '16' : 'rgba(255,255,255,0.03)',
              transition: 'all 0.18s',
              '&:hover': { borderColor: cfg.color },
            }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.color }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600 }}>
              {cfg.label}
            </Typography>
            <Typography sx={{
              color: cfg.color, fontSize: '0.7rem', fontWeight: 700,
              backgroundColor: cfg.color + '20', px: 0.65, borderRadius: 3,
            }}>
              {stats[key]}
            </Typography>
          </Box>
        ))}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.8 }}>
          <IconButton size="small"
            onClick={() => setMapZoom(z => Math.min(19, z + 1))}
            sx={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1.5 }}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
          <IconButton size="small"
            onClick={() => setMapZoom(z => Math.max(14, z - 1))}
            sx={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1.5 }}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Main two-column body */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT — Lot map */}
        <Box sx={{
          flex: 1, overflowY: 'auto', overflowX: 'auto',
          p: { xs: 2, md: 3 },
        }}>
          {/* Legend */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.62rem', letterSpacing: '0.12em' }}>
              LEGEND:
            </Typography>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: 0.5, backgroundColor: cfg.bg, border: `2px solid ${cfg.border}` }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.62rem' }}>{cfg.label}</Typography>
              </Box>
            ))}
            <Typography sx={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.6rem', ml: 0.5 }}>
              · Hover → 🎥 Tour or 📋 Info
            </Typography>
          </Box>

          {/* Phase Title */}
          <Box sx={{
            mb: 2, px: 3, py: 1.5, borderRadius: 2,
            backgroundColor: 'rgba(59,130,246,0.14)',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Typography sx={{
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
              PHASE {selectedPhase}
            </Typography>
          </Box>

          {/* Entrance road */}
          <Box sx={{
            mb: 2, px: 2, py: 0.8, borderRadius: 1,
            background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 20px, transparent 20px, transparent 40px)',
            border: '1px dashed rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', letterSpacing: '0.3em' }}>
              ← MAIN ENTRANCE ROAD →
            </Typography>
          </Box>

          {/* Blocks */}
          <Box sx={{ position: 'relative', height: 740, borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
            <MapContainer
              center={MAP_CENTER}
              zoom={mapZoom}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {lotBoxes.map((box) => (
                <Rectangle
                  key={`box-${box.lot.id}`}
                  bounds={box.bounds}
                  pathOptions={{
                    color: 'rgba(255,255,255,0.25)',
                    weight: 1,
                    dashArray: '3,5',
                    fillOpacity: 0,
                  }}
                />
              ))}

              {phaseFilteredLots.map((lot) => {
                const coord = lotCoordinates[lot.id] || MAP_CENTER;
                const cfg = STATUS_CONFIG[lot.status] || STATUS_CONFIG.vacant;
                return (
                  <CircleMarker
                    key={lot.id}
                    center={coord}
                    radius={markerRadius}
                    pathOptions={{
                      color: cfg.border,
                      fillColor: cfg.color,
                      fillOpacity: 0.85,
                      weight: 2,
                    }}
                    eventHandlers={{
                      click: () => setSelectedLot(lot),
                    }}
                  >
                    <Popup>
                      <Box sx={{ color: '#111' }}>
                        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                          Block {lot.block} • Lot {lot.lotNumber}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#333' }}>
                          {lot.type} • {lot.sqm} sqm
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: '#555' }}>
                          Status: {cfg.label}
                        </Typography>
                      </Box>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
            <Box sx={{ position: 'absolute', top: 16, left: 16, px: 2, py: 1, borderRadius: 2, backgroundColor: 'rgba(15,23,42,0.78)' }}>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.12em' }}>
                Casimiro Westville Homes Map
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.62rem' }}>
              Casimiro WestVille Homes · VIMS · Map is for reference only
            </Typography>
          </Box>
        </Box>

        {/* RIGHT — Always-visible sidebar */}
        <Box sx={{
          width: { xs: 0, lg: 340 },
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(7,18,32,0.96)',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          {selectedLot ? (
            <LotDetailPanel
              lot={selectedLot}
              onClose={() => setSelectedLot(null)}
              onRegister={() => handleRegister(selectedLot)}
              onTour={(l) => setTourLot(l)}
            />
          ) : (
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Village summary header */}
              <Box sx={{
                borderRadius: 2.5, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.12)',
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}>
                <Box sx={{
                  height: 110, position: 'relative',
                  backgroundImage: 'url(https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=600&q=80)',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(10,26,5,0.9))' }} />
                  <Box sx={{ position: 'absolute', bottom: 10, left: 12 }}>
                    <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>Casimiro WestVille Homes</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem' }}>Browse & find your perfect lot</Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                  {[
                    { label: 'Total', value: stats.total, color: 'rgba(255,255,255,0.7)' },
                    { label: 'Available', value: stats.vacant, color: '#60a5fa' },
                    { label: 'Reserved', value: stats.reserved, color: '#fbbf24' },
                  ].map(s => (
                    <Box key={s.label} sx={{ textAlign: 'center', py: 0.8, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <Typography sx={{ color: s.color, fontWeight: 800, fontSize: '1.2rem' }}>{s.value}</Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.58rem' }}>{s.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Availability donut chart visual */}
              <Box sx={{ borderRadius: 2, p: 1.8, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', mb: 1.5 }}>
                  LOT AVAILABILITY
                </Typography>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const pct = stats.total > 0 ? Math.round((stats[key] / stats.total) * 100) : 0;
                  return (
                    <Box key={key} sx={{ mb: 1.2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>{cfg.label}</Typography>
                        <Typography sx={{ color: cfg.color, fontSize: '0.68rem', fontWeight: 700 }}>{stats[key]} ({pct}%)</Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: cfg.color, transition: 'width 0.5s ease' }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Featured vacant lots */}
              <Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', mb: 1.2 }}>
                  ✨ FEATURED AVAILABLE LOTS
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {featuredLots.map((lot) => (
                    <Box key={lot.id} onClick={() => setSelectedLot(lot)}
                      sx={{
                        p: 1.5, borderRadius: 2, cursor: 'pointer',
                        backgroundColor: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.18s',
                        '&:hover': { backgroundColor: 'rgba(59,130,246,0.16)', borderColor: 'rgba(59,130,246,0.35)', transform: 'translateX(3px)' },
                      }}>
                      <Box>
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>
                          Block {lot.block}, Lot {lot.lotNumber}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem' }}>
                          {lot.type} · {lot.sqm} sqm
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.75rem' }}>
                          ₱{(lot.price / 1000000).toFixed(1)}M
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.58rem' }}>from</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* CTA */}
              <Box sx={{
                borderRadius: 2.5, p: 2,
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.18))',
                border: '1px solid rgba(59,130,246,0.25)',
                textAlign: 'center',
              }}>
                <Typography sx={{ fontSize: '1.3rem', mb: 0.5 }}>🏡</Typography>
                <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', mb: 0.5 }}>
                  Ready to move in?
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', mb: 1.5, lineHeight: 1.5 }}>
                  Click any green lot on the map to view details and start your registration.
                </Typography>
                <Button component={Link} to="/register" fullWidth variant="contained"
                  sx={{
                    backgroundColor: '#3b82f6', color: 'white', fontWeight: 700,
                    borderRadius: 5, textTransform: 'none', fontSize: '0.8rem',
                    '&:hover': { backgroundColor: '#2563eb' },
                    boxShadow: '0 4px 14px rgba(59,130,246,0.25)',
                  }}>
                  Register as Resident
                </Button>
              </Box>

              {/* Info note */}
              <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', lineHeight: 1.7, textAlign: 'center' }}>
                  Map is for reference only.<br />
                  Contact admin for exact lot details, pricing & payment terms.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Mobile side panel (overlay) */}
      {selectedLot && (
        <LotDetailPanel
          lot={selectedLot}
          onClose={() => setSelectedLot(null)}
          onRegister={() => handleRegister(selectedLot)}
          onTour={(l) => setTourLot(l)}
        />
      )}

      {/* Virtual tour overlay */}
      {tourLot && (
        <VirtualTourViewer
          lot={tourLot}
          onClose={() => setTourLot(null)}
          onRegister={() => { setTourLot(null); handleRegister(tourLot); }}
        />
      )}
    </Box>
  );
};

export default PublicLotMap;