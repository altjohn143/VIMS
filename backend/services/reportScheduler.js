const axios = require('axios');
const ReportSchedule = require('../models/ReportSchedule');
const ServiceRequest = require('../models/ServiceRequest');
const Visitor = require('../models/Visitor');
const Payment = require('../models/Payment');

function isDue(schedule) {
  if (!schedule.enabled) return false;
  const now = new Date();
  if (!schedule.lastRunAt) return true;
  return now.getTime() - new Date(schedule.lastRunAt).getTime() >= 24 * 60 * 60 * 1000;
}

async function buildData(reportType) {
  if (reportType === 'service_requests') return ServiceRequest.find({}).limit(500).sort({ createdAt: -1 });
  if (reportType === 'visitors') return Visitor.find({}).limit(500).sort({ createdAt: -1 });
  return Payment.find({}).limit(500).sort({ createdAt: -1 });
}

async function runSchedule(schedule) {
  const data = await buildData(schedule.reportType);
  const emailWebhook = process.env.EMAIL_WEBHOOK_URL;
  if (emailWebhook) {
    await axios.post(emailWebhook, {
      to: schedule.recipients,
      subject: `Scheduled Report: ${schedule.name}`,
      body: `Report ${schedule.reportType} generated with ${data.length} rows.`,
      attachments: [{ filename: `${schedule.reportType}.json`, data }]
    });
  }
  schedule.lastRunAt = new Date();
  await schedule.save();
}

function startReportScheduler() {
  const timer = setInterval(async () => {
    try {
      const schedules = await ReportSchedule.find({ enabled: true });
      for (const s of schedules) {
        if (isDue(s)) {
          await runSchedule(s);
        }
      }
    } catch (error) {
      console.error('Report scheduler error:', error.message);
    }
  }, 5 * 60 * 1000);
  return timer;
}

module.exports = { startReportScheduler, runSchedule };
