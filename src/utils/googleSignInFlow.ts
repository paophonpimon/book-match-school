export interface GoogleSignInEnvironment {
  userAgent: string
  maxTouchPoints: number
  coarsePointer: boolean
}

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
  void environment
  // Popup sign-in keeps Firebase Auth on one session. Redirect sign-in can lose
  // its result when web.app and firebaseapp.com storage are partitioned.
  return false
}
