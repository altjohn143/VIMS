/**
 * MongoDB Index Creation Script
 * Run once: node backend/scripts/create-indexes.js
 * 
 * Indexes for the most common query patterns identified in the codebase
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/vims';

async function createIndexes() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  
  const indexes = [
    // Visitors - heavily filtered by status, dates, residentId
    { collection: 'visitors', index: { status: 1, expectedArrival: 1 }, options: {} },
    { collection: 'visitors', index: { residentId: 1, createdAt: -1 }, options: {} },
    { collection: 'visitors', index: { createdAt: -1 }, options: {} },
    { collection: 'visitors', index: { status: 1, createdAt: -1 }, options: {} },
    { collection: 'visitors', index: { expectedArrival: 1, status: 1 }, options: {} },
    { collection: 'visitors', index: { 'residentId.firstName': 'text', 'residentId.lastName': 'text' }, options: { default_language: 'english' } },
    
    // Payments - heavily filtered by status, paymentType, paymentMethod, residentId, dates
    { collection: 'payments', index: { status: 1, dueDate: 1 }, options: {} },
    { collection: 'payments', index: { residentId: 1, status: 1, createdAt: -1 }, options: {} },
    { collection: 'payments', index: { paymentType: 1, status: 1 }, options: {} },
    { collection: 'payments', index: { paymentMethod: 1, status: 1 }, options: {} },
    { collection: 'payments', index: { createdAt: -1 }, options: {} },
    { collection: 'payments', index: { invoiceNumber: 1 }, options: { unique: true, sparse: true } },
    { collection: 'payments', index: { referenceNumber: 1 }, options: { unique: true, sparse: true } },
    
    // Service Requests - filtered by status, category, priority, residentId, assignedTo
    { collection: 'servicerequests', index: { status: 1, category: 1, priority: 1 }, options: {} },
    { collection: 'servicerequests', index: { residentId: 1, createdAt: -1 }, options: {} },
    { collection: 'servicerequests', index: { assignedTo: 1, status: 1 }, options: {} },
    { collection: 'servicerequests', index: { createdAt: -1 }, options: {} },
    { collection: 'servicerequests', index: { isArchived: 1, createdAt: -1 }, options: {} },
    
    // Users - filtered by role, isActive, isApproved, houseNumber
    { collection: 'users', index: { role: 1, isActive: 1, isApproved: 1 }, options: {} },
    { collection: 'users', index: { houseNumber: 1 }, options: {} },
    { collection: 'users', index: { email: 1 }, options: { unique: true } },
    
    // Identity Verification - filtered by status
    { collection: 'identityverifications', index: { status: 1, updatedAt: -1 }, options: {} },
    { collection: 'identityverifications', index: { userId: 1 }, options: {} },
    
    // Announcements
    { collection: 'announcements', index: { status: 1, scheduledAt: 1 }, options: {} },
    { collection: 'announcements', index: { isArchived: 1, createdAt: -1 }, options: {} },
    
    // Reservations
    { collection: 'reservations', index: { status: 1, resourceType: 1 }, options: {} },
    { collection: 'reservations', index: { residentId: 1, status: 1 }, options: {} },
    { collection: 'reservations', index: { startDate: 1, endDate: 1 }, options: {} },
    
    // Lots
    { collection: 'lots', index: { status: 1, phase: 1 }, options: {} },
    { collection: 'lots', index: { block: 1, lotNumber: 1 }, options: { unique: true } },
  ];
  
  let created = 0;
  let skipped = 0;
  
  for (const { collection, index, options } of indexes) {
    try {
      const coll = db.collection(collection);
      const indexName = await coll.createIndex(index, { ...options, background: true });
      console.log(`✓ Created index on ${collection}: ${indexName}`);
      created++;
    } catch (error) {
      if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
        console.log(`⊘ Index already exists on ${collection} (skipped)`);
        skipped++;
      } else {
        console.error(`✗ Failed to create index on ${collection}:`, error.message);
      }
    }
  }
  
  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
  process.exit(0);
}

createIndexes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});