const express = require('express');
const router = express.Router();
const Lot = require('../models/Lot');
const OccupancyHistory = require('../models/OccupancyHistory');
const { protect, authorize } = require('../middleware/auth');
const { paginateQuery } = require('../utils/pagination');
const { createInAppNotification } = require('../services/inAppNotificationService');
const debugLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
};

const AMENITY_LOTS = {
  'P4-B3-L6': 'Covered Court',
  'P2-B5-L13': 'Covered Court',
  'P4-B2-L7': 'Swimming Pool',
  'P3-B15-L9': 'Multi-Purpose Hall'
};

const OLD_AMENITY_LOTS = ['P4-B18-L6', 'P2-B10-L13', 'P4-B17-L7', 'P3-B5-L9'];

const isAmenityLot = (lotId) => Boolean(AMENITY_LOTS[String(lotId || '').toUpperCase()]);

const normalizeAmenityLot = async (lot, persist = false) => {
  if (!lot) return lot;
  const amenityType = AMENITY_LOTS[String(lot.lotId || '').toUpperCase()];
  if (!amenityType) return lot;

  lot.status = 'amenity';
  lot.type = amenityType;
  lot.price = null;
  lot.occupiedBy = null;
  lot.occupiedAt = null;
  lot.features = [amenityType, 'Community Amenity'];
  if (persist && typeof lot.save === 'function') {
    await lot.save();
  }
  return lot;
};

const normalizeUnassignedOccupiedLot = async (lot, persist = false) => {
  if (!lot) return lot;
  if (isAmenityLot(lot.lotId)) {
    return normalizeAmenityLot(lot, persist);
  }
  if (lot.status === 'occupied' && !lot.occupiedBy) {
    lot.status = 'vacant';
    lot.occupiedBy = null;
    lot.occupiedAt = null;
    if (persist && typeof lot.save === 'function') {
      await lot.save();
    }
  }
  return lot;
};

const emptyMapPosition = () => ({
  isPositioned: false,
  left: null,
  top: null,
  width: null,
  height: null,
  rotate: 0,
  shape: 'rectangle',
  updatedAt: new Date()
});

const cleanupUnassignedOccupiedLots = async () => {
  await Lot.updateMany(
    { lotId: { $in: OLD_AMENITY_LOTS }, status: 'amenity' },
    {
      $set: {
        status: 'vacant',
        type: 'Single Family',
        price: null,
        occupiedBy: null,
        occupiedAt: null,
        features: ['Standard Lot', 'Ready for Occupancy']
      }
    }
  );

  for (const [lotId, amenityType] of Object.entries(AMENITY_LOTS)) {
    await Lot.updateOne(
      { lotId },
      {
        $set: {
          status: 'amenity',
          type: amenityType,
          price: null,
          occupiedBy: null,
          occupiedAt: null,
          features: [amenityType, 'Community Amenity']
        }
      }
    );
  }

  await Lot.updateMany(
    { status: 'occupied', $or: [{ occupiedBy: null }, { occupiedBy: { $exists: false } }] },
    { $set: { status: 'vacant', occupiedBy: null, occupiedAt: null } }
  );
};

