import { describe, expect, it } from 'vitest'
import { bookStatsWriteFields, buildUserBookWritePayload, hasExactFields, progressWriteFields, userBookWriteFields } from '../services/firestorePayloads'
import type { UserBook } from '../types'
import { applyCompletion, applyStatusTransition, emptyBookCounters, planLikeTransaction } from '../utils/firestoreCounters'

const likedBook: UserBook = {
  uid: 'student-1',
  termId: '2569-1',
  bookId: 'wonder',
  status: 'liked',
  rating: null,
  review: null,
  moodAfterReading: null,
  favoriteAspect: null,
  likedAt: '2026-07-22T00:00:00.000Z',
  startedAt: null,
  readAt: null,
  updatedAt: '2026-07-22T00:00:00.000Z',
}

describe('liked book transaction', () => {
  it('increments progress and book stats once on the first like', () => {
    const result = planLikeTransaction(0, emptyBookCounters, undefined)
    expect(result).toMatchObject({ status: 'liked', counted: true, progressLikedCount: 1 })
    expect(result.counters.likeCount).toBe(1)
  })

  it('does not increment a duplicate like', () => {
    const result = planLikeTransaction(1, { ...emptyBookCounters, likeCount: 1 }, 'liked')
    expect(result).toMatchObject({ status: 'liked', counted: false, progressLikedCount: 1 })
    expect(result.counters.likeCount).toBe(1)
  })

  it('produces the same totals when Firestore retries from the same snapshot', () => {
    const firstAttempt = planLikeTransaction(4, { ...emptyBookCounters, likeCount: 9 }, undefined)
    const retryAttempt = planLikeTransaction(4, { ...emptyBookCounters, likeCount: 9 }, undefined)
    expect(retryAttempt).toEqual(firstAttempt)
    expect(retryAttempt.progressLikedCount).toBe(5)
    expect(retryAttempt.counters.likeCount).toBe(10)
  })

  it('keeps likeCount stable across liked to reading to read', () => {
    const liked = planLikeTransaction(0, emptyBookCounters, undefined).counters
    const reading = applyStatusTransition(liked, 'liked', 'reading')
    const read = applyCompletion(reading, 'reading', 5)
    expect(liked.likeCount).toBe(1)
    expect(reading.likeCount).toBe(1)
    expect(read.likeCount).toBe(1)
  })

  it('builds exactly the userBooks schema accepted by the rules', () => {
    const timestamp = { serverTimestamp: true }
    const payload = buildUserBookWritePayload(likedBook, undefined, 'liked', timestamp)
    expect(hasExactFields(payload, userBookWriteFields)).toBe(true)
    expect(Object.keys(payload).sort()).toEqual([...userBookWriteFields].sort())
    expect(payload).toEqual({
      uid: 'student-1',
      termId: '2569-1',
      bookId: 'wonder',
      status: 'liked',
      rating: null,
      review: null,
      moodAfterReading: null,
      favoriteAspect: null,
      likedAt: timestamp,
      startedAt: null,
      readAt: null,
      updatedAt: timestamp,
      lifetimeReadCredited: false,
      lifetimeCreditedAt: null,
    })
  })

  it('keeps the progress and bookStats field allowlists aligned with the rules', () => {
    expect([...progressWriteFields].sort()).toEqual([
      'uid', 'termId', 'displayName', 'className', 'readCount', 'likedCount',
      'eligible', 'lastReadAt', 'updatedAt',
    ].sort())
    expect([...bookStatsWriteFields].sort()).toEqual([
      'termId', 'bookId', 'likeCount', 'saveCount', 'readingCount', 'readCount',
      'ratingTotal', 'ratingCount', 'lastUpdatedBy', 'updatedAt',
    ].sort())
  })
})
