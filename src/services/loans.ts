import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Book, BookLoanLock, Loan, LoanAuditAction, LoanStatus, MembershipStatus, Profile, TermStatus } from '../types'
import {
  calculateDueAt,
  DEFAULT_LOAN_DAYS,
  assertLoanRequestAvailable,
  MAX_RENEW_COUNT,
  normalizeLoanDays,
  planLoanTransition,
  validateLoanRequestAccess,
} from '../utils/loans'
import { getAdminFirebaseContext, getVerifiedAdminFirebaseContext } from './adminAuth'
import { currentStudentUser, db } from './firebase'

const ADMIN_LOAN_LIMIT = 300

function requireStudentFirestore() {
  if (!db) throw new Error('Firebase ยังไม่พร้อมใช้งาน')
  return db
}

function asIso(value: unknown, fallback = new Date(0).toISOString()) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  return typeof value === 'string' ? value : fallback
}

function nullableIso(value: unknown) {
  return value == null ? null : asIso(value)
}

function isLoanStatus(value: unknown): value is LoanStatus {
  return ['pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled'].includes(String(value))
}

function membershipStatus(value: unknown): MembershipStatus {
  return ['active', 'suspended', 'graduated', 'transferred'].includes(String(value))
    ? value as MembershipStatus
    : 'suspended'
}

function termStatus(value: unknown): TermStatus {
  return ['draft', 'active', 'closed'].includes(String(value)) ? value as TermStatus : 'draft'
}

