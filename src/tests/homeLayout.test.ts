import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/features/home/HomePage.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')
const pageHeader = readFileSync(resolve(process.cwd(), 'src/components/PageHeader.tsx'), 'utf8')
const studentBrand = readFileSync(resolve(process.cwd(), 'src/components/StudentBrand.tsx'), 'utf8')

describe('student home visual structure', () => {
  it('uses the supplied Book Match artwork without replacing live content', () => {
    expect(page).toContain("const assetRoot = '/assets/book-match'")
    expect(page).toContain('/home/home-hero-books.webp')
    expect(page).toContain('/home/home-reading-corner.webp')
    expect(page).toContain('/home/home-read-completed.webp')
    expect(page).toContain('/home/home-quote-books-coffee.webp')
    expect(page).toContain('{settings.announcement}')
    expect(page).toContain('{displayName}')
  })

  it('preserves the existing student routes and calls to action', () => {
    expect(page).toContain('to="/mood"')
    expect(page).toContain('to="/shelf"')
    expect(page).toContain('to="/leaderboard"')
    expect(page).toContain('to="/profile"')
    expect(page.match(/to="\/mood"/g)).toHaveLength(1)
    expect(page).not.toContain('home-hero__cta-hint')
    expect(page).not.toContain('เริ่มตรงนี้')
    expect(page).toContain('home-hero__button-arrow')
    expect(page).not.toContain('home-start-card')
  })

  it('uses actual reader data for the home ranking instead of a placeholder formula', () => {
    expect(page).toContain('sortLeaderboard')
    expect(page).toContain('readers.filter')
    expect(page).toContain('rankedReaders.findIndex')
    expect(page).not.toContain('37 - read')
  })

  it('keeps the redesign responsive and scoped to the home page', () => {
    expect(css).toContain('.home-page { max-width: 1040px')
    expect(css).toContain('.home-hero { min-height: 285px')
    expect(css).toContain('right: -10px; bottom: -4px; width: 220px; height: 220px')
    expect(css).toContain('@media (min-width: 700px)')
    expect(css).toContain('@media (max-width: 699px)')
    expect(css).toContain('width: min(58%, 210px); margin-top: 30px')
    expect(css).toContain('@media (max-width: 370px)')
    expect(css).toContain('.home-hero__art')
    expect(css).toContain('background: linear-gradient(135deg, #fff0a8 0%, #ffc844 43%, #efa51d 100%)')
    expect(css).toContain('@keyframes home-cta-glow')
    expect(css).toContain('@keyframes home-cta-shine')
    expect(css).not.toContain('.home-start-card')
  })

  it('uses the shared student wordmark without a duplicate app icon', () => {
    expect(page).toContain('<PageHeader')
    expect(page).not.toContain('<header className="home-header">')
    expect(pageHeader).toContain('<StudentBrand compact />')
    expect(studentBrand).toContain('/book-match-wordmark.webp')
    expect(studentBrand).not.toContain('/book-match-app-icon.png')
  })
})
