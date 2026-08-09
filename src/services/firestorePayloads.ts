import type { BookStatus, UserBook } from '../types'

export const userBookWriteFields = [
  'uid', 'termId', 'bookId', 'loanId', 'status', 'rating', 'review', 'moodAfterReading',
  'favoriteAspect', 'likedAt', 'startedAt', 'readAt', 'updatedAt',
  'lifetimeReadCredited', 'lifetimeCreditedAt',
] as const

export const progressWriteFields = [
  'uid', 'termId', 'avatarId', 'displayName', 'className', 'readCount', 'likedCount',
  'eligible', 'lastReadAt', 'updatedAt',
] as const

export const bookStatsWriteFields = [
  'termId', 'bookId', 'likeCount', 'saveCount', 'readingCount', 'readCount',
  'ratingTotal', 'ratingCount', 'lastUpdatedBy', 'updatedAt',
] as const

export function buildUserBookWritePayload(
  userBook: UserBook,
  previous: Record<string, unknown> | undefined,
  status: BookStatus,
  timestamp: unknown,
) {
  return {
    uid: userBook.uid,
    termId: userBook.termId,
    bookId: userBook.bookId,
    loanId: previous?.loanId ?? userBook.loanId ?? null,
    status,
    rating: previous?.rating ?? null,
    review: previous?.review ?? null,
    moodAfterReading: previous?.moodAfterReading ?? null,
    favoriteAspect: previous?.favoriteAspect ?? null,
    likedAt: previous?.likedAt ?? (status === 'liked' ? timestamp : null),
    startedAt: previous?.startedAt ?? (status === 'reading' ? timestamp : null),
    readAt: previous?.readAt ?? null,
    updatedAt: timestamp,
    lifetimeReadCredited: previous?.lifetimeReadCredited === true,
    lifetimeCreditedAt: previous?.lifetimeCreditedAt ?? null,
  }
}

export function hasExactFields(payload: Record<string, unknown>, fields: readonly string[]) {
  const actual = Object.keys(payload).sort()
  const expected = [...fields].sort()
  return actual.length === expected.length && actual.every((field, index) => field === expected[index])
}
