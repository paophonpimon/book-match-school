import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/onboarding/WelcomePage.tsx'), 'utf8')
const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')
const brandSource = readFileSync(resolve(process.cwd(), 'src/components/Brand.tsx'), 'utf8')
const indexSource = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

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

  it('keeps the brand and supplied artwork visually prominent', () => {
    expect(styles).toContain('.welcome-card > .brand { transform: scale(1.03)')
    expect(styles).toContain('width: clamp(178px, 49vw, 218px)')
    expect(styles).toContain('.welcome-art { width: 164px')
  })

  it('uses Book Match: เล่มที่ใช่ as the project name', () => {
    expect(brandSource).toContain('<strong>เล่มที่ใช่</strong>')
    expect(brandSource).toContain('<small>BOOK MATCH</small>')
    expect(indexSource).toContain('<title>Book Match: เล่มที่ใช่</title>')
    expect(indexSource).not.toContain('<title>ปัดหาเล่ม | Book Match</title>')
  })
})
