export interface ReaderLevelResult {
  level: number
  name: string
  currentThreshold: number
  nextThreshold: number | null
  progress: number
  remainingBooks: number
}

export interface TermReaderRank {
  key: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master'
  name: string
  minimum: number
}

const LEVELS = [
  { level: 1, minimum: 0, name: 'นักอ่านหน้าใหม่' },
  { level: 2, minimum: 2, name: 'นักสำรวจหนังสือ' },
  { level: 3, minimum: 5, name: 'นักอ่านตั้งใจ' },
  { level: 4, minimum: 9, name: 'นักสะสมเรื่องราว' },
  { level: 5, minimum: 14, name: 'นักอ่านตัวยง' },
  { level: 6, minimum: 20, name: 'เซียนหนังสือ' },
] as const

const TERM_RANKS = [
  { key: 'bronze', name: 'Bronze', minimum: 0 },
  { key: 'silver', name: 'Silver', minimum: 2 },
  { key: 'gold', name: 'Gold', minimum: 5 },
  { key: 'platinum', name: 'Platinum', minimum: 8 },
  { key: 'diamond', name: 'Diamond', minimum: 12 },
  { key: 'master', name: 'Master Reader', minimum: 18 },
] as const

function safeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function getReaderLevel(lifetimeReadCount: number): ReaderLevelResult {
  const count = safeCount(lifetimeReadCount)
  let index = 0
  LEVELS.forEach((item, itemIndex) => {
    if (count >= item.minimum) index = itemIndex
  })
  const current = LEVELS[Math.max(0, index)]
  const next = LEVELS[index + 1]
  if (!next) {
    return {
      level: current.level,
      name: current.name,
      currentThreshold: current.minimum,
      nextThreshold: null,
      progress: 1,
      remainingBooks: 0,
    }
  }
  const range = next.minimum - current.minimum
  return {
    level: current.level,
    name: current.name,
    currentThreshold: current.minimum,
    nextThreshold: next.minimum,
    progress: Math.min(1, Math.max(0, (count - current.minimum) / range)),
    remainingBooks: Math.max(0, next.minimum - count),
  }
}

export function getTermReaderRank(termReadCount: number): TermReaderRank {
  const count = safeCount(termReadCount)
  let current: TermReaderRank = TERM_RANKS[0]
  TERM_RANKS.forEach((rank) => {
    if (count >= rank.minimum) current = rank
  })
  return current
}
