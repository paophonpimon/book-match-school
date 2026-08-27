import type { Reader } from '../types'
import { cumulativeLibraryBorrowCount, hasLibraryBorrowStats } from './legacyBorrowCounts'

export function sortLeaderboard(readers: Reader[]) {
  return [...readers].filter((reader) => reader.eligible && hasLibraryBorrowStats(reader)).sort((a, b) => {
    const countDifference = cumulativeLibraryBorrowCount(b) - cumulativeLibraryBorrowCount(a)
    if (countDifference !== 0) return countDifference
    return a.displayName.localeCompare(b.displayName, 'th')
  })
}
