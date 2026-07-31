import type { Book, BookStatus, Loan, UserBook } from '../types'

const transitions: Record<BookStatus, BookStatus[]> = {
  liked: ['saved', 'reading'], saved: ['liked', 'reading'], reading: ['read'], read: [],
}

export function canTransition(from: BookStatus, to: BookStatus) {
  return transitions[from].includes(to)
}

export function countCompletedOnce(existing: UserBook | undefined, next: UserBook) {
  return next.status === 'read' && existing?.status !== 'read' ? 1 : 0
}

export function readShelfBooks(
  books: Book[],
  userBooks: Record<string, UserBook>,
  loans: Loan[],
  termId: string,
) {
  const returnedAtByBook = new Map<string, string>()
  loans.forEach((loan) => {
    if (loan.termId !== termId || loan.status !== 'returned' || !loan.returnedAt) return
    const previous = returnedAtByBook.get(loan.bookId) ?? ''
    if (loan.returnedAt > previous) returnedAtByBook.set(loan.bookId, loan.returnedAt)
  })

  return books.filter((book) => (
    userBooks[book.id]?.status === 'read' || returnedAtByBook.has(book.id)
  )).sort((left, right) => {
    const leftAt = userBooks[left.id]?.readAt ?? returnedAtByBook.get(left.id) ?? ''
    const rightAt = userBooks[right.id]?.readAt ?? returnedAtByBook.get(right.id) ?? ''
    return rightAt.localeCompare(leftAt)
  })
}

export function coverFallbackNeeded(url: string) {
  if (!url.trim()) return true
  try {
    const parsed = new URL(url)
    return !['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname
  } catch {
    return true
  }
}
