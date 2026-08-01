import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/features/discovery/DiscoverPage.tsx'), 'utf8')
const shell = readFileSync(resolve(process.cwd(), 'src/components/AppShell.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('mobile swipe deck regression', () => {
  it('reserves dynamic viewport space above the bottom navigation and safe area', () => {
    expect(shell).toContain("app-shell--discover")
    expect(css).toContain('height: 100dvh')
    expect(css).toContain('calc(68px + env(safe-area-inset-bottom))')
    expect(css).toContain('grid-template-rows: auto auto minmax(0, 1fr) auto auto')
  })

  it('removes the numbered journey steps and keeps covers portrait shaped', () => {
    expect(page).not.toContain('ProgressSteps')
    expect(css).toContain('aspect-ratio: 2 / 3')
    expect(css).toContain('object-fit: contain')
  })

  it('keeps both cards in one fixed clipped deck without rotating the next card', () => {
    expect(page).toContain('data-testid="swipe-deck"')
    expect(css).toContain('.swipe-stage {')
    expect(css).toContain('contain: layout paint')
    expect(css).toContain('overflow: hidden')
    expect(css).toContain('translate3d(0, 8px, 0) scale(.965)')
    expect(css).not.toContain('scale(.96) rotate(1.4deg)')
  })

  it('uses the same guarded decision animation for buttons and gestures', () => {
    expect(page).toContain('transitionBookId.current')
    expect(page).toContain("void onDecision('liked')")
    expect(page).toContain("void decide('liked')")
    expect(page).toContain('drag={!disabled}')
    expect(page).not.toContain('AnimatePresence')
  })

  it('keeps all three gesture instructions visible and explicit', () => {
    expect(page).toContain('ปัดซ้าย = ไม่ใช่')
    expect(page).toContain('ปัดขวา = ชอบ')
    expect(page).toContain('ปัดขึ้น = เก็บไว้ก่อน')
  })

  it('shows only the aggregate star score on swipe cards when ratings exist', () => {
    expect(page).toContain('bookRatings')
    expect(page).toContain('className="swipe-card__rating"')
    expect(page).toContain('★ {rating.ratingAverage.toFixed(1)}')
    expect(css).toContain('.swipe-card__rating')
    expect(page).toContain('className="swipe-card__title-line"')
    expect(css).toContain('font-size: var(--swipe-title-size)')
  })

  it('prevents an undo race while the preceding Firestore write is syncing', () => {
    expect(page).toContain('!swipeHistory.length || isTransitioning || syncing')
    expect(page).toContain('disabled={isTransitioning || syncing}')
  })

  it('has a compact layout for short mobile viewports', () => {
    expect(css).toContain('@media (max-width: 699px) and (max-height: 740px)')
    expect(css).toContain('.swipe-action > span { width: 46px; height: 46px; }')
  })
})
