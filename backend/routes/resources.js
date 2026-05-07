const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const { protect, authorize } = require('../middleware/auth');

// Get all resources
router.get('/', protect, async (req, res) => {
  try {
    const resources = await Resource.find({ isActive: true }).sort({ type: 1, name: 1 });
    res.json({ success: true, data: resources });
  } catch (error) {
    console.error('Get resources error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch resources' });
  }
});

// Create a new resource (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { type, name, description } = req.body;

    if (!type || !name) {
      return res.status(400).json({ success: false, error: 'Type and name are required' });
    }

    const existingResource = await Resource.findOne({ name: name.trim() });
    if (existingResource) {
      return res.status(409).json({ success: false, error: 'Resource with this name already exists' });
    }

    const resource = await Resource.create({
      type,
      name: name.trim(),
      description: description || '',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    console.error('Create resource error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create resource' });
  }
});

// Update a resource (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { type, name, description, isActive } = req.body;

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    if (name && name !== resource.name) {
      const existingResource = await Resource.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
      if (existingResource) {
        return res.status(409).json({ success: false, error: 'Resource with this name already exists' });
      }
    }

    const updatedResource = await Resource.findByIdAndUpdate(
      req.params.id,
      {
        type: type || resource.type,
        name: name ? name.trim() : resource.name,
        description: description !== undefined ? description : resource.description,
        isActive: isActive !== undefined ? isActive : resource.isActive,
      },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: updatedResource });
  } catch (error) {
    console.error('Update resource error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update resource' });
  }
});

// Delete a resource (admin only) - soft delete by setting isActive to false
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    // Check if resource is being used in active reservations
    const Reservation = require('../models/Reservation');
    const activeReservations = await Reservation.find({
      resourceName: resource.name,
      status: { $in: ['pending', 'confirmed', 'borrowed'] }
    });

    if (activeReservations.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete resource that has active reservations'
      });
    }

    await Resource.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Resource deactivated successfully' });
  } catch (error) {
    console.error('Delete resource error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete resource' });
  }
});

module.exports = router;