import { createHash } from 'node:crypto'

const DEFAULT_SOURCE_URL = 'https://script.google.com/macros/s/AKfycbzkFWH1V-c-cNQ69GTdAScuv7wRURqKGzvC8Q9vIdYzjLCr8GnLY-t8KU_6UbO3VBhoFQ/exec'
const EXPECTED_COUNT = 106
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'book-match-school'
const sourceUrl = process.env.BOOKS_MIGRATION_SOURCE_URL || DEFAULT_SOURCE_URL
const commit = process.argv.includes('--commit')

function text(value) {
  return String(value ?? '').trim()
}

function list(value) {
  const values = Array.isArray(value) ? value : [value]
  return values.flatMap((item) => text(item).split(';')).map((item) => item.trim()).filter(Boolean)
}

function normalizeIdentity(value) {
  return text(value).normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g, ' ')
}

function uniqueKey(book) {
  return createHash('sha256')
    .update(`${normalizeIdentity(book.title)}\u0000${normalizeIdentity(book.author)}`)
    .digest('hex')
}

function cleanUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

const response = await fetch(sourceUrl, { headers: { Accept: 'application/json' } })
if (!response.ok) throw new Error(`Legacy catalog returned HTTP ${response.status}`)
const payload = await response.json()
if (payload?.ok !== true || !Array.isArray(payload.books)) {
  throw new Error(`Legacy catalog schema is invalid: ${JSON.stringify(payload).slice(0, 500)}`)
}

const books = payload.books.map((source, index) => {
  const id = text(source.id)
  const title = text(source.title)
  const author = text(source.author)
  if (!id || !title || !author) throw new Error(`Row ${index + 2} is missing id, title, or author`)
  return cleanUndefined({
    ...source,
    id,
    title,
    author,
    categoryCode: text(source.categoryCode),
    category: text(source.category),
    description: text(source.description),
    coverUrl: text(source.coverUrl),
    audioUrl: text(source.audioUrl),
    isbn: text(source.isbn),
    callNumber: text(source.callNumber),
    tags: list(source.tags),
    moods: list(source.moods),
    readingLevel: text(source.readingLevel),
    recommendedGrades: text(source.recommendedGrades),
    estimatedReadingMinutes: source.estimatedReadingMinutes === '' || source.estimatedReadingMinutes == null
      ? null
      : Number(source.estimatedReadingMinutes),
    matchReason: text(source.matchReason),
    active: source.active !== false,
    displayOrder: Number.isFinite(Number(source.displayOrder)) ? Number(source.displayOrder) : index + 1,
    normalizedTitle: normalizeIdentity(title),
    normalizedAuthor: normalizeIdentity(author),
    normalizedTitleAuthor: `${normalizeIdentity(title)}\u0000${normalizeIdentity(author)}`,
    migrationSource: 'google-sheets-apps-script-v1',
  })
})

const duplicateIds = books.filter((book, index) => books.findIndex((candidate) => candidate.id === book.id) !== index)
const uniqueKeys = new Map()
const duplicateIdentities = []
for (const book of books) {
  const key = uniqueKey(book)
  if (uniqueKeys.has(key)) duplicateIdentities.push([uniqueKeys.get(key), book.id])
  uniqueKeys.set(key, book.id)
}
if (books.length !== EXPECTED_COUNT) throw new Error(`Expected ${EXPECTED_COUNT} books, received ${books.length}`)
if (duplicateIds.length) throw new Error(`Duplicate book IDs: ${duplicateIds.map((book) => book.id).join(', ')}`)
if (duplicateIdentities.length) throw new Error(`Duplicate normalized title/author: ${JSON.stringify(duplicateIdentities)}`)

const checksum = createHash('sha256')
  .update(JSON.stringify(books.map((book) => [book.id, book.title, book.author, book.active, book.displayOrder])))
  .digest('hex')
const categoryCounts = Object.fromEntries(
  [...new Set(books.map((book) => book.categoryCode))].sort().map((code) => [
    code,
    books.filter((book) => book.categoryCode === code).length,
  ]),
)

console.log(JSON.stringify({
  mode: commit ? 'commit' : 'dry-run',
  projectId: PROJECT_ID,
  sourceUrl,
  count: books.length,
  active: books.filter((book) => book.active).length,
  hidden: books.filter((book) => !book.active).length,
  firstId: books[0]?.id,
  lastId: books.at(-1)?.id,
  duplicateIds: duplicateIds.length,
  duplicateNormalizedTitleAuthors: duplicateIdentities.length,
  categoryCounts,
  checksum,
}, null, 2))

if (!commit) process.exit(0)

const accessToken = process.env.FIREBASE_ACCESS_TOKEN
if (!accessToken) throw new Error('FIREBASE_ACCESS_TOKEN is required for --commit')
const databaseRoot = `projects/${PROJECT_ID}/databases/(default)/documents`
const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
const existingResponse = await fetch(
  `https://firestore.googleapis.com/v1/${databaseRoot}/books?pageSize=1`,
  { headers },
)
if (!existingResponse.ok) throw new Error(`Could not inspect books collection: HTTP ${existingResponse.status} ${await existingResponse.text()}`)
const existingPayload = await existingResponse.json()
if (Array.isArray(existingPayload.documents) && existingPayload.documents.length) {
  throw new Error('books collection is not empty; migration aborted before writing')
}

function firestoreValue(value) {
  if (value == null) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === 'object') return { mapValue: { fields: firestoreFields(value) } }
  return { stringValue: String(value) }
}

function firestoreFields(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)]))
}

function createWrite(path, data) {
  return {
    update: { name: `${databaseRoot}/${path}`, fields: firestoreFields(data) },
    currentDocument: { exists: false },
  }
}

const now = new Date()
const writes = []
for (const book of books) {
  writes.push(createWrite(`books/${book.id}`, { ...book, migratedAt: now, updatedAt: now }))
  writes.push(createWrite(`bookUniqueKeys/${uniqueKey(book)}`, {
    bookId: book.id,
    normalizedTitle: book.normalizedTitle,
    normalizedAuthor: book.normalizedAuthor,
    updatedAt: now,
  }))
}
writes.push(createWrite(`migrationRuns/google-sheets-${checksum.slice(0, 16)}`, {
  sourceUrl,
  count: books.length,
  checksum,
  categoryCounts,
  completedAt: now,
}))
const commitResponse = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
  { method: 'POST', headers, body: JSON.stringify({ writes }) },
)
if (!commitResponse.ok) throw new Error(`Firestore commit failed: HTTP ${commitResponse.status} ${await commitResponse.text()}`)
const commitPayload = await commitResponse.json()
if (!Array.isArray(commitPayload.writeResults) || commitPayload.writeResults.length !== writes.length) {
  throw new Error(`Firestore commit returned ${commitPayload.writeResults?.length ?? 0}/${writes.length} write results`)
}
console.log(`Committed ${books.length} books to Firestore with checksum ${checksum}`)
