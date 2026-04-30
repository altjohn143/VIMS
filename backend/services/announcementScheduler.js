const Announcement = require('../models/Announcement');

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
      const result = await Announcement.updateMany(
        {
          status: 'scheduled',
          scheduledAt: { $lte: now }
        },
        {
          $set: {
            status: 'published',
            publishedAt: now
          },
          $unset: {
            scheduledAt: 1
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`Published ${result.modifiedCount} scheduled announcements`);
      }
    } catch (error) {
      console.error('Error publishing scheduled announcements:', error);
    }
  }
}

module.exports = new AnnouncementScheduler();