export const ADMIN_EMAIL = 'paopornpimon@gmail.com'
export const ADMIN_BOOKS_CACHE_KEY = 'book-match-admin-books-firestore-v1'
export const ADMIN_PAGE_SIZE = 20

export const adminMoodOptions = [
  'อยากลุ้น',
  'อยากขำ',
  'อยากได้ความรู้',
  'อ่านสั้น ๆ',
  'หาแรงบันดาลใจ',
  'อยากผ่อนคลาย',
] as const

export const adminTagOptions = [
  'ผจญภัย',
  'มิตรภาพ',
  'ครอบครัว',
  'โรงเรียน',
  'สืบสวน',
  'แฟนตาซี',
  'วิทยาศาสตร์',
  'เทคโนโลยี',
  'ประวัติศาสตร์',
  'ชีวประวัติ',
  'จิตวิทยา',
  'พัฒนาตนเอง',
  'ภาษาและวรรณกรรม',
  'การ์ตูนความรู้',
  'ธรรมชาติ',
  'สุขภาพ',
  'ศิลปะ',
  'กีฬา',
  'อารมณ์ขัน',
  'แรงบันดาลใจ',
] as const

export const adminCategoryOptions = [
  { code: '000', name: 'ความรู้ทั่วไป' },
  { code: '100', name: 'ปรัชญาและจิตวิทยา' },
  { code: '200', name: 'ศาสนา' },
  { code: '300', name: 'สังคมศาสตร์' },
  { code: '400', name: 'ภาษา' },
  { code: '500', name: 'วิทยาศาสตร์' },
  { code: '600', name: 'เทคโนโลยีและวิทยาการประยุกต์' },
  { code: '700', name: 'ศิลปะและนันทนาการ' },
  { code: '800', name: 'วรรณคดี' },
  { code: '900', name: 'ประวัติศาสตร์และภูมิศาสตร์' },
] as const

export interface AdminBook {
  id: string
  title: string
  author: string
  categoryCode: string
  category: string
  description: string
  coverUrl: string
  audioUrl: string
  isbn: string
  callNumber: string
  tags: string[]
  moods: string[]
  readingLevel: string
  recommendedGrades: string
  estimatedReadingMinutes: number | null
  matchReason: string
  active: boolean
  displayOrder: number
}

export type AdminBookInput = Omit<AdminBook, 'id'>
export type AdminBookStatusFilter = 'all' | 'active' | 'hidden'
export type AdminBookMutationAction = 'create' | 'update' | 'archive' | 'restore'

export interface AdminBookStats {
  total: number
  active: number
  hidden: number
  byCategory: Array<{ categoryCode: string; count: number }>
}

function asText(value: unknown) {
  return value == null ? '' : String(value).trim()
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function asBoolean(value: unknown, fallback = true) {
  if (value === '' || value == null) return fallback
  if (typeof value === 'boolean') return value
  return !['false', '0', 'no', 'n', 'ไม่'].includes(asText(value).toLocaleLowerCase('th-TH'))
}

export function splitAdminList(value: unknown) {
  const values = Array.isArray(value) ? value : [value]
  return values
    .flatMap((item) => asText(item).split(';'))
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeAdminBook(value: unknown, index = 0): AdminBook {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    id: asText(source.id || source.bookId || source.book_id),
    title: asText(source.title),
    author: asText(source.author),
    categoryCode: asText(source.categoryCode || source.category_code || source.categoryId || source.category_id),
    category: asText(source.category),
    description: asText(source.description),
    coverUrl: asText(source.coverUrl || source.cover_url),
    audioUrl: asText(source.audioUrl || source.audio_url),
    isbn: asText(source.isbn),
    callNumber: asText(source.callNumber || source.call_number),
    tags: splitAdminList(source.tags),
    moods: splitAdminList(source.moods || source.mood_tags),
    readingLevel: asText(source.readingLevel || source.reading_level),
    recommendedGrades: asText(source.recommendedGrades || source.recommended_grades),
    estimatedReadingMinutes: source.estimatedReadingMinutes == null || source.estimatedReadingMinutes === ''
      ? null
      : asNumber(source.estimatedReadingMinutes),
    matchReason: asText(source.matchReason || source.match_reason),
    active: asBoolean(source.active, true),
    displayOrder: asNumber(source.displayOrder || source.display_order, index + 1),
  }
}

export function validateAdminBook(book: AdminBookInput) {
  if (!book.title.trim() || !book.author.trim() || !book.categoryCode.trim() || !book.category.trim() || !book.description.trim()) {
    return 'กรุณากรอกชื่อหนังสือ ผู้แต่ง หมวดหนังสือ และคำอธิบายให้ครบ'
  }
  if (!/^[0-9]{3}$/.test(book.categoryCode.trim())) {
    return 'รหัสหมวดต้องเป็นตัวเลข 3 หลัก เช่น 000 หรือ 900'
  }
  const category = adminCategoryOptions.find(({ code }) => code === book.categoryCode.trim())
  if (!category || category.name !== book.category.trim()) {
    return 'รหัสหมวดและชื่อหมวดไม่ตรงกัน กรุณาเลือกจากรายการ'
  }
  if (book.moods.length < 1 || book.moods.length > 3) {
    return 'กรุณาเลือกอารมณ์ 1–3 ข้อ'
  }
  if (book.moods.some((mood) => !adminMoodOptions.includes(mood as typeof adminMoodOptions[number]))) {
    return 'มีอารมณ์ที่ไม่อยู่ในรายการที่อนุญาต'
  }
  if (book.estimatedReadingMinutes != null && book.estimatedReadingMinutes < 0) {
    return 'เวลาอ่านโดยประมาณต้องไม่ติดลบ'
  }
  if (book.displayOrder < 0) return 'ลำดับการแสดงต้องไม่ติดลบ'
  for (const [label, url] of [['URL รูปปก', book.coverUrl], ['URL เสียงอ่าน', book.audioUrl]] as const) {
    if (!url.trim()) continue
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid')
    } catch {
      return `${label} ไม่ถูกต้อง`
    }
  }
  return null
}

