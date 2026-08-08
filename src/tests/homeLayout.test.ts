import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/features/home/HomePage.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('student home visual structure', () => {
  it('uses the supplied Book Match artwork without replacing live content', () => {
    expect(page).toContain("const assetRoot = '/assets/book-match'")
    expect(page).toContain('/home/home-hero-books.png')
    expect(page).toContain('/home/home-reading-corner.png')
    expect(page).toContain('/home/home-quote-books-coffee.png')
    expect(page).toContain('{settings.announcement}')
    expect(page).toContain('{displayName}')
  })

  it('preserves the existing student routes and calls to action', () => {
    expect(page).toContain('to="/mood"')
    expect(page).toContain('to="/shelf"')
    expect(page).toContain('to="/leaderboard"')
    expect(page).toContain('to="/profile"')
  })

  it('uses actual reader data for the home ranking instead of a placeholder formula', () => {
    expect(page).toContain('sortLeaderboard')
    expect(page).toContain('readers.filter')
    expect(page).toContain('rankedReaders.findIndex')
    expect(page).not.toContain('37 - read')
  })

  it('keeps the redesign responsive and scoped to the home page', () => {
    expect(css).toContain('.home-page { max-width: 1040px')
    expect(css).toContain('@media (min-width: 700px)')
    expect(css).toContain('@media (max-width: 370px)')
    expect(css).toContain('.home-hero__art')
  })
})
