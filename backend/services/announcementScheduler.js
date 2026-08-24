const Announcement = require('../models/Announcement');
const { emitPublicAnnouncement } = require('./announcementRealtimeService');

class AnnouncementScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Announcement scheduler started');

    // Check every minute for announcements to publish
    this.intervalId = setInterval(async () => {
      try {
        await this.publishScheduledAnnouncements();
      } catch (error) {
        console.error('Error in announcement scheduler:', error);
      }
    }, 60000); // 1 minute

    // Also run immediately on start
    this.publishScheduledAnnouncements();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Announcement scheduler stopped');
  }

  async publishScheduledAnnouncements() {
    const now = new Date();
    try {
      const announcements = await Announcement.find({
        isArchived: false,
        status: 'scheduled',
        scheduledAt: { $lte: now }
      });

      for (const announcement of announcements) {
        announcement.status = 'published';
        announcement.publishedAt = now;
        announcement.scheduledAt = null;
        await announcement.save();
        emitPublicAnnouncement('created', announcement);
      }

      if (announcements.length > 0) {
        console.log(`Published ${announcements.length} scheduled announcements`);
      }
    } catch (error) {
      console.error('Error publishing scheduled announcements:', error);
    }
  }
}

module.exports = new AnnouncementScheduler();
