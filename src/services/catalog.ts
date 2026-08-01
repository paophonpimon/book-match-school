import { demoSettings } from '../data/demoData'
import type { Book, CatalogPayload, Category, Settings } from '../types'
import {
  collection,
  getDocsFromCache,
  getDocsFromServer,
  query,
  where,
} from 'firebase/firestore'
import { env } from './env'
import { currentStudentUser, db } from './firebase'
import { readStored, writeStored } from './storage'
import { coverFallbackNeeded } from '../utils/userBooks'

const CACHE_KEY = 'book-match-catalog-cache-v3'
const CACHE_MS = 12 * 60 * 1000
const ACCENTS = ['#e8896e', '#6f8d86', '#b8834c', '#e4a347', '#526879', '#77a887']
const CATEGORY_NAME_OVERRIDES: Record<string, string> = {
  '800': 'วรรณกรรมและวรรณคดี',
}

const moodIds: Record<string, string> = {
  'อยากลุ้น': 'thrill',
  'อยากขำ': 'laugh',
  'อยากได้ความรู้': 'learn',
  'อ่านสั้น ๆ': 'short',
  'หาแรงบันดาลใจ': 'inspire',
  'อยากผ่อนคลาย': 'relax',
}

interface CachedCatalog {
  savedAt: number
  payload: CatalogPayload
}

interface BooksApiResponse {
  ok?: boolean
  books?: unknown[]
  error?: string
  detail?: string
  settings?: Partial<Settings>
}

interface LoadCatalogOptions {
  force?: boolean
  apiUrl?: string
  fetcher?: typeof fetch
}

export type CatalogSource = 'sheets' | 'firestore' | 'cache' | 'error'

export interface CatalogResult {
  data: CatalogPayload
  source: CatalogSource
  error?: string
  refresh?: Promise<CatalogResult>
}

export function filterCatalogToBooksWithCovers(catalog: CatalogPayload): CatalogPayload {
  const books = catalog.books.filter((book) => !coverFallbackNeeded(book.coverUrl))
  const categoryIds = new Set(books.map((book) => book.categoryId))
  return {
    ...catalog,
    books,
    categories: catalog.categories.filter((category) => categoryIds.has(category.id)),
  }
}

function asText(value: unknown) {
  return value == null ? '' : String(value).trim()
}

function asNumber(value: unknown, fallback: number) {
  if (value === '' || value == null) return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function splitSemicolonList(value: unknown) {
  const values = Array.isArray(value) ? value : [value]
  return values
    .flatMap((item) => asText(item).split(';'))
    .map((item) => item.trim())
    .filter(Boolean)
}

export function compareCatalogBooks(left: Book, right: Book) {
  const leftCategory = left.categoryCode || left.categoryId
  const rightCategory = right.categoryCode || right.categoryId
  return leftCategory.localeCompare(rightCategory, 'th-TH', { numeric: true })
    || left.title.localeCompare(right.title, 'th-TH', { numeric: true, sensitivity: 'base' })
    || left.id.localeCompare(right.id, 'en-US')
}

function categoryIdFor(categoryCode: string, category: string, index: number) {
  if (categoryCode) return categoryCode
  const fromName = category.toLocaleLowerCase('th-TH').replace(/\s+/g, '-')
  return fromName || `category-${index + 1}`
}

function normalizeSettings(settings: Partial<Settings> | undefined): Settings {
  if (!settings) return demoSettings
  return {
    schoolName: asText(settings.schoolName) || demoSettings.schoolName,
    projectName: asText(settings.projectName) || demoSettings.projectName,
    termId: asText(settings.termId) || demoSettings.termId,
    termName: asText(settings.termName) || demoSettings.termName,
    announcement: asText(settings.announcement) || demoSettings.announcement,
    reviewMinChars: asNumber(settings.reviewMinChars, demoSettings.reviewMinChars),
    leaderboardEnabled: settings.leaderboardEnabled !== false,
  }
}

export function normalizeBooksApiResponse(payload: unknown): CatalogPayload {
  if (!payload || typeof payload !== 'object') throw new Error('API ส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง')
  const response = payload as BooksApiResponse
  if (response.ok !== true) {
    throw new Error(asText(response.error) || asText(response.detail) || 'API แจ้งว่าโหลดรายการหนังสือไม่สำเร็จ')
  }
  if (!Array.isArray(response.books)) throw new Error('API ไม่มีรายการ books ตาม schema ที่กำหนด')

  const activeRows = response.books.filter((row) => row && typeof row === 'object' && (row as { active?: unknown }).active !== false)
  const books = activeRows.map((row, index): Book => {
    const source = row as Record<string, unknown>
    const id = asText(source.id)
    const title = asText(source.title)
    if (!id || !title) throw new Error(`ข้อมูลหนังสือลำดับที่ ${index + 1} ไม่มี id หรือ title`)

    const categoryCode = asText(source.categoryCode)
    const category = CATEGORY_NAME_OVERRIDES[categoryCode] ?? asText(source.category)
    const categoryId = categoryIdFor(categoryCode, category, index)
    const moods = splitSemicolonList(source.moods)
    const tags = splitSemicolonList(source.tags)
    const callNumber = asText(source.callNumber)
    const matchReason = asText(source.matchReason)

    return {
      id,
      title,
      author: asText(source.author),
      categoryId,
      categoryCode,
      category,
      description: asText(source.description),
      coverUrl: asText(source.coverUrl),
      audioUrl: asText(source.audioUrl),
      isbn: asText(source.isbn),
      callNumber,
      tags,
      moods,
      moodTags: moods.map((mood) => moodIds[mood] ?? mood).filter(Boolean),
      readingLevel: asText(source.readingLevel),
      recommendedGrades: asText(source.recommendedGrades),
      matchReason,
      shelfCode: callNumber || categoryCode || 'สอบถามบรรณารักษ์',
      shelfDescription: category ? `หมวด ${category}` : (matchReason || 'สอบถามตำแหน่งหนังสือจากบรรณารักษ์'),
      featured: false,
      active: true,
      popularity: Math.max(0, 100 - index),
      accent: ACCENTS[index % ACCENTS.length],
    }
  }).sort(compareCatalogBooks)

  const categoryMap = new Map<string, Category>()
  books.forEach((book) => {
    if (categoryMap.has(book.categoryId)) return
    categoryMap.set(book.categoryId, {
      id: book.categoryId,
      name: book.category || book.categoryCode || 'ไม่ระบุหมวด',
      icon: '📚',
      active: true,
      displayOrder: categoryMap.size + 1,
    })
  })

  return {
    books,
    categories: [...categoryMap.values()],
    settings: normalizeSettings(response.settings),
  }
}

function readableCatalogError(error: unknown) {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'Google Sheets ใช้เวลาตอบกลับนานเกินไป กรุณาลองอีกครั้ง'
  }
  if (error instanceof Error && error.message) return error.message
  return 'ติดต่อ Google Sheets ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง'
}

