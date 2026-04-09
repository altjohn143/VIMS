const path = require('path');
const { createWorker, PSM } = require('tesseract.js');

const uploadDir = path.join(__dirname, '../uploads/ids');

const NOISE_WORDS = new Set([
  'REPUBLIC', 'PHILIPPINES', 'PHILIPPINE', 'IDENTIFICATION', 'IDENTITY', 'VALID', 'ONLY',
  'NOT', 'TRANSFERABLE', 'SIGN', 'SIGNATURE', 'BLOOD', 'TYPE', 'EYES', 'HAIR', 'HEIGHT',
  'WEIGHT', 'SEX', 'MALE', 'FEMALE', 'CITIZENSHIP', 'ISSUED', 'EXPIR', 'DATE', 'BIRTH',
  'PLACE', 'ADDRESS', 'PRECINCT', 'EMERGENCY', 'CONTACT', 'PIN', 'AGENCY', 'PHILSYS',
  'UMID', 'SSS', 'GSIS', 'LTO', 'DRIVER', 'LICENSE', 'VOTER', 'POSTAL', 'ID', 'NO'
]);

function looksLikeNameToken(word) {
  if (!word || word.length < 2) return false;
  if (NOISE_WORDS.has(word.toUpperCase())) return false;
  return /^[A-Za-zÀ-ÿ'.-]+$/.test(word);
}

function isProbableNameLine(line) {
  const t = line.trim();
  if (t.length < 2 || t.length > 80) return false;
  if (/^[\s.]+$/.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  if (/^\d+[/-]\d+[/-]\d+$/.test(t)) return false;
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const alphaTokens = tokens.filter((w) => looksLikeNameToken(w.replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, '')));
  if (alphaTokens.length === 0) return false;
  if (tokens.every((w) => NOISE_WORDS.has(w.toUpperCase()))) return false;
  const letterRatio = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length / t.length;
  return letterRatio > 0.55;
}

/** junk OCR like "." — not a real name */
function isBogusName(s) {
  const t = (s || '').trim();
  if (t.length < 2) return true;
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(t)) return true;
  return false;
}

/**
 * Philippine IDs often list: Given names (compound) + Middle name as last token on one line.
 * e.g. "JOHN MATTHEW ZABALA" → first "John Matthew", middle "Zabala"
 * Two tokens → both treated as first name (e.g. "John Matthew").
 */
function splitGivenIntoFirstMiddle(givenLine, surnameLine) {
  let parts = givenLine.trim().split(/\s+/).filter(Boolean);
  const surNorm = (surnameLine || '')
    .replace(/[^A-Za-zÀ-ÿ]/gi, '')
    .toUpperCase();
  if (surNorm) {
    parts = parts.filter((p) => p.replace(/[^A-Za-zÀ-ÿ]/gi, '').toUpperCase() !== surNorm);
  }
  if (parts.length === 0) return { first: '', middle: '' };
  if (parts.length === 1) return { first: parts[0], middle: '' };
  if (parts.length === 2) return { first: `${parts[0]} ${parts[1]}`, middle: '' };
  const middle = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(' ');
  return { first, middle };
}

function normalizeLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Common OCR mistakes in numeric dates */
function normalizeOcrDigitsInDates(text) {
  return text
    .replace(/([0-9])O([0-9])/g, '$10$2')
    .replace(/([0-9])o([0-9])/g, '$10$2')
    .replace(/\bO([0-9]{1,2})\b/g, '0$1');
}

function parseYyyyMmDd(y, mo, d) {
  const yi = Number(y);
  const mi = Number(mo);
  const di = Number(d);
  if (yi < 1900 || yi > 2100 || mi < 1 || mi > 12 || di < 1 || di > 31) return '';
  return `${yi}-${String(mi).padStart(2, '0')}-${String(di).padStart(2, '0')}`;
}

/** PH-style: day/month/year when both day and month could be ≤12 */
function parseDmyPh(a, b, c) {
  const cy = c.length === 2 ? `20${c}` : c;
  const first = Number(a);
  const second = Number(b);
  let day;
  let month;
  const year = cy;
  if (first > 12) {
    day = a;
    month = b;
  } else if (second > 12) {
    day = b;
    month = a;
  } else {
    // Ambiguous: assume DD/MM/YYYY (Philippines)
    day = a;
    month = b;
  }
  return parseYyyyMmDd(year, month, day);
}

function extractFirstDmyFromString(t) {
  const iso = t.match(/\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/);
  if (iso) {
    const [, y, mo, d] = iso;
    return parseYyyyMmDd(y, mo, d);
  }
  const dmy = t.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (dmy) {
    const [, a, b, c] = dmy;
    return parseDmyPh(a, b, c);
  }
  return '';
}

const MONTH_MAP = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12
};

function extractMonthNameDate(t) {
  const re = /\b(\d{1,2})[\s./-]+([A-Za-z]{3,9})[\s./-]+(\d{2,4})\b/i;
  const m = t.match(re);
  if (!m) return '';
  const [, d, monStr, yStr] = m;
  const mo = MONTH_MAP[monStr.toLowerCase()];
  if (!mo) return '';
  const y = yStr.length === 2 ? `20${yStr}` : yStr;
  return parseYyyyMmDd(y, mo, d);
}

