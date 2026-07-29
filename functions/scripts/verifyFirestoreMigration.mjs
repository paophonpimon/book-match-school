import { createHash } from 'node:crypto'

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'book-match-school'
const EXPECTED_COUNT = 106
const EXPECTED_CHECKSUM = '467b2e067a49e254d89cf6a7d26726b94d32f91ed6ef2f09e5d6dc40c33ab100'
const accessToken = process.env.FIREBASE_ACCESS_TOKEN
if (!accessToken) throw new Error('FIREBASE_ACCESS_TOKEN is required')

function decode(value) {
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode)
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {})
  return undefined
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decode(value)]))
}

const response = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/books?pageSize=300&orderBy=displayOrder`,
  { headers: { Authorization: `Bearer ${accessToken}` } },
)
if (!response.ok) throw new Error(`Firestore list failed: HTTP ${response.status} ${await response.text()}`)
const payload = await response.json()
const books = (payload.documents ?? []).map((document) => decodeFields(document.fields ?? {}))
  .sort((left, right) => Number(left.displayOrder) - Number(right.displayOrder))
const checksum = createHash('sha256')
  .update(JSON.stringify(books.map((book) => [book.id, book.title, book.author, book.active, book.displayOrder])))
  .digest('hex')
const ids = new Set(books.map((book) => book.id))
const categoryCounts = Object.fromEntries(
  [...new Set(books.map((book) => book.categoryCode))].sort().map((code) => [
    code,
    books.filter((book) => book.categoryCode === code).length,
  ]),
)
const report = {
  count: books.length,
  active: books.filter((book) => book.active).length,
  hidden: books.filter((book) => !book.active).length,
  uniqueIds: ids.size,
  firstId: books[0]?.id,
  lastId: books.at(-1)?.id,
  categoryCounts,
  checksum,
  expectedChecksum: EXPECTED_CHECKSUM,
  valid: books.length === EXPECTED_COUNT && ids.size === EXPECTED_COUNT && checksum === EXPECTED_CHECKSUM,
}
console.log(JSON.stringify(report, null, 2))
if (!report.valid) process.exitCode = 1
