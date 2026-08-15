import { describe, expect, it } from 'vitest'
import { getStudentEntryRoute } from '../utils/studentRouting'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const setupPage = readFileSync(resolve(process.cwd(), 'src/features/onboarding/ProfileSetupPage.tsx'), 'utf8')
const pageHeader = readFileSync(resolve(process.cwd(), 'src/components/PageHeader.tsx'), 'utf8')

describe('student account routing', () => {
  it('keeps a signed-out visitor on the login screen', () => {
    expect(getStudentEntryRoute({ loading: false, signedIn: false, hasActiveTerm: false, hasProfile: false })).toBe('welcome')
  })

  it('routes an existing profile into the application', () => {
    expect(getStudentEntryRoute({ loading: false, signedIn: true, hasActiveTerm: true, hasProfile: true })).toBe('home')
  })

  it('routes a signed-in account without a profile to setup validation', () => {
    expect(getStudentEntryRoute({ loading: false, signedIn: true, hasActiveTerm: true, hasProfile: false })).toBe('setup')
  })

  it('shows a safe maintenance state when current term is missing', () => {
    expect(getStudentEntryRoute({ loading: false, signedIn: true, hasActiveTerm: false, hasProfile: false })).toBe('maintenance')
  })

  it('lets an account cancel onboarding and return to account selection', () => {
    expect(pageHeader).toContain('if (onBack) onBack(); else navigate(-1)')
    expect(setupPage).toContain('resetDevice()')
    expect(setupPage).toContain("navigate('/welcome', { replace: true })")
    expect(setupPage).toContain('ยกเลิกและเปลี่ยนบัญชี')
  })

  it('keeps ordinary back navigation when an existing profile is being edited', () => {
    expect(setupPage).toContain('if (canReturnToProfile)')
    expect(setupPage).toContain('navigate(-1)')
  })

  it('sets a new password inside the existing imported-student setup before saving the profile', () => {
    expect(setupPage).toContain('ตั้งรหัสผ่านของฉัน')
    expect(setupPage).toContain('validateNewStudentPassword')
    expect(setupPage.indexOf('await updateCurrentStudentPassword(newPassword)')).toBeLessThan(setupPage.indexOf('await saveProfile({'))
  })
})
