import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  DeleteOutline as ClearIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Map as MapIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  SelectAll as SelectAllIcon,
  Visibility as PreviewIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowLeft as ArrowLeftIcon,
  KeyboardArrowRight as ArrowRightIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
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
// Blocks are stored per phase (Phase 2 can now contain Blocks 1-13).
// The previous modulo-5 conversion incorrectly displayed Blocks 6 and 11 as Block 1.
const getPhaseBlock = (rawBlock) => Number(rawBlock);
const DEFAULT_POSITION = {
  left: 48,
  top: 48,
  width: 1.6,
  height: 2.4,
  rotate: 0,
  source: 'new'
};

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

const normalizePosition = (position) => {
  const width = clamp(Number(position.width) || DEFAULT_POSITION.width, 0.1, 20);
  const height = clamp(Number(position.height) || DEFAULT_POSITION.height, 0.1, 20);
  return {
    ...position,
    width,
    height,
    left: clamp(Number(position.left) || 0, 0, 100 - width),
    top: clamp(Number(position.top) || 0, 0, 100 - height),
    rotate: clamp(Number(position.rotate) || 0, -180, 180)
  };
};

const AdminLotMapEditor = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const importInputRef = useRef(null);
  const dragRef = useRef(null);
  const [lots, setLots] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [selectedLotIds, setSelectedLotIds] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [draftPositions, setDraftPositions] = useState({});
  const [showGrid, setShowGrid] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapSize, setSnapSize] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [previewMode, setPreviewMode] = useState(false);
  const [isMapPadCollapsed, setIsMapPadCollapsed] = useState(false);
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
        setSelectedLotIds((current) => current.length ? current : [rows[0].lotId]);
        setSelectedPhase((current) => current || 'all');
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
      .filter((lot) => selectedPhase === 'all' || lot.phase === Number(selectedPhase))
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
      .sort((a, b) => a.phase - b.phase || a.phaseBlock - b.phaseBlock || a.lotNumber - b.lotNumber);
  }, [lots, positionFilter, search, selectedPhase, statusFilter]);

  const selectedLot = lots.find((lot) => lot.lotId === selectedLotId) || phaseLots[0] || null;
  const getCurrentPosition = useCallback((lot) => {
    if (!lot) return null;
    return draftPositions[lot.lotId] || getDisplayPosition(lot);
  }, [draftPositions]);
  const selectedPosition = useMemo(() => (
    getCurrentPosition(selectedLot) || DEFAULT_POSITION
  ), [getCurrentPosition, selectedLot]);
  const draftCount = Object.keys(draftPositions).length;
  const hasUnsavedChanges = draftCount > 0;
  const selectedSet = useMemo(() => new Set(selectedLotIds), [selectedLotIds]);
  useEffect(() => {
    if (selectedLot && selectedPhase !== 'all' && selectedLot.phase !== Number(selectedPhase)) {
      setSelectedPhase(selectedLot.phase);
    }
  }, [selectedLot, selectedPhase]);

  const pushHistory = useCallback(() => {
    setUndoStack((current) => [...current.slice(-19), draftPositions]);
    setRedoStack([]);
  }, [draftPositions]);

  const updateDraft = (updates, track = true) => {
    if (!selectedLot) return;
    if (track) pushHistory();
    setDraftPositions((current) => {
      const base = current[selectedLot.lotId] || selectedPosition;
      const nextUpdates = { ...updates };
      if (Object.prototype.hasOwnProperty.call(nextUpdates, 'left')) nextUpdates.left = snap(nextUpdates.left);
      if (Object.prototype.hasOwnProperty.call(nextUpdates, 'top')) nextUpdates.top = snap(nextUpdates.top);
      const next = normalizePosition({ ...base, ...nextUpdates, source: 'draft' });
      return { ...current, [selectedLot.lotId]: next };
    });
  };

  const setLotDraft = (lotId, position) => {
    setDraftPositions((current) => ({
      ...current,
      [lotId]: normalizePosition({ ...position, source: 'draft' })
    }));
  };

  const snap = (value) => {
    if (!snapEnabled) return value;
    const size = Number(snapSize) || 0.5;
    return Math.round(value / size) * size;
  };

  const getPercentPoint = (event) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp((((event.clientX - rect.left - pan.x) / zoom) / rect.width) * 100, 0, 100),
      y: clamp((((event.clientY - rect.top - pan.y) / zoom) / rect.height) * 100, 0, 100)
    };
  };

  const placeSelectedLot = async (event) => {
    if (!selectedLot || dragRef.current?.dragging) return;
    const point = getPercentPoint(event);
    if (!point) return;

    updateDraft({
      left: snap(point.x - selectedPosition.width / 2),
      top: snap(point.y - selectedPosition.height / 2)
    });
  };

  const startDrag = (event, lot) => {
    event.stopPropagation();
    pushHistory();
    setSelectedLotId(lot.lotId);
    if (!event.shiftKey && !selectedSet.has(lot.lotId)) {
      setSelectedLotIds([lot.lotId]);
    }
    const position = lot.lotId === selectedLotId ? selectedPosition : getCurrentPosition(lot);
    if (!position) return;
    setLotDraft(lot.lotId, position);
    const point = getPercentPoint(event);
    if (!point) return;
    dragRef.current = {
      dragging: true,
      moved: false,
      lotId: lot.lotId,
      groupLotIds: selectedSet.has(lot.lotId) ? [...selectedSet] : [lot.lotId],
      startPositions: Object.fromEntries(
        (selectedSet.has(lot.lotId) ? [...selectedSet] : [lot.lotId])
          .map((id) => {
            const row = lots.find((item) => item.lotId === id);
            return [id, getCurrentPosition(row) || DEFAULT_POSITION];
          })
      ),
      startPoint: point,
      offsetX: point.x - position.left,
      offsetY: point.y - position.top
    };
  };

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragRef.current?.dragging) return;
      const point = getPercentPoint(event);
      if (!point) return;
      dragRef.current.moved = true;
      const groupLotIds = dragRef.current.groupLotIds || [dragRef.current.lotId];
      if (groupLotIds.length > 1) {
        const deltaX = point.x - dragRef.current.startPoint.x;
        const deltaY = point.y - dragRef.current.startPoint.y;
        setDraftPositions((current) => {
          const next = { ...current };
          groupLotIds.forEach((lotId) => {
            const start = dragRef.current.startPositions[lotId];
            if (!start) return;
            next[lotId] = normalizePosition({
              ...start,
              left: snap(start.left + deltaX),
              top: snap(start.top + deltaY),
              source: 'draft'
            });
          });
          return next;
        });
      } else {
        updateDraft({
          left: snap(point.x - dragRef.current.offsetX),
          top: snap(point.y - dragRef.current.offsetY)
        }, false);
      }
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

  const handleSelectLot = (lot, append = false) => {
    setSelectedLotId(lot.lotId);
    setSelectedPhase(lot.phase);
    setSelectedLotIds((current) => {
      if (!append) return [lot.lotId];
      if (current.includes(lot.lotId)) return current.filter((id) => id !== lot.lotId);
      return [...current, lot.lotId];
    });
  };

  const handlePhaseChange = (phase) => {
    if (phase === 'all') {
      const firstLot = lots
        .sort((a, b) => a.phase - b.phase || a.phaseBlock - b.phaseBlock || a.lotNumber - b.lotNumber)[0];
      setSelectedPhase('all');
      setSelectedLotId(firstLot?.lotId || '');
      setSelectedLotIds(firstLot ? [firstLot.lotId] : []);
      return;
    }

    const nextPhase = Number(phase);
    const firstLot = lots
      .filter((lot) => lot.phase === nextPhase)
      .sort((a, b) => a.phaseBlock - b.phaseBlock || a.lotNumber - b.lotNumber)[0];
    setSelectedPhase(nextPhase);
    setSelectedLotId(firstLot?.lotId || '');
    setSelectedLotIds(firstLot ? [firstLot.lotId] : []);
  };

  const undoDraft = () => {
    setUndoStack((current) => {
      if (!current.length) return current;
      const previous = current[current.length - 1];
      setRedoStack((redo) => [draftPositions, ...redo].slice(0, 20));
      setDraftPositions(previous);
      return current.slice(0, -1);
    });
  };

  const redoDraft = () => {
    setRedoStack((current) => {
      if (!current.length) return current;
      const next = current[0];
      setUndoStack((undo) => [...undo.slice(-19), draftPositions]);
      setDraftPositions(next);
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
      left: snap(clamp(selectedPosition.left + selectedPosition.width + 0.25, 0, 100 - selectedPosition.width)),
      source: 'draft'
    };
    setSelectedLotId(nextLot.lotId);
    setSelectedLotIds([nextLot.lotId]);
    setLotDraft(nextLot.lotId, nextPosition);
    toast.success(`Duplicated placement to ${nextLot.lotId}`);
  };

  const nudgeSelected = (axis, direction) => {
    if (!selectedLot || previewMode) return;
    if (!snapEnabled) {
      updateDraft({ [axis]: selectedPosition[axis] + direction * 0.25 });
      return;
    }

    const size = Number(snapSize) || 0.5;
    const current = Number(selectedPosition[axis]) || 0;
    const next = direction < 0
      ? Math.floor((current - 0.0001) / size) * size
      : Math.ceil((current + 0.0001) / size) * size;
    updateDraft({ [axis]: next });
  };

  const resizeSelected = (axis, amount) => {
    if (!selectedLot || previewMode) return;
    updateDraft({ [axis]: selectedPosition[axis] + amount });
  };

  const rotateSelected = (amount) => {
    if (!selectedLot || previewMode) return;
    updateDraft({ rotate: selectedPosition.rotate + amount });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!selectedLot || event.target.closest('input, textarea, [role="combobox"]')) return;
      const step = event.shiftKey ? 0.5 : (snapEnabled ? (Number(snapSize) || 0.5) : 0.1);
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
      setDraftPositions((current) => {
        const next = { ...current };
        delete next[selectedLot.lotId];
        return next;
      });
      toast.success('Map position saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save map position');
    } finally {
      setSaving(false);
    }
  };

  const saveAllDrafts = async () => {
    const entries = Object.entries(draftPositions);
    if (!entries.length) {
      toast('No draft positions to save');
      return;
    }

    try {
      setSaving(true);
      const responses = await Promise.all(entries.map(([lotId, position]) => axios.put(`/api/lots/${encodeURIComponent(lotId)}/map-position`, {
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
        rotate: position.rotate,
        shape: 'rectangle'
      })));
      const updatedLots = responses.map((response) => normalizeLot(response.data.data));
      setLots((current) => current.map((lot) => updatedLots.find((updated) => updated.lotId === lot.lotId) || lot));
      setDraftPositions({});
      setUndoStack([]);
      setRedoStack([]);
      toast.success(`Saved ${updatedLots.length} map position${updatedLots.length === 1 ? '' : 's'}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save all draft positions');
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
      setDraftPositions((current) => {
        const next = { ...current };
        delete next[selectedLot.lotId];
        return next;
      });
      toast.success('Saved map position cleared');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to clear map position');
    } finally {
      setSaving(false);
    }
  };

  const removeSquare = async () => {
    if (!selectedLot) return;

    const confirmed = window.confirm(
      `Remove the ${selectedLot.lotId} square from the map? The lot record will remain in the database.`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      const response = await axios.delete(`/api/lots/${encodeURIComponent(selectedLot.lotId)}/map-position`);
      const updated = normalizeLot(response.data.data);
      setLots((current) => current.map((lot) => (lot.lotId === updated.lotId ? updated : lot)));
      setDraftPositions((current) => {
        const next = { ...current };
        delete next[selectedLot.lotId];
        return next;
      });
      setUndoStack([]);
      setRedoStack([]);
      toast.success(`${selectedLot.lotId} square removed; lot record retained`);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Failed to remove square');
    } finally {
      setSaving(false);
    }
  };

  const exportMapData = async () => {
    try {
      setSaving(true);
      const response = await axios.get('/api/lots/map-data/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `VIMS_Lot_Map_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Lot map backup exported');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to export lot map data');
    } finally {
      setSaving(false);
    }
  };

  const importMapData = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const lotCount = Array.isArray(payload?.lots) ? payload.lots.length : 0;
      if (!lotCount) {
        toast.error('Backup file has no lots to import');
        return;
      }

      const confirmed = window.confirm(
        `Import ${lotCount} lots from this backup? Existing lots with the same Lot ID will be updated.`
      );
      if (!confirmed) return;

      setSaving(true);
      const response = await axios.post('/api/lots/map-data/import', payload);
      const result = response.data?.data;
      const corrected = Number(result?.correctedPositionLabels) || 0;
      const positioned = Number(result?.positioned) || 0;
      toast.success(`Imported ${result?.total || lotCount} lots (${positioned} placed, ${corrected} labels corrected)`);
      setDraftPositions({});
      setUndoStack([]);
      setRedoStack([]);
      await loadLots();
    } catch (error) {
      const message = error instanceof SyntaxError
        ? 'Invalid JSON backup file'
        : error.response?.data?.error || 'Failed to import lot map data';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const selectAllVisible = () => {
    setSelectedLotIds(phaseLots.map((lot) => lot.lotId));
    if (phaseLots[0]) setSelectedLotId(phaseLots[0].lotId);
  };

  const clearSelection = () => {
    setSelectedLotIds(selectedLot ? [selectedLot.lotId] : []);
  };

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const navigateBack = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved lot map changes. Leave without saving?')) return;
    navigate('/dashboard/admin/lot-management');
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
          <IconButton onClick={navigateBack} sx={{ mr: 1.5, color: themeColors.primary }}>
            <ArrowBackIcon />
          </IconButton>
          <MapIcon sx={{ mr: 1.5, color: themeColors.primary }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Public Lot Map Editor
          </Typography>
          <Button startIcon={<SaveIcon />} disabled={saving || !draftCount} onClick={saveAllDrafts} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Save All {draftCount ? `(${draftCount})` : ''}
          </Button>
          <Button startIcon={<ExportIcon />} disabled={saving} onClick={exportMapData} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Export
          </Button>
          <Button startIcon={<ImportIcon />} disabled={saving} onClick={() => importInputRef.current?.click()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={importMapData}
            style={{ display: 'none' }}
          />
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
                  <Chip label={`${draftCount} draft${draftCount === 1 ? '' : 's'}`} size="small" sx={{ bgcolor: `${themeColors.warning}18`, color: themeColors.warning, fontWeight: 700 }} />
                  <Button size="small" variant={showGrid ? 'contained' : 'outlined'} disabled={previewMode} onClick={() => setShowGrid((value) => !value)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Grid
                  </Button>
                  <Button size="small" variant={previewMode ? 'contained' : 'outlined'} startIcon={<PreviewIcon />} onClick={() => setPreviewMode((value) => !value)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Preview
                  </Button>
                  <Tooltip title="Zoom out">
                    <span>
                      <IconButton size="small" disabled={zoom <= 0.75} onClick={() => setZoom((value) => clamp(Number((value - 0.25).toFixed(2)), 0.75, 3))}>
                        <ZoomOutIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Chip label={`${Math.round(zoom * 100)}%`} size="small" sx={{ fontWeight: 700 }} />
                  <Tooltip title="Zoom in">
                    <span>
                      <IconButton size="small" disabled={zoom >= 3} onClick={() => setZoom((value) => clamp(Number((value + 0.25).toFixed(2)), 0.75, 3))}>
                        <ZoomInIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button size="small" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Reset View
                  </Button>
                  {[
                    ['Left', -40, 0],
                    ['Up', 0, -40],
                    ['Down', 0, 40],
                    ['Right', 40, 0]
                  ].map(([label, x, y]) => (
                    <Button key={label} size="small" disabled={zoom <= 1} onClick={() => setPan((current) => ({ x: current.x + x, y: current.y + y }))} sx={{ minWidth: 32, px: 0.8, fontWeight: 900 }}>
                      {label}
                    </Button>
                  ))}
                </Box>
              </Box>

              <Box
                ref={mapRef}
                onClick={previewMode ? undefined : placeSelectedLot}
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1536 / 1024',
                  overflow: 'hidden',
                  borderRadius: '14px',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: '#0f172a',
                  cursor: previewMode ? 'default' : selectedLot ? 'crosshair' : 'default',
                  userSelect: 'none'
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    transition: dragRef.current?.dragging ? 'none' : 'transform 0.16s ease'
                  }}
                >
                <Box component="img" src={mapImage} alt="Lot map editor" sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                {showGrid && !previewMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)
                      `,
                      backgroundSize: `${snapSize * 2}% ${snapSize * 2}%`,
                    }}
                  />
                )}
                {phaseLots.map((lot) => {
                    const status = STATUS_CONFIG[lot.status] || STATUS_CONFIG.vacant;
                  const isSelected = lot.lotId === selectedLot?.lotId;
                  const isMultiSelected = selectedSet.has(lot.lotId);
                  const position = previewMode ? getSavedPosition(lot) : getCurrentPosition(lot);
                  if (!position) return null;
                  const isSaved = Boolean(getSavedPosition(lot));

                  return (
                    <Tooltip key={lot.lotId} title={`${lot.lotId} · ${isSaved ? 'Saved' : 'Draft'}`} arrow>
                      <Box
                        onPointerDown={previewMode ? undefined : (event) => startDrag(event, lot)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (previewMode) return;
                          if (dragRef.current?.lotId === lot.lotId && dragRef.current.moved) {
                            dragRef.current.moved = false;
                            return;
                          }
                          handleSelectLot(lot, event.shiftKey);
                        }}
                        sx={{
                          position: 'absolute',
                          left: `${position.left + position.width / 2}%`,
                          top: `${position.top + position.height / 2}%`,
                          width: `${position.width}%`,
                          height: `${position.height}%`,
                          transform: `translate(-50%, -50%) rotate(${position.rotate || 0}deg)`,
                          borderRadius: '3px',
                          border: (isSelected || isMultiSelected) ? '2px solid #ffffff' : `1px solid ${status.border}`,
                          boxShadow: (isSelected || isMultiSelected) ? `0 0 0 3px ${themeColors.info}` : 'none',
                          backgroundColor: `${status.color}${isSaved ? '35' : '18'}`,
                          cursor: previewMode ? 'pointer' : 'grab',
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
                {selectedLot && !previewMode && selectedPosition && (
                  <Box
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      zIndex: 10,
                      width: isMapPadCollapsed ? 190 : 220,
                      p: 1,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.97)',
                      border: `1px solid ${themeColors.border}`,
                      boxShadow: '0 14px 36px rgba(15,23,42,0.24)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: isMapPadCollapsed ? 0 : 0.8 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 900, color: themeColors.textPrimary, lineHeight: 1.1 }}>
                          {selectedLot.lotId}
                        </Typography>
                        {!isMapPadCollapsed && (
                          <Typography sx={{ fontSize: '0.64rem', fontWeight: 800, color: themeColors.textSecondary }}>
                            Map quick edit
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          size="small"
                          label={draftPositions[selectedLot.lotId] ? 'Draft' : 'Saved'}
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                        />
                        <Tooltip title={isMapPadCollapsed ? 'Expand controls' : 'Minimize controls'}>
                          <IconButton size="small" onClick={() => setIsMapPadCollapsed((value) => !value)}>
                            {isMapPadCollapsed ? <AddIcon sx={{ fontSize: 16 }} /> : <RemoveIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {!isMapPadCollapsed && (
                      <>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '34px 34px 34px', justifyContent: 'center', gap: 0.45, mb: 0.9 }}>
                          <Box />
                          <Tooltip title="Move up">
                            <IconButton size="small" onClick={() => nudgeSelected('top', -1)} sx={{ border: `1px solid ${themeColors.border}` }}><ArrowUpIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Box />
                          <Tooltip title="Move left">
                            <IconButton size="small" onClick={() => nudgeSelected('left', -1)} sx={{ border: `1px solid ${themeColors.border}` }}><ArrowLeftIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Move down">
                            <IconButton size="small" onClick={() => nudgeSelected('top', 1)} sx={{ border: `1px solid ${themeColors.border}` }}><ArrowDownIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Move right">
                            <IconButton size="small" onClick={() => nudgeSelected('left', 1)} sx={{ border: `1px solid ${themeColors.border}` }}><ArrowRightIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Box>

                        {[
                          ['Width', 'width', `${selectedPosition.width.toFixed(2)}%`],
                          ['Height', 'height', `${selectedPosition.height.toFixed(2)}%`],
                          ['Rotate', 'rotate', `${Math.round(selectedPosition.rotate || 0)} deg`]
                        ].map(([label, key, value]) => (
                          <Box key={key} sx={{ display: 'grid', gridTemplateColumns: '52px 28px 1fr 28px', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: themeColors.textSecondary }}>{label}</Typography>
                            <IconButton
                              size="small"
                              onClick={() => key === 'rotate' ? rotateSelected(-5) : resizeSelected(key, -0.1)}
                              sx={{ width: 26, height: 26, border: `1px solid ${themeColors.border}` }}
                            >
                              <RemoveIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 900, textAlign: 'center', color: themeColors.textPrimary }}>{value}</Typography>
                            <IconButton
                              size="small"
                              onClick={() => key === 'rotate' ? rotateSelected(5) : resizeSelected(key, 0.1)}
                              sx={{ width: 26, height: 26, border: `1px solid ${themeColors.border}` }}
                            >
                              <AddIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Box>
                        ))}

                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          startIcon={<SaveIcon />}
                          disabled={saving}
                          onClick={savePosition}
                          sx={{ mt: 0.5, textTransform: 'none', fontWeight: 900, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}
                        >
                          Save Lot
                        </Button>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={3.5}>
            <Paper sx={{ p: 2.2, borderRadius: '18px', border: `1px solid ${themeColors.border}`, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }}>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>Lot Controls</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>View</InputLabel>
                    <Select value={selectedPhase} label="View" onChange={(event) => handlePhaseChange(event.target.value)}>
                      <MenuItem value="all">All Phases</MenuItem>
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
                        setSelectedLotIds([event.target.value]);
                      }}
                    >
                      {phaseLots.map((lot) => (
                        <MenuItem key={lot.lotId} value={lot.lotId}>
                          {lot.lotId} - Phase {lot.phase} - Block {lot.phaseBlock} Lot {lot.lotNumber}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" startIcon={<SelectAllIcon />} variant="outlined" onClick={selectAllVisible} sx={{ textTransform: 'none', fontWeight: 800 }}>
                      Select Visible
                    </Button>
                    <Button size="small" variant="outlined" onClick={clearSelection} sx={{ textTransform: 'none', fontWeight: 800 }}>
                      Single Select
                    </Button>
                    <Chip size="small" label={`${selectedLotIds.length || 1} selected`} sx={{ fontWeight: 700 }} />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 800, mb: 1 }}>Editor Assist</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={7}>
                  <FormControlLabel
                    control={<Switch checked={snapEnabled} onChange={(event) => setSnapEnabled(event.target.checked)} />}
                    label="Snap to grid"
                  />
                </Grid>
                <Grid item xs={5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Snap</InputLabel>
                    <Select value={snapSize} label="Snap" onChange={(event) => setSnapSize(Number(event.target.value))}>
                      <MenuItem value={0.25}>0.25%</MenuItem>
                      <MenuItem value={0.5}>0.5%</MenuItem>
                      <MenuItem value={1}>1%</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button fullWidth variant="contained" disabled={saving || !draftCount} onClick={saveAllDrafts} sx={{ textTransform: 'none', fontWeight: 900, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}>
                    Save All Drafts {draftCount ? `(${draftCount})` : ''}
                  </Button>
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
                    <Button variant="contained" disabled={saving} color="error" onClick={removeSquare} sx={{ gridColumn: '1 / -1', textTransform: 'none', fontWeight: 800 }}>
                      Remove Square
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

