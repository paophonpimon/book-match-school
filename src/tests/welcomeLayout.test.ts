import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/onboarding/WelcomePage.tsx'), 'utf8')
const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')
const brandSource = readFileSync(resolve(process.cwd(), 'src/components/Brand.tsx'), 'utf8')
const indexSource = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('welcome page visual structure', () => {
  it('uses the primary Student ID login and legacy Google sign-in without the old heart artwork', () => {
    expect(pageSource).not.toContain("../../../img/logo-book.webp")
    expect(pageSource).not.toContain('welcome-art')
    expect(pageSource).toContain('เข้าสู่ระบบด้วย Google')
    expect(pageSource).toContain('signInWithGoogle')
    expect(pageSource).toContain('signInWithStudentId')
    expect(pageSource).toContain('เลขประจำตัวนักเรียน')
    expect(pageSource).toContain('สมาชิกเดิมที่เคยสมัครด้วย Google')
    expect(pageSource).toContain('เข้าใช้ครั้งแรก? ให้กรอกเลขประจำตัวนักเรียนซ้ำอีกครั้ง')
    expect(pageSource).toContain('ลืมรหัสผ่านใช่ไหม?')
  })

  it('supports dynamic viewport height and short mobile screens', () => {
    expect(styles).toContain('min-height: 100dvh')
    expect(styles).toContain('@media (max-height: 720px) and (max-width: 600px)')
    expect(styles).toContain('env(safe-area-inset-bottom)')
  })

  it('keeps the brand prominent while fitting the sign-in form in one mobile viewport', () => {
    expect(pageSource).toContain('/assets/book-match/logos/book-match-wordmark.webp')
    expect(styles).toContain('.welcome-wordmark { width: clamp(180px, 48vw, 230px)')
    expect(styles).toContain('.welcome-wordmark { width: 142px')
    expect(styles).toContain('overflow-y: auto')
  })

  it('adds gentle accessible motion to the welcome sign-in call to action', () => {
    expect(styles).toContain('.welcome-spark { animation: student-twinkle')
    expect(styles).toContain('.welcome-student-button:not(:disabled) { animation: welcome-cta-glow')
    expect(styles).toContain('@keyframes welcome-flower-sway')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('uses Book Match: เล่มที่ใช่ as the project name', () => {
    expect(brandSource).toContain('<strong>เล่มที่ใช่</strong>')
    expect(brandSource).toContain('<small>BOOK MATCH</small>')
    expect(indexSource).toContain('<title>Book Match: เล่มที่ใช่</title>')
    expect(indexSource).not.toContain('<title>ปัดหาเล่ม | Book Match</title>')
  })
})
