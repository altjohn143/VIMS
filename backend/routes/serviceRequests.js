const express = require('express');
const multer = require('multer');
const router = express.Router();

const isSecurityHeadOfficer = (user) =>
  user?.role === 'security' && (
    user.securityLevel === 'head-officer' ||
    String(user.email || '').toLowerCase() === 'security@vims.com'
  );
const getHeadOfficerStaffFilter = (headOfficerId) => ({
  role: 'security',
  securityLevel: 'personnel',
  isActive: true,
  isArchived: false,
  $or: [
    { headOfficerId },
    { headOfficerId: null },
    { headOfficerId: { $exists: false } }
  ]
});
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { sendServiceRequestStatusNotification } = require('../services/notificationService');
const { createInAppNotification } = require('../services/inAppNotificationService');
const { uploadImageBuffer, deleteImage } = require('../services/cloudinaryService');

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, callback) => {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.mimetype || '')) {
      return callback(new Error('Attachments must be JPEG, PNG, or WebP images'));
    }
    callback(null, true);
  }
});

const removeUploadedAssets = async (assets = []) => {
  await Promise.allSettled(assets.map((asset) => deleteImage(asset.publicId)));
};

const notifyAdminsOnCancellation = async (serviceRequest) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(admins.map(admin => createInAppNotification({
      userId: admin._id,
      type: 'service_request',
      title: 'Service request cancelled by resident',
      body: `${serviceRequest.title} was cancelled by the resident.`,
      metadata: {
        requestId: serviceRequest._id,
        status: serviceRequest.status,
        cancelledBy: serviceRequest.cancelledBy,
        cancelledReason: serviceRequest.cancelledReason
      }
    })));
  } catch (error) {
    console.error('Failed to notify admins about request cancellation:', error.message);
  }
};

router.post('/', protect, authorize('resident'), attachmentUpload.array('attachments', 3), async (req, res) => {
  let uploadedAttachments = [];
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
    
    if (req.files?.length) {
      for (const file of req.files) {
        const uploaded = await uploadImageBuffer(file.buffer, { folder: 'vims/service-requests' });
        uploadedAttachments.push({
          filename: file.originalname,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date()
        });
      }
    }

    const serviceRequest = await ServiceRequest.create({
      residentId: req.user.id,
      category,
      title,
      description,
      priority: priority || 'medium',
      location: location || '',
      status: 'pending',
      attachments: uploadedAttachments
    });
    
    res.status(201).json({
      success: true,
      message: 'Service request submitted successfully',
      data: serviceRequest
    });
    
  } catch (error) {
    if (uploadedAttachments.length) await removeUploadedAssets(uploadedAttachments);
    console.error('Create service request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit service request'
    });
  }
});

router.delete('/:id/attachments/:attachmentId', protect, async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, error: 'Service request not found' });

    const ownsRequest = String(request.residentId) === String(req.user.id);
    if (!ownsRequest && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to remove this attachment' });
    }
    if (ownsRequest && request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Attachments cannot be changed after processing starts' });
    }

    const attachment = request.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ success: false, error: 'Attachment not found' });

    const publicId = attachment.publicId;
    attachment.deleteOne();
    await request.save();
    if (publicId) await deleteImage(publicId);

    return res.json({ success: true, message: 'Attachment removed' });
  } catch (error) {
    console.error('Remove service request attachment error:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove attachment' });
  }
});

