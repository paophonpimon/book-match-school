import { describe, expect, it } from 'vitest'
import { applyCompletion, applyStatusTransition, emptyBookCounters } from '../utils/firestoreCounters'

describe('Firestore aggregate counters', () => {
  it('tracks liked, saved and reading status without double counting the same state', () => {
    const liked = applyStatusTransition(emptyBookCounters, undefined, 'liked')
    expect(liked.likeCount).toBe(1)
    expect(applyStatusTransition(liked, 'liked', 'liked')).toEqual(liked)
    const reading = applyStatusTransition(liked, 'liked', 'reading')
    expect(reading.likeCount).toBe(1)
    expect(reading.readingCount).toBe(1)
  })

  it('removes counters when a saved user book is deleted during undo', () => {
    const saved = { ...emptyBookCounters, saveCount: 1 }
    expect(applyStatusTransition(saved, 'saved', undefined).saveCount).toBe(0)
  })

  it('removes the like counter when a liked book is removed from the shelf', () => {
    const liked = { ...emptyBookCounters, likeCount: 1 }
    expect(applyStatusTransition(liked, 'liked', undefined).likeCount).toBe(0)
  })

  it('increments completion and rating once only', () => {
    const reading = { ...emptyBookCounters, readingCount: 1 }
    const completed = applyCompletion(reading, 'reading', 5)
    expect(completed).toMatchObject({ readingCount: 0, readCount: 1, ratingTotal: 5, ratingCount: 1 })
    expect(applyCompletion(completed, 'read', 5)).toEqual(completed)
  })
})
