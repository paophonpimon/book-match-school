import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const firebaseService = readFileSync(resolve(process.cwd(), 'src/services/firebase.ts'), 'utf8')
const appContext = readFileSync(resolve(process.cwd(), 'src/app/AppContext.tsx'), 'utf8')
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')

describe('Google student authentication and membership security', () => {
  it('removes anonymous authentication from the student runtime', () => {
    expect(firebaseService).not.toContain('signInAnonymously')
    expect(appContext).not.toContain('ensureAnonymousUser')
  })

  it('uses Google popup with redirect fallback and restored auth state', () => {
    expect(firebaseService).toContain('signInWithPopup')
    expect(firebaseService).toContain('signInWithRedirect')
    expect(firebaseService).toContain('onAuthStateChanged')
  })

  it('upgrades a legacy anonymous account by linking Google without changing its UID', () => {
    expect(firebaseService).toContain('auth.currentUser?.isAnonymous')
    expect(firebaseService).toContain('linkWithPopup(auth.currentUser, provider)')
    expect(firebaseService).toContain('linkWithRedirect(auth.currentUser, provider)')
  })

  it('requires verified token email for membership ownership', () => {
    expect(rules).toContain('request.auth.token.email_verified == true')
    expect(rules).toContain('request.resource.data.email == request.auth.token.email')
  })

  it('permits a one-time legacy student ID upgrade but keeps an existing ID immutable', () => {
    expect(rules).toContain("resource.data.get('studentId', '')")
    expect(rules).toContain("previousStudentId == ''")
    expect(rules).toContain('request.resource.data.studentId == previousStudentId')
    expect(rules).toContain('profileMembershipMatches(uid)')
    expect(firebaseService).toContain('await user.getIdToken(true)')
  })

  it('allows a registration transaction to check an unused student ID without exposing other members', () => {
    expect(rules).toContain('!exists(/databases/$(database)/documents/studentMemberships/$(studentId))')
    expect(rules).toContain('resource.data.uid == request.auth.uid')
    expect(rules).toContain('allow list: if isAdmin()')
  })

  it('restricts suspended members from new student activity', () => {
    expect(rules).toContain("get(membershipPath).data.status == 'active'")
    expect(rules).toContain('activeMember(request.resource.data.uid)')
  })

  it('keeps Admin authorization pinned to the verified Admin email', () => {
    expect(rules).toContain("request.auth.token.email == 'paopornpimon@gmail.com'")
  })
})
