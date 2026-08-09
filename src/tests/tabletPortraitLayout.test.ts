import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('touch tablet portrait-like student layout', () => {
  it('keeps landscape touch tablets in a centered mobile-width shell', () => {
    expect(css).toContain('@media (min-width: 700px) and (orientation: landscape) and (pointer: coarse)')
    expect(css).toContain('.app-shell { position: relative; width: min(480px, 100%); margin: 0 auto')
    expect(css).toContain('.bottom-nav { left: 50%; right: auto; width: min(480px, 100%); transform: translateX(-50%); }')
  })

  it('reserves wide landscape navigation for desktop pointer devices', () => {
    expect(css).toContain('@media (min-width: 1024px) and (orientation: landscape) and (hover: hover) and (pointer: fine)')
    expect(css).toContain('@media (min-width: 700px) and (orientation: portrait), (min-width: 700px) and (hover: hover) and (pointer: fine)')
  })
})
