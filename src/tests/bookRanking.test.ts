import { describe, expect, it } from 'vitest'
import { demoBooks } from '../data/demoData'
import { deterministicShuffle, rankBooks } from '../utils/bookRanking'

describe('book ranking', () => {
  it('shuffles deterministically for the same session seed', () => {
    const values = ['a', 'b', 'c', 'd', 'e']
    expect(deterministicShuffle(values, 'session-1')).toEqual(deterministicShuffle(values, 'session-1'))
    expect(deterministicShuffle(values, 'session-1')).not.toEqual(deterministicShuffle(values, 'session-2'))
  })

  it('prioritizes featured and matching books while removing inactive or seen books', () => {
    const ranked = rankBooks(demoBooks, ['learn', 'inspire'], ['science'], 'student-a', ['mindset'])
    expect(ranked.some((book) => book.id === 'mindset')).toBe(false)
    expect(ranked.every((book) => book.active)).toBe(true)
    expect(ranked.slice(0, 5).some((book) => book.moodTags.includes('learn'))).toBe(true)
    expect(ranked.slice(0, 5).some((book) => book.moodTags.includes('inspire'))).toBe(true)
  })

  it('promotes the visible next book without reshuffling after a swipe', () => {
    const initial = rankBooks(demoBooks, ['laugh', 'short'], [], 'stable-round')
    expect(initial.length).toBeGreaterThan(2)

    const afterSwipe = rankBooks(demoBooks, ['laugh', 'short'], [], 'stable-round', [initial[0].id])
    expect(afterSwipe[0].id).toBe(initial[1].id)
    expect(afterSwipe[1].id).toBe(initial[2].id)
  })
})

