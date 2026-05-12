const express = require('express');
const router = express.Router();
const Lot = require('../models/Lot');
const OccupancyHistory = require('../models/OccupancyHistory');
const { protect, authorize } = require('../middleware/auth');

// Generate all lots with phases (run once to populate database)
router.post('/generate', async (req, res) => {
  try {
    const LOT_SIZES = [120, 150, 180, 200, 240, 300];
    const HOUSE_TYPES = ['Single Family', 'Townhouse', 'Corner Lot', 'End Unit'];
    
    const seed = (phase, block, lot) => (phase * 127 + block * 31 + lot * 17) % 100;
    
    let created = 0;
    
    // Phase 1-5: Each phase has 5 blocks and 100 lots total (20 lots per block)
    for (let phase = 1; phase <= 5; phase++) {
      for (let block = 1; block <= 5; block++) {
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
    const lots = await Lot.find({ status: 'vacant' })
      .sort({ phase: 1, block: 1, lotNumber: 1 })
      .select('lotId block lotNumber type sqm price address phase');
    
    res.json({
      success: true,
      count: lots.length,
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
    const lots = await Lot.find()
      .sort({ phase: 1, block: 1, lotNumber: 1 })
      .populate('occupiedBy', 'firstName lastName email');
    
    res.json({
      success: true,
      count: lots.length,
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
    
    if (!['vacant', 'occupied', 'reserved'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const lot = await Lot.findOne({ lotId: req.params.lotId });
    
    if (!lot) {
      return res.status(404).json({ success: false, error: 'Lot not found' });
    }
    
    const previousStatus = lot.status;
    const previousOccupiedBy = lot.occupiedBy;
    lot.status = status;
    
    if (status === 'occupied' && occupiedBy) {
      lot.occupiedBy = occupiedBy;
      lot.occupiedAt = new Date();
    } else if (status === 'vacant') {
      lot.occupiedBy = null;
      lot.occupiedAt = null;
    }
    
    await lot.save();
    await OccupancyHistory.create({
      lotId: lot.lotId,
      residentId: status === 'occupied' ? lot.occupiedBy : previousOccupiedBy,
      action: status === 'occupied' ? 'move_in' : status === 'vacant' ? 'move_out' : 'status_update',
      previousStatus,
      newStatus: status,
      reason: 'Manual lot status update',
      performedBy: req.user._id
    });
    
    res.json({
      success: true,
      message: `Lot ${lot.lotId} status updated to ${status}`,
      data: lot
    });
  } catch (error) {
    console.error('Update lot status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/history/:lotId', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    const history = await OccupancyHistory.find({ lotId: req.params.lotId })
      .populate('residentId', 'firstName lastName email')
      .populate('performedBy', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Get lot history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if a specific lot is available
router.get('/check/:block/:lot', async (req, res) => {
  try {
    const { block, lot } = req.params;
    const lotId = `${block.toUpperCase()}-${lot}`;
    
    const existingLot = await Lot.findOne({ lotId });
    
    if (!existingLot) {
      return res.json({ success: true, available: false, error: 'Invalid lot number' });
    }
    
    res.json({
      success: true,
      available: existingLot.status === 'vacant',
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
    const { format = 'pdf', phase, block, status, type, timezoneOffset = 0 } = req.query;
    const timezoneOffsetMinutes = parseInt(timezoneOffset, 10) || 0;

    console.log('Export request:', { format, phase, block, status, type, user: req.user._id });

    // Build filter based on query parameters
    let filter = {};
    if (phase) filter.phase = Number(phase);
    if (block) filter.block = Number(block);
    if (status) filter.status = status;
    if (type) filter.type = type;

    const lots = await require('../models/Lot').find(filter)
      .populate('occupiedBy', 'firstName lastName email')
      .sort({ phase: 1, block: 1, lotNumber: 1 });

    console.log(`Found ${lots.length} lots for export`);

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
      'Price': lot.price ? `₱${lot.price.toLocaleString()}` : 'N/A',
      Address: lot.address,
      Features: lot.features ? lot.features.join(', ') : 'None',
      'Occupied By': lot.occupiedBy ? `${lot.occupiedBy.firstName} ${lot.occupiedBy.lastName}` : 'Vacant'
    }));

    console.log(`Prepared ${data.length} data rows for export`);

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

    if (format === 'pdf') {
      console.log('Generating PDF report...');
      const pdfReportService = require('../services/pdfReportService');
      const pdfBuffer = await pdfReportService.generateDataReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes });

      console.log(`PDF generated, buffer size: ${pdfBuffer.length} bytes`);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Lots_Export_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    // CSV format
    const csvData = data.map(row => columns.map(col => `"${row[col.key] || ''}"`).join(','));
    const csvHeader = columns.map(col => `"${col.header}"`).join(',');
    const csvContent = [csvHeader, ...csvData].join('\n');

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