function firestoreCatalogQuery() {
  if (!db) throw new Error('Cloud Firestore ยังไม่พร้อมใช้งาน')
  return query(
    collection(db, 'books'),
    where('active', '==', true),
  )
}

async function loadFirestoreCatalogFromServer(): Promise<CatalogResult> {
  if (!currentStudentUser()) throw new Error('กรุณาเข้าสู่ระบบด้วย Google ก่อนโหลดรายการหนังสือ')
  const snapshot = await getDocsFromServer(firestoreCatalogQuery())
  const data = filterCatalogToBooksWithCovers(normalizeBooksApiResponse({
    ok: true,
    books: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
  }))
  if (!data.books.length) {
    return {
      data,
      source: 'error',
      error: 'ยังไม่มีหนังสือที่เปิดใช้งานใน Firestore',
    }
  }
  return { data, source: 'firestore' }
}

async function loadFirestoreCatalog(force: boolean): Promise<CatalogResult> {
  try {
    if (!currentStudentUser()) throw new Error('กรุณาเข้าสู่ระบบด้วย Google ก่อนโหลดรายการหนังสือ')
    if (!force) {
      try {
        const cached = await getDocsFromCache(firestoreCatalogQuery())
        if (!cached.empty) {
          const data = filterCatalogToBooksWithCovers(normalizeBooksApiResponse({
            ok: true,
            books: cached.docs.map((item) => ({ id: item.id, ...item.data() })),
          }))
          return {
            data,
            source: 'cache',
            refresh: loadFirestoreCatalogFromServer(),
          }
        }
      } catch {
        // The first visit has no IndexedDB cache. Continue with the authoritative server query.
      }
    }
    return await loadFirestoreCatalogFromServer()
  } catch (error) {
    return {
      data: { books: [], categories: [], settings: demoSettings },
      source: 'error',
      error: `โหลดรายการหนังสือจาก Firestore ไม่สำเร็จ (${error instanceof Error ? error.message : String(error)})`,
    }
  }
}

export async function loadCatalog(options: LoadCatalogOptions = {}): Promise<CatalogResult> {
  if (env.catalogSource === 'firestore' && options.apiUrl === undefined) {
    return loadFirestoreCatalog(Boolean(options.force))
  }
  const apiUrl = options.apiUrl ?? env.booksApiUrl
  const fetcher = options.fetcher ?? fetch
  if (!apiUrl) {
    return {
      data: { books: [], categories: [], settings: demoSettings },
      source: 'error',
      error: 'ยังไม่ได้ตั้งค่าแหล่งข้อมูลหนังสือจริง ระบบจะไม่ใช้ข้อมูลตัวอย่างแทน',
    }
  }

  const cached = readStored<CachedCatalog | null>(CACHE_KEY, null)
  if (!options.force && cached && Date.now() - cached.savedAt < CACHE_MS) {
    return { data: cached.payload, source: 'cache' }
  }

  try {
    const response = await fetcher(apiUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) throw new Error(`Google Sheets API ตอบกลับด้วยสถานะ ${response.status}`)
    const catalog = normalizeBooksApiResponse(await response.json())
    writeStored(CACHE_KEY, { savedAt: Date.now(), payload: catalog })
    return { data: catalog, source: 'sheets' }
  } catch (error) {
    const detail = readableCatalogError(error)
    if (cached) {
      return {
        data: cached.payload,
        source: 'cache',
        error: `โหลดรายการล่าสุดจาก Google Sheets ไม่สำเร็จ กำลังแสดงข้อมูลที่โหลดสำเร็จครั้งก่อน (${detail})`,
      }
    }
    return {
      data: { books: [], categories: [], settings: demoSettings },
      source: 'error',
      error: `โหลดรายการหนังสือจาก Google Sheets ไม่สำเร็จ และไม่มีข้อมูลจริงที่บันทึกไว้ (${detail})`,
    }
  }
}
