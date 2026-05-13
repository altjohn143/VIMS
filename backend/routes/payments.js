const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { createInAppNotification } = require('../services/inAppNotificationService');
const { analyzeReceiptFraud } = require('../services/openaiReceiptFraudService');

const MONTHLY_DUES_AMOUNT_KEY = 'monthly_dues_amount';

async function getMonthlyDuesAmount() {
  const setting = await Setting.findOne({ key: MONTHLY_DUES_AMOUNT_KEY });
  return typeof setting?.value === 'number' ? setting.value : 500;
}

async function setMonthlyDuesAmount(amount) {
  return await Setting.findOneAndUpdate(
    { key: MONTHLY_DUES_AMOUNT_KEY },
    { value: amount, description: 'Default monthly dues amount for association dues.' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function createMonthlyDuesForResident(resident, targetMonth, targetYear) {
  const dueDay = 10;
  const defaultInclusions = ['Maintenance', 'Security', 'Garbage', 'Common Area Upkeep', 'Administrative fees'];

  const existingDues = await Payment.findOne({
    residentId: resident._id,
    paymentType: 'monthly_dues',
    'billingPeriod.month': targetMonth,
    'billingPeriod.year': targetYear
  });

  if (existingDues) {
    return existingDues;
  }

  const monthlyDuesAmount = await getMonthlyDuesAmount();

  return await Payment.create({
    residentId: resident._id,
    amount: monthlyDuesAmount,
    paymentType: 'monthly_dues',
    status: 'pending',
    dueDate: new Date(targetYear, targetMonth - 1, dueDay),
    billingPeriod: { month: targetMonth, year: targetYear },
    description: `Monthly Association Dues - ${new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })} ${targetYear}`,
    notes: 'Includes Maintenance, Security, Garbage, Common Area Upkeep, and Administrative fees.',
    inclusions: defaultInclusions
  });
}

// ========== PAYMENT ROUTES ==========

// Test route to verify payments API is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Payments API is working!' });
});

// Get all payments for logged-in resident
router.get('/my', protect, authorize('resident'), async (req, res) => {
  try {
    const payments = await Payment.find({ residentId: req.user.id }).sort({ createdAt: -1 });
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const overduePayments = payments.filter(p => p.status === 'pending' && new Date() > p.dueDate);
    
    res.json({
      success: true,
      data: payments,
      summary: {
        totalPaid,
        totalPending: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        pendingCount: pendingPayments.length,
        overdueCount: overduePayments.length,
        overdueAmount: overduePayments.reduce((sum, p) => sum + p.amount, 0)
      }
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payments' });
  }
});

// Get current monthly dues
router.get('/current-dues', protect, authorize('resident'), async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const dueDay = 10;

    // Users created after the 10th of the current month should be billed next month.
    let targetMonth = currentMonth;
    let targetYear = currentYear;

    console.log(`Fetching current dues for user ${req.user.id}, month: ${targetMonth}, year: ${targetYear}`);

    // Check if resident was created after the 10th of the current month and bill next month if needed.
    const user = await User.findById(req.user.id);
    const createdAt = user.createdAt ? new Date(user.createdAt) : null;

    if (
      createdAt &&
      createdAt.getFullYear() === currentYear &&
      createdAt.getMonth() === currentMonth - 1 &&
      createdAt.getDate() > dueDay
    ) {
      targetMonth += 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    }

    const dues = await createMonthlyDuesForResident(user, targetMonth, targetYear);

    res.json({ success: true, data: dues });
  } catch (error) {
    console.error('Get current dues error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get current dues' });
  }
});

// Get specific payment
router.get('/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('residentId', 'firstName lastName email houseNumber');
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (req.user.role !== 'admin' && payment.residentId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get payment' });
  }
});

// Process payment
router.post('/:id/pay', protect, authorize('resident'), async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    
    if (!paymentMethod) {
      return res.status(400).json({ success: false, error: 'Payment method required' });
    }
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    if (payment.status === 'paid') {
      return res.status(400).json({ success: false, error: 'Already paid' });
    }
    
    const referenceNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Handle cash payment
    if (paymentMethod === 'cash') {
      payment.status = 'pending';
      payment.paymentMethod = 'cash';
      payment.referenceNumber = referenceNumber;
      await payment.save();
      return res.json({ 
        success: true, 
        message: 'Cash payment selected. Please pay at the admin office.', 
        data: payment 
      });
    }
    
    // For QRPh payments - mark as pending with QRPh method
    if (paymentMethod === 'qrph') {
      payment.paymentMethod = 'qrph';
      payment.referenceNumber = referenceNumber;
      payment.status = 'pending';
      await payment.save();
      
      return res.json({
        success: true,
        message: 'QRPh payment initiated. Please complete the payment by scanning the QR code.',
        data: payment
      });
    }
    
    res.json({
      success: true,
      data: payment
    });
    
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to process payment' });
  }
});

