const mongoose = require('mongoose');
const Announcement = require('./models/Announcement');
const User = require('./models/User');
const announcementScheduler = require('./services/announcementScheduler');

async function testScheduler() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vims_system');
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@vims.com' });
    if (!adminUser) {
      console.error('Admin user not found');
      process.exit(1);
    }
    console.log('Found admin user:', adminUser._id);

    // Create a test scheduled announcement
    const scheduledTime = new Date();
    scheduledTime.setSeconds(scheduledTime.getSeconds() + 10); // Schedule for 10 seconds from now

    const testAnnouncement = new Announcement({
      title: 'Test Scheduled Announcement',
      body: 'This is a test announcement to verify the scheduler.',
      author: 'Admin',
      status: 'scheduled',
      scheduledAt: scheduledTime,
      createdBy: adminUser._id
    });

    await testAnnouncement.save();
    console.log('Created test scheduled announcement:', testAnnouncement._id);

    // Wait for scheduler to run (it runs every minute, but we can call it manually)
    console.log('Waiting 15 seconds for scheduler...');
    setTimeout(async () => {
      await announcementScheduler.publishScheduledAnnouncements();

      // Check if it was published
      const updatedAnnouncement = await Announcement.findById(testAnnouncement._id);
      console.log('Announcement status after scheduler run:', updatedAnnouncement.status);

      if (updatedAnnouncement.status === 'published') {
        console.log('✅ Scheduler is working correctly!');
      } else {
        console.log('❌ Scheduler did not publish the announcement.');
      }

      process.exit(0);
    }, 15000);

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testScheduler();