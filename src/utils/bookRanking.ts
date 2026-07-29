import type { Book } from '../types'

function hashSeed(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: string) {
  let state = hashSeed(seed)
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function deterministicShuffle<T>(items: T[], seed: string): T[] {
  const random = seededRandom(seed)
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function rankBooks(books: Book[], moods: string[], categories: string[], seed: string, seen: string[] = []) {
  const shuffled = deterministicShuffle(books.filter((book) => book.active), seed)
  const ranked = shuffled.sort((a, b) => {
    const score = (book: Book) => (book.featured ? 1000 : 0) + (book.moodTags.filter((tag) => moods.includes(tag)).length * 500) + (categories.includes(book.categoryId) ? 250 : 0) + book.popularity
    return score(b) - score(a)
  })
  return ranked.filter((book) => !seen.includes(book.id))
}