router.get('/my', protect, authorize('resident'), async (req, res) => {
  try {
    const { status } = req.query;
    
    let filter = { residentId: req.user.id, isArchived: false };
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    const requests = await ServiceRequest.find(filter)
      .populate('assignedTo', 'firstName lastName role')
      .populate('cancelledBy', 'firstName lastName role')
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

router.get('/my/archived', protect, authorize('resident'), async (req, res) => {
  try {
    const { category } = req.query;

    const filter = { residentId: req.user.id, isArchived: true };
    if (category) filter.category = category;

    const requests = await ServiceRequest.find(filter)
      .populate('assignedTo', 'firstName lastName role')
      .populate('cancelledBy', 'firstName lastName role')
      .sort({ archivedAt: -1, updatedAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get my archived requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get archived service requests'
    });
  }
});

router.get('/', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    const { status, category, priority, residentId } = req.query;
    
    let filter = { isArchived: false };

    if (req.user.role === 'security') {
      if (isSecurityHeadOfficer(req.user)) {
        filter.category = { $in: ['security', 'complaint'] };
      } else {
        filter.assignedTo = req.user.id;
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (category && category !== 'all') {
      if (req.user.role === 'security' && isSecurityHeadOfficer(req.user)) {
        if (['security', 'complaint'].includes(category)) filter.category = category;
      } else {
        filter.category = category;
      }
    }
    if (priority && priority !== 'all') filter.priority = priority;
    if (residentId) filter.residentId = residentId;
    
    const requests = await ServiceRequest.find(filter)
      .populate('residentId', 'firstName lastName houseNumber phone email')
      .populate('assignedTo', 'firstName lastName role phone')
      .populate('reviewedBy', 'firstName lastName')
      .populate('completedBy', 'firstName lastName')
      .populate('cancelledBy', 'firstName lastName role')
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
    const { status, adminNotes, updatedBy, completedBy, completedAt, cancelledBy, cancelledAt, cancelledReason } = req.body;
    
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
        request.cancelledReason = cancelledReason || request.cancelledReason || 'Cancelled by admin';
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

      if (status === 'cancelled' && ['pending', 'under-review', 'assigned', 'in-progress'].includes(request.status)) {
        request.status = status;
        request.cancelledAt = new Date();
        request.cancelledBy = req.user.id;
        request.cancelledReason = cancelledReason || 'Cancelled by resident';
      } else {
        return res.status(400).json({
          success: false,
          error: 'Residents can only cancel active requests'
        });
      }
    }
    else if (req.user.role === 'security') {
      const assignedToId = request.assignedTo?._id?.toString() || request.assignedTo?.toString();
      const canHeadOfficerHandle = isSecurityHeadOfficer(req.user) && ['security', 'complaint'].includes(request.category);
      if (canHeadOfficerHandle && !assignedToId) {
        return res.status(400).json({
          success: false,
          error: 'Assign this request to a security officer before updating its status'
        });
      }
      const currentSecurityId = req.user.id || req.user._id?.toString();
      if (assignedToId !== currentSecurityId && !canHeadOfficerHandle) {
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

    if (request.status === 'cancelled' && request.cancelledBy?.toString() === request.residentId?.toString()) {
      await notifyAdminsOnCancellation(request);
    }

    await createInAppNotification({
      userId: request.residentId,
      type: 'service_request',
      title: 'Service request status updated',
      body: `${request.title} is now ${request.status}.`,
      metadata: {
        requestId: request._id,
        status: request.status,
        cancelledReason: request.cancelledReason
      }
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

router.put('/:id', protect, authorize('resident'), async (req, res) => {
  try {
    const { title, description, priority, location } = req.body;

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
        error: 'Not authorized to edit this request'
      });
    }

    if (request.category !== 'complaint') {
      return res.status(400).json({
        success: false,
        error: 'Only complaints can be edited here'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending complaints can be edited'
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    request.title = title;
    request.description = description;
    request.priority = priority || request.priority || 'medium';
    request.location = location || '';

    await request.save();

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      data: request
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update complaint'
    });
  }
});

router.put('/:id/archive', protect, authorize('resident', 'admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }

    if (req.user.role === 'resident') {
      if (request.residentId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to archive this request'
        });
      }

      if (request.category !== 'complaint') {
        return res.status(400).json({
          success: false,
          error: 'Only complaints can be archived here'
        });
      }

      if (!['completed', 'cancelled', 'rejected'].includes(request.status)) {
        return res.status(400).json({
          success: false,
          error: 'Only resolved or cancelled complaints can be archived'
        });
      }
    }

    request.isArchived = true;
    request.archivedAt = new Date();
    request.archivedBy = req.user._id;
    request.archivedReason = reason || (req.user.role === 'resident' ? 'Archived by resident' : 'Archived by admin');
    await request.save();

    res.json({
      success: true,
      message: 'Complaint archived successfully',
      data: request
    });
  } catch (error) {
    console.error('Archive complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive complaint'
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
      status: { $in: ['pending', 'under-review'] },
      isArchived: false
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

// Get daily service request stats for a specific date
router.get('/stats/daily', protect, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date parameter is required' });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const totalRequests = await ServiceRequest.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    const pendingRequests = await ServiceRequest.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'pending'
    });
    const completedRequests = await ServiceRequest.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed'
    });

    res.json({
      success: true,
      data: {
        totalRequests,
        pendingRequests,
        completedRequests
      }
    });

  } catch (error) {
    console.error('Get daily service request stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily service request statistics'
    });
  }
});

router.put('/:id/assign-staff', protect, authorize('admin', 'security'), async (req, res) => {
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

    if (req.user.role === 'security' && !isSecurityHeadOfficer(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Only the security head officer can assign security requests'
      });
    }

    if (req.user.role === 'security' && !['security', 'complaint'].includes(request.category)) {
      return res.status(403).json({
        success: false,
        error: 'Head officers can only assign security and complaint requests'
      });
    }
    
    const staff = await User.findById(assignedTo);
    if (!staff || !staff.isActive || staff.role === 'resident') {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff member'
      });
    }

    if (['security', 'complaint'].includes(request.category) && staff.role !== 'security') {
      return res.status(400).json({
        success: false,
        error: 'Security and complaint requests must be assigned to security staff'
      });
    }

    if (req.user.role === 'security') {
      const isUnassignedPersonnel = !staff.headOfficerId;
      const supervisedByCurrentOfficer = staff.headOfficerId && String(staff.headOfficerId) === String(req.user.id);
      if (staff.securityLevel === 'head-officer' || (!supervisedByCurrentOfficer && !isUnassignedPersonnel)) {
        return res.status(403).json({
          success: false,
          error: 'You can only assign requests to security staff under your supervision'
        });
      }
      if (isUnassignedPersonnel) {
        staff.headOfficerId = req.user._id;
        await staff.save();
      }
    }

    if (!['security', 'complaint'].includes(request.category) && staff.role === 'security') {
      return res.status(400).json({
        success: false,
        error: 'Security staff can only be assigned to security and complaint requests'
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
    const { reason } = req.body;
    
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }

    request.isArchived = true;
    request.archivedAt = new Date();
    request.archivedBy = req.user._id;
    request.archivedReason = reason || 'No reason provided';
    await request.save();
    
    res.json({
      success: true,
      message: 'Service request archived successfully'
    });
    
  } catch (error) {
    console.error('Archive request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive service request'
    });
  }
});

