const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const Visitor = require('../models/Visitor');
const { protect, authorize } = require('../middleware/auth');

const escapeValue = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
const personName = (person) => person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown' : 'Unknown';

function dateRange(startDate, endDate) {
  if (!startDate && !endDate) return null;
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) range.$lte = new Date(endDate);
  return range;
}

// Admin-only export for an individual resident's history or a filtered operational report.
router.get('/export', protect, authorize('admin'), async (req, res) => {
  try {
    const { format = 'pdf', reportType = 'activity', residentId, lot, startDate, endDate, timezoneOffset = 0 } = req.query;
    if (!['activity', 'service-requests', 'reservations', 'payments', 'visitors', 'residents'].includes(reportType)) {
      return res.status(400).json({ success: false, error: 'Invalid report type' });
    }

    const residentFilter = { role: 'resident', isArchived: { $ne: true } };
    if (residentId) residentFilter._id = residentId;
    if (lot) {
      const lotValue = String(lot).trim();
      residentFilter.$or = [
        { houseLot: new RegExp(`^${lotValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { houseNumber: new RegExp(`^${lotValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      ];
    }
    const residents = await User.find(residentFilter).select('firstName lastName email phone houseBlock houseLot houseNumber address createdAt').lean();
    if (!residents.length) return res.status(404).json({ success: false, error: 'No residents match the selected user or lot.' });
    const residentIds = residents.map((resident) => resident._id);
    const residentsById = new Map(residents.map((resident) => [String(resident._id), resident]));
    const createdRange = dateRange(startDate, endDate);
    const withDateRange = (filter, field = 'createdAt') => createdRange ? { ...filter, [field]: createdRange } : filter;
    const rows = [];

    if (reportType === 'activity' || reportType === 'residents') {
      residents.forEach((resident) => rows.push({
        Section: 'Account', Date: resident.createdAt, Resident: personName(resident),
        Lot: [resident.houseBlock && `Block ${resident.houseBlock}`, resident.houseLot && `Lot ${resident.houseLot}`].filter(Boolean).join(', ') || resident.houseNumber || 'N/A',
        Record: 'Resident account', Details: `${escapeValue(resident.email)} | ${escapeValue(resident.phone)}`,
        Status: 'Registered', Amount: ''
      }));
    }

    if (reportType === 'activity' || reportType === 'service-requests') {
      const requests = await ServiceRequest.find(withDateRange({ residentId: { $in: residentIds } })).lean();
      requests.forEach((request) => {
        const resident = residentsById.get(String(request.residentId));
        rows.push({ Section: request.category === 'complaint' ? 'Complaint' : 'Service request', Date: request.createdAt,
          Resident: personName(resident), Lot: resident?.houseLot || resident?.houseNumber || 'N/A',
          Record: request.title, Details: `${request.category} · ${escapeValue(request.description)}`,
          Status: request.status, Amount: request.estimatedCost || '' });
      });
    }

    if (reportType === 'activity' || reportType === 'reservations') {
      const reservations = await Reservation.find(withDateRange({ reservedBy: { $in: residentIds } })).lean();
      reservations.forEach((reservation) => {
        const resident = residentsById.get(String(reservation.reservedBy));
        const resource = reservation.items?.length
          ? reservation.items.map((item) => `${item.resourceName} (${item.quantity || 1})`).join('; ')
          : reservation.resourceName || reservation.resourceType || 'Reservation';
        rows.push({ Section: 'Reservation', Date: reservation.createdAt, Resident: personName(resident),
          Lot: resident?.houseLot || resident?.houseNumber || 'N/A', Record: resource,
          Details: `${reservation.startDate ? new Date(reservation.startDate).toLocaleString() : ''} to ${reservation.endDate ? new Date(reservation.endDate).toLocaleString() : ''}`,
          Status: reservation.status, Amount: '' });
      });
    }

    if (reportType === 'activity' || reportType === 'payments') {
      const payments = await Payment.find(withDateRange({ residentId: { $in: residentIds } })).lean();
      payments.forEach((payment) => {
        const resident = residentsById.get(String(payment.residentId));
        rows.push({ Section: 'Payment', Date: payment.createdAt, Resident: personName(resident),
          Lot: resident?.houseLot || resident?.houseNumber || 'N/A', Record: payment.invoiceNumber || payment.paymentType,
          Details: `${payment.paymentType || 'payment'}${payment.paymentMethod ? ` · ${payment.paymentMethod}` : ''}`,
          Status: payment.status, Amount: Number(payment.paidAmount || payment.amount || 0).toFixed(2) });
      });
    }

    if (reportType === 'activity' || reportType === 'visitors') {
      const visitors = await Visitor.find(withDateRange({ residentId: { $in: residentIds } })).lean();
      visitors.forEach((visitor) => {
        const resident = residentsById.get(String(visitor.residentId));
        const visitWindow = [visitor.expectedArrival, visitor.expectedDeparture]
          .filter(Boolean)
          .map((date) => new Date(date).toLocaleString())
          .join(' to ');
        rows.push({ Section: 'Visitor pass', Date: visitor.createdAt, Resident: personName(resident),
          Lot: resident?.houseLot || resident?.houseNumber || 'N/A', Record: visitor.visitorName,
          Details: `${escapeValue(visitor.purpose)}${visitWindow ? ` · Expected: ${visitWindow}` : ''}${visitor.vehicleNumber ? ` · Vehicle: ${visitor.vehicleNumber}` : ''}`,
          Status: visitor.status, Amount: '' });
      });
    }

    if (!rows.length) return res.status(404).json({ success: false, error: 'No records match the selected filters.' });
    rows.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    const data = rows.map((row, index) => ({ ...row, No: index + 1, Date: row.Date ? new Date(row.Date).toLocaleString() : 'N/A' }));
    // These relative widths add up to a landscape A4 table. Keeping the same
    // schema for every report type also keeps CSV columns in the same order.
    const columns = [
      { header: 'No.', key: 'No', width: 5 }, { header: 'Section', key: 'Section', width: 12 },
      { header: 'Date & Time', key: 'Date', width: 17 }, { header: 'Resident', key: 'Resident', width: 17 },
      { header: 'Lot', key: 'Lot', width: 10 }, { header: 'Record', key: 'Record', width: 18 },
      { header: 'Details', key: 'Details', width: 32 }, { header: 'Status', key: 'Status', width: 12 }, { header: 'Amount (PHP)', key: 'Amount', width: 12 }
    ];
    const labels = { activity: 'Resident Activity History', 'service-requests': 'Service Requests and Complaints', reservations: 'Reservation Requests', payments: 'Payment History', visitors: 'Visitor Pass and Visit History', residents: 'Resident Directory' };
    const pdfReportService = require('../services/pdfReportService');
    const filename = `VIMS_${reportType.replace(/[^a-z]/g, '_')}_report_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'pdf') {
      const pdf = await pdfReportService.generateDataReport(labels[reportType], data, columns, {
        creator: req.user,
        timezoneOffsetMinutes: Number(timezoneOffset) || 0,
        layout: 'landscape',
        margin: 28,
        table: {
          headerFontSize: 6.8,
          bodyFontSize: 6.5,
          cellPadding: 2.5,
          maxRows: 1000
        }
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return res.send(pdf);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(pdfReportService.generateCsvReport(labels[reportType], data, columns, { creator: req.user, timezoneOffsetMinutes: Number(timezoneOffset) || 0 }));
  } catch (error) {
    console.error('Custom report export error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create the custom report.' });
  }
});

module.exports = router;