export const validateCreateBook = validateAdminBook

export function normalizeBookIdentity(value: string) {
  return value.normalize('NFKC').trim().toLocaleLowerCase('th-TH').replace(/\s+/g, ' ')
}

export function cleanAdminBookInput(book: AdminBookInput): AdminBookInput {
  return {
    title: book.title.trim(),
    author: book.author.trim(),
    categoryCode: book.categoryCode.trim(),
    category: book.category.trim(),
    description: book.description.trim(),
    coverUrl: book.coverUrl.trim(),
    audioUrl: book.audioUrl.trim(),
    isbn: book.isbn.trim(),
    callNumber: book.callNumber.trim(),
    tags: book.tags.map((tag) => tag.trim()).filter(Boolean),
    moods: book.moods.map((mood) => mood.trim()).filter(Boolean),
    readingLevel: book.readingLevel.trim(),
    recommendedGrades: book.recommendedGrades.trim(),
    estimatedReadingMinutes: book.estimatedReadingMinutes,
    matchReason: book.matchReason.trim(),
    active: book.active,
    displayOrder: Math.trunc(book.displayOrder),
  }
}

export function changedAdminBookFields(before: AdminBookInput | null, after: AdminBookInput) {
  if (!before) return Object.keys(after).sort()
  return (Object.keys(after) as Array<keyof AdminBookInput>)
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .sort()
}

export function isDuplicateAdminBook(
  books: AdminBook[],
  candidate: Pick<AdminBookInput, 'title' | 'author'>,
  editingId = '',
) {
  const title = normalizeBookIdentity(candidate.title)
  const author = normalizeBookIdentity(candidate.author)
  return books.some((book) => (
    book.id !== editingId
    && normalizeBookIdentity(book.title) === title
    && normalizeBookIdentity(book.author) === author
  ))
}

export function filterAdminBooks(
  books: AdminBook[],
  search: string,
  categoryCode = '',
  status: AdminBookStatusFilter = 'all',
) {
  const needle = normalizeBookIdentity(search)
  return books.filter((book) => {
    const matchesText = !needle
      || normalizeBookIdentity(book.title).includes(needle)
      || normalizeBookIdentity(book.author).includes(needle)
    const matchesCategory = !categoryCode || book.categoryCode === categoryCode
    const matchesStatus = status === 'all' || book.active === (status === 'active')
    return matchesText && matchesCategory && matchesStatus
  })
}

export function paginateAdminBooks(books: AdminBook[], page = 1, pageSize = ADMIN_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(books.length / pageSize))
  const safePage = Math.max(1, Math.min(page, totalPages))
  return {
    books: books.slice((safePage - 1) * pageSize, safePage * pageSize),
    page: safePage,
    totalPages,
  }
}

export function calculateAdminBookStats(books: AdminBook[]): AdminBookStats {
  const categoryCounts = new Map<string, number>()
  for (let start = 0; start <= 900; start += 100) categoryCounts.set(String(start).padStart(3, '0'), 0)
  books.forEach((book) => {
    const code = book.categoryCode.match(/^[0-9]{3}/)?.[0] ?? 'อื่น ๆ'
    categoryCounts.set(code, (categoryCounts.get(code) ?? 0) + 1)
  })
  return {
    total: books.length,
    active: books.filter((book) => book.active).length,
    hidden: books.filter((book) => !book.active).length,
    byCategory: [...categoryCounts.entries()].map(([categoryCode, count]) => ({ categoryCode, count })),
  }
}

