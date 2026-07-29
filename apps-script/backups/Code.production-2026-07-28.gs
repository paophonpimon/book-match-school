const CONFIG = {
  spreadsheetId: '11j1bxPjl6l-DYPZFV9TWLbcmp3zze6bIJptCK4BFonU',
  booksSheet: 'Books',
  submissionsSheet: 'Book_Submissions',
  rejectedSheet: 'Rejected',
  auditSheet: 'Audit_Log',
  allowedMoods: [
    'อยากลุ้น',
    'อยากขำ',
    'อยากได้ความรู้',
    'อ่านสั้น ๆ',
    'หาแรงบันดาลใจ',
    'อยากผ่อนคลาย',
  ],
  firebaseApiKey: 'AIzaSyAivRbp8jpox7Lj7BdsCGAzY5ph8Ehpxtw',
  adminEmails: ['paopornpimon@gmail.com'],
  categories: {
    '000': 'ความรู้ทั่วไป',
    '100': 'ปรัชญาและจิตวิทยา',
    '200': 'ศาสนา',
    '300': 'สังคมศาสตร์',
    '400': 'ภาษา',
    '500': 'วิทยาศาสตร์',
    '600': 'เทคโนโลยีและวิทยาการประยุกต์',
    '700': 'ศิลปะและนันทนาการ',
    '800': 'วรรณคดี',
    '900': 'ประวัติศาสตร์และภูมิศาสตร์',
  },
};

