export type StudentEntryRoute = 'loading' | 'welcome' | 'maintenance' | 'setup' | 'home'

export function getStudentEntryRoute(input: {
  loading: boolean
  signedIn: boolean
  hasActiveTerm: boolean
  hasProfile: boolean
}): StudentEntryRoute {
  if (input.loading) return 'loading'
  if (!input.signedIn) return 'welcome'
  if (!input.hasActiveTerm) return 'maintenance'
  if (!input.hasProfile) return 'setup'
  return 'home'
}
