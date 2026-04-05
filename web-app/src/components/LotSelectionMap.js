// src/components/LotSelectionMap.js - Completely clean, no warnings
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Tooltip,
  Zoom
} from '@mui/material';
import {
  Home as HomeIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon
} from '@mui/icons-material';

const STATUS_CONFIG = {
  vacant: { color: '#22c55e', bg: '#dcfce7', label: 'Vacant', border: '#16a34a', icon: <CheckCircleIcon fontSize="small" /> },
  occupied: { color: '#ef4444', bg: '#fee2e2', label: 'Occupied', border: '#dc2626', icon: <BlockIcon fontSize="small" /> },
  reserved: { color: '#f59e0b', bg: '#fef3c7', label: 'Reserved', border: '#d97706', icon: <HomeIcon fontSize="small" /> },
};

const LotSelectionMap = ({ lots, selectedLotId, onSelectLot, themeColors }) => {
  const [zoom, setZoom] = useState(1);

  // Group lots by block
  const lotsByBlock = useMemo(() => {
    const grouped = {};
    lots.forEach(lot => {
      if (!grouped[lot.block]) grouped[lot.block] = [];
      grouped[lot.block].push(lot);
    });
    // Sort lots within each block by lot number
    Object.keys(grouped).forEach(block => {
      grouped[block].sort((a, b) => a.lotNumber - b.lotNumber);
    });
    return grouped;
  }, [lots]);

  // Sort blocks
  const sortedBlocks = Object.keys(lotsByBlock).sort();

  const isLotAvailable = (lot) => lot.status === 'vacant';
  const isLotSelected = (lot) => selectedLotId === lot.lotId;

  const handleLotClick = (lot) => {
    if (isLotAvailable(lot)) {
      onSelectLot(lot);
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '500px', backgroundColor: '#f0f4f0' }}>
      {/* Zoom Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
        <Chip
          label="Zoom In"
          onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
          size="small"
          variant="outlined"
        />
        <Chip
          label="Zoom Out"
          onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
          size="small"
          variant="outlined"
        />
        <Chip
          label="Reset"
          onClick={() => setZoom(1)}
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Legend */}
      <Paper sx={{ p: 1.5, mb: 3, borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, mr: 1 }}>Legend:</Typography>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, backgroundColor: config.bg, border: `2px solid ${config.border}` }} />
            <Typography variant="caption">{config.label}</Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 0.5, backgroundColor: '#2d501640', border: '2px solid #2d5016' }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>Selected</Typography>
        </Box>
      </Paper>

      {/* Instructions */}
      <Paper sx={{ p: 1.5, mb: 3, borderRadius: 2, bgcolor: '#e8f5e9' }}>
        <Typography variant="body2" sx={{ textAlign: 'center', color: '#2e7d32' }}>
          💡 Click on any <strong>green (vacant)</strong> lot to select it for your registration
        </Typography>
      </Paper>

      {/* Map Container */}
      <Box sx={{ 
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
        transition: 'transform 0.2s ease',
        minHeight: '600px'
      }}>
        {/* Entrance Road */}
        <Box sx={{
          mb: 2,
          p: 1,
          borderRadius: 1,
          background: 'repeating-linear-gradient(90deg, #b0bec5 0px, #b0bec5 20px, #90a4ae 20px, #90a4ae 40px)',
          textAlign: 'center'
        }}>
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
            ← MAIN ENTRANCE ROAD →
          </Typography>
        </Box>

        {/* Blocks */}
        {sortedBlocks.map((block) => {
          const blockLots = lotsByBlock[block] || [];
          const vacantCount = blockLots.filter(l => l.status === 'vacant').length;
          
          return (
            <Paper key={block} sx={{ mb: 3, p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Box sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: themeColors?.primary || '#2d5016',
                  color: 'white'
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    BLOCK {block}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
                {vacantCount > 0 && (
                  <Chip
                    label={`${vacantCount} available`}
                    size="small"
                    sx={{ bgcolor: '#22c55e20', color: '#16a34a', fontWeight: 600 }}
                  />
                )}
              </Box>

              {/* Road strip */}
              <Box sx={{
                height: 3,
                mb: 1.5,
                borderRadius: 0.5,
                background: 'repeating-linear-gradient(90deg, #90a4ae 0px, #90a4ae 12px, #78909c 12px, #78909c 24px)',
              }} />

              {/* Lots Grid */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {blockLots.map((lot) => {
                  const isSelected = isLotSelected(lot);
                  const isAvailable = isLotAvailable(lot);
                  const statusConfig = STATUS_CONFIG[lot.status] || STATUS_CONFIG.vacant;
                  
                  const width = Math.max(50, Math.min(80, 60 * zoom));
                  const height = Math.max(40, Math.min(70, 50 * zoom));
                  
                  return (
                    <Tooltip
                      key={lot.lotId}
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="subtitle2">{lot.lotId}</Typography>
                          <Typography variant="caption">{lot.type} • {lot.sqm} sqm</Typography>
                          {isAvailable && (
                            <Typography variant="caption" sx={{ color: '#22c55e' }}>
                              ✓ Click to select
                            </Typography>
                          )}
                          {!isAvailable && (
                            <Typography variant="caption" sx={{ color: '#ef4444' }}>
                              Not available
                            </Typography>
                          )}
                        </Box>
                      }
                      placement="top"
                      TransitionComponent={Zoom}
                    >
                      <Box
                        onClick={() => handleLotClick(lot)}
                        sx={{
                          width,
                          height,
                          borderRadius: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          backgroundColor: isSelected ? statusConfig.color + '40' : statusConfig.bg,
                          border: `2px solid ${isSelected ? (themeColors?.primary || '#2d5016') : statusConfig.border}`,
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          opacity: isAvailable ? 1 : 0.6,
                          transition: 'all 0.2s ease',
                          '&:hover': isAvailable ? {
                            transform: 'scale(1.05)',
                            boxShadow: `0 4px 12px ${statusConfig.color}80`,
                            border: `2px solid ${statusConfig.color}`,
                          } : {},
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                          {lot.lotNumber}
                        </Typography>
                        {zoom >= 0.8 && (
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>
                            {lot.sqm}m²
                          </Typography>
                        )}
                        {isSelected && (
                          <Box sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            backgroundColor: themeColors?.primary || '#2d5016',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}>
                            <CheckCircleIcon sx={{ fontSize: 12, color: 'white' }} />
                          </Box>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Paper>
          );
        })}

        {/* Footer */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#888' }}>
            Interactive Lot Map • Click on vacant lots to select
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LotSelectionMap;