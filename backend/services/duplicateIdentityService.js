const IdentityVerification = require('../models/IdentityVerification');
const User = require('../models/User');

function normalizeIdNumber(value) {
  return String(value || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findDuplicateByIdNumber(idNumber, excludeUserId = null) {
  const normalizedId = normalizeIdNumber(idNumber);
  if (!normalizedId) return null;

  const filter = {
    'aiResult.providerRaw.idNumber': normalizedId
  };
  if (excludeUserId) {
    filter.userId = { $ne: excludeUserId };
  }

  const verification = await IdentityVerification.findOne(filter).populate('userId', 'firstName lastName email isApproved').lean();
  if (!verification) return null;

  return {
    type: 'idNumber',
    duplicateVerification: verification,
    duplicateUser: verification.userId || null
  };
}

async function findDuplicateByProfile(ocr, excludeUserId = null) {
  if (!ocr || !ocr.firstName || !ocr.lastName || !ocr.dob) return null;

  const firstName = String(ocr.firstName).trim();
  const lastName = String(ocr.lastName).trim();
  if (!firstName || !lastName) return null;

  const userQuery = {
    dateOfBirth: ocr.dob,
    firstName: new RegExp(`^${escapeRegex(firstName)}$`, 'i'),
    lastName: new RegExp(`^${escapeRegex(lastName)}$`, 'i')
  };
  if (excludeUserId) {
    userQuery._id = { $ne: excludeUserId };
  }

  const existingUser = await User.findOne(userQuery).select('firstName lastName email isApproved houseNumber houseBlock houseLot').lean();
  if (!existingUser) return null;

  return {
    type: 'profile',
    duplicateUser: existingUser
  };
}

async function detectDuplicateIdentity({ idNumber, ocr, excludeUserId = null }) {
  const normalizedIdNumber = normalizeIdNumber(idNumber || (ocr && ocr.idNumber) || '');

  if (normalizedIdNumber) {
    const duplicate = await findDuplicateByIdNumber(normalizedIdNumber, excludeUserId);
    if (duplicate) {
      return {
        found: true,
        source: 'idNumber',
        reason: 'This government ID number is already registered to another resident account.',
        ...duplicate
      };
    }
  }

  const profileDuplicate = await findDuplicateByProfile(ocr, excludeUserId);
  if (profileDuplicate) {
    return {
      found: true,
      source: 'profile',
      reason: 'The uploaded ID appears to match another resident account by name and date of birth.',
      ...profileDuplicate
    };
  }

  return { found: false };
}

module.exports = {
  detectDuplicateIdentity,
  normalizeIdNumber
};
