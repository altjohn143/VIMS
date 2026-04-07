const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { sendServiceRequestStatusNotification } = require('../services/notificationService');
const { createInAppNotification } = require('../services/inAppNotificationService');

router.post('/', protect, authorize('resident'), async (req, res) => {
  try {
    const {
      category,
      title,
      description,
      priority,
      location
    } = req.body;
    
    if (!category || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Category, title, and description are required'
      });
    }
    
    const serviceRequest = await ServiceRequest.create({
      residentId: req.user.id,
      category,
      title,
      description,
      priority: priority || 'medium',
      location: location || '',
      status: 'pending'
    });
    
    res.status(201).json({
      success: true,
      message: 'Service request submitted successfully',
      data: serviceRequest
    });
    
  } catch (error) {
    console.error('Create service request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit service request'
    });
  }
});

router.get('/my', protect, authorize('resident'), async (req, res) => {
  try {
    const { status } = req.query;
    
    let filter = { residentId: req.user.id };
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    const requests = await ServiceRequest.find(filter)
      .populate('assignedTo', 'firstName lastName role')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
    
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service requests'
    });
  }
});

router.get('/', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    const { status, category, priority, residentId } = req.query;
    
    let filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (residentId) filter.residentId = residentId;
    
    const requests = await ServiceRequest.find(filter)
      .populate('residentId', 'firstName lastName houseNumber phone email')
      .populate('assignedTo', 'firstName lastName role phone')
      .populate('reviewedBy', 'firstName lastName')
      .populate('completedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
    
  } catch (error) {
    console.error('Get service requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service requests'
    });
  }
});

router.put('/:id/assign', protect, authorize('admin'), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'Staff ID is required'
      });
    }
    
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }
    
    request.assignedTo = assignedTo;
    request.assignedAt = new Date();
    request.status = 'assigned';
    
    await request.save();
    await createInAppNotification({
      userId: request.residentId,
      type: 'service_request',
      title: 'Service request assigned',
      body: `${request.title} was assigned to staff.`,
      metadata: { requestId: request._id, status: request.status }
    });
    const resident = await User.findById(request.residentId).select('email phone');
    if (resident) {
      await sendServiceRequestStatusNotification(request, resident, {
        actorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Admin'
      });
    }
    
    res.json({
      success: true,
      message: 'Service request assigned successfully',
      data: request
    });
    
  } catch (error) {
    console.error('Assign request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign service request'
    });
  }
});

router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, adminNotes, updatedBy, completedBy, completedAt, cancelledBy, cancelledAt } = req.body;
    
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }

    if (req.user.role === 'admin') {
      request.status = status;

      if (status === 'completed') {
        request.completedAt = completedAt || new Date();
        request.completedBy = completedBy || req.user.id;
      }
      
      if (status === 'cancelled') {
        request.cancelledAt = cancelledAt || new Date();
        request.cancelledBy = cancelledBy || req.user.id;
      }
      
      if (adminNotes) {
        request.adminNotes = adminNotes;
      }
    } 
    else if (req.user.role === 'resident') {
      if (request.residentId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this request'
        });
      }

      if (status === 'cancelled' && request.status === 'pending') {
        request.status = status;
        request.cancelledAt = new Date();
        request.cancelledBy = req.user.id;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Residents can only cancel pending requests'
        });
      }
    }
    else if (req.user.role === 'security') {
      if (request.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Not assigned to this request'
        });
      }
      
      if (['in-progress', 'completed'].includes(status)) {
        request.status = status;
        
        if (status === 'completed') {
          request.completedAt = new Date();
          request.completedBy = req.user.id;
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Staff can only change to in-progress or completed'
        });
      }
    }
    
    await request.save();
    await createInAppNotification({
      userId: request.residentId,
      type: 'service_request',
      title: 'Service request status updated',
      body: `${request.title} is now ${request.status}.`,
      metadata: { requestId: request._id, status: request.status }
    });
    const resident = await User.findById(request.residentId).select('email phone');
    if (resident) {
      await sendServiceRequestStatusNotification(request, resident, {
        actorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.role
      });
    }
    
    res.json({
      success: true,
      message: 'Service request status updated',
      data: request
    });
    
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

router.put('/:id/rate', protect, authorize('resident'), async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }
    
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }
    
    if (request.residentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to rate this request'
      });
    }
    
    if (request.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only completed requests can be rated'
      });
    }
    
    request.rating = rating;
    request.feedback = feedback || '';
    
    await request.save();
    await createInAppNotification({
      userId: request.residentId,
      type: 'service_request',
      title: 'Service request assigned',
      body: `${request.title} was assigned to staff.`,
      metadata: { requestId: request._id, status: request.status }
    });
    const resident = await User.findById(request.residentId).select('email phone');
    if (resident) {
      await sendServiceRequestStatusNotification(request, resident, {
        actorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Admin'
      });
    }
    
    res.json({
      success: true,
      message: 'Service rated successfully',
      data: request
    });
    
  } catch (error) {
    console.error('Rate service error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rate service'
    });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = { residentId: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    const requests = await ServiceRequest.find(query)
      .populate('residentId', 'firstName lastName email phone houseNumber')
      .populate('assignedTo', 'firstName lastName role')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
    
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service requests'
    });
  }
});