/** Prefer date on/near lines that mention birth (avoids expiry / issue dates when possible) */
function extractDobNearBirthLabels(lines, fullTextNormalized) {
  const birthRes = [
    /birth|kapanganakan|date\s*of\s*birth|d\.?\s*o\.?\s*b|birthdate|birth\s*date|petsa\s*ng\s*kapanganakan/i
  ];
  const window = [];
  for (let i = 0; i < lines.length; i++) {
    if (!birthRes.some((re) => re.test(lines[i]))) continue;
    for (let j = i; j < Math.min(i + 4, lines.length); j++) {
      window.push(lines[j]);
    }
  }
  const chunk = window.join(' ');
  let dob = extractFirstDmyFromString(chunk);
  if (!dob) dob = extractMonthNameDate(chunk);
  if (dob) return dob;

  for (const line of lines) {
    if (!birthRes.some((re) => re.test(line))) continue;
    const same = extractFirstDmyFromString(line) || extractMonthNameDate(line);
    if (same) return same;
  }
  return '';
}

function extractDobFixed(fullText) {
  const t = normalizeOcrDigitsInDates(fullText.replace(/\s+/g, ' '));
  const lines = normalizeLines(fullText);

  const nearBirth = extractDobNearBirthLabels(lines, t);
  if (nearBirth) return nearBirth;

  const iso = t.match(/\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/);
  if (iso) {
    const [, y, mo, d] = iso;
    const out = parseYyyyMmDd(y, mo, d);
    if (out) return out;
  }
  const dmy = t.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (dmy) {
    const [, a, b, c] = dmy;
    return parseDmyPh(a, b, c);
  }

  const monthName = extractMonthNameDate(t);
  if (monthName) return monthName;

  const allDates = [...t.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g)];
  for (const m of allDates) {
    const parsed = parseDmyPh(m[1], m[2], m[3]);
    if (parsed) {
      const y = Number(parsed.slice(0, 4));
      if (y >= 1940 && y <= 2015) return parsed;
    }
  }
  return '';
}

function extractIdNumber(fullText) {
  const digits = fullText.match(/\b\d{10,16}\b/g);
  return digits && digits[0] ? digits[0] : '';
}

function labelValue(lines, patterns) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!patterns.some((re) => re.test(line))) continue;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (isProbableNameLine(lines[j])) return lines[j].trim();
    }
  }
  return '';
}

function heuristicNames(lines) {
  const nameLines = lines.filter(isProbableNameLine);
  if (nameLines.length === 0) {
    return { lastName: '', firstName: '', middleName: '' };
  }
  let lastName = '';
  let firstName = '';
  let middleName = '';

  const labeledLast = labelValue(lines, [/surname|apelyido|last\s*name|family\s*name/i]);
  const labeledFirst = labelValue(lines, [
    /given\s*name/i,
    /first\s*name/i,
    /mga\s*pangalan/i,
    /\bpangalan(?!g)\b/i
  ]);
  const labeledMiddleOnly = labelValue(lines, [
    /middle\s*name/i,
    /gitnang\s*pangalan/i,
    /mother'?s?\s*maiden/i
  ]);

  if (labeledLast) lastName = labeledLast;

  if (labeledMiddleOnly && labeledFirst) {
    firstName = labeledFirst.trim();
    middleName = labeledMiddleOnly.trim();
  } else if (labeledFirst) {
    const sp = splitGivenIntoFirstMiddle(labeledFirst, lastName);
    firstName = sp.first;
    middleName = sp.middle;
  }

  if (!lastName && nameLines[0]) {
    lastName = nameLines[0];
  }
  if (!firstName) {
    const rest = nameLines.filter((l) => l !== lastName);
    if (rest[0]) {
      const sp = splitGivenIntoFirstMiddle(rest[0], lastName);
      firstName = sp.first;
      middleName = middleName || sp.middle;
    }
  }

  lastName = titleCaseWords(lastName);
  firstName = titleCaseWords(firstName);
  middleName = titleCaseWords(middleName);

  if (isBogusName(firstName) && middleName && middleName.includes(' ')) {
    const sp = splitGivenIntoFirstMiddle(middleName, lastName);
    if (!isBogusName(sp.first)) {
      firstName = titleCaseWords(sp.first);
      middleName = titleCaseWords(sp.middle);
    }
  }

  return { lastName, firstName, middleName };
}

function titleCaseWords(s) {
  if (!s) return '';
  return s
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}

function parseFieldsFromText(rawText) {
  const lines = normalizeLines(rawText);
  const fullText = lines.join('\n');
  const { lastName, firstName, middleName } = heuristicNames(lines);
  const dob = extractDobFixed(fullText);
  const idNumber = extractIdNumber(fullText);

  let confidence = 0.35;
  if (firstName || lastName) confidence += 0.25;
  if (lastName && firstName) confidence += 0.2;
  if (dob) confidence += 0.1;
  if (idNumber) confidence += 0.05;
  confidence = Math.min(0.95, confidence);

  return {
    firstName,
    lastName,
    middleName,
    dob,
    idNumber,
    confidence,
    rawText: fullText.slice(0, 8000)
  };
}

async function recognizeImage(absPath) {
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const { data } = await worker.recognize(absPath);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

async function extractIdFieldsFromImagePaths(frontAbsPath, backAbsPath) {
  // Sequential OCR uses less peak RAM (helps small Render instances).
  const frontText = await recognizeImage(frontAbsPath);
  const backText = await recognizeImage(backAbsPath);
  const combined = `${frontText}\n${backText}`;
  const parsed = parseFieldsFromText(combined);
  return {
    ...parsed,
    engine: 'tesseract'
  };
}

/**
 * Multer stores files as filenames under uploads/ids — resolve absolute paths.
 */
function resolveUploadedPaths(filenameFront, filenameBack) {
  return {
    front: path.join(uploadDir, filenameFront),
    back: path.join(uploadDir, filenameBack)
  };
}

module.exports = {
  extractIdFieldsFromImagePaths,
  resolveUploadedPaths,
  parseFieldsFromText
};