// Upload QRPh payment receipt
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'receipt-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/upload-qrph-receipt', protect, authorize('resident'), upload.single('receipt'), async (req, res) => {
  try {
    const { referenceNumber, paymentId, amount } = req.body;
    const receiptFile = req.file;
    
    console.log('=== DEBUG UPLOAD ===');
    console.log('Payment ID received:', paymentId);
    console.log('Reference number:', referenceNumber);
    console.log('File received:', receiptFile ? `Yes (${receiptFile.filename})` : 'No');
    
    // Validate paymentId format
    if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
      console.error('Invalid payment ID:', paymentId);
      return res.status(400).json({ success: false, error: 'Invalid payment ID' });
    }
    
    const payment = await Payment.findById(paymentId);
    console.log('Payment found:', payment ? 'Yes' : 'No');
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found. Please refresh and try again.' });
    }
    
    // Update payment with QRPh payment details
    payment.paymentMethod = 'qrph';
    payment.referenceNumber = referenceNumber;
    payment.status = 'pending';
    payment.receiptImage = receiptFile ? receiptFile.filename : null; // Store the filename
    payment.notes = `QRPh payment submitted. Receipt: ${receiptFile ? receiptFile.filename : 'No receipt uploaded'}`;
    if (receiptFile?.filename) {
      try {
        const resident = await User.findById(req.user.id).select('firstName lastName houseNumber email');
        const receiptAbsPath = path.join(uploadDir, receiptFile.filename);
        const analysis = await analyzeReceiptFraud({
          receiptAbsPath,
          paymentContext: {
            expectedAmount: payment.amount,
            expectedReferenceNumber: referenceNumber || '',
            invoiceNumber: payment.invoiceNumber || '',
            residentName: resident ? `${resident.firstName || ''} ${resident.lastName || ''}`.trim() : '',
            residentEmail: resident?.email || '',
            houseNumber: resident?.houseNumber || '',
            dueDate: payment.dueDate ? new Date(payment.dueDate).toISOString() : ''
          }
        });
        payment.receiptAi = {
          fraudScore: analysis.fraudScore,
          flags: analysis.flags,
          recommendation: analysis.recommendation,
          explanation: analysis.explanation,
          extracted: analysis.extracted,
          analyzedAt: new Date(),
          model: analysis.model
        };
      } catch (aiError) {
        payment.receiptAi = {
          fraudScore: null,
          flags: ['ai_unavailable'],
          recommendation: 'needs_review',
          explanation: `Receipt AI analysis unavailable: ${aiError.message || 'Unknown error'}`,
          extracted: { amount: '', refNo: '', date: '', merchant: '' },
          analyzedAt: new Date(),
          model: ''
        };
      }
    }
    await payment.save();
    
    console.log(`QRPh payment submitted for invoice ${payment.invoiceNumber}. Reference: ${referenceNumber}`);
    
    res.json({
      success: true,
      message: 'Payment receipt submitted. Admin will verify your payment.',
      data: payment
    });
    
  } catch (error) {
    console.error('Upload receipt error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit payment' });
  }
});

// Serve uploaded receipt images (Admin only)
router.get('/receipt-image/:filename', protect, authorize('admin'), async (req, res) => {
  try {
    let { filename } = req.params;
    filename = decodeURIComponent(filename);

    // Security: Prevent directory traversal
    const safeFilename = path.basename(filename);
    const imagePath = path.join(__dirname, '../uploads/receipts', safeFilename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    // Get file extension to set correct content type
    const ext = path.extname(imagePath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.gif') contentType = 'image/gif';
    if (ext === '.pdf') contentType = 'application/pdf';
    
    res.setHeader('Content-Type', contentType);
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving receipt image:', error);
    res.status(500).json({ success: false, error: 'Failed to serve image' });
  }
});

// Admin: Get all payments
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, paymentType, page = 1, limit = 20, format = 'json' } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;

    const payments = await Payment.find(filter)
      .populate('residentId', 'firstName lastName houseNumber')
      .sort({ createdAt: -1 });

    if (format === 'pdf') {
      // Import PDF service
      const pdfReportService = require('../services/pdfReportService');

      const columns = [
        { key: 'residentId.firstName', label: 'Resident' },
        { key: 'residentId.houseNumber', label: 'House' },
        { key: 'amount', label: 'Amount' },
        { key: 'paymentType', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'createdAt', label: 'Created' }
      ];

      const pdfBuffer = await pdfReportService.generateDataReport(
        'VIMS Payments Report',
        payments,
        columns,
        { creator: { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }, timezoneOffsetMinutes }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Payments_Report_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    // Regular JSON response with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedPayments = payments.slice(skip, skip + parseInt(limit));
    const total = payments.length;

    const summary = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } } } }
    ]);

    res.json({
      success: true,
      data: paginatedPayments,
      summary: { totalCollected: summary[0]?.totalPaid || 0 },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get payments' });
  }
});

