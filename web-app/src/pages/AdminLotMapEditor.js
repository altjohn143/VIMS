import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  TextField,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  DeleteOutline as ClearIcon,
  Map as MapIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../config/axios';
import mapImage from '../assets/lotbettermap.jpg';

const themeColors = {
  primary: '#166534',
  primaryDark: '#14532d',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  background: '#f3f5f7',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)'
};

const STATUS_CONFIG = {
  vacant: { color: '#22c55e', border: '#16a34a', label: 'Vacant' },
  occupied: { color: '#ef4444', border: '#dc2626', label: 'Occupied' },
  reserved: { color: '#f59e0b', border: '#d97706', label: 'Reserved' }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const getPhaseBlock = (rawBlock) => ((Number(rawBlock) - 1) % 5) + 1;

const normalizeLot = (lot) => {
  const rawBlock = Number(lot.block);
  return {
    ...lot,
    id: lot.lotId,
    phase: Number(lot.phase) || 1,
    block: rawBlock,
    phaseBlock: getPhaseBlock(rawBlock),
    lotNumber: Number(lot.lotNumber)
  };
};

const getSavedPosition = (lot) => {
  const position = lot?.mapPosition;
  if (!position?.isPositioned) return null;

  const left = Number(position.left);
  const top = Number(position.top);
  const width = Number(position.width);
  const height = Number(position.height);
  const rotate = Number(position.rotate) || 0;

  if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { left, top, width, height, rotate, source: 'saved' };
};

const getDisplayPosition = (lot) => getSavedPosition(lot);

const AdminLotMapEditor = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const dragRef = useRef(null);
  const [lots, setLots] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [draftPosition, setDraftPosition] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadLots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/lots');
      const rows = response.data?.success ? (response.data.data || []).map(normalizeLot) : [];
      setLots(rows);
      if (rows.length) {
        setSelectedLotId((current) => current || rows[0].lotId);
        setSelectedPhase((current) => current || rows[0].phase || 1);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load lots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  const phases = useMemo(() => (
    Array.from(new Set(lots.map((lot) => lot.phase))).sort((a, b) => a - b)
  ), [lots]);

  const phaseLots = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lots
      .filter((lot) => lot.phase === Number(selectedPhase))
      .filter((lot) => statusFilter === 'all' || lot.status === statusFilter)
      .filter((lot) => {
        if (positionFilter === 'saved') return Boolean(getSavedPosition(lot));
        if (positionFilter === 'unmapped') return !getSavedPosition(lot);
        return true;
      })
      .filter((lot) => {
        if (!query) return true;
        return [lot.lotId, lot.address, lot.status, lot.type, `block ${lot.phaseBlock}`, `lot ${lot.lotNumber}`]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => a.phaseBlock - b.phaseBlock || a.lotNumber - b.lotNumber);
  }, [lots, positionFilter, search, selectedPhase, statusFilter]);

  const selectedLot = lots.find((lot) => lot.lotId === selectedLotId) || phaseLots[0] || null;
  const selectedPosition = useMemo(() => (
    draftPosition || getDisplayPosition(selectedLot) || {
      left: 48,
      top: 48,
      width: 1.6,
      height: 2.4,
      rotate: 0,
      source: 'new'
    }
  ), [draftPosition, selectedLot]);

  useEffect(() => {
    if (selectedLot && selectedLot.phase !== Number(selectedPhase)) {
      setSelectedPhase(selectedLot.phase);
    }
  }, [selectedLot, selectedPhase]);

  const pushHistory = useCallback(() => {
    setUndoStack((current) => [...current.slice(-19), selectedPosition]);
    setRedoStack([]);
  }, [selectedPosition]);

  const updateDraft = (updates, track = true) => {
    if (track) pushHistory();
    setDraftPosition((current) => {
      const base = current || selectedPosition;
      const next = { ...base, ...updates, source: 'draft' };
      return {
        ...next,
        left: clamp(Number(next.left) || 0, 0, 100 - (Number(next.width) || 1)),
        top: clamp(Number(next.top) || 0, 0, 100 - (Number(next.height) || 1)),
        width: clamp(Number(next.width) || 1, 0.1, 20),
        height: clamp(Number(next.height) || 1, 0.1, 20),
        rotate: clamp(Number(next.rotate) || 0, -180, 180)
      };
    });
  };

  const getPercentPoint = (event) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)
    };
  };

  const placeSelectedLot = async (event) => {
    if (!selectedLot || dragRef.current?.dragging) return;
    const point = getPercentPoint(event);
    if (!point) return;

    updateDraft({
      left: point.x - selectedPosition.width / 2,
      top: point.y - selectedPosition.height / 2
    });
  };

  const startDrag = (event, lot) => {
    event.stopPropagation();
    pushHistory();
    setSelectedLotId(lot.lotId);
    const position = lot.lotId === selectedLotId ? selectedPosition : getDisplayPosition(lot);
    if (!position) return;
    setDraftPosition(position);
    const point = getPercentPoint(event);
    if (!point) return;
    dragRef.current = {
      dragging: true,
      lotId: lot.lotId,
      offsetX: point.x - position.left,
      offsetY: point.y - position.top
    };
  };

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragRef.current?.dragging) return;
      const point = getPercentPoint(event);
      if (!point) return;
      updateDraft({
        left: point.x - dragRef.current.offsetX,
        top: point.y - dragRef.current.offsetY
      }, false);
    };

    const handleUp = () => {
      if (dragRef.current) {
        dragRef.current.dragging = false;
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  });

  const handleSelectLot = (lot) => {
    setSelectedLotId(lot.lotId);
    setSelectedPhase(lot.phase);
    setDraftPosition(null);
  };

  const handlePhaseChange = (phase) => {
    const nextPhase = Number(phase);
    const firstLot = lots
      .filter((lot) => lot.phase === nextPhase)
      .sort((a, b) => a.phaseBlock - b.phaseBlock || a.lotNumber - b.lotNumber)[0];
    setSelectedPhase(nextPhase);
    setSelectedLotId(firstLot?.lotId || '');
    setDraftPosition(null);
  };

  const undoDraft = () => {
    setUndoStack((current) => {
      if (!current.length) return current;
      const previous = current[current.length - 1];
      setRedoStack((redo) => [selectedPosition, ...redo].slice(0, 20));
      setDraftPosition(previous);
      return current.slice(0, -1);
    });
  };

  const redoDraft = () => {
    setRedoStack((current) => {
      if (!current.length) return current;
      const next = current[0];
      setUndoStack((undo) => [...undo.slice(-19), selectedPosition]);
      setDraftPosition(next);
      return current.slice(1);
    });
  };

  const duplicateNextLot = () => {
    if (!selectedLot) return;
    const ordered = lots
      .filter((lot) => lot.phase === selectedLot.phase && lot.phaseBlock === selectedLot.phaseBlock)
      .sort((a, b) => a.lotNumber - b.lotNumber);
    const index = ordered.findIndex((lot) => lot.lotId === selectedLot.lotId);
    const nextLot = ordered[index + 1];
    if (!nextLot) {
      toast.error('No next lot in this block');
      return;
    }

    const nextPosition = {
      ...selectedPosition,
      left: clamp(selectedPosition.left + selectedPosition.width + 0.25, 0, 100 - selectedPosition.width),
      source: 'draft'
    };
    setSelectedLotId(nextLot.lotId);
    setDraftPosition(nextPosition);
    toast.success(`Duplicated placement to ${nextLot.lotId}`);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!selectedLot || event.target.closest('input, textarea, [role="combobox"]')) return;
      const step = event.shiftKey ? 0.5 : 0.1;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        updateDraft({ left: selectedPosition.left - step });
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        updateDraft({ left: selectedPosition.left + step });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        updateDraft({ top: selectedPosition.top - step });
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        updateDraft({ top: selectedPosition.top + step });
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoDraft();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redoDraft();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const savePosition = async () => {
    if (!selectedLot) return;

    try {
      setSaving(true);
      const payload = {
        left: selectedPosition.left,
        top: selectedPosition.top,
        width: selectedPosition.width,
        height: selectedPosition.height,
        rotate: selectedPosition.rotate,
        shape: 'rectangle'
      };
      const response = await axios.put(`/api/lots/${selectedLot.lotId}/map-position`, payload);
      const updated = normalizeLot(response.data.data);
      setLots((current) => current.map((lot) => (lot.lotId === updated.lotId ? updated : lot)));
      setDraftPosition(null);
      toast.success('Map position saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save map position');
    } finally {
      setSaving(false);
    }
  };

  const clearPosition = async () => {
    if (!selectedLot) return;

    try {
      setSaving(true);
      const response = await axios.delete(`/api/lots/${selectedLot.lotId}/map-position`);
      const updated = normalizeLot(response.data.data);
      setLots((current) => current.map((lot) => (lot.lotId === updated.lotId ? updated : lot)));
      setDraftPosition(null);
      toast.success('Saved map position cleared');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to clear map position');
    } finally {
      setSaving(false);
    }
  };

  const removeLot = async () => {
    if (!selectedLot) return;

    const confirmed = window.confirm(
      `Remove ${selectedLot.lotId} permanently? This deletes the lot record and removes it from the public map.`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      await axios.delete(`/api/lots/${selectedLot.lotId}`);
      setLots((current) => {
        const remaining = current.filter((lot) => lot.lotId !== selectedLot.lotId);
        const nextLot = remaining
          .filter((lot) => lot.phase === selectedLot.phase)
          .sort((a, b) => a.phaseBlock - b.phaseBlock || a.lotNumber - b.lotNumber)[0] || remaining[0];
        setSelectedLotId(nextLot?.lotId || '');
        setSelectedPhase(nextLot?.phase || selectedPhase);
        return remaining;
      });
      setDraftPosition(null);
      setUndoStack([]);
      setRedoStack([]);
      toast.success('Lot removed');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove lot');
    } finally {
      setSaving(false);
    }
  };

  const positionedCount = lots.filter((lot) => getSavedPosition(lot)).length;
  const unmappedCount = lots.filter((lot) => !getSavedPosition(lot)).length;

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: themeColors.background }}>
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: themeColors.background }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255,255,255,0.96)',
          color: themeColors.textPrimary,
          borderBottom: `1px solid ${themeColors.border}`
        }}
      >
        <Toolbar>
          <IconButton onClick={() => navigate('/dashboard/admin/lot-management')} sx={{ mr: 1.5, color: themeColors.primary }}>
            <ArrowBackIcon />
          </IconButton>
          <MapIcon sx={{ mr: 1.5, color: themeColors.primary }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Public Lot Map Editor
          </Typography>
          <Button startIcon={<RefreshIcon />} onClick={loadLots} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Refresh
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={8.5}>
            <Paper sx={{ p: 2, borderRadius: '18px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>Map Canvas</Typography>
                  <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                    Click the map to place the selected lot. Only saved editor positions appear on the public map.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`${positionedCount} saved`} size="small" sx={{ bgcolor: `${themeColors.success}18`, color: themeColors.success, fontWeight: 700 }} />
                  <Chip label={`${unmappedCount} unmapped`} size="small" sx={{ bgcolor: `${themeColors.info}18`, color: themeColors.info, fontWeight: 700 }} />
                  <Button size="small" variant={showGrid ? 'contained' : 'outlined'} onClick={() => setShowGrid((value) => !value)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Grid
                  </Button>
                </Box>
              </Box>

              <Box
                ref={mapRef}
                onClick={placeSelectedLot}
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1536 / 1024',
                  overflow: 'hidden',
                  borderRadius: '14px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: '#0f172a',
                  cursor: selectedLot ? 'crosshair' : 'default',
                  userSelect: 'none'
                }}
              >
                <Box component="img" src={mapImage} alt="Lot map editor" sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                {showGrid && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)
                      `,
                      backgroundSize: '5% 5%',
                    }}
                  />
                )}
                {phaseLots.map((lot) => {
                  const status = STATUS_CONFIG[lot.status] || STATUS_CONFIG.vacant;
                  const isSelected = lot.lotId === selectedLot?.lotId;
                  const position = isSelected ? selectedPosition : getDisplayPosition(lot);
                  if (!position) return null;
                  const isSaved = Boolean(getSavedPosition(lot));

                  return (
                    <Tooltip key={lot.lotId} title={`${lot.lotId} · ${isSaved ? 'Saved' : 'Draft'}`} arrow>
                      <Box
                        onPointerDown={(event) => startDrag(event, lot)}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectLot(lot);
                        }}
                        sx={{
                          position: 'absolute',
                          left: `${position.left + position.width / 2}%`,
                          top: `${position.top + position.height / 2}%`,
                          width: `${position.width}%`,
                          height: `${position.height}%`,
                          transform: `translate(-50%, -50%) rotate(${position.rotate || 0}deg)`,
                          borderRadius: '3px',
                          border: isSelected ? '2px solid #ffffff' : `1px solid ${status.border}`,
                          boxShadow: isSelected ? `0 0 0 3px ${themeColors.info}` : 'none',
                          backgroundColor: `${status.color}${isSaved ? '35' : '18'}`,
                          cursor: 'grab',
                          transition: dragRef.current?.dragging ? 'none' : '0.12s ease',
                          '&:hover': {
                            backgroundColor: `${status.color}44`
                          }
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={3.5}>
            <Paper sx={{ p: 2.2, borderRadius: '18px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }}>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>Lot Controls</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Phase</InputLabel>
                    <Select value={selectedPhase} label="Phase" onChange={(event) => handlePhaseChange(event.target.value)}>
                      {phases.map((phase) => <MenuItem key={phase} value={phase}>Phase {phase}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(event) => setStatusFilter(event.target.value)}>
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="vacant">Vacant</MenuItem>
                      <MenuItem value="occupied">Occupied</MenuItem>
                      <MenuItem value="reserved">Reserved</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Map Position</InputLabel>
                    <Select value={positionFilter} label="Map Position" onChange={(event) => setPositionFilter(event.target.value)}>
                      <MenuItem value="all">All lots</MenuItem>
                      <MenuItem value="saved">Saved only</MenuItem>
                      <MenuItem value="unmapped">Unmapped only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Search lot" value={search} onChange={(event) => setSearch(event.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Selected Lot</InputLabel>
                    <Select
                      value={selectedLot?.lotId || ''}
                      label="Selected Lot"
                      onChange={(event) => {
                        setSelectedLotId(event.target.value);
                        setDraftPosition(null);
                      }}
                    >
                      {phaseLots.map((lot) => (
                        <MenuItem key={lot.lotId} value={lot.lotId}>
                          {lot.lotId} · Block {lot.phaseBlock} Lot {lot.lotNumber}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {selectedLot ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800 }}>{selectedLot.lotId}</Typography>
                      <Typography variant="caption" color="text.secondary">{selectedLot.address}</Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={selectedPosition.source === 'saved' ? 'Saved' : 'Draft'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  {[
                    ['left', 'Left', 0, 100, 0.05],
                    ['top', 'Top', 0, 100, 0.05],
                    ['width', 'Width', 0.3, 8, 0.05],
                    ['height', 'Height', 0.3, 8, 0.05],
                    ['rotate', 'Rotate', -180, 180, 1]
                  ].map(([key, label, min, max, step]) => (
                    <Box key={key} sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
                        <TextField
                          size="small"
                          type="number"
                          value={Number(selectedPosition[key]).toFixed(key === 'rotate' ? 0 : 2)}
                          onChange={(event) => updateDraft({ [key]: Number(event.target.value) })}
                          inputProps={{ min, max, step }}
                          sx={{ width: 92 }}
                        />
                      </Box>
                      <Slider
                        value={Number(selectedPosition[key]) || 0}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(_, value) => updateDraft({ [key]: value })}
                      />
                    </Box>
                  ))}

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 2 }}>
                    <Button variant="outlined" disabled={!undoStack.length} onClick={undoDraft} sx={{ textTransform: 'none', fontWeight: 800 }}>
                      Undo
                    </Button>
                    <Button variant="outlined" disabled={!redoStack.length} onClick={redoDraft} sx={{ textTransform: 'none', fontWeight: 800 }}>
                      Redo
                    </Button>
                    <Button variant="outlined" onClick={duplicateNextLot} sx={{ textTransform: 'none', fontWeight: 800 }}>
                      Duplicate Next
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={saving}
                      onClick={savePosition}
                      sx={{ textTransform: 'none', fontWeight: 800, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}
                    >
                      Save
                    </Button>
                    <Button variant="outlined" startIcon={<ClearIcon />} disabled={saving} color="error" onClick={clearPosition} sx={{ textTransform: 'none', fontWeight: 800 }}>
                      Clear
                    </Button>
                    <Button variant="contained" disabled={saving} color="error" onClick={removeLot} sx={{ gridColumn: '1 / -1', textTransform: 'none', fontWeight: 800 }}>
                      Remove Lot
                    </Button>
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">No lot selected.</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminLotMapEditor;
