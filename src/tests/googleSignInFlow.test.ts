import { describe, expect, it } from 'vitest'
import { shouldUseGoogleSignInRedirect, type GoogleSignInEnvironment } from '../utils/googleSignInFlow'

const desktopEnvironment: GoogleSignInEnvironment = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36',
  maxTouchPoints: 0,
  coarsePointer: false,
}

describe('Google student sign-in flow', () => {
  it('keeps a closing Firebase popup on desktop browsers', () => {
    expect(shouldUseGoogleSignInRedirect(desktopEnvironment)).toBe(false)
  })

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) [FBAN/MessengerForiOS;FBAV/520.0]',
  ])('uses same-tab redirect on mobile or in-app browsers: %s', (userAgent) => {
    expect(shouldUseGoogleSignInRedirect({
      userAgent,
      maxTouchPoints: 5,
      coarsePointer: true,
    })).toBe(true)
  })

  it('detects an iPad requesting the desktop version of a website', () => {
    expect(shouldUseGoogleSignInRedirect({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      maxTouchPoints: 5,
      coarsePointer: true,
    })).toBe(true)
  })

  it('does not mistake an ordinary Mac for an iPad', () => {
    expect(shouldUseGoogleSignInRedirect({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      maxTouchPoints: 0,
      coarsePointer: false,
    })).toBe(false)
  })

  it('uses redirect for touch-first browsers even with an unusual user agent', () => {
    expect(shouldUseGoogleSignInRedirect({
      userAgent: 'BookMatchSchoolBrowser/1.0',
      maxTouchPoints: 10,
      coarsePointer: true,
    })).toBe(true)
  })
})
