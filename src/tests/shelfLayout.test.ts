import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/features/shelf/ShelfPage.tsx'), 'utf8')
const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('personal shelf visual layout', () => {
  it('uses the shared header and real existing shelf states', () => {
    expect(page).toContain('<PageHeader title="หนังสือของฉัน" />')
    expect(page).toContain("readShelfBooks(books, userBooks, loans, currentTerm?.id ?? '')")
    expect(page).toContain("['liked', 'saved']")
    expect(page).toContain("item?.status === 'reading'")
  })

  it('keeps all existing shelf, loan and review actions', () => {
    expect(page).toContain('removeBookFromShelf(bookId)')
    expect(page).toContain("setBookStatus(book.id, 'reading')")
    expect(page).toContain("navigate(`/books/${book.id}`)")
    expect(page).toContain("navigate(`/review/${book.id}`)")
    expect(page).toContain("navigate('/loans')")
  })

  it('uses branded real assets and responsive status styling', () => {
    expect(page).toContain('/assets/book-match/home/home-reading-corner.webp')
    expect(page).toContain('/assets/book-match/empty-states/empty-bookshelf.png')
    expect(page).toContain('shelf-item--${awaitingReview')
    expect(styles).toContain('/* Personal shelf redesign */')
    expect(styles).toContain('.shelf-item--reading')
    expect(styles).toContain('.shelf-item--read')
    expect(styles).toContain('.shelf-action--loan')
  })
})