// Admin: Generate monthly invoices
router.post('/generate-monthly', protect, authorize('admin'), async (req, res) => {
  try {
    const { month, year } = req.body;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const residents = await User.find({ role: 'resident', isActive: true, isApproved: true });
    
    let created = 0;

    for (const resident of residents) {
      const existing = await Payment.findOne({
        residentId: resident._id,
        paymentType: 'monthly_dues',
        'billingPeriod.month': targetMonth,
        'billingPeriod.year': targetYear
      });

      if (!existing) {
        await createMonthlyDuesForResident(resident, targetMonth, targetYear);
        created++;
      }
    }

    res.json({ success: true, message: `Generated ${created} invoices` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate invoices' });
  }
});

// Admin: Get current monthly dues amount
router.get('/admin/monthly-dues-amount', protect, authorize('admin'), async (req, res) => {
  try {
    const amount = await getMonthlyDuesAmount();
    res.json({ success: true, data: { amount } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get monthly dues amount' });
  }
});

// Admin: Update monthly dues amount
router.put('/admin/monthly-dues-amount', protect, authorize('admin'), async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, error: 'Invalid monthly dues amount' });
    }

    const updated = await setMonthlyDuesAmount(amount);
    res.json({ success: true, data: { amount: updated.value } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update monthly dues amount' });
  }
});

// Admin: Confirm payment (for cash or QRPh)
router.put('/:id/confirm', protect, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    
    payment.status = 'paid';
    payment.paymentDate = new Date();
    payment.processedBy = req.user.id;
    payment.receiptNumber = `RC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Add verification notes if provided
    if (req.body.verificationNotes) {
      payment.notes = (payment.notes || '') + `\n[Admin Verification: ${req.body.verificationNotes}]`;
    }
    
    await payment.save();
    await createInAppNotification({
      userId: payment.residentId,
      type: 'payment',
      title: 'Payment confirmed',
      body: `Your payment ${payment.invoiceNumber} has been confirmed.`,
      metadata: { paymentId: payment._id }
    });
    res.json({ success: true, message: 'Payment confirmed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to confirm payment' });
  }
});

// Admin: Send reminders
router.post('/send-reminders', protect, authorize('admin'), async (req, res) => {
  try {
    const overduePayments = await Payment.find({ status: 'pending', dueDate: { $lt: new Date() } })
      .populate('residentId', 'email');
    let remindersSent = 0;
    for (const payment of overduePayments) {
      console.log(`Reminder sent to ${payment.residentId?.email} for invoice ${payment.invoiceNumber}`);
      if (payment.residentId?._id) {
        await createInAppNotification({
          userId: payment.residentId._id,
          type: 'payment',
          title: 'Payment reminder',
          body: `Your invoice ${payment.invoiceNumber} is overdue.`,
          metadata: { paymentId: payment._id }
        });
      }
      remindersSent++;
    }
    res.json({ success: true, message: `Sent ${remindersSent} reminders` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send reminders' });
  }
});

// Admin: Get stats
router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { year, month } = req.query;
    let startDate, endDate;

    if (year && month) {
      // Specific month
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else {
      // Current month by default
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      endDate = new Date();
    }

    const [totalCollected, monthlyCollected, paymentCount] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'completed', createdAt: { $gte: startDate, $lte: endDate } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.countDocuments({ status: 'completed', createdAt: { $gte: startDate, $lte: endDate } })
    ]);

    res.json({
      success: true,
      data: {
        totalCollected: totalCollected[0]?.total || 0,
        monthlyCollected: monthlyCollected[0]?.total || 0,
        paymentCount: monthlyCollected[0]?.count || paymentCount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

router.get('/admin/methods', protect, authorize('admin'), async (req, res) => {
  try {
    const { year, month } = req.query;
    const match = { status: 'completed' };

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      match.createdAt = { $gte: startDate, $lte: endDate };
    }

    const methods = await Payment.aggregate([
      { $match: match },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: methods.map(method => ({
        method: method._id || 'Unknown',
        count: method.count || 0,
        total: method.total || 0
      }))
    });
  } catch (error) {
    console.error('Get payment method stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment method stats' });
  }
});

module.exports = router;