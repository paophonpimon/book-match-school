import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/discovery/BookDetailPage.tsx'), 'utf8')
const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('book detail visual layout', () => {
  it('keeps the shared student header and real book data in the editorial hero', () => {
    expect(pageSource).toContain('<PageHeader title=')
    expect(pageSource).toContain('back />')
    expect(pageSource).toContain('<BookCover book={book} loading="eager" />')
    expect(pageSource).toContain('{book.title}')
    expect(pageSource).toContain('{book.author}')
    expect(pageSource).toContain('reviewSummary.ratingAverage')
    expect(pageSource).toContain('detail-hero__book-outline')
  })

  it('preserves existing audio, loan, shelf and review handlers', () => {
    expect(pageSource).toContain('<AudioNarration title={book.title} audioUrl={book.audioUrl} />')
    expect(pageSource).toContain('await requestLoan(book!.id)')
    expect(pageSource).toContain('await cancelLoan(activeLoan.id)')
    expect(pageSource).toContain("setBookStatus(book.id, 'saved')")
    expect(pageSource).toContain("navigate(`/review/${book.id}`)")
    expect(pageSource).toContain('<ReaderReviews')
    expect(pageSource).toContain("loan-card--requestable")
    expect(pageSource).toContain('detail-action--save')
    expect(pageSource).toContain('detail-action--next')
  })

  it('renders only real catalog tags and responsive premium card styling', () => {
    expect(pageSource).toContain('new Set([...(book.tags ?? []), ...book.moodTags])')
    expect(styles).toContain('/* Book detail visual system */')
    expect(styles).toContain('.detail-hero__cover')
    expect(styles).toContain('linear-gradient(145deg, #fffaf4 0%, #fbe9dc 100%)')
    expect(styles).toContain('@media (max-width: 370px)')
    expect(styles).toContain('padding-bottom: calc(108px + env(safe-area-inset-bottom))')
    expect(styles).toContain('.loan-card--requestable')
    expect(styles).toContain('.shelf-location > div')
    expect(styles).toContain('.detail-actions .detail-action--save')
  })
})
