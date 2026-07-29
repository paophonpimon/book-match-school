import { describe, expect, it } from 'vitest'
import type { UserBook } from '../types'
import { canTransition, countCompletedOnce, coverFallbackNeeded } from '../utils/userBooks'

const readBook: UserBook = { uid: 'u1', termId: 't1', bookId: 'b1', status: 'read', rating: 5, review: 'ชอบหนังสือเล่มนี้มากเพราะให้ข้อคิดที่ดี', moodAfterReading: 'happy', favoriteAspect: 'เนื้อเรื่อง', likedAt: null, startedAt: null, readAt: new Date().toISOString(), updatedAt: new Date().toISOString() }

describe('user book rules', () => {
  it('supports liked to reading to read', () => {
    expect(canTransition('liked', 'reading')).toBe(true)
    expect(canTransition('reading', 'read')).toBe(true)
    expect(canTransition('read', 'reading')).toBe(false)
  })
  it('counts the same completed book once per term', () => {
    expect(countCompletedOnce(undefined, readBook)).toBe(1)
    expect(countCompletedOnce(readBook, readBook)).toBe(0)
  })
  it('detects missing and malformed cover URLs', () => {
    expect(coverFallbackNeeded('')).toBe(true)
    expect(coverFallbackNeeded('not-a-url')).toBe(true)
    expect(coverFallbackNeeded('https://example.com/cover.jpg')).toBe(false)
  })
  it('lets the image request decide whether a valid remote cover can load', () => {
    expect(coverFallbackNeeded('https://www.2ebook.com/new/assets/images/thumb/book.jpg')).toBe(false)
    expect(coverFallbackNeeded('https://www.elibrarycub.com/images/book.jpg')).toBe(false)
    expect(coverFallbackNeeded('https://storage.naiin.com/cover.jpg')).toBe(false)
  })
})
