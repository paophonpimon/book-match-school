import type { BookStatus } from '../types'

export interface BookCounters {
  likeCount: number
  saveCount: number
  readingCount: number
  readCount: number
  ratingTotal: number
  ratingCount: number
}

export const emptyBookCounters: BookCounters = {
  likeCount: 0,
  saveCount: 0,
  readingCount: 0,
  readCount: 0,
  ratingTotal: 0,
  ratingCount: 0,
}

export function countersForCurrentStatus(status: BookStatus, hasLiked: boolean, rating: number | null = null): BookCounters {
  const isRead = status === 'read'
  return {
    likeCount: hasLiked ? 1 : 0,
    saveCount: status === 'saved' ? 1 : 0,
    readingCount: status === 'reading' ? 1 : 0,
    readCount: isRead ? 1 : 0,
    ratingTotal: isRead ? (rating ?? 0) : 0,
    ratingCount: isRead ? 1 : 0,
  }
}

export function applyStatusTransition(counters: BookCounters, previous: BookStatus | undefined, next: BookStatus | undefined): BookCounters {
  if (previous === next) return { ...counters }
  const firstLike = previous === undefined && next === 'liked'
  const undoFirstLike = previous === 'liked' && next === undefined
  return {
    ...counters,
    likeCount: Math.max(0, counters.likeCount + (firstLike ? 1 : 0) - (undoFirstLike ? 1 : 0)),
    saveCount: Math.max(0, counters.saveCount + (next === 'saved' ? 1 : 0) - (previous === 'saved' ? 1 : 0)),
    readingCount: Math.max(0, counters.readingCount + (next === 'reading' ? 1 : 0) - (previous === 'reading' ? 1 : 0)),
  }
}

export function planLikeTransaction(progressLikedCount: number, counters: BookCounters, previous: BookStatus | undefined) {
  const status: BookStatus = previous === 'reading' || previous === 'read' ? previous : 'liked'
  const counted = previous === undefined
  return {
    status,
    counted,
    progressLikedCount: progressLikedCount + (counted ? 1 : 0),
    counters: applyStatusTransition(counters, previous, status),
  }
}

export function planSavedTransaction(counters: BookCounters, previous: BookStatus | undefined) {
  const status: BookStatus = previous === 'reading' || previous === 'read' ? previous : 'saved'
  return {
    status,
    counted: status === 'saved' && previous !== 'saved',
    counters: applyStatusTransition(counters, previous, status),
  }
}

export function applyCompletion(counters: BookCounters, previous: BookStatus | undefined, rating: number): BookCounters {
  if (previous === 'read') return { ...counters }
  return {
    ...counters,
    saveCount: Math.max(0, counters.saveCount - (previous === 'saved' ? 1 : 0)),
    readingCount: Math.max(0, counters.readingCount - (previous === 'reading' ? 1 : 0)),
    readCount: counters.readCount + 1,
    ratingTotal: counters.ratingTotal + rating,
    ratingCount: counters.ratingCount + 1,
  }
}
