/**
 * Book Match production API (Admin Dashboard).
 *
 * Spreadsheet sheets:
 * - Books (required)
 * - Audit_Log (created/initialized automatically)
 * - Settings (optional)
 *
 * Deploy as the existing Web app deployment so the /exec URL remains unchanged.
 */
const BOOKS_SHEET = 'Books';
const AUDIT_SHEET = 'Audit_Log';
const SETTINGS_SHEET = 'Settings';
const SPREADSHEET_ID = '11j1bxPjl6l-DYPZFV9TWLbcmp3zze6bIJptCK4BFonU';
const STUDENT_CACHE_KEY = 'book-match-student-catalog-v3';
const ADMIN_EMAIL = 'paopornpimon@gmail.com';
const FIREBASE_API_KEY_FALLBACK = 'AIzaSyAivRbp8jpox7Lj7BdsCGAzY5ph8Ehpxtw';
const ALLOWED_MOODS = [
  'อยากลุ้น',
  'อยากขำ',
  'อยากได้ความรู้',
  'อ่านสั้น ๆ',
  'หาแรงบันดาลใจ',
  'อยากผ่อนคลาย'
];
const PUBLIC_BOOK_FIELDS = [
  'id', 'title', 'author', 'categoryCode', 'category', 'description',
  'coverUrl', 'audioUrl', 'isbn', 'callNumber', 'tags', 'moods',
  'readingLevel', 'recommendedGrades', 'estimatedReadingMinutes',
  'matchReason', 'active', 'displayOrder'
];
const ADMIN_EDITABLE_FIELDS = PUBLIC_BOOK_FIELDS.filter(function (field) {
  return field !== 'id';
});

function doGet() {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(STUDENT_CACHE_KEY);
    if (cached) return json_(JSON.parse(cached));

    const spreadsheet = getSpreadsheet_();
    const books = readBooks_(spreadsheet)
      .filter(function (book) { return book.active !== false; })
      .sort(sortBooks_)
      .map(function (book) { return pick_(book, PUBLIC_BOOK_FIELDS); });
    const payload = {
      ok: true,
      books: books,
      settings: readSettings_(spreadsheet),
      generatedAt: new Date().toISOString()
    };
    // CacheService defaults to 600 seconds (10 minutes).
    cache.put(STUDENT_CACHE_KEY, JSON.stringify(payload));
    return json_(payload);
  } catch (error) {
    return jsonError_('โหลดรายการหนังสือไม่สำเร็จ', error);
  }
}

function doPost(event) {
  try {
    const request = parseRequest_(event);
    const admin = verifyAdmin_(request.firebaseIdToken);
    switch (request.action) {
      case 'listBooks':
        return listBooks_(admin);
      case 'createBook':
        return createBook_(request.book, admin);
      case 'updateBook':
        return updateBook_(request.bookId, request.book, admin);
      case 'archiveBook':
        return setBookActive_(request.bookId, false, 'archiveBook', admin);
      case 'restoreBook':
        return setBookActive_(request.bookId, true, 'restoreBook', admin);
      default:
        throw new Error('ไม่รองรับ action ที่ระบุ');
    }
  } catch (error) {
    return jsonError_('ดำเนินการไม่สำเร็จ', error);
  }
}

function listBooks_() {
  const books = readBooks_(getSpreadsheet_()).sort(sortBooks_);
  return json_({ ok: true, books: books });
}

function createBook_(rawBook, admin) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getRequiredSheet_(spreadsheet, BOOKS_SHEET);
    const table = readTable_(sheet);
    const book = validateAndNormalizeBook_(rawBook);
    assertNoDuplicate_(table.objects, book, '');

    const now = new Date();
    const bookId = 'book-' + Utilities.getUuid();
    const displayOrder = book.displayOrder > 0
      ? book.displayOrder
      : table.objects.reduce(function (max, item) { return Math.max(max, number_(item.displayOrder, 0)); }, 0) + 1;
    const created = Object.assign({}, book, {
      id: bookId,
      displayOrder: displayOrder,
      sourceType: 'admin',
      isSynthetic: false,
      metadataStatus: 'admin-managed',
      needsReview: false,
      createdAt: now,
      updatedAt: now
    });
    sheet.appendRow(rowForHeaders_(table.headers, created));
    appendAudit_(spreadsheet, 'createBook', bookId, admin.email, null, created, 'created');
    clearStudentCache_();
    return json_({ ok: true, bookId: bookId, book: pick_(created, PUBLIC_BOOK_FIELDS) });
  } finally {
    lock.releaseLock();
  }
}

