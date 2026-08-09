import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/features/profile/ProfilePage.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('student profile visual structure', () => {
  it('keeps the shared student header and existing profile actions', () => {
    expect(page).toContain('<PageHeader title="โปรไฟล์"')
    expect(page).toContain("navigate('/setup')")
    expect(page).toContain("navigate('/categories')")
    expect(page).toContain("navigate('/loans')")
    expect(page).toContain("navigate('/admin')")
    expect(page).toContain('resetDevice()')
  })

  it('renders identity and membership from live application data', () => {
    expect(page).toContain('{profile?.displayName}')
    expect(page).toContain('{profile?.className}')
    expect(page).toContain('{profile?.studentNumber}')
    expect(page).toContain('{authUser?.email}')
    expect(page).toContain('membershipLabels[membership.status]')
    expect(page).not.toContain('เอไอทดสอบระบบ 1')
    expect(page).not.toContain('noi.chaiyo0@gmail.com')
  })

  it('keeps level, term rank, and statistics data driven', () => {
    expect(page).toContain('getReaderLevel(readerStats.lifetimeReadCount)')
    expect(page).toContain('getTermReaderRank(termReadCount)')
    expect(page).toContain('readerStats.lifetimeReadCount.toLocaleString')
    expect(page).toContain('currentTerm?.name')
    expect(page).toContain('termRank.name')
    expect(page).toContain('values.filter')
    expect(page).toContain('navigate(`/shelf?tab=${shelfTab}`)')
    expect(page).toContain('aria-label={`ดูหนังสือ${label}')
  })

  it('uses supplied profile artwork as decoration around real HTML content', () => {
    expect(page).toContain("const profileAssetRoot = '/assets/book-match/profile'")
    expect(page).toContain('profile-active-member-shield.png')
    expect(page).toContain('profile-level-book.png')
    expect(page).toContain('profile-reader-badge-bronze.png')
    expect(page).toContain('profile-star-medal.png')
    expect(page).toContain('profile-term-medal-books.png')
  })

  it('keeps the term medal in sync with the real rank and centers mobile statistics', () => {
    expect(page).toContain('term-rank-card__rank--${termRank.key}')
    expect(page).toContain('className="term-rank-card__medal"')
    expect(css).toContain('.term-rank-card__rank--silver .term-rank-card__medal')
    expect(css).toContain('.term-rank-card__rank--diamond .term-rank-card__medal')
    expect(css).toContain('.profile-stat strong { align-self: center;')
    expect(css).toContain('.profile-stat small { align-self: center;')
  })

  it('has scoped mobile, short-width, and desktop profile treatments', () => {
    expect(css).toContain('/* Student profile — Stage 4 */')
    expect(css).toContain('.profile-hero {')
    expect(css).toContain('.reader-level-card__art')
    expect(css).toContain('.term-rank-card__art')
    expect(css).toContain('.profile-stat--coral')
    expect(css).toContain('@media (max-width: 370px)')
    expect(css).toContain('@media (min-width: 700px)')
  })
})
