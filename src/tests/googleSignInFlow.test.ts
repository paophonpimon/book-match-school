import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { shouldUseGoogleSignInRedirect, type GoogleSignInEnvironment } from '../utils/googleSignInFlow'

const firebaseService = readFileSync(resolve(process.cwd(), 'src/services/firebase.ts'), 'utf8')
const productionEnv = readFileSync(resolve(process.cwd(), '.env.production'), 'utf8')

const desktopEnvironment: GoogleSignInEnvironment = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36',
  maxTouchPoints: 0,
  coarsePointer: false,
}

describe('Google student sign-in flow', () => {
  it('uses popup authentication without a redirect fallback', () => {
    expect(firebaseService).toContain('signInWithPopup')
    expect(firebaseService).toContain('linkWithPopup')
    expect(firebaseService).not.toContain('signInWithRedirect')
    expect(firebaseService).not.toContain('linkWithRedirect')
    expect(firebaseService).not.toContain('getRedirectResult')
  })

  it('keeps the production auth helper on the same Firebase Hosting origin', () => {
    expect(productionEnv).toContain('VITE_FIREBASE_AUTH_DOMAIN=book-match-school.web.app')
  })

  it('keeps a closing Firebase popup on desktop browsers', () => {
    expect(shouldUseGoogleSignInRedirect(desktopEnvironment)).toBe(false)
  })

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) [FBAN/MessengerForiOS;FBAV/520.0]',
  ])('keeps popup sign-in on mobile or in-app browsers: %s', (userAgent) => {
    expect(shouldUseGoogleSignInRedirect({
      userAgent,
      maxTouchPoints: 5,
      coarsePointer: true,
    })).toBe(false)
  })

  it('keeps popup sign-in on an iPad requesting the desktop version', () => {
    expect(shouldUseGoogleSignInRedirect({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      maxTouchPoints: 5,
      coarsePointer: true,
    })).toBe(false)
  })

  it('does not mistake an ordinary Mac for an iPad', () => {
    expect(shouldUseGoogleSignInRedirect({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      maxTouchPoints: 0,
      coarsePointer: false,
    })).toBe(false)
  })

  it('keeps popup sign-in for touch-first browsers with an unusual user agent', () => {
    expect(shouldUseGoogleSignInRedirect({
      userAgent: 'BookMatchSchoolBrowser/1.0',
      maxTouchPoints: 10,
      coarsePointer: true,
    })).toBe(false)
  })
})
