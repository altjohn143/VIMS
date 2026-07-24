import React, { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import mapImage from '../assets/lotbettermap.jpg';

const STATUS = {
  vacant: { label: 'Vacant', color: '#16a34a', background: '#dcfce7' },
  reserved: { label: 'Reserved', color: '#d97706', background: '#fef3c7' },
  occupied: { label: 'Occupied', color: '#dc2626', background: '#fee2e2' },
};

const getPosition = (lot) => {
  const position = lot?.mapPosition;
  if (!position?.isPositioned) return null;

  const left = Number(position.left);
  const top = Number(position.top);
  const width = Number(position.width);
  const height = Number(position.height);
  if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    left,
    top,
    width,
    height,
    rotate: Number(position.rotate) || 0,
  };
};

const compareValues = (a, b) => (
  String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
);

const RegistrationLotMap = ({ lots = [], selectedLotId, onSelectLot, themeColors = {} }) => {
  const [zoom, setZoom] = useState(1);

  const groupedLots = useMemo(() => {
    const phases = new Map();
    lots.forEach((lot) => {
      const phase = Number(lot.phase) || 1;
      const block = lot.block ?? 'Unassigned';
      if (!phases.has(phase)) phases.set(phase, new Map());
      if (!phases.get(phase).has(block)) phases.get(phase).set(block, []);
      phases.get(phase).get(block).push(lot);
    });

    return [...phases.entries()]
      .sort(([a], [b]) => a - b)
      .map(([phase, blocks]) => ({
        phase,
        blocks: [...blocks.entries()]
          .sort(([a], [b]) => compareValues(a, b))
          .map(([block, blockLots]) => ({
            block,
            lots: blockLots.sort((a, b) => compareValues(a.lotNumber, b.lotNumber)),
          })),
      }));
  }, [lots]);

  const positionedLots = useMemo(
    () => lots.filter((lot) => getPosition(lot)),
    [lots]
  );

  const handleSelection = (lotId) => {
    const lot = lots.find((candidate) => candidate.lotId === lotId);
    if (lot?.status === 'vacant' && getPosition(lot)) onSelectLot(lot);
  };

  return (
    <Box>
      <Box sx={{
        p: 2,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) auto' },
        gap: 1.5,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <FormControl fullWidth size="small">
          <InputLabel id="registration-lot-select-label">Select lot by phase and block</InputLabel>
          <Select
            labelId="registration-lot-select-label"
            value={selectedLotId || ''}
            label="Select lot by phase and block"
            onChange={(event) => handleSelection(event.target.value)}
            renderValue={(value) => {
              const lot = lots.find((candidate) => candidate.lotId === value);
              return lot
                ? `Phase ${lot.phase} · Block ${lot.block} · Lot ${lot.lotNumber} (${lot.sqm} sqm)`
                : 'Select lot by phase and block';
            }}
          >
            {groupedLots.flatMap(({ phase, blocks }) => [
              <ListSubheader key={`phase-${phase}`} sx={{ fontWeight: 800, color: themeColors.primary || '#2d5016' }}>
                Phase {phase}
              </ListSubheader>,
              ...blocks.flatMap(({ block, lots: blockLots }) => [
                <ListSubheader
                  key={`phase-${phase}-block-${block}`}
                  sx={{ pl: 4, fontSize: '0.75rem', lineHeight: '32px', color: '#64748b' }}
                >
                  Block {block}
                </ListSubheader>,
                ...blockLots.map((lot) => {
                  const config = STATUS[lot.status] || STATUS.vacant;
                  return (
                    <MenuItem
                      key={lot.lotId}
                      value={lot.lotId}
                      disabled={lot.status !== 'vacant'}
                      sx={{ pl: 6, display: 'flex', justifyContent: 'space-between', gap: 2 }}
                    >
                      <span>Lot {lot.lotNumber} · {lot.sqm} sqm</span>
                      <Typography component="span" variant="caption" sx={{ color: config.color, fontWeight: 700 }}>
                        {config.label}
                      </Typography>
                    </MenuItem>
                  );
                }),
              ]),
            ])}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip icon={<ZoomInIcon />} label="Zoom In" onClick={() => setZoom((value) => Math.min(1.6, value + 0.15))} />
          <Chip icon={<ZoomOutIcon />} label="Zoom Out" onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))} />
          <Chip icon={<ResetIcon />} label="Reset" onClick={() => setZoom(1)} />
        </Box>
      </Box>

      <Box sx={{ p: 1.5, backgroundColor: '#f8fafc' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', px: 0.5, pb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>Legend:</Typography>
          {Object.entries(STATUS).map(([key, config]) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 13, height: 13, backgroundColor: config.background, border: `2px solid ${config.color}`, borderRadius: 0.5 }} />
              <Typography variant="caption">{config.label}</Typography>
            </Box>
          ))}
          <Typography variant="caption" sx={{ ml: { md: 'auto' }, color: '#475569' }}>
            Click a green lot or use the organized list above.
          </Typography>
        </Box>

        <Box sx={{
          height: { xs: 380, sm: 500, md: 620 },
          overflow: 'auto',
          borderRadius: 2,
          border: '1px solid #cbd5e1',
          backgroundColor: '#e2e8f0',
        }}>
          <Box sx={{
            position: 'relative',
            width: `${zoom * 100}%`,
            minWidth: 760,
            aspectRatio: '1536 / 1024',
            transition: 'width 0.2s ease',
          }}>
            <Box
              component="img"
              src={mapImage}
              alt="Casimiro Westville Homes actual lot map"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
            />

            {positionedLots.map((lot) => {
              const position = getPosition(lot);
              const config = STATUS[lot.status] || STATUS.vacant;
              const isSelected = selectedLotId === lot.lotId;
              const isVacant = lot.status === 'vacant';
              const centerLeft = position.left + position.width / 2;
              const centerTop = position.top + position.height / 2;

              return (
                <Box
                  key={lot.lotId}
                  role={isVacant ? 'button' : undefined}
                  tabIndex={isVacant ? 0 : -1}
                  title={`Phase ${lot.phase}, Block ${lot.block}, Lot ${lot.lotNumber} — ${config.label}`}
                  onClick={() => isVacant && onSelectLot(lot)}
                  onKeyDown={(event) => {
                    if (isVacant && (event.key === 'Enter' || event.key === ' ')) onSelectLot(lot);
                  }}
                  sx={{
                    position: 'absolute',
                    left: `${centerLeft}%`,
                    top: `${centerTop}%`,
                    width: `${position.width}%`,
                    height: `${position.height}%`,
                    transform: `translate(-50%, -50%) rotate(${position.rotate}deg)`,
                    borderRadius: '3px',
                    border: `${isSelected ? 3 : 1.5}px solid ${isSelected ? '#1d4ed8' : config.color}`,
                    backgroundColor: isSelected ? '#3b82f640' : `${config.background}aa`,
                    cursor: isVacant ? 'pointer' : 'not-allowed',
                    boxShadow: isSelected ? '0 0 0 4px rgba(59,130,246,0.35)' : 'none',
                    transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': isVacant ? {
                      backgroundColor: '#86efaccc',
                      boxShadow: '0 0 0 3px rgba(22,163,74,0.25)',
                    } : {},
                    '&:focus-visible': {
                      outline: '3px solid #2563eb',
                      outlineOffset: 2,
                    },
                  }}
                />
              );
            })}

            <Box sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              px: 1.5,
              py: 0.8,
              borderRadius: 1.5,
              backgroundColor: 'rgba(15,23,42,0.86)',
            }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                CASIMIRO WESTVILLE HOMES MAP
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RegistrationLotMap;
