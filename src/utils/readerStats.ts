import type { BookStatus } from '../types'
import { getReaderLevel } from './readerLevels'

export interface LifetimeCreditPlan {
  counted: boolean
  lifetimeReadCount: number
  currentLevel: number
  levelUp: boolean
}

export function planLifetimeReadCredit(
  previousStatus: BookStatus | undefined,
  alreadyCredited: boolean,
  previousLifetimeReadCount: number,
): LifetimeCreditPlan {
  const safePrevious = Number.isFinite(previousLifetimeReadCount)
    ? Math.max(0, Math.floor(previousLifetimeReadCount))
    : 0
  const previousLevel = getReaderLevel(safePrevious).level
  if (previousStatus === 'read' || alreadyCredited) {
    return {
      counted: false,
      lifetimeReadCount: safePrevious,
      currentLevel: previousLevel,
      levelUp: false,
    }
  }
  const lifetimeReadCount = safePrevious + 1
  const currentLevel = getReaderLevel(lifetimeReadCount).level
  return {
    counted: true,
    lifetimeReadCount,
    currentLevel,
    levelUp: currentLevel > previousLevel,
  }
}
