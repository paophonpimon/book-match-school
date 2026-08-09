import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('student interface motion', () => {
  it('animates decorative artwork without changing student data or behavior', () => {
    expect(css).toContain('/* Gentle motion for student-facing pages */')
    expect(css).toContain('@keyframes student-float')
    expect(css).toContain('.home-hero__art { animation: student-float')
    expect(css).toContain('.swipe-card__bookmark-art { animation: student-bookmark-sway')
    expect(css).toContain('.leaderboard-podium__medal { animation: student-medal-float')
    expect(css).toContain('.term-rank-card__art,')
  })

  it('keeps motion accessible for people who request reduced animation', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: .01ms !important')
    expect(css).toContain('transition-duration: .01ms !important')
  })

  it('does not target the admin interface', () => {
    const motionSection = css.split('/* Gentle motion for student-facing pages */')[1]
    expect(motionSection).not.toContain('.admin-')
  })
})
