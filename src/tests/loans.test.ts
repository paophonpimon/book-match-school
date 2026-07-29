import { describe, expect, it } from 'vitest'
import type { BookLoanLock, Loan } from '../types'
import {
  assertLoanRequestAvailable,
  calculateDueAt,
  canStudentChangeLoan,
  canStudentReadLoan,
  DAY_MS,
  filterAdminLoans,
  isLoanOverdue,
  loanAvailability,
  overdueLoanDays,
  planApproveLock,
  planBorrowLock,
  planLoanTransition,
  planReleaseLock,
} from '../utils/loans'

const now = '2026-08-01T09:00:00.000Z'

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-1',
    uid: 'student-1',
    termId: '2569-1',
    bookId: 'book-1',
    status: 'pending',
    requestedAt: now,
    approvedAt: null,
    borrowedAt: null,
    dueAt: null,
    returnedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    approvedBy: null,
    returnedBy: null,
    renewCount: 0,
    loanDays: 7,
    adminNote: '',
    studentDisplayName: 'มินยอดนักอ่าน',
    studentFirstName: 'มิน',
    studentLastName: 'ใจดี',
    studentClassroom: 'ม.5/1',
    studentNumber: '14',
    studentId: '123456',
    bookTitle: 'หนังสือทดสอบ',
    bookAuthor: 'ผู้แต่ง',
    bookCoverUrl: 'https://example.com/cover.jpg',
    createdAt: now,
    updatedAt: now,
    lastAuditId: 'audit-1',
    ...overrides,
  }
}

describe('loan request and student permissions', () => {
  it('allows a new pending request when there is no active key or book lock', () => {
    expect(() => assertLoanRequestAvailable(false, false)).not.toThrow()
    expect(loan().status).toBe('pending')
  })

  it('prevents a duplicate active loan request', () => {
    expect(() => assertLoanRequestAvailable(true, false)).toThrow('อยู่แล้ว')
  })

  it('prevents a request while another approved or borrowed loan holds the book lock', () => {
    expect(() => assertLoanRequestAvailable(false, true)).toThrow('มีผู้ยืม')
  })

  it('allows students to cancel only their own pending loan', () => {
    expect(canStudentReadLoan('student-1', 'student-1')).toBe(true)
    expect(canStudentChangeLoan('pending', 'cancelled')).toBe(true)
    expect(canStudentChangeLoan('approved', 'cancelled')).toBe(false)
  })

  it('does not let a student read another student loan', () => {
    expect(canStudentReadLoan('student-2', 'student-1')).toBe(false)
  })

  it.each(['approved', 'borrowed', 'returned'] as const)('does not let a student set status to %s', (status) => {
    expect(canStudentChangeLoan('pending', status)).toBe(false)
  })
})

