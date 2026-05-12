const User = require('../models/User');
const { createInAppNotification } = require('./inAppNotificationService');

/**
 * Broadcast announcement notification to users by role
 */
async function broadcastAnnouncementToRole(announcement, role) {
  try {
    // Find all users with the specified role
    const users = await User.find({ 
      role: role, 
      isActive: true, 
      isArchived: false 
    });

    if (!users.length) {
      console.log(`No active ${role} users found for announcement broadcast`);
      return { sent: 0, failed: 0 };
    }

    // Create in-app notifications for each user
    const notifications = await Promise.allSettled(
      users.map(user =>
        createInAppNotification({
          userId: user._id,
          type: 'announcement',
          title: announcement.title || 'New Announcement',
          body: announcement.body || announcement.content || 'An announcement has been published',
          metadata: {
            announcementId: announcement._id,
            role: role
          }
        })
      )
    );

    const sent = notifications.filter(n => n.status === 'fulfilled' && n.value).length;
    const failed = notifications.filter(n => n.status === 'rejected' || !n.value).length;

    console.log(`✅ Broadcast announcement to ${sent} ${role}s (${failed} failed)`);
    return { sent, failed };
  } catch (error) {
    console.error('Error broadcasting announcement:', error);
    throw error;
  }
}

module.exports = {
  broadcastAnnouncementToRole
};