router.get('/admin/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ 
      status: { $in: ['pending', 'under-review'] } 
    })
      .populate('residentId', 'firstName lastName houseNumber phone email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
    
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending requests'
    });
  }
});

router.get('/admin/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalRequests,
      todayRequests,
      pendingRequests,
      underReviewRequests,
      assignedRequests,
      inProgressRequests,
      completedRequests,
      urgentRequests
    ] = await Promise.all([
      ServiceRequest.countDocuments(),
      ServiceRequest.countDocuments({ createdAt: { $gte: today } }),
      ServiceRequest.countDocuments({ status: 'pending' }),
      ServiceRequest.countDocuments({ status: 'under-review' }),
      ServiceRequest.countDocuments({ status: 'assigned' }),
      ServiceRequest.countDocuments({ status: 'in-progress' }),
      ServiceRequest.countDocuments({ status: 'completed' }),
      ServiceRequest.countDocuments({ priority: 'urgent' })
    ]);

    const categoryStats = await ServiceRequest.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalRequests,
        todayRequests,
        pendingRequests,
        underReviewRequests,
        assignedRequests,
        inProgressRequests,
        completedRequests,
        urgentRequests,
        categoryStats
      }
    });
    
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard stats'
    });
  }
});

router.get('/stats/summary', protect, async (req, res) => {
  try {
    const totalRequests = await ServiceRequest.countDocuments();
    const pendingRequests = await ServiceRequest.countDocuments({ status: 'pending' });
    const inProgressRequests = await ServiceRequest.countDocuments({ status: 'in-progress' });
    const completedRequests = await ServiceRequest.countDocuments({ status: 'completed' });
    const avgRating = await ServiceRequest.aggregate([
      { $match: { rating: { $ne: null } } },
      { $group: { _id: null, average: { $avg: "$rating" } } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalRequests,
        pendingRequests,
        inProgressRequests,
        completedRequests,
        averageRating: avgRating[0]?.average || 0
      }
    });
    
  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service statistics'
    });
  }
});

router.put('/:id/assign-staff', protect, authorize('admin'), async (req, res) => {
  try {
    const { assignedTo, adminNotes } = req.body;
    
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'Staff ID is required'
      });
    }
    
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }
    
    const staff = await User.findById(assignedTo);
    if (!staff || !['admin', 'security'].includes(staff.role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff member'
      });
    }
    
    request.status = 'assigned';
    request.assignedTo = assignedTo;
    request.assignedAt = new Date();
    if (adminNotes) request.adminNotes = adminNotes;
    
    await request.save();
    await createInAppNotification({
      userId: request.residentId,
      type: 'service_request',
      title: 'Service request reviewed',
      body: `${request.title} was reviewed by admin.`,
      metadata: { requestId: request._id, status: request.status }
    });
    const resident = await User.findById(request.residentId).select('email phone');
    if (resident) {
      await sendServiceRequestStatusNotification(request, resident, {
        actorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Admin'
      });
    }
    
    res.json({
      success: true,
      message: 'Service request assigned to staff',
      data: request
    });
    
  } catch (error) {
    console.error('Assign staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign service request'
    });
  }
});

router.put('/:id/review', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, adminNotes, estimatedCost, estimatedCompletion } = req.body;
    
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }

    request.status = status || 'under-review';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    
    if (adminNotes) request.adminNotes = adminNotes;
    if (estimatedCost) request.estimatedCost = estimatedCost;
    if (estimatedCompletion) request.estimatedCompletion = new Date(estimatedCompletion);
    
    await request.save();
    const resident = await User.findById(request.residentId).select('email phone');
    if (resident) {
      await sendServiceRequestStatusNotification(request, resident, {
        actorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Admin'
      });
    }
    
    res.json({
      success: true,
      message: 'Service request reviewed successfully',
      data: request
    });
    
  } catch (error) {
    console.error('Review request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review service request'
    });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { deleteReason, deletedBy } = req.body;
    
    if (!deleteReason) {
      return res.status(400).json({
        success: false,
        error: 'Delete reason is required'
      });
    }
    
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }

    await ServiceRequest.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Service request deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service request'
    });
  }
});

router.get('/admin/staff', protect, authorize('admin'), async (req, res) => {
  try {
    const staffMembers = await User.find({
      role: { $in: ['admin', 'security'] },
      isActive: true
    }).select('firstName lastName email phone role');
    
    res.json({
      success: true,
      data: staffMembers
    });
    
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get staff members'
    });
  }
});

module.exports = router;