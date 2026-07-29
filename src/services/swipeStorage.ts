import type { BookStatus, SwipeAction, SwipeHistoryItem } from '../types'
import { readStored, writeStored } from './storage'

export interface SwipeSession {
  skippedBookIds: string[]
  seenBookIds: string[]
  swipeHistory: SwipeHistoryItem[]
}

const PREFIX = 'book-match-swipe'
const bookStatuses: BookStatus[] = ['liked', 'saved', 'reading', 'read']
const swipeActions: SwipeAction[] = [...bookStatuses, 'skipped']

export function swipeStorageKey(uid: string, termId: string) {
  return `${PREFIX}:${encodeURIComponent(uid)}:${encodeURIComponent(termId)}`
}

export function readSwipeSession(uid: string, termId: string): SwipeSession {
  const stored = readStored<Partial<SwipeSession>>(swipeStorageKey(uid, termId), {})
  const skippedBookIds = uniqueStrings(stored.skippedBookIds)
  const seenBookIds = uniqueStrings([...(stored.seenBookIds ?? []), ...skippedBookIds])
  const swipeHistory = Array.isArray(stored.swipeHistory)
    ? stored.swipeHistory.filter(isSwipeHistoryItem).slice(-20)
    : []
  return { skippedBookIds, seenBookIds, swipeHistory }
}

export function writeSwipeSession(uid: string, termId: string, session: SwipeSession) {
  writeStored(swipeStorageKey(uid, termId), session)
}

export function removeSwipeSession(uid: string, termId: string) {
  localStorage.removeItem(swipeStorageKey(uid, termId))
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))]
}

function isSwipeHistoryItem(value: unknown): value is SwipeHistoryItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SwipeHistoryItem>
  return typeof item.bookId === 'string'
    && swipeActions.includes(item.action as SwipeAction)
    && (item.previousStatus === undefined || bookStatuses.includes(item.previousStatus as BookStatus))
}
