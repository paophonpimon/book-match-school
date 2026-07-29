import { beforeEach, describe, expect, it } from 'vitest'
import { readSwipeSession, swipeStorageKey, writeSwipeSession } from '../services/swipeStorage'

describe('local swipe storage', () => {
  beforeEach(() => localStorage.clear())

  it('separates skipped books and undo history by uid and term', () => {
    writeSwipeSession('student-a', 'term-1', {
      skippedBookIds: ['book-1'],
      seenBookIds: ['book-1'],
      swipeHistory: [{ bookId: 'book-1', action: 'skipped' }],
    })

    expect(readSwipeSession('student-a', 'term-1')).toEqual({
      skippedBookIds: ['book-1'],
      seenBookIds: ['book-1'],
      swipeHistory: [{ bookId: 'book-1', action: 'skipped' }],
    })
    expect(readSwipeSession('student-b', 'term-1').skippedBookIds).toEqual([])
    expect(readSwipeSession('student-a', 'term-2').skippedBookIds).toEqual([])
    expect(swipeStorageKey('student-a', 'term-1')).not.toBe(swipeStorageKey('student-b', 'term-1'))
  })

  it('keeps skipped ids hidden even if an older session omitted them from seen ids', () => {
    localStorage.setItem(swipeStorageKey('student-a', 'term-1'), JSON.stringify({
      skippedBookIds: ['book-2'],
      seenBookIds: [],
      swipeHistory: [],
    }))

    expect(readSwipeSession('student-a', 'term-1').seenBookIds).toEqual(['book-2'])
  })
})
