import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const shell = readFileSync(resolve(process.cwd(), 'src/components/AppShell.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('reader level-up dialog', () => {
  it('renders real level data inside a dedicated opaque celebration card', () => {
    expect(shell).toContain('{levelUp.level}')
    expect(shell).toContain('{levelUp.name}')
    expect(shell).toContain('profile-level-book.png')
    expect(shell).toContain('level-up-dialog__message')
    expect(css).toContain('background: linear-gradient(155deg, #fffefa 0%, #fff6e9 58%, #ffe9da 100%)')
    expect(css).not.toContain('.level-up-dialog { width: min(100%, 420px);')
  })

  it('stays usable on short screens and respects reduced motion', () => {
    expect(css).toContain('(max-height: 680px)')
    expect(css).toContain('(prefers-reduced-motion: reduce)')
    expect(shell).toContain('button--wide')
  })
})
