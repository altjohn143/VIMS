const express = require('express');
const router = express.Router();
const { getCached } = require('../utils/cache');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { createInAppNotification } = require('../services/inAppNotificationService');
const { sendPaymentReminderEmail, sendPaymentConfirmationEmail } = require('../services/notificationService');
const { analyzeReceiptFraud } = require('../services/openaiReceiptFraudService');
const { uploadImageBuffer } = require('../services/cloudinaryService');
const { paginateQuery } = require('../utils/pagination');
const {
  applyDailyPenalty,
  applyDailyPenalties,
  createMonthlyDuesForResident,
  getMonthlyDuesAmount,
  getOutstandingAmount,
  hasSubmittedPaymentForReview,
  notifyAdminsOfPaymentTransaction,
  notifyResidentOfPaymentTransaction,
  parsePesoAmount,
  setMonthlyDuesAmount,
  syncPaymentAmounts
} = require('../services/paymentService');
const debugLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
};

// ========== PAYMENT ROUTES ==========

// Get all payments for logged-in resident
router.get('/my', protect, authorize('resident'), async (req, res) => {
  try {
    const filter = { residentId: req.user.id };
    const { data: payments, pagination } = await paginateQuery(
      Payment.find(filter).sort({ createdAt: -1 }),
      Payment.countDocuments(filter),
      req.query
    );
    const resident = await User.findById(req.user.id).select('paymentCreditBalance');
    await applyDailyPenalties(payments);
    const summaryPayments = await Payment.find(filter).select('amount originalAmount paidAmount penaltyAmount status dueDate').lean();
    const totalPaid = summaryPayments.reduce((sum, p) => sum + Number(p.paidAmount || (p.status === 'paid' ? p.amount : 0)), 0);
    const pendingPayments = summaryPayments.filter(p => p.status === 'pending');
    const overduePayments = summaryPayments.filter(p => p.status === 'pending' && new Date() > p.dueDate);
    
    res.json({
      success: true,
      data: payments,
      count: payments.length,
      total: pagination.total,
      pagination,
      summary: {
        totalPaid,
        totalPending: pendingPayments.reduce((sum, p) => sum + getOutstandingAmount(p), 0),
        pendingCount: pendingPayments.length,
        overdueCount: overduePayments.length,
        overdueAmount: overduePayments.reduce((sum, p) => sum + getOutstandingAmount(p), 0),
        creditBalance: Number(resident?.paymentCreditBalance || 0)
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

    debugLog(`Fetching current dues for user ${req.user.id}, month: ${targetMonth}, year: ${targetYear}`);

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

    const dues = await applyDailyPenalty(await createMonthlyDuesForResident(user, targetMonth, targetYear));

    res.json({
      success: true,
      data: dues,
      summary: { creditBalance: Number(user.paymentCreditBalance || 0) }
    });
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
    await applyDailyPenalty(payment);
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

    if (String(payment.residentId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to pay this invoice' });
    }
    
    if (payment.status === 'paid') {
      return res.status(400).json({ success: false, error: 'Already paid' });
    }
    await applyDailyPenalty(payment);

    if (payment.status === 'pending' && hasSubmittedPaymentForReview(payment)) {
      return res.status(409).json({
        success: false,
        error: 'A payment is already pending for this invoice'
      });
    }
    
    const referenceNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Handle cash payment
    if (paymentMethod === 'cash') {
      payment.status = 'pending';
      payment.paymentMethod = 'cash';
      payment.referenceNumber = referenceNumber;
      payment.rejectionReason = '';
      payment.rejectedAt = null;
      payment.rejectedBy = null;
      await payment.save();
      await notifyAdminsOfPaymentTransaction({
        title: 'Cash payment pending confirmation',
        body: `${req.user.firstName || 'Resident'} ${req.user.lastName || ''} selected cash payment for ${payment.invoiceNumber}.`.trim(),
        metadata: { paymentId: payment._id, residentId: req.user.id, paymentMethod: 'cash' }
      });
      await notifyResidentOfPaymentTransaction(payment, {
        title: 'Cash payment recorded',
        body: `Your cash payment request for ${payment.invoiceNumber} is pending admin confirmation.`,
        metadata: { paymentMethod: 'cash' }
      });
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
      payment.rejectionReason = '';
      payment.rejectedAt = null;
      payment.rejectedBy = null;
      await payment.save();
      await notifyResidentOfPaymentTransaction(payment, {
        title: 'QRPh payment started',
        body: `Your QRPh payment for ${payment.invoiceNumber} has been started. Upload your receipt after payment.`,
        metadata: { paymentMethod: 'qrph' }
      });
      
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

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/upload-qrph-receipt', protect, authorize('resident'), upload.single('receipt'), async (req, res) => {
  try {
    const { referenceNumber, paymentId } = req.body;
    const receiptFile = req.file;
    
    debugLog('=== DEBUG UPLOAD ===');
    debugLog('Payment ID received:', paymentId);
    debugLog('Reference number:', referenceNumber);
    debugLog('File received:', receiptFile ? `Yes (${receiptFile.originalname})` : 'No');
    
    // Validate paymentId format
    if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
      console.error('Invalid payment ID:', paymentId);
      return res.status(400).json({ success: false, error: 'Invalid payment ID' });
    }
    
    const payment = await Payment.findById(paymentId);
    debugLog('Payment found:', payment ? 'Yes' : 'No');
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found. Please refresh and try again.' });
    }

    if (String(payment.residentId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to submit payment for this invoice' });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({ success: false, error: 'This invoice is already paid' });
    }

    await applyDailyPenalty(payment);

    if (payment.status === 'pending' && hasSubmittedPaymentForReview(payment)) {
      return res.status(409).json({
        success: false,
        error: 'A payment is already pending for this invoice'
      });
    }
    
    // Update payment with QRPh payment details
    payment.paymentMethod = 'qrph';
    payment.referenceNumber = referenceNumber;
    payment.status = 'pending';
    payment.rejectionReason = '';
    payment.rejectedAt = null;
    payment.rejectedBy = null;
    let tempReceiptPath = null;
    if (receiptFile?.buffer) {
      const uploadedReceipt = await uploadImageBuffer(receiptFile.buffer, {
        folder: 'vims/receipts'
      });
      payment.receiptImage = uploadedReceipt.secure_url;
      payment.receiptImagePublicId = uploadedReceipt.public_id;
    } else {
      payment.receiptImage = null;
      payment.receiptImagePublicId = null;
    }
    payment.notes = `QRPh payment submitted. Receipt: ${payment.receiptImage || 'No receipt uploaded'}`;
    if (receiptFile?.buffer) {
      try {
        const resident = await User.findById(req.user.id).select('firstName lastName houseNumber email');
        const tempName = `receipt-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(receiptFile.originalname || '.jpg')}`;
        tempReceiptPath = path.join(uploadDir, tempName);
        await fs.promises.writeFile(tempReceiptPath, receiptFile.buffer);
        const analysis = await analyzeReceiptFraud({
          receiptAbsPath: tempReceiptPath,
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
        payment.submittedAmount = parsePesoAmount(analysis.extracted?.amount);
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
        payment.submittedAmount = null;
      }
      finally {
        if (tempReceiptPath) fs.promises.unlink(tempReceiptPath).catch(() => {});
      }
    }
    if (!payment.submittedAmount) {
      payment.submittedAmount = parsePesoAmount(req.body.amount);
    }
    await payment.save();
    await notifyAdminsOfPaymentTransaction({
      title: 'QRPh payment submitted',
      body: `${req.user.firstName || 'Resident'} ${req.user.lastName || ''} submitted a QRPh receipt for ${payment.invoiceNumber}.`.trim(),
      metadata: { paymentId: payment._id, residentId: req.user.id, paymentMethod: 'qrph' }
    });
    await notifyResidentOfPaymentTransaction(payment, {
      title: 'Payment submitted for review',
      body: `Your payment for ${payment.invoiceNumber} was submitted and is pending admin verification.`,
      metadata: { paymentMethod: 'qrph' }
    });
    
    debugLog(`QRPh payment submitted for invoice ${payment.invoiceNumber}. Reference: ${referenceNumber}`);
    
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

// Serve uploaded receipt images by payment ID (Admin only)
router.get('/receipt-image/payment/:paymentId', protect, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).select('receiptImage');
    if (!payment || !payment.receiptImage) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }

    if (/^https?:\/\//i.test(payment.receiptImage)) {
      return res.redirect(payment.receiptImage);
    }

    const safeFilename = path.basename(payment.receiptImage);
    const imagePath = path.join(__dirname, '../uploads/receipts', safeFilename);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }

    const ext = path.extname(imagePath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.gif') contentType = 'image/gif';
    if (ext === '.pdf') contentType = 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving receipt image by payment ID:', error);
    res.status(500).json({ success: false, error: 'Failed to serve image' });
  }
});

// Serve uploaded receipt images (Admin only)
router.get('/receipt-image/:filename', protect, authorize('admin'), async (req, res) => {
  try {
    let { filename } = req.params;
    filename = decodeURIComponent(filename);

    if (/^https?:\/\//i.test(filename)) {
      return res.redirect(filename);
    }

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
    const {
      status,
      paymentType,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      format = 'json',
      timezoneOffset = '0',
      search
    } = req.query;
    const timezoneOffsetMinutes = Number.parseInt(timezoneOffset, 10) || 0;
    let filter = {};
    if (status === 'overdue') {
      filter.status = 'pending';
      filter.dueDate = { $lt: new Date() };
    } else if (status) {
      filter.status = status;
    }
    if (paymentType) filter.paymentType = paymentType;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (startDate) filter.createdAt = { ...filter.createdAt, $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate + 'T23:59:59.999') };

let payments = await Payment.find(filter)
      .select('residentId amount originalAmount paidAmount submittedAmount penaltyAmount paymentType paymentMethod status dueDate createdAt invoiceNumber referenceNumber receiptNumber receiptImage receiptAi description notes rejectionReason rejectedAt')
      .populate('residentId', 'firstName lastName houseNumber paymentCreditBalance')
      .sort({ createdAt: -1 })
      .lean();
    await applyDailyPenalties(payments);

    const searchText = String(search || '').trim().toLowerCase();
    if (searchText) {
      payments = payments.filter((payment) => {
        const residentName = payment.residentId
          ? `${payment.residentId.firstName || ''} ${payment.residentId.lastName || ''}`.toLowerCase()
          : '';
        return (
          residentName.includes(searchText) ||
          String(payment.residentId?.houseNumber || '').toLowerCase().includes(searchText) ||
          String(payment.invoiceNumber || '').toLowerCase().includes(searchText) ||
          String(payment.referenceNumber || '').toLowerCase().includes(searchText) ||
          String(payment.receiptNumber || '').toLowerCase().includes(searchText) ||
          String(payment.description || '').toLowerCase().includes(searchText)
        );
      });
    }

    const reportData = payments.map((payment) => ({
      Resident: payment.residentId ? `${payment.residentId.firstName || ''} ${payment.residentId.lastName || ''}`.trim() : 'Unknown',
      House: payment.residentId?.houseNumber || 'N/A',
      Amount: payment.amount,
      Paid: payment.paidAmount || 0,
      Penalty: payment.penaltyAmount || 0,
      Type: payment.paymentType,
      Method: payment.paymentMethod || 'N/A',
      Status: payment.status,
      'Due Date': payment.dueDate ? payment.dueDate.toLocaleDateString() : 'N/A',
      Created: payment.createdAt ? payment.createdAt.toLocaleDateString() : 'N/A'
    }));

    const reportColumns = [
      { key: 'Resident', label: 'Resident', width: 20 },
      { key: 'House', label: 'House', width: 10 },
      { key: 'Amount', label: 'Amount', width: 12 },
      { key: 'Paid', label: 'Paid', width: 12 },
      { key: 'Penalty', label: 'Penalty', width: 12 },
      { key: 'Type', label: 'Type', width: 14 },
      { key: 'Method', label: 'Method', width: 14 },
      { key: 'Status', label: 'Status', width: 12 },
      { key: 'Due Date', label: 'Due Date', width: 14 },
      { key: 'Created', label: 'Created', width: 14 }
    ];

    if (format === 'pdf') {
      // Import PDF service
      const pdfReportService = require('../services/pdfReportService');

      const pdfBuffer = await pdfReportService.generateDataReport(
        'VIMS Payments Report',
        reportData,
        reportColumns,
        { creator: { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }, timezoneOffsetMinutes }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Payments_Report_${new Date().toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    }

    if (format === 'csv') {
      const pdfReportService = require('../services/pdfReportService');
      const csvContent = pdfReportService.generateCsvReport(
        'VIMS Payments Report',
        reportData,
        reportColumns,
        { creator: { firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role }, timezoneOffsetMinutes }
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="VIMS_Payments_Report_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    // Regular JSON response with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedPayments = payments.slice(skip, skip + parseInt(limit));
    const total = payments.length;

    const summary = payments.reduce((acc, payment) => {
      acc.totalPaid += Number(payment.paidAmount || (payment.status === 'paid' ? payment.amount : 0));
      return acc;
    }, { totalPaid: 0 });

    res.json({
      success: true,
      data: paginatedPayments,
      summary: { totalCollected: summary.totalPaid || 0 },
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
        await createInAppNotification({
          userId: resident._id,
          type: 'payment',
          title: 'New monthly dues invoice',
          body: `Your monthly dues invoice for ${new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })} ${targetYear} is now available.`,
          metadata: { month: targetMonth, year: targetYear, paymentType: 'monthly_dues' }
        });
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
    const rawAmount = String(req.body.amount ?? '').trim();
    const amount = Number(rawAmount);
    if (!rawAmount || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Monthly dues amount must be greater than zero' });
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
    if (payment.status === 'paid') {
      return res.status(400).json({ success: false, error: 'Payment is already confirmed' });
    }

    await applyDailyPenalty(payment);
    const outstandingBeforePayment = getOutstandingAmount(payment);
    const verifiedAmount = parsePesoAmount(req.body.verifiedAmount)
      || Number(payment.submittedAmount || 0)
      || outstandingBeforePayment;
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Verified payment amount must be greater than zero' });
    }

    const appliedAmount = Math.min(verifiedAmount, outstandingBeforePayment);
    const creditedAmount = Math.max(0, verifiedAmount - outstandingBeforePayment);
    const receiptNumber = `RC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    payment.paidAmount = Number(payment.paidAmount || 0) + appliedAmount;
    payment.paymentDate = new Date();
    payment.processedBy = req.user.id;
    payment.receiptNumber = receiptNumber;
    payment.paymentHistory.push({
      amount: appliedAmount,
      creditedAmount,
      paymentMethod: payment.paymentMethod || req.body.paymentMethod || 'cash',
      referenceNumber: payment.referenceNumber || '',
      receiptNumber,
      receiptImage: payment.receiptImage || '',
      verifiedBy: req.user.id,
      notes: req.body.verificationNotes || ''
    });
    
    // Add verification notes if provided
    if (req.body.verificationNotes) {
      payment.notes = (payment.notes || '') + `\n[Admin Verification: ${req.body.verificationNotes}]`;
    }

    payment.paymentMethod = null;
    payment.referenceNumber = undefined;
    payment.transactionId = undefined;
    payment.receiptImage = null;
    payment.receiptImagePublicId = null;
    payment.submittedAmount = null;
    payment.receiptAi = undefined;
    payment.rejectionReason = '';
    payment.rejectedAt = null;
    payment.rejectedBy = null;

    syncPaymentAmounts(payment);
    const remainingBalance = getOutstandingAmount(payment);
    payment.status = remainingBalance <= 0 ? 'paid' : 'pending';
    if (creditedAmount > 0) {
      await User.findByIdAndUpdate(payment.residentId, { $inc: { paymentCreditBalance: creditedAmount } });
    }
    
    await payment.save();
    await createInAppNotification({
      userId: payment.residentId,
      type: 'payment',
      title: payment.status === 'paid' ? 'Payment confirmed' : 'Partial payment confirmed',
      body: payment.status === 'paid'
        ? `Your payment ${payment.invoiceNumber} has been confirmed.${creditedAmount > 0 ? ` Excess payment of PHP ${creditedAmount.toFixed(2)} was added as credit for future dues.` : ''}`
        : `Your partial payment of PHP ${appliedAmount.toFixed(2)} was confirmed. Remaining balance: PHP ${remainingBalance.toFixed(2)}.`,
      metadata: { paymentId: payment._id }
    });
    await notifyAdminsOfPaymentTransaction({
      title: payment.status === 'paid' ? 'Payment confirmed' : 'Partial payment confirmed',
      body: `${payment.invoiceNumber} was ${payment.status === 'paid' ? 'fully confirmed' : 'partially confirmed'} by admin.`,
      metadata: { paymentId: payment._id, residentId: payment.residentId, paymentStatus: payment.status }
    });

    let emailResult = { sent: false, reason: 'not_attempted' };
    try {
      const resident = await User.findById(payment.residentId).select('email firstName lastName');
      emailResult = await sendPaymentConfirmationEmail(payment, resident);
      if (!emailResult.sent) {
        console.warn(`Payment confirmation email skipped for ${resident?.email || payment.residentId}: ${emailResult.reason}`);
      }
    } catch (emailError) {
      emailResult = { sent: false, reason: emailError.message };
      console.error(`Failed to send payment confirmation email for ${payment.invoiceNumber}:`, emailError.message);
    }

    res.json({
      success: true,
      message: payment.status === 'paid' ? 'Payment confirmed' : 'Partial payment confirmed',
      data: { email: emailResult, appliedAmount, creditedAmount, remainingBalance, paymentStatus: payment.status }
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm payment' });
  }
});

// Admin: Reject submitted payment attempt and allow resident to resubmit
router.put('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const rejectionReason = String(req.body.rejectionReason || '').trim();
    if (!rejectionReason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (payment.status === 'paid') {
      return res.status(400).json({ success: false, error: 'Paid payments cannot be rejected' });
    }
    if (!hasSubmittedPaymentForReview(payment)) {
      return res.status(400).json({ success: false, error: 'No submitted payment is pending review' });
    }

    await applyDailyPenalty(payment);

    const rejectedReferenceNumber = payment.referenceNumber || '';
    const rejectedReceiptImage = payment.receiptImage || '';
    const rejectedMethod = payment.paymentMethod || '';
    const rejectedAmount = Number(payment.submittedAmount || 0);

    payment.paymentHistory.push({
      amount: rejectedAmount,
      creditedAmount: 0,
      paymentMethod: rejectedMethod,
      referenceNumber: rejectedReferenceNumber,
      receiptNumber: '',
      receiptImage: rejectedReceiptImage,
      verifiedBy: req.user.id,
      notes: `Rejected: ${rejectionReason}`
    });

    payment.status = 'pending';
    payment.paymentMethod = null;
    payment.referenceNumber = undefined;
    payment.transactionId = undefined;
    payment.receiptImage = null;
    payment.receiptImagePublicId = null;
    payment.submittedAmount = null;
    payment.receiptAi = undefined;
    payment.rejectionReason = rejectionReason;
    payment.rejectedAt = new Date();
    payment.rejectedBy = req.user.id;
    payment.processedBy = req.user.id;
    payment.processedAt = new Date();
    payment.notes = `${payment.notes || ''}\n[Payment rejected: ${rejectionReason}]`.trim();

    syncPaymentAmounts(payment);
    await payment.save();

    await createInAppNotification({
      userId: payment.residentId,
      type: 'payment',
      title: 'Payment rejected',
      body: `Your payment for ${payment.invoiceNumber} was rejected. Reason: ${rejectionReason}`,
      metadata: { paymentId: payment._id }
    });
    await notifyAdminsOfPaymentTransaction({
      title: 'Payment rejected',
      body: `${payment.invoiceNumber} was rejected. Reason: ${rejectionReason}`,
      metadata: { paymentId: payment._id, residentId: payment.residentId }
    });

    res.json({
      success: true,
      message: 'Payment rejected. The resident can submit a new payment.',
      data: payment
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject payment' });
  }
});

// Admin: Send reminders
router.post('/send-reminders', protect, authorize('admin'), async (req, res) => {
  try {
    const unpaidPayments = await Payment.find({ status: 'pending' })
      .populate('residentId', 'email firstName lastName');
    let emailSent = 0;
    let failed = 0;
    let awaitingReview = 0;
    const remindersByResident = new Map();

    for (const payment of unpaidPayments) {
      if (hasSubmittedPaymentForReview(payment)) {
        awaitingReview++;
        continue;
      }

      const resident = payment.residentId;
      if (!resident?._id || !resident.email) {
        failed++;
        continue;
      }

      const residentKey = resident.email.toLowerCase();
      if (!remindersByResident.has(residentKey)) {
        remindersByResident.set(residentKey, { resident, payments: [] });
      }
      remindersByResident.get(residentKey).payments.push(payment);
    }

    for (const { resident, payments } of remindersByResident.values()) {
      try {
        const emailResult = await sendPaymentReminderEmail(payments, resident);
        if (emailResult.sent) {
          emailSent++;
        } else {
          failed++;
          console.warn(`Payment reminder email skipped for ${resident.email}: ${emailResult.reason}`);
        }
        await createInAppNotification({
          userId: resident._id,
          type: 'payment',
          title: 'Payment reminder',
          body: `You have ${payments.length} pending payment${payments.length === 1 ? '' : 's'} requiring attention.`,
          metadata: { paymentIds: payments.map((payment) => payment._id), reminderType: 'manual_admin' }
        });
      } catch (error) {
        failed++;
        console.error(`Failed to send payment reminder email for ${resident.email}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: emailSent > 0
        ? `Sent email reminders to ${emailSent} resident${emailSent === 1 ? '' : 's'}${awaitingReview ? `; skipped ${awaitingReview} payment${awaitingReview === 1 ? '' : 's'} awaiting admin review` : ''}${failed ? ` (${failed} failed/skipped)` : ''}`
        : awaitingReview > 0
          ? `No reminders sent. ${awaitingReview} pending payment${awaitingReview === 1 ? ' is' : 's are'} awaiting admin review.`
          : 'No eligible resident emails found for unpaid payment reminders',
      data: { sent: emailSent, emailSent, failed, awaitingReview }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send reminders' });
  }
});

// Admin: Get stats
router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const cacheKey = `payment-stats:${year || 'current'}:${month || 'current'}`;
    const ttlMs = 60 * 1000; // 1 minute TTL
    
    const data = await getCached(cacheKey, ttlMs, async () => {
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
  
      const [allPayments, totalInvoices, paidInvoices] = await Promise.all([
        Payment.find({}).lean(),
        Payment.countDocuments({}),
        Payment.countDocuments({ status: 'paid' })
      ]);
      await applyDailyPenalties(allPayments);
      const totalCollected = allPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || (payment.status === 'paid' ? payment.amount : 0)), 0);
      const monthlyPayments = allPayments.filter(payment => payment.createdAt >= startDate && payment.createdAt <= endDate);
      const monthlyCollected = monthlyPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || (payment.status === 'paid' ? payment.amount : 0)), 0);
      const paymentCount = monthlyPayments.filter(payment => Number(payment.paidAmount || 0) > 0 || payment.status === 'paid').length;
      const pendingTotal = allPayments
        .filter(payment => payment.status === 'pending')
        .reduce((sum, payment) => sum + getOutstandingAmount(payment), 0);
  
      return {
        totalCollected,
        monthlyCollected,
        paymentCount,
        pendingTotal,
        collectionRate: totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 1000) / 10 : 0
      };
    });
    
    res.json({
      success: true,
      data
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

router.get('/admin/methods', protect, authorize('admin'), async (req, res) => {
  try {
    const { year, month } = req.query;
    const match = {};

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      match.createdAt = { $gte: startDate, $lte: endDate };
    }

    const methods = await Payment.aggregate([
      { $match: { ...match, $or: [{ status: 'paid' }, { paidAmount: { $gt: 0 } }] } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: { $cond: [{ $gt: ['$paidAmount', 0] }, '$paidAmount', '$amount'] } } } },
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

// Public: live current monthly collection summary
router.get('/public/monthly-collection', async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const result = await Payment.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate }, $or: [{ status: 'paid' }, { paidAmount: { $gt: 0 } }] } },
      { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ['$paidAmount', 0] }, '$paidAmount', '$amount'] } }, count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        monthlyCollected: result[0]?.total || 0,
        paymentCount: result[0]?.count || 0,
        month: targetMonth,
        year: targetYear,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Get public monthly collection error:', error);
    res.status(500).json({ success: false, error: 'Failed to get public monthly collection' });
  }
});

module.exports = router;
