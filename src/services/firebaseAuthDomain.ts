const FIREBASE_HOSTING_AUTH_DOMAINS = new Set([
  'book-match-school.web.app',
  'book-match-school.firebaseapp.com',
])

/**
 * Firebase Auth's popup helper must share the app's Hosting origin on iOS.
 * Keep configured domains untouched everywhere else, including local/dev and
 * emulator environments.
 */
export function resolveFirebaseAuthDomain(
  configuredAuthDomain: string | undefined,
  runtimeHostname: string | undefined,
): string | undefined {
  const hostname = runtimeHostname?.trim().toLocaleLowerCase('en-US')
  return hostname && FIREBASE_HOSTING_AUTH_DOMAINS.has(hostname)
    ? hostname
    : configuredAuthDomain
}
