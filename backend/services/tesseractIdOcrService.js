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

function extractDobFixed(fullText) {
  const t = fullText.replace(/\s+/g, ' ');
  const iso = t.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (iso) {
    const [, y, mo, d] = iso;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const dmy = t.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (dmy) {
    let [, a, b, c] = dmy;
    const cy = c.length === 2 ? `20${c}` : c;
    const first = Number(a);
    const second = Number(b);
    let day;
    let month;
    let year = cy;
    if (first > 12) {
      day = a;
      month = b;
    } else if (second > 12) {
      day = b;
      month = a;
    } else {
      day = a;
      month = b;
    }
    const yNum = Number(year);
    if (yNum > 1900 && yNum < 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
