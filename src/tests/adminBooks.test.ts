import { describe, expect, it } from 'vitest'
import {
  adminCategoryOptions,
  adminTagOptions,
  calculateAdminBookStats,
  changedAdminBookFields,
  cleanAdminBookInput,
  filterAdminBooks,
  isDuplicateAdminBook,
  normalizeAdminBook,
  normalizeBookIdentity,
  paginateAdminBooks,
  type AdminBook,
  type AdminBookInput,
  validateAdminBook,
} from '../services/adminBooks'

const book: AdminBookInput = {
  title: 'หนังสือทดสอบ',
  author: 'ผู้เขียนทดสอบ',
  categoryCode: '000',
  category: 'ความรู้ทั่วไป',
  description: 'คำอธิบายหนังสือ',
  coverUrl: 'https://example.com/cover.jpg',
  audioUrl: '',
  isbn: '',
  callNumber: '',
  tags: ['ความรู้'],
  moods: ['อยากขำ', 'อยากผ่อนคลาย'],
  readingLevel: 'ปานกลาง',
  recommendedGrades: 'ม.1-ม.6',
  estimatedReadingMinutes: 20,
  matchReason: 'เหมาะกับผู้อ่าน',
  active: true,
  displayOrder: 12,
}

describe('Admin book schema and list utilities', () => {
  it('normalizes Firestore rows and semicolon arrays', () => {
    const result = normalizeAdminBook({
      id: 'book-1',
      title: 'A',
      author: 'B',
      categoryCode: '000',
      tags: 'หนึ่ง; สอง',
      moods: ['อยากขำ'],
      active: false,
    })
    expect(result.tags).toEqual(['หนึ่ง', 'สอง'])
    expect(result.moods).toEqual(['อยากขำ'])
    expect(result.active).toBe(false)
  })

  it('requires 1–3 moods and a three-digit category', () => {
    expect(validateAdminBook({ ...book, moods: [] })).toContain('1–3')
    expect(validateAdminBook({ ...book, moods: ['อยากขำ', 'อยากลุ้น', 'อยากผ่อนคลาย', 'อ่านสั้น ๆ'] })).toContain('1–3')
    expect(validateAdminBook({ ...book, categoryCode: '10' })).toContain('3 หลัก')
    expect(validateAdminBook({ ...book, category: 'หมวดไม่ตรงกัน' })).toContain('ไม่ตรงกัน')
  })

  it('provides unique predefined tags for the Admin picker', () => {
    expect(adminTagOptions).toContain('ผจญภัย')
    expect(adminTagOptions).toContain('การ์ตูนความรู้')
    expect(new Set(adminTagOptions).size).toBe(adminTagOptions.length)
  })

  it('pairs every Dewey category code with one selectable category name', () => {
    expect(adminCategoryOptions).toHaveLength(10)
    expect(adminCategoryOptions[0]).toEqual({ code: '000', name: 'ความรู้ทั่วไป' })
    expect(adminCategoryOptions.at(-1)).toEqual({ code: '900', name: 'ประวัติศาสตร์และภูมิศาสตร์' })
    expect(new Set(adminCategoryOptions.map(({ code }) => code)).size).toBe(10)
    expect(new Set(adminCategoryOptions.map(({ name }) => name)).size).toBe(10)
  })

  it('uses NFKC, case and whitespace for duplicate detection', () => {
    const existing = [{ id: 'book-1', ...book }] as AdminBook[]
    expect(normalizeBookIdentity('  Test   BOOK ')).toBe('test book')
    expect(isDuplicateAdminBook(existing, { title: ' หนังสือทดสอบ ', author: 'ผู้เขียนทดสอบ' })).toBe(true)
    expect(isDuplicateAdminBook(existing, book, 'book-1')).toBe(false)
  })

  it('cleans the Firestore payload and reports changed fields for audit logs', () => {
    const cleaned = cleanAdminBookInput({
      ...book,
      title: '  หนังสือทดสอบ  ',
      tags: [' หนึ่ง ', '', 'สอง'],
      displayOrder: 12.8,
    })
    expect(cleaned.title).toBe('หนังสือทดสอบ')
    expect(cleaned.tags).toEqual(['หนึ่ง', 'สอง'])
    expect(cleaned.displayOrder).toBe(12)
    expect(changedAdminBookFields(book, { ...book, active: false })).toEqual(['active'])
    expect(changedAdminBookFields(null, book)).toContain('title')
  })

  it('calculates active, hidden and category counts', () => {
    const books = [
      normalizeAdminBook({ id: '1', title: 'A', categoryCode: '000', active: true }),
      normalizeAdminBook({ id: '2', title: 'B', categoryCode: '000', active: false }),
      normalizeAdminBook({ id: '3', title: 'C', categoryCode: '900', active: true }),
    ]
    const stats = calculateAdminBookStats(books)
    expect(stats).toMatchObject({ total: 3, active: 2, hidden: 1 })
    expect(stats.byCategory.find((item) => item.categoryCode === '000')?.count).toBe(2)
    expect(stats.byCategory.find((item) => item.categoryCode === '900')?.count).toBe(1)
  })

  it('searches, filters and paginates 20 items', () => {
    const books = Array.from({ length: 45 }, (_, index) => normalizeAdminBook({
      id: `book-${index}`,
      title: index === 22 ? 'เจ้าชายน้อย' : `เล่ม ${index}`,
      author: index === 22 ? 'แซงเต็ก-ซูเปรี' : 'ผู้เขียน',
      categoryCode: index % 2 ? '000' : '100',
      active: index !== 22,
    }, index))
    expect(filterAdminBooks(books, 'เจ้าชาย', '', 'all')).toHaveLength(1)
    expect(filterAdminBooks(books, 'แซงเต็ก', '', 'hidden')).toHaveLength(1)
    expect(filterAdminBooks(books, '', '000', 'all').every((item) => item.categoryCode === '000')).toBe(true)
    expect(paginateAdminBooks(books, 1).books).toHaveLength(20)
    expect(paginateAdminBooks(books, 3)).toMatchObject({ page: 3, totalPages: 3 })
    expect(paginateAdminBooks(books, 3).books).toHaveLength(5)
  })
})

