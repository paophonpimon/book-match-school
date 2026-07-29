import { describe, expect, it } from 'vitest'
import { getReaderLevel, getTermReaderRank } from '../utils/readerLevels'

describe('permanent reader levels', () => {
  it.each([
    [0, 1], [1, 1], [2, 2], [4, 2], [5, 3], [8, 3],
    [9, 4], [13, 4], [14, 5], [19, 5], [20, 6], [99, 6],
  ])('maps %i lifetime reads to level %i', (count, level) => {
    expect(getReaderLevel(count).level).toBe(level)
  })

  it('reports progress and books remaining without exceeding the final level', () => {
    expect(getReaderLevel(6)).toMatchObject({
      currentThreshold: 5,
      nextThreshold: 9,
      remainingBooks: 3,
      progress: 0.25,
    })
    expect(getReaderLevel(20)).toMatchObject({
      nextThreshold: null,
      remainingBooks: 0,
      progress: 1,
    })
  })
})

describe('current-term reader rank', () => {
  it.each([
    [0, 'Bronze'], [1, 'Bronze'], [2, 'Silver'], [4, 'Silver'],
    [5, 'Gold'], [7, 'Gold'], [8, 'Platinum'], [11, 'Platinum'],
    [12, 'Diamond'], [17, 'Diamond'], [18, 'Master Reader'],
  ])('maps %i term reads to %s', (count, name) => {
    expect(getTermReaderRank(count).name).toBe(name)
  })
})
