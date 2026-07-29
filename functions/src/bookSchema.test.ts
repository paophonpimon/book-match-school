import { describe, expect, it } from 'vitest'
import { normalizeBookInput, normalizeIdentity, validateBookInput } from './bookSchema.js'

const validBook = {
  title: ' หนังสือ ดี ',
  author: ' ผู้แต่ง ',
  categoryCode: '000',
  category: 'ทั่วไป',
  description: 'คำอธิบาย',
  coverUrl: 'https://example.com/cover.jpg',
  audioUrl: '',
  isbn: '',
  callNumber: '',
  tags: ['tag'],
  moods: ['อยากขำ'],
  readingLevel: '',
  recommendedGrades: '',
  estimatedReadingMinutes: 20,
  matchReason: '',
  active: true,
  displayOrder: 1,
}

describe('book schema', () => {
  it('normalizes identity with NFKC, case and whitespace', () => {
    expect(normalizeIdentity('  Test   BOOK  ')).toBe('test book')
  })

  it('normalizes and validates a book payload', () => {
    const book = normalizeBookInput(validBook)
    expect(book.title).toBe('หนังสือ ดี')
    expect(validateBookInput(book)).toBeNull()
  })

  it('rejects an invalid category', () => {
    const book = normalizeBookInput({ ...validBook, categoryCode: '10' })
    expect(validateBookInput(book)).toContain('3 หลัก')
  })
})