function normalizeLoanSnapshot(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Loan {
  const data = snapshot.data()
  if (!data || !isLoanStatus(data.status)) throw new Error(`ข้อมูล Loan ${snapshot.id} ไม่ถูกต้อง`)
  return {
    id: snapshot.id,
    uid: String(data.uid ?? ''),
    termId: String(data.termId ?? ''),
    bookId: String(data.bookId ?? ''),
    status: data.status,
    requestedAt: asIso(data.requestedAt),
    approvedAt: nullableIso(data.approvedAt),
    borrowedAt: nullableIso(data.borrowedAt),
    dueAt: nullableIso(data.dueAt),
    returnedAt: nullableIso(data.returnedAt),
    rejectedAt: nullableIso(data.rejectedAt),
    cancelledAt: nullableIso(data.cancelledAt),
    approvedBy: typeof data.approvedBy === 'string' ? data.approvedBy : null,
    returnedBy: typeof data.returnedBy === 'string' ? data.returnedBy : null,
    renewCount: Number(data.renewCount ?? 0),
    loanDays: Number(data.loanDays ?? DEFAULT_LOAN_DAYS),
    adminNote: String(data.adminNote ?? ''),
    studentDisplayName: String(data.studentDisplayName ?? ''),
    studentFirstName: String(data.studentFirstName ?? ''),
    studentLastName: String(data.studentLastName ?? ''),
    studentClassroom: String(data.studentClassroom ?? ''),
    studentNumber: String(data.studentNumber ?? ''),
    studentId: String(data.studentId ?? ''),
    bookTitle: String(data.bookTitle ?? ''),
    bookAuthor: String(data.bookAuthor ?? ''),
    bookCoverUrl: String(data.bookCoverUrl ?? ''),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
    lastAuditId: String(data.lastAuditId ?? ''),
  }
}

function activeKeyId(uid: string, bookId: string) {
  return `${uid}_${bookId}`
}

function auditPayload(
  action: LoanAuditAction,
  loanId: string,
  bookId: string,
  studentUid: string,
  previousStatus: LoanStatus | null,
  nextStatus: LoanStatus,
  actorUid: string,
  actorEmail: string | null,
  note: string,
) {
  return {
    action,
    loanId,
    bookId,
    studentUid,
    previousStatus,
    nextStatus,
    actorUid,
    actorEmail,
    note: note.trim(),
    createdAt: serverTimestamp(),
  }
}

export async function loadStudentLoans(uid: string) {
  const firestore = requireStudentFirestore()
  const snapshot = await getDocs(query(
    collection(firestore, 'loans'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
  ))
  return snapshot.docs.map(normalizeLoanSnapshot)
}

export function subscribeStudentLoans(
  uid: string,
  onLoans: (loans: Loan[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const firestore = requireStudentFirestore()
  return onSnapshot(query(
    collection(firestore, 'loans'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
  ), (snapshot) => {
    try {
      onLoans(snapshot.docs.map(normalizeLoanSnapshot))
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)))
    }
  }, (error) => onError(error))
}

export async function loadBookLoanLocks() {
  const firestore = requireStudentFirestore()
  const snapshot = await getDocs(collection(firestore, 'bookLoanLocks'))
  return normalizeBookLoanLocks(snapshot.docs)
}

function normalizeBookLoanLocks(items: QueryDocumentSnapshot<DocumentData>[]) {
  const locks: Record<string, BookLoanLock> = {}
  items.forEach((item) => {
    const data = item.data()
    if (!['approved', 'borrowed'].includes(String(data.status))) return
    locks[item.id] = {
      bookId: String(data.bookId ?? item.id),
      loanId: String(data.loanId ?? ''),
      status: data.status as BookLoanLock['status'],
      dueAt: data.dueAt == null ? null : asIso(data.dueAt),
      updatedAt: asIso(data.updatedAt),
      lastAuditId: String(data.lastAuditId ?? ''),
    }
  })
  return locks
}

export function subscribeBookLoanLocks(
  onLocks: (locks: Record<string, BookLoanLock>) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const firestore = requireStudentFirestore()
  return onSnapshot(collection(firestore, 'bookLoanLocks'), (snapshot) => {
    onLocks(normalizeBookLoanLocks(snapshot.docs))
  }, (error) => onError(error))
}

export async function requestLoanRemote(book: Book, profile: Profile, termId: string) {
  const firestore = requireStudentFirestore()
  const user = currentStudentUser()
  if (!user || user.uid !== profile.uid) throw new Error('ไม่พบสิทธิ์ของนักเรียนสำหรับส่งคำขอยืม')
  let tokenSummary: { uid: string; email: string | null; emailVerified: boolean } | null = null
  const loanRef = doc(collection(firestore, 'loans'))
  // A deterministic request-audit id lets Rules prove the relationship without
  // a circular loan -> audit -> loan getAfter() dependency.
  const auditRef = doc(firestore, 'loanAuditLogs', loanRef.id)
  const activeRef = doc(firestore, 'studentLoanActiveKeys', activeKeyId(user.uid, book.id))
  const lockRef = doc(firestore, 'bookLoanLocks', book.id)
  const bookRef = doc(firestore, 'books', book.id)
  const profileRef = doc(firestore, 'profiles', user.uid)
  const membershipUidRef = doc(firestore, 'studentMembershipUids', user.uid)
  const currentTermRef = doc(firestore, 'settings', 'currentTerm')
  try {
    const token = await user.getIdTokenResult(true)
    tokenSummary = {
      uid: user.uid,
      email: user.email?.toLocaleLowerCase('en-US') ?? null,
      emailVerified: token.claims.email_verified === true,
    }
    await runTransaction(firestore, async (transaction) => {
      const [activeSnapshot, lockSnapshot, bookSnapshot, profileSnapshot, membershipUidSnapshot, currentTermSnapshot] = await Promise.all([
        transaction.get(activeRef),
        transaction.get(lockRef),
        transaction.get(bookRef),
        transaction.get(profileRef),
        transaction.get(membershipUidRef),
        transaction.get(currentTermRef),
      ])
      const remoteProfile = profileSnapshot.data()
      const studentId = String(remoteProfile?.studentId ?? '')
      const currentTermId = String(currentTermSnapshot.data()?.termId ?? '')
      const membershipRef = doc(firestore, 'studentMemberships', studentId || '__missing__')
      const termRef = doc(firestore, 'terms', currentTermId || '__missing__')
      const [membershipSnapshot, termSnapshot] = await Promise.all([
        transaction.get(membershipRef),
        transaction.get(termRef),
      ])
      const access = validateLoanRequestAccess({
        auth: tokenSummary!,
        profile: profileSnapshot.exists() ? {
          uid: String(remoteProfile?.uid ?? ''),
          studentId,
          displayName: String(remoteProfile?.displayName ?? ''),
          firstName: String(remoteProfile?.firstName ?? ''),
          lastName: String(remoteProfile?.lastName ?? ''),
          className: String(remoteProfile?.className ?? ''),
          studentNumber: String(remoteProfile?.studentNumber ?? ''),
        } : null,
        membershipUid: membershipUidSnapshot.exists() ? {
          uid: String(membershipUidSnapshot.data().uid ?? ''),
          studentId: String(membershipUidSnapshot.data().studentId ?? ''),
          email: String(membershipUidSnapshot.data().email ?? ''),
        } : null,
        membership: membershipSnapshot.exists() ? {
          uid: String(membershipSnapshot.data().uid ?? ''),
          studentId: String(membershipSnapshot.data().studentId ?? ''),
          email: String(membershipSnapshot.data().email ?? ''),
          status: membershipStatus(membershipSnapshot.data().status),
        } : null,
        currentTermId,
        term: termSnapshot.exists() ? {
          id: termSnapshot.id,
          status: termStatus(termSnapshot.data().status),
        } : null,
      })
      assertLoanRequestAvailable(activeSnapshot.exists(), lockSnapshot.exists())
      if (!bookSnapshot.exists() || bookSnapshot.data().active !== true) throw new Error('หนังสือเล่มนี้ไม่พร้อมให้ยืม')
      const currentBook = bookSnapshot.data()
      const timestamp = serverTimestamp()
      transaction.set(loanRef, {
        id: loanRef.id,
        uid: user.uid,
        termId: access.termId,
        bookId: book.id,
        status: 'pending',
        requestedAt: timestamp,
        approvedAt: null,
        borrowedAt: null,
        dueAt: null,
        returnedAt: null,
        rejectedAt: null,
        cancelledAt: null,
        approvedBy: null,
        returnedBy: null,
        renewCount: 0,
        loanDays: DEFAULT_LOAN_DAYS,
        adminNote: '',
        studentDisplayName: access.profile.displayName,
        studentFirstName: access.profile.firstName,
        studentLastName: access.profile.lastName,
        studentClassroom: access.profile.className,
        studentNumber: access.profile.studentNumber,
        studentId: access.profile.studentId,
        bookTitle: String(currentBook.title ?? ''),
        bookAuthor: String(currentBook.author ?? ''),
        bookCoverUrl: String(currentBook.coverUrl ?? ''),
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAuditId: auditRef.id,
      })
      transaction.set(activeRef, {
        uid: user.uid,
        bookId: book.id,
        loanId: loanRef.id,
        status: 'pending',
        updatedAt: timestamp,
        lastAuditId: auditRef.id,
      })
      transaction.set(auditRef, auditPayload(
        'request', loanRef.id, book.id, user.uid, null, 'pending', user.uid, null, '',
      ))
    })
    return loanRef.id
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown'
    console.error('[Firestore] request-loan failed', {
      code,
      token: tokenSummary,
      expectedTermId: termId,
      paths: {
        profile: profileRef.path,
        membershipUid: membershipUidRef.path,
        currentTerm: currentTermRef.path,
        loan: loanRef.path,
        activeKey: activeRef.path,
        audit: auditRef.path,
        pendingBookLock: lockRef.path,
      },
    })
    throw error
  }
}

export async function cancelLoanRemote(loan: Loan) {
  const firestore = requireStudentFirestore()
  const user = currentStudentUser()
  if (!user || user.uid !== loan.uid) throw new Error('คุณไม่มีสิทธิ์ยกเลิกคำขอนี้')
  const loanRef = doc(firestore, 'loans', loan.id)
  const activeRef = doc(firestore, 'studentLoanActiveKeys', activeKeyId(user.uid, loan.bookId))
  const auditRef = doc(collection(firestore, 'loanAuditLogs'))
  return runTransaction(firestore, async (transaction) => {
    const [loanSnapshot, activeSnapshot] = await Promise.all([
      transaction.get(loanRef),
      transaction.get(activeRef),
    ])
    if (!loanSnapshot.exists()) throw new Error('ไม่พบคำขอยืม')
    const current = normalizeLoanSnapshot(loanSnapshot)
    if (current.status === 'cancelled') return false
    planLoanTransition(current.status, 'cancelled')
    if (!activeSnapshot.exists() || activeSnapshot.data().loanId !== loan.id) {
      throw new Error('ข้อมูลคำขอยืมไม่สอดคล้องกัน กรุณาโหลดใหม่')
    }
    const timestamp = serverTimestamp()
    transaction.update(loanRef, {
      status: 'cancelled',
      cancelledAt: timestamp,
      updatedAt: timestamp,
      lastAuditId: auditRef.id,
    })
    transaction.delete(activeRef)
    transaction.set(auditRef, auditPayload(
      'cancel', loan.id, loan.bookId, user.uid, 'pending', 'cancelled', user.uid, null, '',
    ))
    return true
  })
}

function adminRefs(firestore: Firestore, loan: Loan) {
  return {
    loanRef: doc(firestore, 'loans', loan.id),
    activeRef: doc(firestore, 'studentLoanActiveKeys', activeKeyId(loan.uid, loan.bookId)),
    lockRef: doc(firestore, 'bookLoanLocks', loan.bookId),
    auditRef: doc(collection(firestore, 'loanAuditLogs')),
    notificationRef: doc(firestore, 'studentNotifications', loan.id),
    borrowStatsRef: doc(firestore, 'studentBorrowStats', loan.uid),
  }
}

function logAdminLoanFailure(
  action: 'approve' | 'reject' | 'pickup' | 'renew' | 'return',
  loan: Loan,
  error: unknown,
) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown'
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[Firestore] ${action}-loan failed`, {
    action,
    code,
    message,
    paths: {
      loan: `loans/${loan.id}`,
      activeKey: `studentLoanActiveKeys/${activeKeyId(loan.uid, loan.bookId)}`,
      lock: `bookLoanLocks/${loan.bookId}`,
      auditCollection: 'loanAuditLogs',
      notification: `studentNotifications/${loan.id}`,
      borrowStats: `studentBorrowStats/${loan.uid}`,
    },
  })
}

export async function loadAdminLoans() {
  const { firestore } = getAdminFirebaseContext()
  const snapshot = await getDocsFromServer(query(
    collection(firestore, 'loans'),
    orderBy('requestedAt', 'desc'),
    limit(ADMIN_LOAN_LIMIT),
  ))
  return snapshot.docs.map(normalizeLoanSnapshot)
}

export function subscribeAdminLoans(
  onLoans: (loans: Loan[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { firestore } = getAdminFirebaseContext()
  return onSnapshot(query(
    collection(firestore, 'loans'),
    orderBy('requestedAt', 'desc'),
    limit(ADMIN_LOAN_LIMIT),
  ), (snapshot) => {
    try {
      onLoans(snapshot.docs.map(normalizeLoanSnapshot))
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)))
    }
  }, (error) => onError(error))
}

export async function approveLoanAsAdmin(loan: Loan, loanDays: number, note = '') {
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const refs = adminRefs(firestore, loan)
  const days = normalizeLoanDays(loanDays)
  try {
    return await runTransaction(firestore, async (transaction) => {
      const [loanSnapshot, activeSnapshot, lockSnapshot] = await Promise.all([
        transaction.get(refs.loanRef),
        transaction.get(refs.activeRef),
        transaction.get(refs.lockRef),
      ])
      if (!loanSnapshot.exists()) throw new Error('ไม่พบคำขอยืม')
      const current = normalizeLoanSnapshot(loanSnapshot)
      if (current.status === 'approved' && lockSnapshot.data()?.loanId === loan.id) return false
      planLoanTransition(current.status, 'approved')
      if (!activeSnapshot.exists() || activeSnapshot.data().loanId !== loan.id) throw new Error('Active loan key ไม่ตรงกับคำขอ')
      if (lockSnapshot.exists()) throw new Error('หนังสือเล่มนี้ถูกอนุมัติให้คำขออื่นแล้ว')
      const timestamp = serverTimestamp()
      transaction.update(refs.loanRef, {
        status: 'approved',
        approvedAt: timestamp,
        approvedBy: user.uid,
        loanDays: days,
        adminNote: note.trim(),
        updatedAt: timestamp,
        lastAuditId: refs.auditRef.id,
      })
      transaction.update(refs.activeRef, {
        status: 'approved',
        updatedAt: timestamp,
        lastAuditId: refs.auditRef.id,
      })
      transaction.set(refs.lockRef, {
        bookId: loan.bookId,
        loanId: loan.id,
        status: 'approved',
        dueAt: null,
        updatedAt: timestamp,
        lastAuditId: refs.auditRef.id,
      })
      transaction.set(refs.auditRef, auditPayload(
        'approve', loan.id, loan.bookId, loan.uid, 'pending', 'approved',
        user.uid, user.email?.toLocaleLowerCase('en-US') ?? null, note,
      ))
      transaction.set(refs.notificationRef, {
        uid: loan.uid,
        type: 'loan_approved',
        loanId: loan.id,
        bookId: loan.bookId,
        bookTitle: current.bookTitle,
        createdAt: timestamp,
        readAt: null,
      })
      return true
    })
  } catch (error) {
    logAdminLoanFailure('approve', loan, error)
    throw error
  }
}

export async function rejectLoanAsAdmin(loan: Loan, note: string) {
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const refs = adminRefs(firestore, loan)
  return runTransaction(firestore, async (transaction) => {
    const [loanSnapshot, activeSnapshot, lockSnapshot] = await Promise.all([
      transaction.get(refs.loanRef),
      transaction.get(refs.activeRef),
      transaction.get(refs.lockRef),
    ])
    if (!loanSnapshot.exists()) throw new Error('ไม่พบคำขอยืม')
    const current = normalizeLoanSnapshot(loanSnapshot)
    if (current.status === 'rejected') return false
    planLoanTransition(current.status, 'rejected')
    if (!activeSnapshot.exists() || activeSnapshot.data().loanId !== loan.id) throw new Error('Active loan key ไม่ตรงกับคำขอ')
    if (current.status === 'approved' && (!lockSnapshot.exists() || lockSnapshot.data().loanId !== loan.id)) {
      throw new Error('Loan lock ไม่ตรงกับคำขอที่อนุมัติ')
    }
    const timestamp = serverTimestamp()
    transaction.update(refs.loanRef, {
      status: 'rejected',
      rejectedAt: timestamp,
      adminNote: note.trim(),
      updatedAt: timestamp,
      lastAuditId: refs.auditRef.id,
    })
    transaction.delete(refs.activeRef)
    if (current.status === 'approved') transaction.delete(refs.lockRef)
    transaction.set(refs.auditRef, auditPayload(
      'reject', loan.id, loan.bookId, loan.uid, current.status, 'rejected',
      user.uid, user.email?.toLocaleLowerCase('en-US') ?? null, note,
    ))
    return true
  })
}

export async function pickupLoanAsAdmin(loan: Loan, loanDays: number) {
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const refs = adminRefs(firestore, loan)
  const days = normalizeLoanDays(loanDays)
  return runTransaction(firestore, async (transaction) => {
    const [loanSnapshot, activeSnapshot, lockSnapshot, borrowStatsSnapshot] = await Promise.all([
      transaction.get(refs.loanRef),
      transaction.get(refs.activeRef),
      transaction.get(refs.lockRef),
      transaction.get(refs.borrowStatsRef),
    ])
    if (!loanSnapshot.exists()) throw new Error('ไม่พบคำขอยืม')
    const current = normalizeLoanSnapshot(loanSnapshot)
    if (current.status === 'borrowed' && lockSnapshot.data()?.loanId === loan.id) return false
    planLoanTransition(current.status, 'borrowed')
    if (!activeSnapshot.exists() || activeSnapshot.data().loanId !== loan.id) throw new Error('Active loan key ไม่ตรงกับคำขอ')
    if (!lockSnapshot.exists() || lockSnapshot.data().loanId !== loan.id || lockSnapshot.data().status !== 'approved') {
      throw new Error('Loan lock ไม่พร้อมยืนยันการรับหนังสือ')
    }
    const borrowedAt = Timestamp.now()
    const dueAt = Timestamp.fromDate(calculateDueAt(borrowedAt.toDate(), days))
    const timestamp = serverTimestamp()
    transaction.update(refs.loanRef, {
      status: 'borrowed',
      borrowedAt: timestamp,
      dueAt,
      loanDays: days,
      updatedAt: timestamp,
      lastAuditId: refs.auditRef.id,
    })
    transaction.update(refs.activeRef, {
      status: 'borrowed',
      updatedAt: timestamp,
      lastAuditId: refs.auditRef.id,
    })
    transaction.update(refs.lockRef, {
      status: 'borrowed',
      dueAt,
      updatedAt: timestamp,
      lastAuditId: refs.auditRef.id,
    })
    const borrowStats = borrowStatsSnapshot.data()
    transaction.set(refs.borrowStatsRef, {
      uid: loan.uid,
      legacyBorrowCount: Math.max(0, Number(borrowStats?.legacyBorrowCount ?? 0)),
      legacyBorrowSource: String(borrowStats?.legacyBorrowSource ?? ''),
      legacyBorrowAsOf: String(borrowStats?.legacyBorrowAsOf ?? ''),
      bookMatchBorrowCount: Math.max(0, Number(borrowStats?.bookMatchBorrowCount ?? 0)) + 1,
      updatedAt: timestamp,
    })
    transaction.set(refs.auditRef, auditPayload(
      'pickup', loan.id, loan.bookId, loan.uid, 'approved', 'borrowed',
      user.uid, user.email?.toLocaleLowerCase('en-US') ?? null, '',
    ))
    return true
  })
}

export async function renewLoanAsAdmin(loan: Loan) {
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const refs = adminRefs(firestore, loan)
  return runTransaction(firestore, async (transaction) => {
    const [loanSnapshot, lockSnapshot] = await Promise.all([
      transaction.get(refs.loanRef),
      transaction.get(refs.lockRef),
    ])
    if (!loanSnapshot.exists()) throw new Error('ไม่พบคำขอยืม')
    const current = normalizeLoanSnapshot(loanSnapshot)
    if (current.status !== 'borrowed' || !current.dueAt) throw new Error('ขยายเวลาได้เฉพาะหนังสือที่กำลังยืม')
    if (current.renewCount >= MAX_RENEW_COUNT) throw new Error('รายการนี้ใช้สิทธิ์ขยายเวลาแล้ว')
    if (!lockSnapshot.exists() || lockSnapshot.data().loanId !== loan.id || lockSnapshot.data().status !== 'borrowed') {
      throw new Error('Loan lock ไม่ตรงกับรายการยืม')
    }
    const timestamp = serverTimestamp()
    const dueAt = Timestamp.fromDate(calculateDueAt(current.dueAt, current.loanDays))
    transaction.update(refs.loanRef, {
      dueAt,
      renewCount: current.renewCount + 1,
      updatedAt: timestamp,
      lastAuditId: refs.auditRef.id,
    })
    transaction.update(refs.lockRef, {
      dueAt,
      updatedAt: timestamp,
      lastAuditId: refs.auditRef.id,
    })
    transaction.set(refs.auditRef, auditPayload(
      'renew', loan.id, loan.bookId, loan.uid, 'borrowed', 'borrowed',
      user.uid, user.email?.toLocaleLowerCase('en-US') ?? null, `ขยาย ${current.loanDays} วัน`,
    ))
    return true
  })
}

export async function returnLoanAsAdmin(loan: Loan) {
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const refs = adminRefs(firestore, loan)
  return runTransaction(firestore, async (transaction) => {
    const [loanSnapshot, activeSnapshot, lockSnapshot] = await Promise.all([
      transaction.get(refs.loanRef),
      transaction.get(refs.activeRef),
      transaction.get(refs.lockRef),
    ])
    if (!loanSnapshot.exists()) throw new Error('ไม่พบคำขอยืม')
    const current = normalizeLoanSnapshot(loanSnapshot)
    if (current.status === 'returned') return false
    planLoanTransition(current.status, 'returned')
    if (!activeSnapshot.exists() || activeSnapshot.data().loanId !== loan.id) throw new Error('Active loan key ไม่ตรงกับคำขอ')
    if (!lockSnapshot.exists() || lockSnapshot.data().loanId !== loan.id || lockSnapshot.data().status !== 'borrowed') {
      throw new Error('Loan lock ไม่ตรงกับรายการยืม')
    }
    const timestamp = serverTimestamp()
    transaction.update(refs.loanRef, {
      status: 'returned',
      returnedAt: timestamp,
      returnedBy: user.uid,
      updatedAt: timestamp,
      lastAuditId: refs.auditRef.id,
    })
    transaction.delete(refs.activeRef)
    transaction.delete(refs.lockRef)
    transaction.set(refs.auditRef, auditPayload(
      'return', loan.id, loan.bookId, loan.uid, 'borrowed', 'returned',
      user.uid, user.email?.toLocaleLowerCase('en-US') ?? null, '',
    ))
    return true
  })
}
