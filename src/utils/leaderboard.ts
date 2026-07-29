import type { Reader } from '../types'

export function sortLeaderboard(readers: Reader[]) {
  return [...readers].filter((reader) => reader.eligible).sort((a, b) => {
    if (b.readCount !== a.readCount) return b.readCount - a.readCount
    const aTime = a.lastReadAt ? Date.parse(a.lastReadAt) : Number.POSITIVE_INFINITY
    const bTime = b.lastReadAt ? Date.parse(b.lastReadAt) : Number.POSITIVE_INFINITY
    return aTime - bTime
  })
}
