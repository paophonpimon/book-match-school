export const ADMIN_EMAIL = 'paopornpimon@gmail.com'

export const bookEditableFields = [
  'title',
  'author',
  'categoryCode',
  'category',
  'description',
  'coverUrl',
  'audioUrl',
  'isbn',
  'callNumber',
  'tags',
  'moods',
  'readingLevel',
  'recommendedGrades',
  'estimatedReadingMinutes',
  'matchReason',
  'active',
  'displayOrder',
] as const

export interface BookInput {
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

function text(value: unknown, max = 2000) {
  return String(value ?? '').trim().slice(0, max)
}

function list(value: unknown, maxItems = 30) {
  const values = Array.isArray(value) ? value : String(value ?? '').split(';')
  return values.map((item) => text(item, 120)).filter(Boolean).slice(0, maxItems)
}

function finiteNumber(value: unknown, fallback: number) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function normalizeIdentity(value: unknown) {
  return text(value, 500)
    .normalize('NFKC')
    .toLocaleLowerCase('th-TH')
    .replace(/\s+/g, ' ')
}

export function normalizeBookInput(value: unknown): BookInput {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const estimated = source.estimatedReadingMinutes
  return {
    title: text(source.title, 300),
    author: text(source.author, 300),
    categoryCode: text(source.categoryCode, 3),
    category: text(source.category, 200),
    description: text(source.description, 5000),
    coverUrl: text(source.coverUrl, 2000),
    audioUrl: text(source.audioUrl, 2000),
    isbn: text(source.isbn, 80),
    callNumber: text(source.callNumber, 120),
    tags: list(source.tags),
    moods: list(source.moods, 3),
    readingLevel: text(source.readingLevel, 120),
    recommendedGrades: text(source.recommendedGrades, 120),
    estimatedReadingMinutes: estimated === '' || estimated == null ? null : finiteNumber(estimated, 0),
    matchReason: text(source.matchReason, 1000),
    active: source.active !== false,
    displayOrder: Math.max(0, Math.trunc(finiteNumber(source.displayOrder, 0))),
  }
}

export function validateBookInput(book: BookInput) {
  if (!book.title || !book.author || !book.categoryCode || !book.description) {
    return 'กรุณากรอกชื่อหนังสือ ผู้แต่ง รหัสหมวด และคำอธิบายให้ครบ'
  }
  if (!/^[0-9]{3}$/.test(book.categoryCode)) return 'รหัสหมวดต้องเป็นตัวเลข 3 หลัก'
  if (book.moods.length < 1 || book.moods.length > 3) return 'กรุณาเลือกอารมณ์ 1–3 ข้อ'
  if (book.estimatedReadingMinutes != null && book.estimatedReadingMinutes < 0) return 'เวลาอ่านต้องไม่ติดลบ'
  for (const url of [book.coverUrl, book.audioUrl]) {
    if (!url) continue
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) return 'URL ต้องขึ้นต้นด้วย http หรือ https'
    } catch {
      return 'URL รูปปกหรือเสียงอ่านไม่ถูกต้อง'
    }
  }
  return null
}

