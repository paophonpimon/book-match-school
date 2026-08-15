import { describe, expect, it } from 'vitest'
import { getStudentEntryRoute } from '../utils/studentRouting'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const setupPage = readFileSync(resolve(process.cwd(), 'src/features/onboarding/ProfileSetupPage.tsx'), 'utf8')
const pageHeader = readFileSync(resolve(process.cwd(), 'src/components/PageHeader.tsx'), 'utf8')

describe('student Google Sign-In routing', () => {
  it('keeps a signed-out visitor on the Google login screen', () => {
    expect(getStudentEntryRoute({ loading: false, signedIn: false, hasActiveTerm: false, hasProfile: false })).toBe('welcome')
  })

  it('routes an existing profile into the application', () => {
    expect(getStudentEntryRoute({ loading: false, signedIn: true, hasActiveTerm: true, hasProfile: true })).toBe('home')
  })

  it('routes a new Google user to profile setup', () => {
    expect(getStudentEntryRoute({ loading: false, signedIn: true, hasActiveTerm: true, hasProfile: false })).toBe('setup')
  })

  it('shows a safe maintenance state when current term is missing', () => {
    expect(getStudentEntryRoute({ loading: false, signedIn: true, hasActiveTerm: false, hasProfile: false })).toBe('maintenance')
  })

  it('lets a new Google user cancel onboarding and return to account selection', () => {
    expect(pageHeader).toContain('if (onBack) onBack(); else navigate(-1)')
    expect(setupPage).toContain('resetDevice()')
    expect(setupPage).toContain("navigate('/welcome', { replace: true })")
    expect(setupPage).toContain('ยกเลิกและใช้บัญชี Google อื่น')
  })

  it('keeps ordinary back navigation when an existing profile is being edited', () => {
    expect(setupPage).toContain('if (canReturnToProfile)')
    expect(setupPage).toContain('navigate(-1)')
  })
})
