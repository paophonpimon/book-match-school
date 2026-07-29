import type { BookStatus, UserBook } from '../types'

const transitions: Record<BookStatus, BookStatus[]> = {
  liked: ['saved', 'reading'], saved: ['liked', 'reading'], reading: ['read'], read: [],
}

export function canTransition(from: BookStatus, to: BookStatus) {
  return transitions[from].includes(to)
}

export function countCompletedOnce(existing: UserBook | undefined, next: UserBook) {
  return next.status === 'read' && existing?.status !== 'read' ? 1 : 0
}

export function coverFallbackNeeded(url: string) {
  if (!url.trim()) return true
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return true
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase()
    return ['2ebook.com', 'elibrarycub.com'].includes(hostname)
  } catch {
    return true
  }
}
