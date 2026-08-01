import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertLoanRequestAvailable, planLoanTransition, validateLoanRequestAccess, type LoanRequestAccessContext } from '../utils/loans'

const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
const service = readFileSync(resolve(process.cwd(), 'src/services/loans.ts'), 'utf8')
const detailPage = readFileSync(resolve(process.cwd(), 'src/features/discovery/BookDetailPage.tsx'), 'utf8')
const loanListPage = readFileSync(resolve(process.cwd(), 'src/features/loans/LoanListPage.tsx'), 'utf8')

function activeContext(overrides: Partial<LoanRequestAccessContext> = {}): LoanRequestAccessContext {
  return {
    auth: { uid: 'student-1', email: 'student@example.com', emailVerified: true },
    profile: {
      uid: 'student-1', studentId: '12345', displayName: 'นักอ่านทดสอบ', firstName: 'นักอ่าน',
      lastName: 'ทดสอบ', className: 'ม.5/1', studentNumber: '14',
    },
    membershipUid: { uid: 'student-1', studentId: '12345', email: 'student@example.com' },
    membership: { uid: 'student-1', studentId: '12345', email: 'student@example.com', status: 'active' },
    currentTermId: '2569-1',
    term: { id: '2569-1', status: 'active' },
    ...overrides,
  }
}

describe('pending loan request authorization', () => {
  it('accepts an active verified Google member', () => {
    expect(validateLoanRequestAccess(activeContext())).toMatchObject({ termId: '2569-1' })
  })

  it('rejects a missing membership', () => {
    expect(() => validateLoanRequestAccess(activeContext({ membership: null }))).toThrow('ข้อมูลสมาชิก')
  })

  it('rejects a suspended member', () => {
    expect(() => validateLoanRequestAccess(activeContext({
      membership: { uid: 'student-1', studentId: '12345', email: 'student@example.com', status: 'suspended' },
    }))).toThrow('ไม่ได้อยู่ในสถานะใช้งาน')
  })

  it('rejects a missing current term', () => {
    expect(() => validateLoanRequestAccess(activeContext({ currentTermId: '', term: null }))).toThrow('ภาคเรียนปัจจุบัน')
  })

  it('rejects a closed term', () => {
    expect(() => validateLoanRequestAccess(activeContext({ term: { id: '2569-1', status: 'closed' } }))).toThrow('ไม่ได้อยู่ในสถานะใช้งาน')
  })

  it.each([
    ['profile UID', { profile: { ...activeContext().profile!, uid: 'other' } }],
    ['membership studentId', { membership: { ...activeContext().membership!, studentId: '99999' } }],
    ['UID lock studentId', { membershipUid: { ...activeContext().membershipUid!, studentId: '99999' } }],
  ])('rejects mismatched %s', (_, mismatch) => {
    expect(() => validateLoanRequestAccess(activeContext(mismatch))).toThrow()
  })

  it('creates loan, active key and audit in the same transaction', () => {
    expect(service).toContain('transaction.set(loanRef')
    expect(service).toContain('transaction.set(activeRef')
    expect(service).toContain('transaction.set(auditRef')
    expect(rules).toContain('existsAfter(keyPath)')
    expect(service).toContain("doc(firestore, 'loanAuditLogs', loanRef.id)")
    expect(rules).toContain('request.resource.data.lastAuditId == loanId')
  })

  it('never creates a book lock for pending and Rules require it to remain absent', () => {
    const requestBlock = service.slice(service.indexOf('export async function requestLoanRemote'), service.indexOf('export async function cancelLoanRemote'))
    expect(requestBlock).not.toContain('transaction.set(lockRef')
    expect(rules).toContain('&& !existsAfter(lockPath)')
  })

  it('rejects duplicate active requests', () => {
    expect(() => assertLoanRequestAvailable(true, false)).toThrow('คำขอยืมหนังสือเล่มนี้อยู่แล้ว')
  })

  it('keeps the existing approve, pickup, renew and return transitions', () => {
    expect(planLoanTransition('pending', 'approved').status).toBe('approved')
    expect(planLoanTransition('approved', 'borrowed').status).toBe('borrowed')
    expect(planLoanTransition('borrowed', 'returned').status).toBe('returned')
    expect(service).toContain("'renew', loan.id")
  })

  it('uses authoritative profile, term and book snapshots and avoids the pending getAfter cycle', () => {
    expect(service).toContain('user.getIdTokenResult(true)')
    expect(service).toContain('transaction.get(currentTermRef)')
    expect(service).toContain('transaction.get(profileRef)')
    expect(service).toContain('const currentBook = bookSnapshot.data()')
    const keyCreate = rules.slice(rules.indexOf('match /studentLoanActiveKeys'), rules.indexOf('allow update: if isAdmin()', rules.indexOf('match /studentLoanActiveKeys')))
    expect(keyCreate).toContain('request.resource.data.lastAuditId == request.resource.data.loanId')
    expect(keyCreate).not.toContain('activeKeyMatchesLoan()')
    const auditCreate = rules.slice(rules.indexOf('function validLoanAuditCreate'), rules.indexOf('match /loanAuditLogs'))
    expect(auditCreate).not.toContain('getAfter(loanPath)')
    expect(auditCreate).not.toContain('adminLoanAuditMatches')
    expect(auditCreate).toContain('studentAction || adminAction')
    expect(auditCreate).toContain("auditId == request.resource.data.loanId")
  })

  it('uses an in-app confirmation dialog instead of the browser confirm popup', () => {
    expect(detailPage).toContain('<ConfirmationDialog')
    expect(detailPage).not.toContain('window.confirm')
    expect(loanListPage).toContain('<ConfirmationDialog')
    expect(loanListPage).not.toContain('window.confirm')
    expect(loanListPage).toContain('ยืนยันยกเลิก')
  })
})
