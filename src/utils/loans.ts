import type { BookLoanLock, Loan, LoanStatus, MembershipStatus, TermStatus } from '../types'

export const DEFAULT_LOAN_DAYS = 7
export const MAX_LOAN_DAYS = 30
export const MAX_RENEW_COUNT = 1
export const DAY_MS = 24 * 60 * 60 * 1000

export const activeLoanStatuses: readonly LoanStatus[] = ['pending', 'approved', 'borrowed']

const allowedTransitions: Record<LoanStatus, readonly LoanStatus[]> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['borrowed', 'rejected'],
  borrowed: ['returned'],
  returned: [],
  rejected: [],
  cancelled: [],
}

export function isActiveLoanStatus(status: LoanStatus) {
  return activeLoanStatuses.includes(status)
}

export function canTransitionLoan(from: LoanStatus, to: LoanStatus) {
  return allowedTransitions[from].includes(to)
}

export function planLoanTransition(from: LoanStatus, to: LoanStatus) {
  if (from === to) return { changed: false, status: from }
  if (!canTransitionLoan(from, to)) {
    throw new Error(`ไม่อนุญาตให้เปลี่ยนสถานะการยืมจาก ${from} เป็น ${to}`)
  }
  return { changed: true, status: to }
}

export function canStudentChangeLoan(from: LoanStatus, to: LoanStatus) {
  return from === 'pending' && to === 'cancelled'
}

export function canStudentReadLoan(viewerUid: string, loanUid: string) {
  return Boolean(viewerUid) && viewerUid === loanUid
}

export function assertLoanRequestAvailable(hasActiveKey: boolean, hasBookLock: boolean) {
  if (hasActiveKey) throw new Error('คุณมีคำขอยืมหนังสือเล่มนี้อยู่แล้ว')
  if (hasBookLock) throw new Error('หนังสือเล่มนี้มีผู้ยืมหรือกำลังรอรับแล้ว')
}

export interface LoanRequestAccessContext {
  auth: { uid: string; email: string | null; emailVerified: boolean }
  profile: {
    uid: string
    studentId: string
    displayName: string
    firstName: string
    lastName: string
    className: string
    studentNumber: string
  } | null
  membershipUid: { uid: string; studentId: string; email: string } | null
  membership: { uid: string; studentId: string; email: string; status: MembershipStatus } | null
  currentTermId: string
  term: { id: string; status: TermStatus } | null
}

export function validateLoanRequestAccess(context: LoanRequestAccessContext) {
  const email = context.auth.email?.trim().toLocaleLowerCase('en-US') ?? ''
  if (!email || !context.auth.emailVerified) throw new Error('บัญชี Google ต้องมีอีเมลที่ยืนยันแล้ว')
  if (!context.profile || context.profile.uid !== context.auth.uid) throw new Error('ไม่พบโปรไฟล์ของบัญชีนี้')
  if (!context.profile.studentId) throw new Error('โปรไฟล์ยังไม่มีเลขประจำตัวนักเรียน')
  if (!context.membershipUid
    || context.membershipUid.uid !== context.auth.uid
    || context.membershipUid.studentId !== context.profile.studentId
    || context.membershipUid.email.toLocaleLowerCase('en-US') !== email) {
    throw new Error('ข้อมูลผูกบัญชีกับเลขประจำตัวนักเรียนไม่ตรงกัน')
  }
  if (!context.membership
    || context.membership.uid !== context.auth.uid
    || context.membership.studentId !== context.profile.studentId
    || context.membership.email.toLocaleLowerCase('en-US') !== email) {
    throw new Error('ข้อมูลสมาชิกและโปรไฟล์ไม่ตรงกัน')
  }
  if (context.membership.status !== 'active') throw new Error('บัญชีสมาชิกไม่ได้อยู่ในสถานะใช้งาน กรุณาติดต่อผู้ดูแล')
  if (!context.currentTermId || !context.term || context.term.id !== context.currentTermId) {
    throw new Error('ยังไม่ได้ตั้งค่าภาคเรียนปัจจุบัน')
  }
  if (context.term.status !== 'active') throw new Error('ภาคเรียนปัจจุบันไม่ได้อยู่ในสถานะใช้งาน')
  return { profile: context.profile, termId: context.currentTermId }
}

export type LoanLockState = { loanId: string; status: 'approved' | 'borrowed' } | null

export function planApproveLock(lock: LoanLockState, loanId: string): LoanLockState {
  if (!lock) return { loanId, status: 'approved' }
  if (lock.loanId === loanId && lock.status === 'approved') return lock
  throw new Error('หนังสือเล่มนี้ถูกอนุมัติให้คำขออื่นแล้ว')
}

export function planBorrowLock(lock: LoanLockState, loanId: string): LoanLockState {
  if (lock?.loanId === loanId && lock.status === 'borrowed') return lock
  if (lock?.loanId === loanId && lock.status === 'approved') return { loanId, status: 'borrowed' }
  throw new Error('Loan lock ไม่พร้อมยืนยันการรับหนังสือ')
}

export function planReleaseLock(lock: LoanLockState, loanId: string) {
  if (!lock) return null
  if (lock.loanId !== loanId) throw new Error('Loan lock ไม่ตรงกับรายการยืม')
  return null
}

