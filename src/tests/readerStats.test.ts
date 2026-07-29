import { describe, expect, it } from 'vitest'
import { planLifetimeReadCredit } from '../utils/readerStats'

describe('idempotent lifetime read credit', () => {
  it('increments exactly once for a first completion', () => {
    expect(planLifetimeReadCredit('reading', false, 4)).toEqual({
      counted: true,
      lifetimeReadCount: 5,
      currentLevel: 3,
      levelUp: true,
    })
  })

  it('does not increment an already-read book', () => {
    expect(planLifetimeReadCredit('read', true, 5)).toMatchObject({
      counted: false,
      lifetimeReadCount: 5,
    })
  })

  it('is stable when a transaction retry starts from the committed snapshot', () => {
    const first = planLifetimeReadCredit('reading', false, 8)
    const retry = planLifetimeReadCredit('read', true, first.lifetimeReadCount)
    expect(first.lifetimeReadCount).toBe(9)
    expect(retry).toMatchObject({ counted: false, lifetimeReadCount: 9 })
  })

  it('does not reset when a term changes', () => {
    const before = planLifetimeReadCredit(undefined, true, 14)
    expect(before).toMatchObject({ lifetimeReadCount: 14, currentLevel: 5 })
  })
})
