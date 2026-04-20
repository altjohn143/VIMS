/**
 * Deletes IdentityVerification documents whose userId no longer exists in User (orphans).
 *
 * Usage:
 *   cd backend
 *   node scripts/delete-orphan-verifications.js --dry-run   # list only, no delete
 *   node scripts/delete-orphan-verifications.js             # delete orphans
 *
 * Uses MONGODB_URI from .env (same as server).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const IdentityVerification = require('../models/IdentityVerification');
const User = require('../models/User');

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vims_system';
  await mongoose.connect(uri);
  console.log('Connected:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***@'));

  const verifications = await IdentityVerification.find().select('_id userId createdAt').lean();
  const userIds = await User.distinct('_id');
  const existing = new Set(userIds.map((id) => String(id)));

  const orphans = verifications.filter((v) => !v.userId || !existing.has(String(v.userId)));

  console.log(`\nTotal verifications: ${verifications.length}`);
  console.log(`Orphaned (no matching User): ${orphans.length}`);
  if (orphans.length === 0) {
    await mongoose.disconnect();
    console.log('Nothing to delete.');
    process.exit(0);
    return;
  }

  orphans.forEach((o) => {
    console.log(`  - ${o._id}  userId=${o.userId}  createdAt=${o.createdAt?.toISOString?.() || o.createdAt}`);
  });

  if (dryRun) {
    console.log('\n--dry-run: no documents deleted. Run without --dry-run to delete.');
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  const ids = orphans.map((o) => o._id);
  const result = await IdentityVerification.deleteMany({ _id: { $in: ids } });
  console.log(`\nDeleted ${result.deletedCount} orphan IdentityVerification document(s).`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