export function normalizeLoanDays(value: number, fallback = DEFAULT_LOAN_DAYS) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(MAX_LOAN_DAYS, Math.trunc(value)))
}

export function calculateDueAt(start: Date | number | string, loanDays: number) {
  const startTime = start instanceof Date ? start.getTime() : typeof start === 'number' ? start : new Date(start).getTime()
  if (!Number.isFinite(startTime)) throw new Error('วันที่เริ่มยืมไม่ถูกต้อง')
  return new Date(startTime + normalizeLoanDays(loanDays) * DAY_MS)
}

export function isLoanOverdue(loan: Pick<Loan, 'status' | 'dueAt'>, now = Date.now()) {
  if (loan.status !== 'borrowed' || !loan.dueAt) return false
  const dueTime = new Date(loan.dueAt).getTime()
  return Number.isFinite(dueTime) && dueTime < now
}

export function overdueLoanDays(loan: Pick<Loan, 'status' | 'dueAt'>, now = Date.now()) {
  if (!isLoanOverdue(loan, now) || !loan.dueAt) return 0
  return Math.max(1, Math.ceil((now - new Date(loan.dueAt).getTime()) / DAY_MS))
}

export function formatThaiLoanDate(value: string | null, includeTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

export function loanStatusLabel(status: LoanStatus) {
  return ({
    pending: 'รอการอนุมัติ',
    approved: 'อนุมัติแล้ว รอรับหนังสือ',
    borrowed: 'กำลังยืม',
    returned: 'คืนหนังสือแล้ว',
    rejected: 'ไม่อนุมัติ',
    cancelled: 'ยกเลิกคำขอ',
  } satisfies Record<LoanStatus, string>)[status]
}

export function activeLoanForBook(loans: Loan[], bookId: string) {
  return loans
    .filter((loan) => loan.bookId === bookId && isActiveLoanStatus(loan.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
}

export function latestLoanForBook(loans: Loan[], bookId: string) {
  return loans
    .filter((loan) => loan.bookId === bookId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
}

export function canStartReadingBook(loans: Loan[], bookId: string) {
  return loans.some((loan) => loan.bookId === bookId && loan.status === 'borrowed')
}

export function readingLoanForBook(loans: Loan[], bookId: string) {
  return loans
    .filter((loan) => loan.bookId === bookId
      && loan.borrowedAt
      && (loan.status === 'borrowed' || loan.status === 'returned'))
    .sort((a, b) => new Date(b.borrowedAt!).getTime() - new Date(a.borrowedAt!).getTime())[0] ?? null
}

export function canReviewBook(loans: Loan[], bookId: string) {
  return readingLoanForBook(loans, bookId) !== null
}

export type LoanAvailabilityTone = 'available' | 'pending' | 'approved' | 'borrowed' | 'overdue' | 'unavailable'

export function loanAvailability(
  ownLoan: Loan | null,
  lock: BookLoanLock | undefined,
  now = Date.now(),
): { label: string; tone: LoanAvailabilityTone } {
  if (ownLoan?.status === 'pending') return { label: 'คุณกำลังรออนุมัติ', tone: 'pending' }
  if (ownLoan?.status === 'approved') return { label: 'คุณได้รับอนุมัติแล้ว', tone: 'approved' }
  if (ownLoan?.status === 'borrowed') {
    return isLoanOverdue(ownLoan, now)
      ? { label: 'เกินกำหนดคืน', tone: 'overdue' }
      : { label: 'คุณกำลังยืมเล่มนี้', tone: 'borrowed' }
  }
  if (lock?.status === 'approved') return { label: 'รอรับหนังสือ', tone: 'unavailable' }
  if (lock?.status === 'borrowed') return { label: 'มีผู้ยืมแล้ว', tone: 'unavailable' }
  return { label: 'พร้อมให้ยืม', tone: 'available' }
}

export type AdminLoanBucket = 'pending' | 'approved' | 'borrowed' | 'overdue' | 'returned' | 'closed'

export interface AdminLoanFilter {
  bucket: AdminLoanBucket
  search: string
  classroom: string
  now?: number
}

export function filterAdminLoans(loans: Loan[], filter: AdminLoanFilter) {
  const needle = filter.search.normalize('NFKC').trim().toLocaleLowerCase('th-TH')
  const now = filter.now ?? Date.now()
  return loans.filter((loan) => {
    const matchesBucket = filter.bucket === 'overdue'
      ? isLoanOverdue(loan, now)
      : filter.bucket === 'closed'
        ? ['rejected', 'cancelled'].includes(loan.status)
        : loan.status === filter.bucket
    const haystack = [
      loan.studentDisplayName,
      loan.studentFirstName,
      loan.studentLastName,
      loan.studentId,
      loan.bookTitle,
      loan.bookAuthor,
    ].join(' ').normalize('NFKC').toLocaleLowerCase('th-TH')
    return matchesBucket
      && (!needle || haystack.includes(needle))
      && (!filter.classroom || loan.studentClassroom === filter.classroom)
  }).sort((a, b) => {
    if (filter.bucket === 'pending') return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
    if (filter.bucket === 'borrowed' || filter.bucket === 'overdue') {
      return new Date(a.dueAt ?? '9999-12-31').getTime() - new Date(b.dueAt ?? '9999-12-31').getTime()
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