// Generate all lots with phases (run once to populate database)
router.post('/generate', async (req, res) => {
  try {
    const LOT_SIZES = [120, 150, 180, 200, 240, 300];
    const HOUSE_TYPES = ['Single Family', 'Townhouse', 'Corner Lot', 'End Unit'];
    
    const seed = (phase, block, lot) => (phase * 127 + block * 31 + lot * 17) % 100;
    
    let created = 0;
    
    // Phase 2 has 13 blocks; all other phases have 5. Every block has 20 lots.
    for (let phase = 1; phase <= 5; phase++) {
      const blockCount = phase === 2 ? 13 : 5;
      for (let block = 1; block <= blockCount; block++) {
        for (let lotNum = 1; lotNum <= 20; lotNum++) {
          const s = seed(phase, block, lotNum);
          const lotId = `P${phase}-B${block}-L${lotNum}`;
          
          const existing = await Lot.findOne({ lotId });
          if (!existing) {
            const sqm = LOT_SIZES[lotNum % LOT_SIZES.length];
            const lot = new Lot({
              phase,
              lotId,
              block,
              lotNumber: lotNum,
              status: 'vacant',
              type: HOUSE_TYPES[lotNum % HOUSE_TYPES.length],
              sqm,
              price: sqm * 18000 + s * 5000,
              address: `Phase ${phase} - Block ${block} - Lot ${lotNum}`,
              features: sqm >= 200 ? ['Large Lot', 'Ready for Occupancy'] : ['Standard Lot', 'Ready for Occupancy'],
              photoSeed: s
            });
            await lot.save();
            created++;
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: `Generated ${created} lots`,
      total: await Lot.countDocuments()
    });
  } catch (error) {
    console.error('Generate lots error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all available (vacant) lots
router.get('/available', async (req, res) => {
  try {
    await cleanupUnassignedOccupiedLots();
    const filter = {
      status: 'vacant',
      lotId: { $nin: Object.keys(AMENITY_LOTS) },
      'mapPosition.isPositioned': true
    };
    const { data: lots, pagination } = await paginateQuery(
      Lot.find(filter)
      .sort({ phase: 1, block: 1, lotNumber: 1 })
        .select('lotId block lotNumber type sqm price address phase status mapPosition'),
      Lot.countDocuments(filter),
      req.query,
      { defaultLimit: 1000, maxLimit: 1000 }
    );
    
    res.json({
      success: true,
      count: lots.length,
      total: pagination.total,
      pagination,
      data: lots
    });
  } catch (error) {
    console.error('Get available lots error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all lots (for admin/map)
router.get('/', async (req, res) => {
  try {
    await cleanupUnassignedOccupiedLots();
    const filter = {};
    const { data: lots, pagination } = await paginateQuery(
      Lot.find(filter)
      .sort({ phase: 1, block: 1, lotNumber: 1 })
        .populate('occupiedBy', 'firstName lastName email'),
      Lot.countDocuments(filter),
      req.query,
      { defaultLimit: 1000, maxLimit: 1000 }
    );

    for (const lot of lots) {
      await normalizeUnassignedOccupiedLot(lot, true);
    }
    
    res.json({
      success: true,
      count: lots.length,
      total: pagination.total,
      pagination,
      data: lots
    });
  } catch (error) {
    console.error('Get all lots error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Update lot status
router.put('/:lotId/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, occupiedBy } = req.body;
    
    if (!['vacant', 'occupied', 'reserved', 'amenity'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const lot = await Lot.findOne({ lotId: req.params.lotId });
    
    if (!lot) {
      return res.status(404).json({ success: false, error: 'Lot not found' });
    }

    if (isAmenityLot(lot.lotId) && status === 'occupied') {
      await normalizeAmenityLot(lot, true);
      return res.status(400).json({
        success: false,
        error: `${lot.lotId} is a ${AMENITY_LOTS[lot.lotId]} and cannot be occupied`
      });
    }
    
    const nextStatus = isAmenityLot(lot.lotId) ? 'amenity' : status === 'occupied' && !occupiedBy ? 'vacant' : status;
    const previousStatus = lot.status;
    const previousOccupiedBy = lot.occupiedBy;
    lot.status = nextStatus;
    
    if (nextStatus === 'amenity') {
      await normalizeAmenityLot(lot, false);
    } else if (nextStatus === 'occupied' && occupiedBy) {
      lot.occupiedBy = occupiedBy;
      lot.occupiedAt = new Date();
    } else if (nextStatus === 'vacant') {
      lot.occupiedBy = null;
      lot.occupiedAt = null;
    }
    
    await lot.save();
    await OccupancyHistory.create({
      lotId: lot.lotId,
      residentId: nextStatus === 'occupied' ? lot.occupiedBy : previousOccupiedBy,
      action: nextStatus === 'occupied' ? 'move_in' : nextStatus === 'vacant' ? 'move_out' : 'status_update',
      previousStatus,
      newStatus: nextStatus,
      reason: 'Manual lot status update',
      performedBy: req.user._id
    });
    if (lot.occupiedBy) {
      await createInAppNotification({
        userId: lot.occupiedBy,
        type: 'lot',
        title: 'Lot status updated',
        body: `${lot.lotId} is now ${nextStatus}.`,
        metadata: { lotId: lot.lotId, status: nextStatus, action: 'lot_status_updated' }
      });
    }
    await createInAppNotification({
      userId: req.user._id,
      type: 'lot',
      title: 'Lot status updated',
      body: `${lot.lotId} status changed from ${previousStatus} to ${nextStatus}.`,
      metadata: { lotId: lot.lotId, previousStatus, status: nextStatus, action: 'lot_status_updated' }
    });
    
    res.json({
      success: true,
      message: `Lot ${lot.lotId} status updated to ${nextStatus}`,
      data: lot
    });
  } catch (error) {
    console.error('Update lot status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/history/:lotId', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    const filter = { lotId: req.params.lotId };
    const { data: history, pagination } = await paginateQuery(
      OccupancyHistory.find(filter)
      .populate('residentId', 'firstName lastName email')
      .populate('performedBy', 'firstName lastName role')
        .sort({ createdAt: -1 }),
      OccupancyHistory.countDocuments(filter),
      req.query
    );

    res.json({
      success: true,
      count: history.length,
      total: pagination.total,
      pagination,
      data: history
    });
  } catch (error) {
    console.error('Get lot history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Save public map overlay position for a lot
router.put('/:lotId/map-position', protect, authorize('admin'), async (req, res) => {
  try {
    const { left, top, width, height, rotate = 0, shape = 'rectangle' } = req.body;
    const numbers = {
      left: Number(left),
      top: Number(top),
      width: Number(width),
      height: Number(height),
      rotate: Number(rotate)
    };

    if (
      !Number.isFinite(numbers.left) ||
      !Number.isFinite(numbers.top) ||
      !Number.isFinite(numbers.width) ||
      !Number.isFinite(numbers.height) ||
      !Number.isFinite(numbers.rotate)
    ) {
      return res.status(400).json({ success: false, error: 'Map position values must be valid numbers' });
    }

    if (
      numbers.left < 0 ||
      numbers.left > 100 ||
      numbers.top < 0 ||
      numbers.top > 100 ||
      numbers.width <= 0 ||
      numbers.width > 20 ||
      numbers.height <= 0 ||
      numbers.height > 20 ||
      numbers.rotate < -180 ||
      numbers.rotate > 180
    ) {
      return res.status(400).json({ success: false, error: 'Map position values are outside the allowed range' });
    }

    if (shape !== 'rectangle') {
      return res.status(400).json({ success: false, error: 'Invalid map shape' });
    }

    const lot = await Lot.findOne({ lotId: req.params.lotId });
    if (!lot) {
      return res.status(404).json({ success: false, error: 'Lot not found' });
    }

    lot.mapPosition = {
      isPositioned: true,
      left: numbers.left,
      top: numbers.top,
      width: numbers.width,
      height: numbers.height,
      rotate: numbers.rotate,
      shape,
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    await lot.save();
    await createInAppNotification({
      userId: req.user._id,
      type: 'lot',
      title: 'Lot map position saved',
      body: `Map position saved for ${lot.lotId}.`,
      metadata: { lotId: lot.lotId, action: 'lot_map_position_saved' }
    });

    res.json({
      success: true,
      message: `Map position saved for ${lot.lotId}`,
      data: lot
    });
  } catch (error) {
    console.error('Save lot map position error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Clear public map overlay position for a lot
router.delete('/:lotId/map-position', protect, authorize('admin'), async (req, res) => {
  try {
    const lot = await Lot.findOne({ lotId: req.params.lotId });
    if (!lot) {
      return res.status(404).json({ success: false, error: 'Lot not found' });
    }

    lot.mapPosition = {
      isPositioned: false,
      left: null,
      top: null,
      width: null,
      height: null,
      rotate: 0,
      shape: 'rectangle',
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    await lot.save();
    await createInAppNotification({
      userId: req.user._id,
      type: 'lot',
      title: 'Lot map position cleared',
      body: `Map position cleared for ${lot.lotId}.`,
      metadata: { lotId: lot.lotId, action: 'lot_map_position_cleared' }
    });

    res.json({
      success: true,
      message: `Map position cleared for ${lot.lotId}`,
      data: lot
    });
  } catch (error) {
    console.error('Clear lot map position error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const normalizeMapPosition = (mapPosition, userId = null) => {
  if (!mapPosition?.isPositioned) {
    return {
      isPositioned: false,
      left: null,
      top: null,
      width: null,
      height: null,
      rotate: 0,
      shape: 'rectangle',
      updatedBy: userId,
      updatedAt: new Date()
    };
  }

  const left = Number(mapPosition.left);
  const top = Number(mapPosition.top);
  const width = Number(mapPosition.width);
  const height = Number(mapPosition.height);
  const rotate = Number(mapPosition.rotate) || 0;

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    left < 0 ||
    left > 100 ||
    top < 0 ||
    top > 100 ||
    width <= 0 ||
    width > 20 ||
    height <= 0 ||
    height > 20 ||
    rotate < -180 ||
    rotate > 180
  ) {
    throw new Error('Invalid map position values in backup file');
  }

  return {
    isPositioned: true,
    left,
    top,
    width,
    height,
    rotate,
    shape: 'rectangle',
    updatedBy: userId,
    updatedAt: new Date()
  };
};

const normalizeBackupLot = (lot, userId = null) => {
  const phase = Number(lot.phase);
  const block = Number(lot.block);
  const lotNumber = Number(lot.lotNumber);
  const sqm = Number(lot.sqm);

  if (!lot.lotId || !Number.isFinite(phase) || !Number.isFinite(block) || !Number.isFinite(lotNumber) || !Number.isFinite(sqm)) {
    throw new Error('Backup file has a lot with missing required fields');
  }

  return {
    phase,
    block,
    lotId: String(lot.lotId),
    lotNumber,
    status: ['vacant', 'occupied', 'reserved', 'amenity'].includes(lot.status) ? lot.status : 'vacant',
    type: lot.type || 'Single Family',
    sqm,
    price: lot.price === null || lot.price === undefined || lot.price === '' ? null : Number(lot.price),
    address: lot.address || `Phase ${phase} - Block ${block} - Lot ${lotNumber}`,
    features: Array.isArray(lot.features) ? lot.features.filter(Boolean).map(String) : [],
    photoSeed: Number(lot.photoSeed) || 0,
    mapPosition: normalizeMapPosition(lot.mapPosition, userId)
  };
};

// Admin: Export restorable public lot map data as JSON
router.get('/map-data/export', protect, authorize('admin'), async (req, res) => {
  try {
    const lots = await Lot.find()
      .sort({ phase: 1, block: 1, lotNumber: 1 })
      .lean();

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: 'VIMS public lot map editor',
      count: lots.length,
      lots: lots.map((lot) => ({
        lotId: lot.lotId,
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
        mapPosition: {
          isPositioned: Boolean(lot.mapPosition?.isPositioned),
          left: lot.mapPosition?.left ?? null,
          top: lot.mapPosition?.top ?? null,
          width: lot.mapPosition?.width ?? null,
          height: lot.mapPosition?.height ?? null,
          rotate: lot.mapPosition?.rotate || 0,
          shape: lot.mapPosition?.shape || 'rectangle'
        }
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="VIMS_Lot_Map_Backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(payload);
  } catch (error) {
    console.error('Export lot map data error:', error);
    res.status(500).json({ success: false, error: 'Failed to export lot map data' });
  }
});

// Admin: Import restorable public lot map data JSON
router.post('/map-data/import', protect, authorize('admin'), async (req, res) => {
  try {
    const backupLots = Array.isArray(req.body?.lots) ? req.body.lots : null;
    if (!backupLots || !backupLots.length) {
      return res.status(400).json({ success: false, error: 'Backup file must contain a lots array' });
    }

    let created = 0;
    let updated = 0;
    let positioned = 0;

    for (const rawLot of backupLots) {
      const lotData = normalizeBackupLot(rawLot, req.user._id);
      if (lotData.mapPosition.isPositioned) positioned++;

      const existing = await Lot.findOne({ lotId: lotData.lotId });
      if (existing) {
        Object.assign(existing, lotData);
        if (lotData.status !== 'occupied') {
          existing.occupiedBy = null;
          existing.occupiedAt = null;
        }
        await existing.save();
        updated++;
      } else {
        await Lot.create(lotData);
        created++;
      }
    }

    await createInAppNotification({
      userId: req.user._id,
      type: 'lot',
      title: 'Lot map data imported',
      body: `Imported ${backupLots.length} lots. Created ${created}, updated ${updated}.`,
      metadata: { action: 'lot_map_data_imported', total: backupLots.length, created, updated, positioned }
    });

    res.json({
      success: true,
      message: `Imported ${backupLots.length} lots`,
      data: {
        total: backupLots.length,
        created,
        updated,
        positioned
      }
    });
  } catch (error) {
    console.error('Import lot map data error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to import lot map data' });
  }
});

// Check if a specific lot is available
router.get('/check/:block/:lot', async (req, res) => {
  try {
    await cleanupUnassignedOccupiedLots();
    const { block, lot } = req.params;
    const lotId = `${block.toUpperCase()}-${lot}`;
    
    const existingLot = await Lot.findOne({ lotId });
    
    if (!existingLot) {
      return res.json({ success: true, available: false, error: 'Invalid lot number' });
    }

    await normalizeAmenityLot(existingLot, true);
    
    res.json({
      success: true,
      available: existingLot.status === 'vacant' && !isAmenityLot(existingLot.lotId),
      lot: {
        lotId: existingLot.lotId,
        status: existingLot.status,
        type: existingLot.type,
        sqm: existingLot.sqm
      }
    });
  } catch (error) {
    console.error('Check lot error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export lots data (CSV or PDF format)
router.get('/export', protect, async (req, res) => {
  try {
    await cleanupUnassignedOccupiedLots();
    const { format = 'pdf', phase, block, status, type, timezoneOffset = 0 } = req.query;
    const timezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;

    debugLog('Export request:', { format, phase, block, status, type, user: req.user._id });

    // Build filter based on query parameters
    let filter = {
      'mapPosition.isPositioned': true
    };
    if (phase) filter.phase = Number(phase);
    if (block) filter.block = Number(block);
    if (status) filter.status = status;
    if (type) filter.type = type;

    const lots = await require('../models/Lot').find(filter)
      .populate('occupiedBy', 'firstName lastName email')
      .sort({ phase: 1, block: 1, lotNumber: 1 });

    debugLog(`Found ${lots.length} lots for export`);

    if (!lots.length) {
      return res.status(404).json({
        success: false,
        error: 'No lots found matching the criteria'
      });
    }

    const data = lots.map(lot => ({
      'Lot ID': lot.lotId,
      Phase: lot.phase,
      Block: lot.block,
      'Lot Number': lot.lotNumber,
      Status: lot.status,
      Type: lot.type,
      'Area (sqm)': lot.sqm,
      'Price': lot.status === 'amenity' ? 'N/A' : lot.price ? `₱${lot.price.toLocaleString()}` : 'N/A',
      Address: lot.address,
      Features: lot.features ? lot.features.join(', ') : 'None',
      'Occupied By': lot.occupiedBy ? `${lot.occupiedBy.firstName} ${lot.occupiedBy.lastName}` : 'Vacant'
    }));

    debugLog(`Prepared ${data.length} data rows for export`);

    const columns = [
      { header: 'Lot ID', key: 'Lot ID', width: 12 },
      { header: 'Phase', key: 'Phase', width: 6 },
      { header: 'Block', key: 'Block', width: 6 },
      { header: 'Lot Number', key: 'Lot Number', width: 10 },
      { header: 'Status', key: 'Status', width: 10 },
      { header: 'Type', key: 'Type', width: 15 },
      { header: 'Area (sqm)', key: 'Area (sqm)', width: 10 },
      { header: 'Price', key: 'Price', width: 12 },
      { header: 'Address', key: 'Address', width: 25 },
      { header: 'Features', key: 'Features', width: 20 },
      { header: 'Occupied By', key: 'Occupied By', width: 20 }
    ];

    const title = 'Lot Management Report';
    const lotSummary = {
      total: lots.length,
      occupied: lots.filter(l => l.status === 'occupied').length,
      vacant: lots.filter(l => l.status === 'vacant').length,
      reserved: lots.filter(l => l.status === 'reserved').length,
      amenities: lots.filter(l => l.status === 'amenity').length,
      other: lots.filter(l => !['occupied', 'vacant', 'reserved', 'amenity'].includes(l.status)).length
    };

    if (format === 'pdf') {
      debugLog('Generating PDF report...');
      const pdfReportService = require('../services/pdfReportService');
      const pdfBuffer = await pdfReportService.generateDataReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes, summary: lotSummary });

      debugLog(`PDF generated, buffer size: ${pdfBuffer.length} bytes`);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Lots_Export_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    const pdfReportService = require('../services/pdfReportService');
    const csvContent = pdfReportService.generateCsvReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="VIMS_Lots_Export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export lots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export lots'
    });
  }
});

// Get lot by ID
router.get('/:lotId', async (req, res) => {
  try {
    const lot = await Lot.findOne({ lotId: req.params.lotId })
      .populate('occupiedBy', 'firstName lastName email phone');
    
    if (!lot) {
      return res.status(404).json({ success: false, error: 'Lot not found' });
    }
    
    res.json({
      success: true,
      data: lot
    });
  } catch (error) {
    console.error('Get lot error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
