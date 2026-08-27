import type { Reader } from '../types'

export interface LegacyBorrowFields {
  legacyBorrowCount: number
  legacyBorrowSource: string
  legacyBorrowAsOf: string
  bookMatchBorrowCount: number
}

export function normalizeLegacyBorrowFields(data?: Record<string, unknown>): LegacyBorrowFields {
  const rawCount = Number(data?.legacyBorrowCount ?? 0)
  const rawBookMatchCount = Number(data?.bookMatchBorrowCount ?? 0)
  return {
    legacyBorrowCount: Number.isFinite(rawCount) ? Math.max(0, Math.trunc(rawCount)) : 0,
    legacyBorrowSource: typeof data?.legacyBorrowSource === 'string' ? data.legacyBorrowSource : '',
    legacyBorrowAsOf: typeof data?.legacyBorrowAsOf === 'string' ? data.legacyBorrowAsOf : '',
    bookMatchBorrowCount: Number.isFinite(rawBookMatchCount) ? Math.max(0, Math.trunc(rawBookMatchCount)) : 0,
  }
}

export function bookMatchCompletedReadCount(reader: Pick<Reader, 'readCount'>) {
  return Math.max(0, reader.readCount)
}

export function legacyLibraryBorrowCount(reader: Pick<Reader, 'legacyBorrowCount'>) {
  return Math.max(0, reader.legacyBorrowCount ?? 0)
}

export function bookMatchLibraryBorrowCount(reader: Pick<Reader, 'bookMatchBorrowCount'>) {
  return Math.max(0, reader.bookMatchBorrowCount ?? 0)
}

export function cumulativeLibraryBorrowCount(reader: Pick<Reader, 'legacyBorrowCount' | 'bookMatchBorrowCount'>) {
  return legacyLibraryBorrowCount(reader) + bookMatchLibraryBorrowCount(reader)
}

export function hasLibraryBorrowStats(reader: Pick<Reader, 'legacyBorrowCount' | 'legacyBorrowSource' | 'legacyBorrowAsOf' | 'bookMatchBorrowCount'>) {
  return cumulativeLibraryBorrowCount(reader) > 0 || Boolean(reader.legacyBorrowSource || reader.legacyBorrowAsOf)
}
