export interface GoogleSignInEnvironment {
  userAgent: string
  maxTouchPoints: number
  coarsePointer: boolean
}

const mobileOrInAppBrowserPattern = /Android|iPhone|iPad|iPod|Mobile|FBAN|FBAV|FB_IAB|Instagram|Line\/|GSA\//i

export function getGoogleSignInEnvironment(): GoogleSignInEnvironment {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { userAgent: '', maxTouchPoints: 0, coarsePointer: false }
  }

  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  }
}

export function shouldUseGoogleSignInRedirect(
  environment: GoogleSignInEnvironment = getGoogleSignInEnvironment(),
) {
  if (mobileOrInAppBrowserPattern.test(environment.userAgent)) return true

  // iPadOS can identify itself as macOS when the browser requests a desktop site.
  if (/Macintosh/i.test(environment.userAgent) && environment.maxTouchPoints > 1) return true

  return environment.coarsePointer && environment.maxTouchPoints > 0
}
