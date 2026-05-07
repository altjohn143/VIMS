function normalizeNameValue(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/[^A-ZÀ-ÿ\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeName(s) {
  return normalizeNameValue(s).split(/\s+/).filter(Boolean);
}

function tokenMatchRatio(expected, actual) {
  const exp = tokenizeName(expected);
  const act = tokenizeName(actual);
  if (exp.length === 0 || act.length === 0) return 0;
  const actSet = new Set(act);
  const hits = exp.filter((t) => actSet.has(t)).length;
  return hits / exp.length;
}

/**
 * Detect the ID type from OCR extracted text
 * Maps detected ID keywords to our document type values
 */
function detectIdTypeFromOcr(ocrRawText) {
  if (!ocrRawText) return null;
  
  const text = String(ocrRawText || '').toUpperCase();
  
  // Driver's License - check for LTO keywords
  if (/\bLTO\b/.test(text) || /DRIVER.*LICENSE|LICENSE.*DRIVER/.test(text) || /PROFESSIONAL DRIVER/.test(text)) {
    return 'driver_license';
  }
  
  // National ID - check for PhilSys/National ID keywords
  if (/PHILSYS|PHILIPPINE IDENTIFICATION|NATIONAL ID|NATIONAL IDENTIFICATION/.test(text)) {
    return 'national_id';
  }
  
  // SSS ID
  if (/\bSSS\b|SOCIAL SECURITY SYSTEM|SOCIAL SECURITY/.test(text)) {
    return 'sss';
  }
  
  // GSIS ID
  if (/\bGSIS\b|GOVERNMENT SERVICE INSURANCE/.test(text)) {
    return 'gsis';
  }
  
  // Passport
  if (/PASSPORT|REPUBLIC OF THE PHILIPPINES/.test(text) && /PASSPORT/.test(text)) {
    return 'passport';
  }
  
  // Voter's ID
  if (/VOTER|COMELEC|OFFICIAL BALLOT|VOTER.*INFORMATION/.test(text)) {
    return 'voters';
  }
  
  // PRC ID
  if (/PROFESSIONAL REGULATION COMMISSION|PRC.*ID|PROFESSIONAL LICENSE/.test(text)) {
    return 'prc';
  }
  
  // NBI Clearance
  if (/NATIONAL BUREAU OF INVESTIGATION|NBI|NBI CLEARANCE/.test(text)) {
    return 'nbi';
  }
  
  // UMID
  if (/UNIFIED MULTI-PURPOSE|UMID|UMP ID/.test(text)) {
    return 'umid';
  }
  
  // OWWA ID
  if (/OVERSEAS WORKERS|OWWA/.test(text)) {
    return 'owwa';
  }
  
  // PhilHealth ID
  if (/PHILHEALTH|DEPARTMENT OF HEALTH/.test(text)) {
    return 'philhealth';
  }
  
  // TIN ID
  if (/TAX IDENTIFICATION|TIN ID|TAX ID/.test(text)) {
    return 'tin';
  }
  
  // Pag-Ibig ID
  if (/PAG-IBIG|HOME DEVELOPMENT MUTUAL|HDMF/.test(text)) {
    return 'pagibig';
  }
  
  // AFP ID
  if (/ARMED FORCES.*PHILIPPINES|AFP|MILITARY/.test(text)) {
    return 'afp';
  }
  
  // PNP ID
  if (/PHILIPPINE NATIONAL POLICE|PNP/.test(text)) {
    return 'pnp';
  }
  
  return null;
}

/**
 * Validate that the selected document type matches the detected type
 * Returns { isValid, detectedType, message }
 */
function validateDocumentType(selectedType, detectedType) {
  if (!selectedType || !detectedType) {
    return {
      isValid: detectedType === null, // Valid only if we couldn't detect (rely on user selection)
      detectedType,
      message: 'Could not detect ID type from image'
    };
  }

  if (selectedType === detectedType) {
    return {
      isValid: true,
      detectedType,
      message: 'Document type matches selected type'
    };
  }

  // Map type labels for better error messages
  const typeLabels = {
    'national_id': 'National ID',
    'driver_license': 'Driver\'s License',
    'passport': 'Passport',
    'sss': 'SSS ID',
    'gsis': 'GSIS ID',
    'umid': 'UMID',
    'voters': 'Voter\'s ID',
    'prc': 'PRC ID',
    'nbi': 'NBI Clearance',
    'owwa': 'OWWA ID',
    'philhealth': 'PhilHealth ID',
    'tin': 'TIN ID',
    'pagibig': 'Pag-Ibig ID',
    'afp': 'AFP ID',
    'pnp': 'PNP ID'
  };

  return {
    isValid: false,
    detectedType,
    message: `Selected ${typeLabels[selectedType] || selectedType} but detected ${typeLabels[detectedType] || detectedType}`
  };
}

function verifyUserAgainstOcr({ user, ocr, documentType }) {
  const flags = [];
  const reasons = [];
  const normalizedUserLast = normalizeNameValue(user.lastName);
  const normalizedOcrLast = normalizeNameValue(ocr.lastName);

  const lastExact = normalizedUserLast && normalizedOcrLast && normalizedUserLast === normalizedOcrLast;
  const firstRatio = tokenMatchRatio(user.firstName, ocr.firstName);
  const middleOk = !user.middleName ? true : tokenMatchRatio(user.middleName, ocr.middleName) >= 1;
  const dobOk = !user.dateOfBirth ? true : String(user.dateOfBirth).trim() === String(ocr.dob || '').trim();

  if (!lastExact) {
    flags.push('name_mismatch');
    reasons.push('Last name mismatch');
  }
  if (firstRatio < 0.8) {
    flags.push('name_mismatch');
    reasons.push('Given name mismatch');
  }
  if (!middleOk) {
    flags.push('name_mismatch');
    reasons.push('Middle name mismatch');
  }
  if (!dobOk) {
    flags.push('dob_mismatch');
    reasons.push('Date of birth mismatch');
  }

  // Validate document type if provided
  if (documentType) {
    const detectedType = detectIdTypeFromOcr(ocr.rawText);
    const typeValidation = validateDocumentType(documentType, detectedType);
    if (!typeValidation.isValid) {
      flags.push('id_type_mismatch');
      reasons.push(typeValidation.message);
    }
  }

  const ocrConfidence = typeof ocr.confidence === 'number' ? ocr.confidence : 0;
  const score =
    0.45 * Math.max(0, Math.min(1, ocrConfidence)) +
    0.25 * (lastExact ? 1 : 0) +
    0.2 * Math.max(0, Math.min(1, firstRatio)) +
    0.05 * (middleOk ? 1 : 0) +
    0.05 * (dobOk ? 1 : 0);

  const normalizedScore = Math.max(0, Math.min(1, score));
  let decision = 'manual_review';
  const hasNameMismatch = flags.includes('name_mismatch');
  const hasDobMismatch = flags.includes('dob_mismatch');
  const hasIdTypeMismatch = flags.includes('id_type_mismatch');
  const hardReject =
    (hasDobMismatch && firstRatio < 0.6) ||
    (hasNameMismatch && firstRatio < 0.45) ||
    (hasNameMismatch && hasDobMismatch) ||
    hasIdTypeMismatch;
  if (hardReject) {
    decision = 'rejected';
  } else {
    const strictAutoApprove =
      normalizedScore >= 0.9 &&
      ocrConfidence >= 0.8 &&
      lastExact &&
      firstRatio >= 0.9 &&
      middleOk &&
      dobOk &&
      flags.length === 0;
    if (strictAutoApprove) decision = 'documents_verified';
  }

  return {
    score: normalizedScore,
    flags: Array.from(new Set(flags)),
    reason: reasons.length ? reasons.join(', ') : 'Profile details are consistent with uploaded ID.',
    decision
  };
}

module.exports = {
  verifyUserAgainstOcr,
  detectIdTypeFromOcr,
  validateDocumentType
};
