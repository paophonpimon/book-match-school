import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Loan, LoanStatus } from '../types'
import { createLoanSnapshotTracker, processLoanSnapshot } from '../utils/loanRealtime'

function loan(id: string, status: LoanStatus): Loan {
  return {
    id,
    uid: 'student-1',
    termId: '2569-1',
    bookId: `book-${id}`,
    status,
    requestedAt: '2026-08-01T00:00:00.000Z',
    approvedAt: status === 'approved' ? '2026-08-02T00:00:00.000Z' : null,
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
    studentDisplayName: 'นักเรียนทดสอบ',
    studentFirstName: 'นักเรียน',
    studentLastName: 'ทดสอบ',
    studentClassroom: 'ม.1/1',
    studentNumber: '1',
    studentId: 'TEST-1',
    bookTitle: `หนังสือ ${id}`,
    bookAuthor: 'ผู้แต่ง',
    bookCoverUrl: '',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    lastAuditId: '',
  }
}

describe('loan realtime snapshot tracking', () => {
  it('does not show false approval toasts for the initial approved records', () => {
    const result = processLoanSnapshot(createLoanSnapshotTracker(), [loan('a', 'approved')])
    expect(result.newlyApproved).toEqual([])
  })

  it('detects pending -> approved once and ignores repeated approved snapshots', () => {
    const initial = processLoanSnapshot(createLoanSnapshotTracker(), [loan('a', 'pending')])
    const approved = processLoanSnapshot(initial.tracker, [loan('a', 'approved')])
    const repeated = processLoanSnapshot(approved.tracker, [loan('a', 'approved')])

    expect(approved.newlyApproved.map((item) => item.id)).toEqual(['a'])
    expect(repeated.newlyApproved).toEqual([])
  })

  it('tracks other student loan status changes without producing approval messages', () => {
    const initial = processLoanSnapshot(createLoanSnapshotTracker(), [loan('a', 'approved')])
    const borrowed = processLoanSnapshot(initial.tracker, [loan('a', 'borrowed')])
    expect(borrowed.tracker.statuses.get('a')).toBe('borrowed')
    expect(borrowed.newlyApproved).toEqual([])
  })
})

describe('Firestore loan subscriptions', () => {
  const service = readFileSync('src/services/loans.ts', 'utf8')
  const context = readFileSync('src/app/AppContext.tsx', 'utf8')
  const admin = readFileSync('src/features/admin/AdminLoanManagement.tsx', 'utf8')

  it('uses the existing student query constraints and returns the onSnapshot unsubscribe', () => {
    expect(service).toContain('export function subscribeStudentLoans')
    expect(service).toContain("where('uid', '==', uid)")
    expect(service).toMatch(/return onSnapshot\(query\(/)
    expect(context).toContain('return unsubscribe')
  })

  it('keeps public book availability and due dates realtime without exposing borrower identity', () => {
    expect(service).toContain('export function subscribeBookLoanLocks')
    expect(service).toContain("collection(firestore, 'bookLoanLocks')")
    expect(service).toContain('dueAt: data.dueAt == null ? null : asIso(data.dueAt)')
    expect(context).toContain('subscribeBookLoanLocks(setBookLoanLocks')
  })

  it('subscribes the Admin list in realtime and cleans up on unmount', () => {
    expect(service).toContain('export function subscribeAdminLoans')
    expect(admin).toContain('subscribeAdminLoans((nextLoans) =>')
    expect(admin).toContain('setLoans(nextLoans)')
    expect(admin).toContain('return unsubscribe')
  })
})