function updateBook_(bookId, rawBook, admin) {
  const id = text_(bookId || (rawBook && rawBook.id));
  if (!id) throw new Error('ไม่พบ bookId');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getRequiredSheet_(spreadsheet, BOOKS_SHEET);
    const table = readTable_(sheet);
    const index = findBookIndex_(table.objects, id);
    if (index < 0) throw new Error('ไม่พบหนังสือที่ต้องการแก้ไข');

    const before = table.objects[index];
    const book = validateAndNormalizeBook_(rawBook);
    assertNoDuplicate_(table.objects, book, id);
    const after = Object.assign({}, before, book, { id: id, updatedAt: new Date() });
    const rowNumber = index + 2;
    sheet.getRange(rowNumber, 1, 1, table.headers.length).setValues([rowForHeaders_(table.headers, after)]);
    appendAudit_(spreadsheet, 'updateBook', id, admin.email, before, after, 'updated');
    clearStudentCache_();
    return json_({ ok: true, bookId: id, book: pick_(after, PUBLIC_BOOK_FIELDS) });
  } finally {
    lock.releaseLock();
  }
}

function setBookActive_(bookId, active, action, admin) {
  const id = text_(bookId);
  if (!id) throw new Error('ไม่พบ bookId');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = getSpreadsheet_();
    const sheet = getRequiredSheet_(spreadsheet, BOOKS_SHEET);
    const table = readTable_(sheet);
    const index = findBookIndex_(table.objects, id);
    if (index < 0) throw new Error('ไม่พบหนังสือที่ต้องการ');

    const before = table.objects[index];
    const after = Object.assign({}, before, { active: active, updatedAt: new Date() });
    const rowNumber = index + 2;
    sheet.getRange(rowNumber, 1, 1, table.headers.length).setValues([rowForHeaders_(table.headers, after)]);
    appendAudit_(spreadsheet, action, id, admin.email, before, after, before.active === active ? 'no-op' : 'status-changed');
    clearStudentCache_();
    return json_({ ok: true, bookId: id, active: active });
  } finally {
    lock.releaseLock();
  }
}

function verifyAdmin_(idToken) {
  const token = text_(idToken);
  if (!token) throw new Error('ไม่พบ Firebase ID Token');
  const apiKey = PropertiesService.getScriptProperties().getProperty('FIREBASE_API_KEY') || FIREBASE_API_KEY_FALLBACK;
  const response = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey), {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: token }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Firebase ID Token ไม่ถูกต้องหรือหมดอายุ');
  const payload = JSON.parse(response.getContentText());
  const user = payload.users && payload.users[0];
  const email = text_(user && user.email).toLowerCase();
  const providers = (user && user.providerUserInfo) || [];
  const googleProvider = providers.some(function (provider) { return provider.providerId === 'google.com'; });
  if (!user || email !== ADMIN_EMAIL || user.emailVerified !== true || !googleProvider) {
    throw new Error('บัญชีนี้ไม่มีสิทธิ์จัดการหนังสือ');
  }
  return { uid: user.localId, email: email };
}

function validateAndNormalizeBook_(rawBook) {
  if (!rawBook || typeof rawBook !== 'object') throw new Error('ข้อมูลหนังสือไม่ถูกต้อง');
  const book = {};
  ADMIN_EDITABLE_FIELDS.forEach(function (field) { book[field] = rawBook[field]; });
  book.title = text_(book.title);
  book.author = text_(book.author);
  book.categoryCode = text_(book.categoryCode);
  book.category = text_(book.category);
  book.description = text_(book.description);
  book.coverUrl = text_(book.coverUrl);
  book.audioUrl = text_(book.audioUrl);
  book.isbn = text_(book.isbn);
  book.callNumber = text_(book.callNumber);
  book.tags = list_(book.tags).join('; ');
  const moods = list_(book.moods);
  book.moods = moods.join('; ');
  book.readingLevel = text_(book.readingLevel);
  book.recommendedGrades = text_(book.recommendedGrades);
  book.estimatedReadingMinutes = book.estimatedReadingMinutes === '' || book.estimatedReadingMinutes == null
    ? ''
    : number_(book.estimatedReadingMinutes, -1);
  book.matchReason = text_(book.matchReason);
  book.active = book.active !== false;
  book.displayOrder = number_(book.displayOrder, 0);

  if (!book.title || !book.author || !book.categoryCode || !book.description) {
    throw new Error('กรุณากรอกชื่อหนังสือ ผู้แต่ง รหัสหมวด และคำอธิบายให้ครบ');
  }
  if (!/^[0-9]{3}$/.test(book.categoryCode)) throw new Error('รหัสหมวดต้องเป็นตัวเลข 3 หลัก');
  if (moods.length < 1 || moods.length > 3 || moods.some(function (mood) { return ALLOWED_MOODS.indexOf(mood) < 0; })) {
    throw new Error('กรุณาเลือกอารมณ์ที่อนุญาต 1–3 ข้อ');
  }
  if (book.estimatedReadingMinutes !== '' && book.estimatedReadingMinutes < 0) throw new Error('เวลาอ่านโดยประมาณต้องไม่ติดลบ');
  if (book.displayOrder < 0) throw new Error('ลำดับการแสดงต้องไม่ติดลบ');
  return book;
}

