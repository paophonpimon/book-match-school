import { describe, expect, it } from 'vitest'
import { sortLeaderboard } from '../utils/leaderboard'

describe('leaderboard sorting', () => {
  it('sorts by read count, then earliest confirmation, and excludes ineligible readers', () => {
    const result = sortLeaderboard([
      { uid: 'late', displayName: 'Late', className: '1', readCount: 5, likedCount: 0, eligible: true, lastReadAt: '2026-02-02T00:00:00Z' },
      { uid: 'early', displayName: 'Early', className: '1', readCount: 5, likedCount: 0, eligible: true, lastReadAt: '2026-02-01T00:00:00Z' },
      { uid: 'off', displayName: 'Off', className: '1', readCount: 99, likedCount: 0, eligible: false, lastReadAt: null },
    ])
    expect(result.map((reader) => reader.uid)).toEqual(['early', 'late'])
  })
})
