require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Announcement = require('../models/Announcement');
const IdentityVerification = require('../models/IdentityVerification');
const ServiceRequest = require('../models/ServiceRequest');
const { uploadImageBuffer, uploadImagePath } = require('../services/cloudinaryService');

const apply = process.argv.includes('--apply');
const backendRoot = path.resolve(__dirname, '..');
const stats = { candidates: 0, migrated: 0, missing: 0, failed: 0 };

const localPath = (folder, filename) => {
  if (!filename || /^https?:\/\//i.test(filename)) return null;
  const target = path.resolve(backendRoot, 'uploads', folder, path.basename(filename));
  return fs.existsSync(target) ? target : null;
};

const migrateFile = async ({ label, buffer, filePath, folder }) => {
  stats.candidates += 1;
  if (!apply) {
    console.log(`[dry-run] ${label}`);
    return null;
  }
  if (!buffer && !filePath) {
    stats.missing += 1;
    console.warn(`[missing] ${label}`);
    return null;
  }
  try {
    const uploaded = buffer
      ? await uploadImageBuffer(buffer, { folder })
      : await uploadImagePath(filePath, { folder });
    stats.migrated += 1;
    console.log(`[migrated] ${label}`);
    return uploaded;
  } catch (error) {
    stats.failed += 1;
    console.error(`[failed] ${label}: ${error.message}`);
    return null;
  }
};

const migrateVerifications = async () => {
  const records = await IdentityVerification.find({});
  for (const record of records) {
    for (const kind of ['front', 'back', 'selfie']) {
      const imageField = `${kind}Image`;
      const urlField = `${kind}ImageUrl`;
      const publicIdField = `${kind}ImagePublicId`;
      const dataField = `${kind}ImageData`;
      if (record[urlField] || (!record[imageField] && !record[dataField])) continue;
      const uploaded = await migrateFile({
        label: `verification ${record._id} ${kind}`,
        buffer: record[dataField],
        filePath: localPath('ids', record[imageField]),
        folder: kind === 'selfie' ? 'vims/verification-selfies' : 'vims/ids'
      });
      if (uploaded) {
        record[urlField] = uploaded.secure_url;
        record[publicIdField] = uploaded.public_id;
        record[dataField] = null;
      }
    }
    if (apply && record.isModified()) await record.save();
  }
};

const migrateSimpleAssets = async () => {
  const users = await User.find({});
  for (const user of users) {
    if (user.profilePhoto && !/^https?:\/\//i.test(user.profilePhoto)) {
      const uploaded = await migrateFile({ label: `user ${user._id} profile`, filePath: localPath('profile-photos', user.profilePhoto), folder: 'vims/profiles' });
      if (uploaded) { user.profilePhoto = uploaded.secure_url; user.profilePhotoPublicId = uploaded.public_id; }
    }
    for (let index = 0; index < (user.vehicles || []).length; index += 1) {
      const vehicle = user.vehicles[index];
      if (!vehicle.carImage || /^https?:\/\//i.test(vehicle.carImage)) continue;
      const uploaded = await migrateFile({ label: `user ${user._id} vehicle ${index}`, filePath: localPath('vehicle-photos', vehicle.carImage), folder: 'vims/vehicles' });
      if (uploaded) { vehicle.carImage = uploaded.secure_url; vehicle.carImagePublicId = uploaded.public_id; }
    }
    if (apply && user.isModified()) await user.save();
    if (apply && user.role === 'resident' && user.profilePhoto && /^https?:\/\//i.test(user.profilePhoto)) {
      await IdentityVerification.updateOne(
        { userId: user._id, $or: [{ selfieImageUrl: null }, { selfieImageUrl: '' }, { selfieImageUrl: { $exists: false } }] },
        {
          $set: {
            residentEmail: user.email || '',
            residentDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            selfieImage: `profile-${user._id}.jpg`,
            selfieImageUrl: user.profilePhoto,
            selfieImagePublicId: user.profilePhotoPublicId || null,
            selfieImageData: null,
            selfieImageMimeType: 'image/jpeg'
          },
          $setOnInsert: { status: 'pending_upload' }
        },
        { upsert: true }
      );
    }
  }

  const payments = await Payment.find({ receiptImage: { $nin: [null, ''] } });
  for (const payment of payments) {
    if (/^https?:\/\//i.test(payment.receiptImage)) continue;
    const uploaded = await migrateFile({ label: `payment ${payment._id} receipt`, filePath: localPath('receipts', payment.receiptImage), folder: 'vims/receipts' });
    if (uploaded && apply) await Payment.updateOne({ _id: payment._id }, { receiptImage: uploaded.secure_url, receiptImagePublicId: uploaded.public_id });
  }

  const announcements = await Announcement.find({ image: { $nin: [null, ''] } });
  for (const announcement of announcements) {
    if (/^https?:\/\//i.test(announcement.image)) continue;
    const uploaded = await migrateFile({ label: `announcement ${announcement._id} image`, filePath: localPath('announcements', announcement.image), folder: 'vims/announcements' });
    if (uploaded && apply) await Announcement.updateOne({ _id: announcement._id }, { image: uploaded.secure_url, imagePublicId: uploaded.public_id });
  }

  const serviceRequests = await ServiceRequest.find({ 'attachments.0': { $exists: true } });
  for (const request of serviceRequests) {
    for (const attachment of request.attachments) {
      if (attachment.url && /^https?:\/\//i.test(attachment.url)) continue;
      const filename = attachment.filename || attachment.url;
      const uploaded = await migrateFile({
        label: `service request ${request._id} attachment ${attachment._id}`,
        filePath: localPath('service-requests', filename),
        folder: 'vims/service-requests'
      });
      if (uploaded) {
        attachment.url = uploaded.secure_url;
        attachment.publicId = uploaded.public_id;
      }
    }
    if (apply && request.isModified()) await request.save();
  }
};

const run = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vims_system';
  await mongoose.connect(uri);
  await migrateVerifications();
  await migrateSimpleAssets();
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...stats }, null, 2));
  await mongoose.disconnect();
  if (stats.failed) process.exitCode = 1;
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
