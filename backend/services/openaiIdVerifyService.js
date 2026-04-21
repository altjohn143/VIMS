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

function verifyUserAgainstOcr({ user, ocr }) {
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
  const hardReject =
    (hasDobMismatch && firstRatio < 0.6) ||
    (hasNameMismatch && firstRatio < 0.45) ||
    (hasNameMismatch && hasDobMismatch);
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
  verifyUserAgainstOcr
};
