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
    
    const seed = (phase, block, lot) => (phase * 127 + block.charCodeAt(0) * 31 + lot * 17) % 100;
    
    let created = 0;
    
    // Phase 1-5: Each phase has 10 blocks and 50 lots total (5-10 lots per block)
    for (let phase = 1; phase <= 5; phase++) {
      // Blocks per phase: A-J for Phase 1, K-T for Phase 2, etc.
      const blockStart = 'A'.charCodeAt(0) + (phase - 1) * 10;
      
      for (let blockIndex = 0; blockIndex < 10; blockIndex++) {
        const blockChar = String.fromCharCode(blockStart + blockIndex);
        // Distribute 50 lots across 10 blocks: 5-5 lots per block (can vary)
        const lotsPerBlock = phase % 2 === 0 ? 5 : 5; // 50 lots / 10 blocks = 5 per block
        
        for (let lotNum = 1; lotNum <= lotsPerBlock; lotNum++) {
          const s = seed(phase, blockChar, lotNum);
          const lotId = `P${phase}-${blockChar}-${lotNum}`;
          
          const existing = await Lot.findOne({ lotId });
          if (!existing) {
            const sqm = LOT_SIZES[lotNum % LOT_SIZES.length];
            const lot = new Lot({
              phase,
              lotId,
              block: blockChar,
              lotNumber: lotNum,
              status: 'vacant',
              type: HOUSE_TYPES[lotNum % HOUSE_TYPES.length],
              sqm,
              price: sqm * 18000 + s * 5000,
              address: `Phase ${phase}, Block ${blockChar}, Lot ${lotNum}, Casimiro Westville Homes`,
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

module.exports = router;