// Restore archived service request
router.put('/:id/restore', protect, authorize('admin'), async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }
    
    if (!request.isArchived) {
      return res.status(400).json({
        success: false,
        error: 'Service request is not archived'
      });
    }
    
    request.isArchived = false;
    request.archivedAt = null;
    request.archivedBy = null;
    request.archivedReason = '';
    await request.save();
    
    res.json({
      success: true,
      message: 'Service request restored successfully',
      data: request
    });
    
  } catch (error) {
    console.error('Restore request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore service request'
    });
  }
});

router.get('/admin/staff', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    if (req.user.role === 'security' && !isSecurityHeadOfficer(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Only the security head officer can view assignable staff'
      });
    }

    const filter = req.user.role === 'security'
      ? getHeadOfficerStaffFilter(req.user._id)
      : {
          role: { $ne: 'resident' },
          isActive: true,
          isArchived: false
        };

    const staffMembers = await User.find(filter)
      .select('firstName lastName email phone role securityLevel assignedPhases assignedAreas patrolSchedule headOfficerId');
    
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

// Get archived service requests
router.get('/archived', protect, authorize('admin'), async (req, res) => {
  try {
    const serviceRequests = await ServiceRequest.find({ isArchived: true })
      .populate('residentId', 'firstName lastName email houseNumber')
      .populate('assignedTo', 'firstName lastName email')
      .populate('archivedBy', 'firstName lastName email')
      .sort({ archivedAt: -1 });
    
    res.json({
      success: true,
      data: serviceRequests
    });
    
  } catch (error) {
    console.error('Get archived service requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get archived service requests'
    });
  }
});

// Export service requests data (CSV or PDF format)
router.get('/export', protect, authorize('admin', 'security'), async (req, res) => {
  try {
    const { format = 'pdf', status, category, priority, assignedTo, startDate, endDate, timezoneOffset = '0' } = req.query;
    const timezoneOffsetMinutes = Number(timezoneOffset) || 0;

    // Build filter based on user role and query parameters
    let filter = {};
    if (req.user.role === 'security') {
      filter.assignedTo = req.user.id;
    }

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo && req.user.role === 'admin') filter.assignedTo = assignedTo;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const serviceRequests = await ServiceRequest.find(filter)
      .populate('residentId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 });

    if (!serviceRequests.length) {
      return res.status(404).json({
        success: false,
        error: 'No service requests found matching the criteria'
      });
    }

    const data = serviceRequests.map(request => ({
      ID: request._id.toString(),
      Resident: request.residentId ? `${request.residentId.firstName} ${request.residentId.lastName}` : 'Unknown',
      Category: request.category,
      Title: request.title,
      Priority: request.priority,
      Status: request.status,
      'Assigned To': request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : 'Unassigned',
      Location: request.location || 'N/A',
      Rating: request.rating || 'N/A',
      'Created Date': request.createdAt.toLocaleDateString(),
      'Updated Date': request.updatedAt.toLocaleDateString()
    }));

    const columns = [
      { header: 'ID', key: 'ID', width: 25 },
      { header: 'Resident', key: 'Resident', width: 20 },
      { header: 'Category', key: 'Category', width: 15 },
      { header: 'Title', key: 'Title', width: 30 },
      { header: 'Priority', key: 'Priority', width: 10 },
      { header: 'Status', key: 'Status', width: 12 },
      { header: 'Assigned To', key: 'Assigned To', width: 20 },
      { header: 'Location', key: 'Location', width: 15 },
      { header: 'Rating', key: 'Rating', width: 8 },
      { header: 'Created Date', key: 'Created Date', width: 12 },
      { header: 'Updated Date', key: 'Updated Date', width: 12 }
    ];

    const title = req.user.role === 'security' ? 'Security Service Requests Report' : 'Admin Service Requests Report';

    if (format === 'pdf') {
      const pdfReportService = require('../services/pdfReportService');
      const pdfBuffer = await pdfReportService.generateDataReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Service_Requests_Export_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    const pdfReportService = require('../services/pdfReportService');
    const csvContent = pdfReportService.generateCsvReport(title, data, columns, { creator: req.user, timezoneOffsetMinutes });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="VIMS_Service_Requests_Export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export service requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export service requests'
    });
  }
});

module.exports = router;