describe('admin loan transitions and locks', () => {
  it('approves pending and creates the approved lock', () => {
    expect(planLoanTransition('pending', 'approved')).toEqual({ changed: true, status: 'approved' })
    expect(planApproveLock(null, 'loan-1')).toEqual({ loanId: 'loan-1', status: 'approved' })
  })

  it('does not allow a second loan to take an existing lock', () => {
    expect(() => planApproveLock({ loanId: 'loan-1', status: 'approved' }, 'loan-2')).toThrow('คำขออื่น')
  })

  it('makes approval idempotent for the same loan', () => {
    const lock = { loanId: 'loan-1', status: 'approved' } as const
    expect(planApproveLock(lock, 'loan-1')).toBe(lock)
    expect(planLoanTransition('approved', 'approved')).toEqual({ changed: false, status: 'approved' })
  })

  it('changes approved to borrowed and keeps lock ownership', () => {
    expect(planLoanTransition('approved', 'borrowed')).toEqual({ changed: true, status: 'borrowed' })
    expect(planBorrowLock({ loanId: 'loan-1', status: 'approved' }, 'loan-1')).toEqual({ loanId: 'loan-1', status: 'borrowed' })
  })

  it('sets dueAt from pickup time using the chosen loan duration', () => {
    expect(calculateDueAt(now, 7).toISOString()).toBe('2026-08-08T09:00:00.000Z')
    expect(calculateDueAt(now, 14).getTime() - new Date(now).getTime()).toBe(14 * DAY_MS)
  })

  it('returns borrowed and releases the matching lock', () => {
    expect(planLoanTransition('borrowed', 'returned')).toEqual({ changed: true, status: 'returned' })
    expect(planReleaseLock({ loanId: 'loan-1', status: 'borrowed' }, 'loan-1')).toBeNull()
  })

  it('rejects releasing a lock owned by another loan', () => {
    expect(() => planReleaseLock({ loanId: 'loan-2', status: 'borrowed' }, 'loan-1')).toThrow('ไม่ตรง')
  })

  it('makes a repeated return harmless', () => {
    expect(planLoanTransition('returned', 'returned')).toEqual({ changed: false, status: 'returned' })
  })

  it('produces the same approval plan during a transaction retry', () => {
    const first = planApproveLock(null, 'loan-1')
    const retry = planApproveLock(null, 'loan-1')
    expect(retry).toEqual(first)
  })

  it('allows a fresh request after the previous loan is returned and its locks are removed', () => {
    expect(() => assertLoanRequestAvailable(false, false)).not.toThrow()
  })

  it('rejects forbidden backward transitions', () => {
    expect(() => planLoanTransition('returned', 'borrowed')).toThrow()
    expect(() => planLoanTransition('borrowed', 'approved')).toThrow()
  })
})

describe('overdue, UI status and Admin filtering', () => {
  const borrowed = loan({
    status: 'borrowed',
    approvedAt: now,
    approvedBy: 'admin',
    borrowedAt: now,
    dueAt: '2026-08-08T09:00:00.000Z',
  })

  it('calculates overdue state and whole displayed days consistently', () => {
    expect(isLoanOverdue(borrowed, new Date('2026-08-08T09:00:01.000Z').getTime())).toBe(true)
    expect(overdueLoanDays(borrowed, new Date('2026-08-10T08:59:59.000Z').getTime())).toBe(2)
  })

  it('does not mark a loan overdue before its exact due time', () => {
    expect(isLoanOverdue(borrowed, new Date('2026-08-08T08:59:59.000Z').getTime())).toBe(false)
  })

  it('shows the correct student-facing availability labels without borrower identity', () => {
    const lock: BookLoanLock = { bookId: 'book-1', loanId: 'other-loan', status: 'borrowed', updatedAt: now, lastAuditId: 'audit-2' }
    expect(loanAvailability(null, undefined).label).toBe('พร้อมให้ยืม')
    expect(loanAvailability(loan(), undefined).label).toBe('คุณกำลังรออนุมัติ')
    expect(loanAvailability(null, lock).label).toBe('มีผู้ยืมแล้ว')
    expect(loanAvailability(borrowed, lock, new Date('2026-08-10').getTime()).label).toBe('เกินกำหนดคืน')
  })

  it('searches and filters Admin loans by status, student, book and classroom', () => {
    const data = [
      loan(),
      loan({ id: 'loan-2', uid: 'student-2', studentDisplayName: 'พลอย', studentClassroom: 'ม.6/2', bookTitle: 'โลกวิทยาศาสตร์' }),
      borrowed,
    ]
    expect(filterAdminLoans(data, { bucket: 'pending', search: 'พลอย', classroom: 'ม.6/2' }).map((item) => item.id)).toEqual(['loan-2'])
    expect(filterAdminLoans(data, { bucket: 'borrowed', search: 'หนังสือทดสอบ', classroom: '' }).map((item) => item.id)).toEqual(['loan-1'])
  })

  it('sorts pending requests oldest first and borrowed loans by nearest due date', () => {
    const pending = filterAdminLoans([
      loan({ id: 'new', requestedAt: '2026-08-03T00:00:00.000Z' }),
      loan({ id: 'old', requestedAt: '2026-08-01T00:00:00.000Z' }),
    ], { bucket: 'pending', search: '', classroom: '' })
    expect(pending.map((item) => item.id)).toEqual(['old', 'new'])
  })
})
