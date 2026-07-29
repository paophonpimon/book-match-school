import { describe, expect, it } from 'vitest'
import { getStudentEntryRoute } from '../utils/studentRouting'

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
})
