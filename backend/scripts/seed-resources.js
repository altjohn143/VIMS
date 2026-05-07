const mongoose = require('mongoose');
const Resource = require('../models/Resource');
require('dotenv').config();

const seedResources = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingResources = await Resource.find({});
    if (existingResources.length > 0) {
      console.log('Resources already seeded');
      return;
    }

    const resources = [
      // Venues
      { type: 'venue', name: 'Covered Court', description: 'Outdoor basketball court with roof covering' },
      { type: 'venue', name: 'Swimming Pool', description: 'Community swimming pool' },
      { type: 'venue', name: 'Multi-Purpose Hall', description: 'Large hall for events and gatherings' },
      { type: 'venue', name: 'Function Room', description: 'Small room for meetings and functions' },
      { type: 'venue', name: 'Conference Room', description: 'Room equipped for conferences and presentations' },

      // Equipment
      { type: 'equipment', name: 'Tables', description: 'Folding tables for events' },
      { type: 'equipment', name: 'Chairs', description: 'Folding chairs for events' },
      { type: 'equipment', name: 'Speakers', description: 'Audio speakers for announcements' },
      { type: 'equipment', name: 'Microphones', description: 'Wireless microphones' },
      { type: 'equipment', name: 'Projector', description: 'Video projector for presentations' },
      { type: 'equipment', name: 'Podium', description: 'Speaker podium' },
    ];

    // Get admin user (assuming there's at least one admin)
    const User = require('../models/User');
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      return;
    }

    const resourcesWithCreator = resources.map(resource => ({
      ...resource,
      createdBy: adminUser._id,
    }));

    await Resource.insertMany(resourcesWithCreator);
    console.log('Resources seeded successfully');

  } catch (error) {
    console.error('Error seeding resources:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedResources();