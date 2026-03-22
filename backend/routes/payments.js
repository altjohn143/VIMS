const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

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
    
    let existingDues = await Payment.findOne({
      residentId: req.user.id,
      paymentType: 'monthly_dues',
      'billingPeriod.month': currentMonth,
      'billingPeriod.year': currentYear
    });
    
    if (existingDues) {
      return res.json({ success: true, data: existingDues });
    }
    
    const dues = await Payment.create({
      residentId: req.user.id,
      amount: 1500,
      paymentType: 'monthly_dues',
      status: 'pending',
      dueDate: new Date(currentYear, currentMonth - 1, 10),
      billingPeriod: { month: currentMonth, year: currentYear },
      description: `Monthly Association Dues - ${new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' })} ${currentYear}`,
      notes: ''
    });
    
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
    if (!paymentMethod) return res.status(400).json({ success: false, error: 'Payment method required' });
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (payment.status === 'paid') return res.status(400).json({ success: false, error: 'Already paid' });
    
    const referenceNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    if (paymentMethod === 'cash') {
      payment.status = 'pending';
      payment.paymentMethod = 'cash';
      payment.referenceNumber = referenceNumber;
      await payment.save();
      return res.json({ success: true, message: 'Cash payment submitted', data: payment });
    }
    
    // Simulate successful payment
    payment.status = 'paid';
    payment.paymentMethod = paymentMethod;
    payment.referenceNumber = referenceNumber;
    payment.transactionId = `TXN-${uuidv4()}`;
    payment.paymentDate = new Date();
    payment.receiptNumber = `RC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await payment.save();
    
    const resident = await User.findById(req.user.id);
    res.json({
      success: true,
      message: `Payment successful via ${paymentMethod.toUpperCase()}`,
      data: {
        payment,
        receipt: {
          receiptNumber: payment.receiptNumber,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          residentName: `${resident.firstName} ${resident.lastName}`,
          houseNumber: resident.houseNumber,
          invoiceNumber: payment.invoiceNumber,
          description: payment.description
        }
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to process payment' });
  }
});

// Admin: Get all payments
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, paymentType, page = 1, limit = 20 } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const payments = await Payment.find(filter)
      .populate('residentId', 'firstName lastName houseNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Payment.countDocuments(filter);
    
    const summary = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } } } }
    ]);
    
    res.json({
      success: true,
      data: payments,
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
        await Payment.create({
          residentId: resident._id,
          amount: 1500,
          paymentType: 'monthly_dues',
          status: 'pending',
          dueDate: new Date(targetYear, targetMonth - 1, 10),
          billingPeriod: { month: targetMonth, year: targetYear },
          description: `Monthly Association Dues - ${new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })} ${targetYear}`
        });
        created++;
      }
    }
    res.json({ success: true, message: `Generated ${created} invoices` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate invoices' });
  }
});

// Admin: Confirm cash payment
router.put('/:id/confirm', protect, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    payment.status = 'paid';
    payment.paymentDate = new Date();
    payment.processedBy = req.user.id;
    payment.receiptNumber = `RC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await payment.save();
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
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [totalCollected, monthlyCollected] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'paid', paymentDate: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    res.json({
      success: true,
      data: {
        totalCollected: totalCollected[0]?.total || 0,
        monthlyCollected: monthlyCollected[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

module.exports = router;