function doGet() {
  try {
    const books = readBooks_();
    return json_({ ok: true, books });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(payload.action || 'createBook');

    if (action !== 'createBook') {
      throw new Error('ไม่รองรับคำสั่งนี้');
    }

    const admin = verifyFirebaseAdmin_(payload.firebaseIdToken);
    const result = createBook_(payload.book || {}, admin.email);
    return json_({ ok: true, ...result });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function verifyFirebaseAdmin_(idToken) {
  const token = String(idToken || '').trim();
  if (!token) {
    throw new Error('กรุณาเข้าสู่ระบบผู้ดูแล');
  }

  const url =
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
    encodeURIComponent(CONFIG.firebaseApiKey);

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: token }),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const data = JSON.parse(response.getContentText() || '{}');
  const user = data.users && data.users[0];

  if (status !== 200 || !user || !user.email) {
    throw new Error('เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  const email = String(user.email).trim().toLowerCase();
  const allowed = CONFIG.adminEmails.map(value => value.toLowerCase());

  if (!allowed.includes(email)) {
    throw new Error('บัญชีนี้ไม่มีสิทธิ์เพิ่มหนังสือ');
  }

  return { email, localId: user.localId || '' };
}

function readBooks_() {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = ss.getSheetByName(CONFIG.booksSheet);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();

  return values
    .filter(row => row[1] && row[16] !== false)
    .map(row => rowToObject_(headers, row))
    .sort((a, b) => Number(a.displayOrder || 999999) - Number(b.displayOrder || 999999));
}

function createBook_(input, submittedBy) {
  const clean = normalizeBook_(input);
  const validationError = validateBook_(clean);

  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const submissions = ss.getSheetByName(CONFIG.submissionsSheet);
  const submissionId = Utilities.getUuid();
  const now = new Date();

  submissions.appendRow([
    submissionId,
    validationError ? 'rejected' : 'approved',
    now,
    String(submittedBy || ''),
    clean.title,
    clean.author,
    clean.categoryCode,
    clean.description,
    clean.coverUrl,
    clean.audioUrl,
    clean.moods.join('; '),
    clean.active,
    validationError || '',
    validationError ? now : '',
    '',
    '',
    '1',
  ]);

  if (validationError) {
    ss.getSheetByName(CONFIG.rejectedSheet).appendRow([
      submissionId,
      now,
      String(submittedBy || ''),
      clean.title,
      clean.author,
      clean.categoryCode,
      clean.description,
      clean.coverUrl,
      clean.audioUrl,
      clean.moods.join('; '),
      clean.active,
      validationError,
      JSON.stringify(input),
    ]);
    log_(ss, 'reject', submittedBy, submissionId, '', clean.title, 'rejected', validationError);
    throw new Error(validationError);
  }

  const books = ss.getSheetByName(CONFIG.booksSheet);
  ensureNotDuplicate_(books, clean.title, clean.author);

  const bookId = makeBookId_(books, clean.categoryCode);
  const displayOrder = books.getLastRow();
  const category = CONFIG.categories[clean.categoryCode];
  const tags = [category].concat(clean.tags).filter(Boolean).join('; ');
  const matchReason = `เหมาะสำหรับผู้ที่สนใจ${category} และกำลังมองหาหนังสือแบบ${clean.moods.join(', ')}`;

  books.appendRow([
    bookId,
    clean.title,
    clean.author,
    clean.categoryCode,
    category,
    clean.description,
    clean.coverUrl,
    clean.audioUrl,
    clean.isbn,
    clean.callNumber,
    tags,
    clean.moods.join('; '),
    clean.readingLevel,
    clean.recommendedGrades,
    clean.estimatedReadingMinutes || '',
    matchReason,
    clean.active,
    displayOrder,
    'web-admin',
    false,
    '',
    'พร้อมให้บริการ',
    '',
    clean.categoryCode,
    displayOrder,
    'verified',
    false,
    now,
    now,
  ]);

  submissions.getRange(submissions.getLastRow(), 15).setValue(bookId);
  log_(ss, 'create', submittedBy, submissionId, bookId, clean.title, 'approved', 'เพิ่มหนังสือสำเร็จ');

  return { bookId, submissionId };
}

function normalizeBook_(input) {
  const moods = Array.isArray(input.moods)
    ? input.moods
    : String(input.moods || '').split(';');

  return {
    title: String(input.title || '').trim(),
    author: String(input.author || '').trim(),
    categoryCode: String(input.categoryCode || '').padStart(3, '0').trim(),
    description: String(input.description || '').trim(),
    coverUrl: String(input.coverUrl || '').trim(),
    audioUrl: String(input.audioUrl || '').trim(),
    isbn: String(input.isbn || '').trim(),
    callNumber: String(input.callNumber || '').trim(),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    moods: [...new Set(moods.map(v => String(v).trim()).filter(Boolean))],
    readingLevel: String(input.readingLevel || 'ปานกลาง').trim(),
    recommendedGrades: String(input.recommendedGrades || 'ม.1-ม.6').trim(),
    estimatedReadingMinutes: Number(input.estimatedReadingMinutes || 0),
    active: input.active !== false,
  };
}

function validateBook_(book) {
  if (!book.title) return 'กรุณากรอกชื่อหนังสือ';
  if (!book.author) return 'กรุณากรอกชื่อผู้แต่ง';
  if (!CONFIG.categories[book.categoryCode]) return 'เลขหมวดต้องเป็น 000–900 ตามรายการที่กำหนด';
  if (!book.description) return 'กรุณากรอกคำอธิบายหรือเรื่องย่อ';
  if (!isHttpUrl_(book.coverUrl)) return 'ลิงก์รูปปกไม่ถูกต้อง';
  if (book.audioUrl && !isHttpUrl_(book.audioUrl)) return 'ลิงก์ไฟล์เสียงไม่ถูกต้อง';
  if (book.moods.length < 1 || book.moods.length > 3) return 'เลือกอารมณ์หนังสือ 1–3 ข้อ';
  if (book.moods.some(mood => !CONFIG.allowedMoods.includes(mood))) return 'พบค่าอารมณ์ที่ระบบไม่รองรับ';
  return '';
}

function ensureNotDuplicate_(sheet, title, author) {
  const values = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 2).getDisplayValues();
  const key = `${title}|${author}`.toLowerCase().replace(/\s+/g, '');
  const duplicate = values.some(row =>
    `${row[0]}|${row[1]}`.toLowerCase().replace(/\s+/g, '') === key
  );
  if (duplicate) throw new Error('พบหนังสือชื่อและผู้แต่งซ้ำในฐานข้อมูล');
}

function makeBookId_(sheet, categoryCode) {
  const prefix = `book-${categoryCode}-`;
  const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getDisplayValues().flat();
  let max = 0;
  ids.forEach(id => {
    if (String(id).startsWith(prefix)) {
      max = Math.max(max, Number(String(id).slice(prefix.length)) || 0);
    }
  });
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

function log_(ss, action, userEmail, submissionId, bookId, title, status, detail) {
  ss.getSheetByName(CONFIG.auditSheet).appendRow([
    new Date(), action, String(userEmail || ''), submissionId, bookId,
    title, status, detail, '1',
  ]);
}

function rowToObject_(headers, row) {
  return headers.reduce((obj, key, index) => {
    obj[key] = row[index];
    return obj;
  }, {});
}

function isHttpUrl_(value) {
  return /^https?:\/\/\S+$/i.test(String(value || ''));
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
