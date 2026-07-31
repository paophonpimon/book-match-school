import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { test, expect } from '@playwright/test'
import { ACCEPTANCE_PROJECT_ID, TERM_ID, accounts, bookIds } from '../fixtures'
import { readManifest, type FixtureManifest } from '../helpers'

let environment: RulesTestEnvironment
let manifest: FixtureManifest

function requestPayload(uid: string, studentId: string, loanId: string, bookId: string) {
  const index = bookIds.indexOf(bookId)
  return {
    id: loanId, uid, termId: TERM_ID, bookId, status: 'pending', requestedAt: serverTimestamp(),
    approvedAt: null, borrowedAt: null, dueAt: null, returnedAt: null, rejectedAt: null,
    cancelledAt: null, approvedBy: null, returnedBy: null, renewCount: 0, loanDays: 7, adminNote: '',
    studentDisplayName: 'E2E studentA', studentFirstName: 'นักเรียน', studentLastName: 'ทดสอบ studentA',
    studentClassroom: 'ม.5/1', studentNumber: studentId.slice(-2), studentId,
    bookTitle: `หนังสือทดสอบ E2E ${index + 1}`, bookAuthor: `ผู้แต่ง TEST ${index + 1}`,
    bookCoverUrl: index === 8 ? 'http://127.0.0.1:4173/e2e-cover-error.png'
      : index === 9 ? 'http://127.0.0.1:4173/e2e-cover-slow.png'
        : index === 11 ? '' : 'http://127.0.0.1:4173/acceptance-cover.svg',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastAuditId: loanId,
  }
}

async function createRequest(account: keyof typeof accounts, bookId: string, loanId: string) {
  const user = manifest.users[account]
  const db = environment.authenticatedContext(user.uid, { email: user.email, email_verified: true }).firestore()
  const batch = writeBatch(db)
  batch.set(doc(db, 'loans', loanId), requestPayload(user.uid, user.studentId, loanId, bookId))
  batch.set(doc(db, 'studentLoanActiveKeys', `${user.uid}_${bookId}`), {
    uid: user.uid, bookId, loanId, status: 'pending', updatedAt: serverTimestamp(), lastAuditId: loanId,
  })
  batch.set(doc(db, 'loanAuditLogs', loanId), {
    action: 'request', loanId, bookId, studentUid: user.uid, previousStatus: null, nextStatus: 'pending',
    actorUid: user.uid, actorEmail: null, note: '', createdAt: serverTimestamp(),
  })
  await batch.commit()
}

test.describe.serial('Firestore Rules acceptance', () => {
  test.beforeAll(async () => {
    manifest = await readManifest()
    environment = await initializeTestEnvironment({
      projectId: ACCEPTANCE_PROJECT_ID,
      firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(resolve('firestore.rules'), 'utf8') },
    })
  })
  test.afterAll(async () => environment.cleanup())

  test('active verified member creates pending loan + key + audit without lock', async () => {
    const loanId = 'E2E-RULE-REQUEST-A'
    await assertSucceeds(createRequest('studentA', bookIds[6], loanId))
    const inspector = environment.unauthenticatedContext().firestore()
    await environment.withSecurityRulesDisabled(async (context) => {
      expect((await getDoc(doc(context.firestore(), 'loans', loanId))).data()?.status).toBe('pending')
      expect((await getDoc(doc(context.firestore(), 'studentLoanActiveKeys', `${manifest.users.studentA.uid}_${bookIds[6]}`))).exists()).toBe(true)
      expect((await getDoc(doc(context.firestore(), 'loanAuditLogs', loanId))).exists()).toBe(true)
      expect((await getDoc(doc(context.firestore(), 'bookLoanLocks', bookIds[6]))).exists()).toBe(false)
    })
    void inspector
  })

  test('missing membership and suspended member are denied', async () => {
    await assertFails(createRequest('studentNew', bookIds[1], 'E2E-DENY-NO-MEMBER'))
    await assertFails(createRequest('suspended', bookIds[2], 'E2E-DENY-SUSPENDED'))
  })

  test('hidden book and duplicate active request are denied', async () => {
    await assertFails(createRequest('studentB', bookIds[10], 'E2E-DENY-HIDDEN'))
    await assertFails(createRequest('studentA', bookIds[6], 'E2E-DENY-DUPLICATE'))
  })

  test('missing and closed current term are denied', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'settings', 'currentTerm'), { termId: '' })
    })
    await assertFails(createRequest('studentB', bookIds[3], 'E2E-DENY-NO-TERM'))
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'settings', 'currentTerm'), { termId: '2998-2' })
    })
    await assertFails(createRequest('studentB', bookIds[3], 'E2E-DENY-CLOSED'))
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'settings', 'currentTerm'), { termId: TERM_ID })
    })
  })

  test('UID/studentId mismatch is denied', async () => {
    const user = manifest.users.studentC
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'studentMembershipUids', user.uid), {
        uid: user.uid, studentId: '99999', email: user.email,
      })
    })
    await assertFails(createRequest('studentC', bookIds[4], 'E2E-DENY-MISMATCH'))
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'studentMembershipUids', user.uid), {
        uid: user.uid, studentId: user.studentId, email: user.email,
      })
    })
  })
})
