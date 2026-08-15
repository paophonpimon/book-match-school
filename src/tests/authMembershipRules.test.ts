import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const firebaseService = readFileSync(resolve(process.cwd(), 'src/services/firebase.ts'), 'utf8')
const appContext = readFileSync(resolve(process.cwd(), 'src/app/AppContext.tsx'), 'utf8')
const setupPage = readFileSync(resolve(process.cwd(), 'src/features/onboarding/ProfileSetupPage.tsx'), 'utf8')
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')

describe('Student ID and legacy Google authentication security', () => {
  it('keeps Google popup login for existing members and adds Email/Password login', () => {
    expect(firebaseService).toContain('signInWithPopup')
    expect(firebaseService).toContain('signInWithEmailAndPassword')
    expect(firebaseService).not.toContain('signInWithRedirect')
    expect(firebaseService).toContain('onAuthStateChanged')
    expect(appContext).toContain('const user = await signInStudentWithGoogle()')
    expect(appContext).toContain('const user = await signInStudentWithId(studentId, password)')
  })

  it('preserves legacy anonymous-to-Google linking without changing its UID', () => {
    expect(firebaseService).toContain('auth.currentUser?.isAnonymous')
    expect(firebaseService).toContain('linkWithPopup(auth.currentUser, provider)')
  })

  it('blocks client-side membership and UID-lock creation', () => {
    const membershipSection = rules.slice(rules.indexOf('match /studentMemberships/'), rules.indexOf('match /studentMembershipUids/'))
    const uidSection = rules.slice(rules.indexOf('match /studentMembershipUids/'), rules.indexOf('match /studentDirectory/'))
    expect(membershipSection).toContain('allow create: if false;')
    expect(uidSection).toContain('allow create: if false;')
    expect(firebaseService).not.toContain('transaction.set(membershipUidRef')
    expect(firebaseService).not.toContain('transaction.set(membershipRef')
  })

  it('requires a provisioned directory before creating the first profile', () => {
    expect(rules).toContain('&& directoryProfileMatches(uid)')
    expect(firebaseService).toContain('!editingExistingProfile && !directorySnapshot.exists()')
    expect(setupPage).toContain('บัญชี Google นี้ยังไม่เป็นสมาชิก Book Match')
  })

  it('uses official fields from the directory and prevents student writes to it', () => {
    expect(firebaseService).toContain('const official = directory ?')
    expect(rules).toContain('get(directoryPath).data.firstName == request.resource.data.firstName')
    expect(rules).toContain('get(directoryPath).data.studentNumber == request.resource.data.studentNumber')
    expect(rules).toContain('match /studentDirectory/{studentId}')
    expect(rules).toContain('allow create, update, delete: if false;')
    expect(setupPage).toContain('หากข้อมูลไม่ถูกต้อง กรุณาแจ้งบรรณารักษ์')
  })

  it('keeps Admin authorization pinned to the verified Admin email', () => {
    expect(rules).toContain('request.auth.token.email_verified == true')
    expect(rules).toContain("request.auth.token.email == 'paopornpimon@gmail.com'")
  })

  it('still restricts suspended members from student activity', () => {
    expect(rules).toContain("get(membershipPath).data.status == 'active'")
    expect(rules).toContain('activeMember(request.resource.data.uid)')
  })
})
