import { describe, expect, it } from 'vitest'
import { sortLeaderboard } from '../utils/leaderboard'

describe('leaderboard sorting', () => {
  it('sorts by cumulative library borrows and excludes ineligible readers', () => {
    const result = sortLeaderboard([
      { uid: 'late', displayName: 'Late', className: '1', readCount: 99, legacyBorrowCount: 2, bookMatchBorrowCount: 1, likedCount: 0, eligible: true, lastReadAt: '2026-02-02T00:00:00Z' },
      { uid: 'early', displayName: 'Early', className: '1', readCount: 0, legacyBorrowCount: 5, bookMatchBorrowCount: 0, likedCount: 0, eligible: true, lastReadAt: null },
      { uid: 'off', displayName: 'Off', className: '1', readCount: 99, legacyBorrowCount: 100, likedCount: 0, eligible: false, lastReadAt: null },
      { uid: 'missing', displayName: 'Missing', className: '1', readCount: 99, legacyBorrowCount: 0, bookMatchBorrowCount: 0, likedCount: 0, eligible: true, lastReadAt: null },
    ])
    expect(result.map((reader) => reader.uid)).toEqual(['early', 'late'])
  })

  it('keeps a student with an imported zero baseline but excludes readers with no borrow-stat document', () => {
    const result = sortLeaderboard([
      { uid: 'imported-zero', displayName: 'Imported', className: '1', readCount: 0, legacyBorrowCount: 0, legacyBorrowSource: 'google-sheets', legacyBorrowAsOf: '2026-08-27', bookMatchBorrowCount: 0, likedCount: 0, eligible: true, lastReadAt: null },
      { uid: 'not-imported', displayName: 'Not imported', className: '1', readCount: 3, legacyBorrowCount: 0, legacyBorrowSource: '', legacyBorrowAsOf: '', bookMatchBorrowCount: 0, likedCount: 0, eligible: true, lastReadAt: null },
    ])
    expect(result.map((reader) => reader.uid)).toEqual(['imported-zero'])
  })

  it('does not let completed-read count change the library-borrow ranking', () => {
    const result = sortLeaderboard([
      { uid: 'current', displayName: 'Current', className: '1', readCount: 60, legacyBorrowCount: 0, bookMatchBorrowCount: 1, likedCount: 0, eligible: true, lastReadAt: null },
      { uid: 'legacy', displayName: 'Legacy', className: '1', readCount: 1, legacyBorrowCount: 8, bookMatchBorrowCount: 0, likedCount: 0, eligible: true, lastReadAt: null },
    ])
    expect(result.map((reader) => reader.uid)).toEqual(['legacy', 'current'])
  })
})
