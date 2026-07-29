import { describe, expect, it } from 'vitest'
import { buildUserBookWritePayload, hasExactFields, userBookWriteFields } from '../services/firestorePayloads'
import type { UserBook } from '../types'
import { applyStatusTransition, emptyBookCounters, planLikeTransaction, planSavedTransaction } from '../utils/firestoreCounters'

const savedBook: UserBook = {
  uid: 'student-1',
  termId: '2569-1',
  bookId: 'wonder',
  status: 'saved',
  rating: null,
  review: null,
  moodAfterReading: null,
  favoriteAspect: null,
  likedAt: null,
  startedAt: null,
  readAt: null,
  updatedAt: '2026-07-22T00:00:00.000Z',
}

describe('saved book transaction', () => {
  it('increments saveCount on the first save', () => {
    const result = planSavedTransaction(emptyBookCounters, undefined)
    expect(result).toMatchObject({ status: 'saved', counted: true })
    expect(result.counters.saveCount).toBe(1)
  })

  it('does not increment a duplicate save', () => {
    const result = planSavedTransaction({ ...emptyBookCounters, saveCount: 1 }, 'saved')
    expect(result).toMatchObject({ status: 'saved', counted: false })
    expect(result.counters.saveCount).toBe(1)
  })

  it('produces the same saveCount when Firestore retries from the same snapshot', () => {
    const firstAttempt = planSavedTransaction({ ...emptyBookCounters, saveCount: 8 }, undefined)
    const retryAttempt = planSavedTransaction({ ...emptyBookCounters, saveCount: 8 }, undefined)
    expect(retryAttempt).toEqual(firstAttempt)
    expect(retryAttempt.counters.saveCount).toBe(9)
  })

  it('supports liked to saved without losing the cumulative likeCount', () => {
    const result = planSavedTransaction({ ...emptyBookCounters, likeCount: 1 }, 'liked')
    expect(result.status).toBe('saved')
    expect(result.counters).toMatchObject({ likeCount: 1, saveCount: 1 })
  })

  it('supports saved to liked without adding another like', () => {
    const result = planLikeTransaction(1, { ...emptyBookCounters, likeCount: 1, saveCount: 1 }, 'saved')
    expect(result).toMatchObject({ status: 'liked', counted: false, progressLikedCount: 1 })
    expect(result.counters).toMatchObject({ likeCount: 1, saveCount: 0 })
  })

  it('removes the active saved counter when reading starts', () => {
    const result = applyStatusTransition({ ...emptyBookCounters, saveCount: 1 }, 'saved', 'reading')
    expect(result).toMatchObject({ saveCount: 0, readingCount: 1 })
  })

  it('does not move a read book backwards to saved', () => {
    const counters = { ...emptyBookCounters, readCount: 1, ratingCount: 1, ratingTotal: 5 }
    const result = planSavedTransaction(counters, 'read')
    expect(result.status).toBe('read')
    expect(result.counted).toBe(false)
    expect(result.counters).toEqual(counters)
  })

  it('builds a saved payload with only fields allowed by the rules', () => {
    const timestamp = { serverTimestamp: true }
    const payload = buildUserBookWritePayload(savedBook, undefined, 'saved', timestamp)
    expect(hasExactFields(payload, userBookWriteFields)).toBe(true)
    expect(payload).toMatchObject({
      uid: 'student-1',
      termId: '2569-1',
      bookId: 'wonder',
      status: 'saved',
      rating: null,
      review: null,
      moodAfterReading: null,
      favoriteAspect: null,
      likedAt: null,
      startedAt: null,
      readAt: null,
      updatedAt: timestamp,
    })
  })
})