function assertNoDuplicate_(books, candidate, editingId) {
  const title = candidate.title.toLocaleLowerCase();
  const author = candidate.author.toLocaleLowerCase();
  const duplicate = books.some(function (book) {
    return text_(book.id) !== editingId
      && text_(book.title).toLocaleLowerCase() === title
      && text_(book.author).toLocaleLowerCase() === author;
  });
  if (duplicate) throw new Error('มีหนังสือชื่อและผู้แต่งนี้อยู่แล้ว');
}

function readBooks_(spreadsheet) {
  const objects = readTable_(getRequiredSheet_(spreadsheet, BOOKS_SHEET)).objects;
  return objects
    .filter(function (row) { return text_(row.id) && text_(row.title); })
    .map(function (row) {
      const book = pick_(row, PUBLIC_BOOK_FIELDS);
      book.id = text_(book.id);
      book.title = text_(book.title);
      book.author = text_(book.author);
      book.categoryCode = text_(book.categoryCode);
      book.category = text_(book.category);
      book.description = text_(book.description);
      book.coverUrl = text_(book.coverUrl);
      book.audioUrl = text_(book.audioUrl);
      book.isbn = text_(book.isbn);
      book.callNumber = text_(book.callNumber);
      book.tags = list_(book.tags);
      book.moods = list_(book.moods);
      book.readingLevel = text_(book.readingLevel);
      book.recommendedGrades = text_(book.recommendedGrades);
      book.estimatedReadingMinutes = book.estimatedReadingMinutes === '' ? null : number_(book.estimatedReadingMinutes, null);
      book.matchReason = text_(book.matchReason);
      book.active = boolean_(book.active, true);
      book.displayOrder = number_(book.displayOrder, 0);
      return book;
    });
}

function readSettings_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SETTINGS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return {};
  const rows = readTable_(sheet).objects;
  const settings = {};
  rows.forEach(function (row) {
    const key = text_(row.key);
    if (key) settings[key] = row.value;
  });
  return settings;
}

function readTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], objects: [] };
  const headers = values[0].map(function (value) { return text_(value); });
  const objects = values.slice(1)
    .filter(function (row) { return row.some(function (cell) { return cell !== ''; }); })
    .map(function (row) {
      const object = {};
      headers.forEach(function (header, index) { if (header) object[header] = row[index]; });
      return object;
    });
  return { headers: headers, objects: objects };
}

function appendAudit_(spreadsheet, action, bookId, email, before, after, detail) {
  let sheet = spreadsheet.getSheetByName(AUDIT_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(AUDIT_SHEET);
  const headers = ['timestamp', 'action', 'bookId', 'email', 'titleBefore', 'titleAfter', 'activeBefore', 'activeAfter', 'detail'];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(),
    action,
    bookId,
    email,
    before ? text_(before.title) : '',
    after ? text_(after.title) : '',
    before ? boolean_(before.active, true) : '',
    after ? boolean_(after.active, true) : '',
    detail
  ]);
}

function rowForHeaders_(headers, object) {
  return headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : '';
  });
}

function findBookIndex_(books, bookId) {
  return books.findIndex(function (book) { return text_(book.id) === bookId; });
}

function sortBooks_(left, right) {
  return number_(left.displayOrder, 0) - number_(right.displayOrder, 0)
    || text_(left.title).localeCompare(text_(right.title), 'th');
}

function clearStudentCache_() {
  CacheService.getScriptCache().remove(STUDENT_CACHE_KEY);
}

function getRequiredSheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบชีต ' + name);
  return sheet;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function parseRequest_(event) {
  if (!event || !event.postData || !event.postData.contents) throw new Error('ไม่พบ request body');
  return JSON.parse(event.postData.contents);
}

function pick_(source, fields) {
  const output = {};
  fields.forEach(function (field) { output[field] = source[field]; });
  return output;
}

function text_(value) {
  return value == null ? '' : String(value).trim();
}

function list_(value) {
  const values = Array.isArray(value) ? value : [value];
  return values.reduce(function (all, item) {
    return all.concat(text_(item).split(';'));
  }, []).map(function (item) { return item.trim(); }).filter(Boolean);
}

function number_(value, fallback) {
  const number = Number(value);
  return isFinite(number) ? number : fallback;
}

function boolean_(value, fallback) {
  if (value === '' || value == null) return fallback;
  if (typeof value === 'boolean') return value;
  return ['false', '0', 'no', 'n', 'ไม่'].indexOf(text_(value).toLowerCase()) < 0;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(message, error) {
  return json_({
    ok: false,
    error: message,
    detail: String(error && error.message ? error.message : error)
  });
}
