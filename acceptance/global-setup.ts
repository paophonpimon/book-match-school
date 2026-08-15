import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, doc, setDoc } from 'firebase/firestore'
import { ACCEPTANCE_PASSWORD, ACCEPTANCE_PROJECT_ID, TERM_ID, accounts, bookIds } from './fixtures'

interface CreatedUser { uid: string; email: string; studentId: string }

async function createVerifiedUser(email: string, studentId: string): Promise<CreatedUser> {
  const signUp = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: ACCEPTANCE_PASSWORD, returnSecureToken: true }),
  })
  if (!signUp.ok) throw new Error(`Auth emulator signUp failed: ${signUp.status} ${await signUp.text()}`)
  const account = await signUp.json() as { localId: string; idToken: string }
  const update = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${ACCEPTANCE_PROJECT_ID}/accounts:update`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' },
    body: JSON.stringify({ localId: account.localId, emailVerified: true }),
  })
  if (!update.ok) throw new Error(`Auth emulator verify failed: ${update.status} ${await update.text()}`)
  return { uid: account.localId, email, studentId }
}

export default async function globalSetup() {
  const rules = await readFile(resolve('firestore.rules'), 'utf8')
  const environment = await initializeTestEnvironment({
    projectId: ACCEPTANCE_PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules },
  })
  await environment.clearFirestore()
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${ACCEPTANCE_PROJECT_ID}/accounts`, { method: 'DELETE' })

  const users = Object.fromEntries(await Promise.all(Object.entries(accounts).map(async ([key, account]) => [
    key, await createVerifiedUser(account.email, account.studentId),
  ]))) as Record<keyof typeof accounts, CreatedUser>

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const now = Timestamp.now()
    await setDoc(doc(db, 'settings', 'currentTerm'), { termId: TERM_ID, updatedAt: now, updatedBy: users.admin.uid })
    await setDoc(doc(db, 'terms', TERM_ID), {
      id: TERM_ID, name: 'ภาคเรียนทดสอบ E2E', academicYear: 2569, semester: 1,
      startDate: now, endDate: Timestamp.fromMillis(now.toMillis() + 90 * 86400000), status: 'active',
      createdAt: now, updatedAt: now, createdBy: users.admin.uid, updatedBy: users.admin.uid,
    })
    await setDoc(doc(db, 'terms', '2998-2'), {
      id: '2998-2', name: 'ภาคเรียนปิด E2E', academicYear: 2998, semester: 2,
      startDate: now, endDate: now, status: 'closed', createdAt: now, updatedAt: now,
      createdBy: users.admin.uid, updatedBy: users.admin.uid,
    })

    for (const [key, user] of Object.entries(users)) {
      if (key === 'admin') continue
      const status = key === 'suspended' ? 'suspended' : 'active'
      if (key === 'studentNew') {
        await setDoc(doc(db, 'studentMemberships', user.studentId), {
          studentId: user.studentId, uid: user.uid, email: user.email, status: 'active', createdAt: now, updatedAt: now,
        })
        await setDoc(doc(db, 'studentMembershipUids', user.uid), {
          uid: user.uid, studentId: user.studentId, email: user.email, createdAt: now, updatedAt: now,
        })
        await setDoc(doc(db, 'studentDirectory', user.studentId), {
          studentId: user.studentId, uid: user.uid, firstName: 'ใหม่', lastName: 'ทดสอบ',
          gradeLevel: '5/5', className: 'ม.5/5', studentNumber: '5', createdAt: now, updatedAt: now,
        })
        continue
      }
      const profile = {
        uid: user.uid, avatarId: 'avatar-boy-01', studentId: user.studentId, displayName: `E2E ${key}`,
        firstName: 'นักเรียน', lastName: `ทดสอบ ${key}`, gradeLevel: '5/1', className: 'ม.5/1',
        studentNumber: user.studentId.slice(-2), interests: ['learn'], createdAt: now, lastActiveAt: now,
      }
      await setDoc(doc(db, 'profiles', user.uid), profile)
      await setDoc(doc(db, 'studentMemberships', user.studentId), {
        studentId: user.studentId, uid: user.uid, email: user.email, status, createdAt: now, updatedAt: now,
      })
      await setDoc(doc(db, 'studentMembershipUids', user.uid), {
        uid: user.uid, studentId: user.studentId, email: user.email, createdAt: now, updatedAt: now,
      })
      await setDoc(doc(db, 'progress', `${TERM_ID}_${user.uid}`), {
        uid: user.uid, termId: TERM_ID, avatarId: profile.avatarId, firstName: profile.firstName,
        lastName: profile.lastName, displayName: profile.displayName, className: profile.className,
        readCount: 0, likedCount: 0, eligible: true, lastReadAt: null, updatedAt: now,
      })
      await setDoc(doc(db, 'readerStats', user.uid), {
        uid: user.uid, lifetimeReadCount: 0, currentLevel: 1, updatedAt: now, lastCreditedUserBookId: null,
      })
    }

    for (const [index, id] of bookIds.entries()) {
      const active = index !== 10
      const coverUrl = index === 8 ? 'http://127.0.0.1:4174/e2e-cover-error.png'
        : index === 9 ? 'http://127.0.0.1:4174/e2e-cover-slow.png'
          : index === 11 ? '' : 'http://127.0.0.1:4174/acceptance-cover.svg'
      await setDoc(doc(db, 'books', id), {
        id, title: `หนังสือทดสอบ E2E ${index + 1}`, author: `ผู้แต่ง TEST ${index + 1}`,
        categoryCode: `${(index % 10) * 100}`.padStart(3, '0'), category: `หมวด E2E ${index % 4}`,
        description: `รายละเอียดหนังสือสำหรับ automated acceptance test เล่มที่ ${index + 1}`,
        coverUrl, audioUrl: '', isbn: `E2EISBN${index + 1}`, callNumber: `E2E-${index + 1}`,
        tags: ['TEST', index % 2 ? 'ความรู้' : 'ผ่อนคลาย'], moods: [index % 2 ? 'อยากได้ความรู้' : 'อยากผ่อนคลาย'],
        readingLevel: 'ปานกลาง', recommendedGrades: 'ม.1-ม.6', matchReason: 'ข้อมูลจำลอง E2E', active,
        displayOrder: index + 1, normalizedTitle: `หนังสือทดสอบ e2e ${index + 1}`,
        normalizedAuthor: `ผู้แต่ง test ${index + 1}`, normalizedTitleAuthor: `หนังสือทดสอบ e2e ${index + 1}\u0000ผู้แต่ง test ${index + 1}`,
        bookUniqueKey: `${index + 1}`.padStart(64, '0'), createdAt: now, createdBy: users.admin.uid,
        updatedAt: now, updatedBy: users.admin.uid, lastAuditId: `E2E-SEED-${index + 1}`,
      })
    }
  })
  await mkdir(resolve('acceptance/fixtures'), { recursive: true })
  await writeFile(resolve('acceptance/fixtures/manifest.json'), JSON.stringify({
    projectId: ACCEPTANCE_PROJECT_ID, termId: TERM_ID, generatedAt: new Date().toISOString(), users, books: bookIds,
    scope: 'Firebase Emulator only; every fixture ID contains E2E/TEST',
  }, null, 2))
  await environment.cleanup()
}
