import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/onboarding/WelcomePage.tsx'), 'utf8')
const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('welcome page visual structure', () => {
  it('uses the supplied book artwork and preserves Google sign-in', () => {
    expect(pageSource).toContain("../../../img/logo-book.png")
    expect(pageSource).toContain('เข้าสู่ระบบด้วย Google')
    expect(pageSource).toContain('signInWithGoogle')
  })

  it('supports dynamic viewport height and short mobile screens', () => {
    expect(styles).toContain('min-height: 100dvh')
    expect(styles).toContain('@media (max-height: 720px) and (max-width: 600px)')
    expect(styles).toContain('env(safe-area-inset-bottom)')
  })
})
