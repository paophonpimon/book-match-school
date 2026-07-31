import {
  collection,
  doc,
  getDocsFromServer,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import type { AcademicTerm, BookStatus, LoanStatus, Reader } from '../types'
import { buildTermReport, type TermReport, type TermReportLoan, type TermReportUserBook } from '../utils/termReports'
import { getAdminFirebaseContext, getVerifiedAdminFirebaseContext } from './adminAuth'

export interface NewAcademicTerm {
  id: string
  name: string
  academicYear: number
  semester: 1 | 2
  startDate: string
  endDate: string
}

function asIso(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  return typeof value === 'string' ? value : new Date(0).toISOString()
}

export async function listTermsAsAdmin(): Promise<AcademicTerm[]> {
  const { firestore } = getAdminFirebaseContext()
  const snapshot = await getDocsFromServer(query(collection(firestore, 'terms'), orderBy('academicYear', 'desc')))
  return snapshot.docs.map((item) => {
    const data = item.data()
    return {
      id: item.id,
      name: String(data.name ?? item.id),
      academicYear: Number(data.academicYear ?? 0),
      semester: Number(data.semester) === 2 ? 2 : 1,
      startDate: asIso(data.startDate),
      endDate: asIso(data.endDate),
      status: ['draft', 'active', 'closed'].includes(String(data.status))
        ? data.status as AcademicTerm['status']
        : 'draft',
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt),
      createdBy: String(data.createdBy ?? ''),
      updatedBy: String(data.updatedBy ?? ''),
    }
  })
}

function validateNewTerm(term: NewAcademicTerm) {
  if (!/^[0-9]{4}-(1|2)$/.test(term.id)) return 'รหัสภาคเรียนต้องอยู่ในรูป 2569-1 หรือ 2569-2'
  if (!term.name.trim()) return 'กรุณาระบุชื่อภาคเรียน'
  if (!Number.isInteger(term.academicYear) || term.academicYear < 2500 || term.academicYear > 9999) return 'ปีการศึกษาไม่ถูกต้อง'
  if (![1, 2].includes(term.semester)) return 'ภาคเรียนต้องเป็น 1 หรือ 2'
  const startDate = new Date(term.startDate)
  const endDate = new Date(term.endDate)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return 'ช่วงวันที่ภาคเรียนไม่ถูกต้อง'
  return ''
}

export async function createTermAsAdmin(term: NewAcademicTerm) {
  const validationError = validateNewTerm(term)
  if (validationError) throw new Error(validationError)
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const termRef = doc(firestore, 'terms', term.id)
  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(termRef)
    if (snapshot.exists()) throw new Error('รหัสภาคเรียนนี้มีอยู่แล้ว')
    transaction.set(termRef, {
      name: term.name.trim(),
      academicYear: term.academicYear,
      semester: term.semester,
      startDate: Timestamp.fromDate(new Date(term.startDate)),
      endDate: Timestamp.fromDate(new Date(term.endDate)),
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.uid,
      updatedBy: user.uid,
    })
    return term.id
  })
}

export async function activateTermAsAdmin(termId: string) {
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const activeSnapshot = await getDocsFromServer(query(collection(firestore, 'terms'), where('status', '==', 'active')))
  const selectedRef = doc(firestore, 'terms', termId)
  const settingsRef = doc(firestore, 'settings', 'currentTerm')
  const activeRefs = activeSnapshot.docs.filter((item) => item.id !== termId).map((item) => item.ref)
  return runTransaction(firestore, async (transaction) => {
    const [selectedSnapshot] = await Promise.all([
      transaction.get(selectedRef),
      ...activeRefs.map((reference) => transaction.get(reference)),
    ])
    if (!selectedSnapshot.exists()) throw new Error('ไม่พบภาคเรียนที่เลือก')
    const timestamp = serverTimestamp()
    activeRefs.forEach((reference) => transaction.update(reference, {
      status: 'closed',
      updatedAt: timestamp,
      updatedBy: user.uid,
    }))
    transaction.update(selectedRef, {
      status: 'active',
      updatedAt: timestamp,
      updatedBy: user.uid,
    })
    transaction.set(settingsRef, {
      termId,
      updatedAt: timestamp,
      updatedBy: user.uid,
    })
    return true
  })
}

export async function closeTermAsAdmin(termId: string) {
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const termRef = doc(firestore, 'terms', termId)
  const settingsRef = doc(firestore, 'settings', 'currentTerm')
  return runTransaction(firestore, async (transaction) => {
    const [termSnapshot, settingsSnapshot] = await Promise.all([
      transaction.get(termRef),
      transaction.get(settingsRef),
    ])
    if (!termSnapshot.exists()) throw new Error('ไม่พบภาคเรียนที่เลือก')
    if (termSnapshot.data().status !== 'active') throw new Error('ปิดได้เฉพาะภาคเรียนที่กำลังใช้งาน')
    if (!settingsSnapshot.exists() || settingsSnapshot.data().termId !== termId) {
      throw new Error('ภาคเรียนปัจจุบันใน settings ไม่ตรงกับภาคเรียนที่เลือก')
    }
    transaction.update(termRef, {
      status: 'closed',
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    })
    transaction.delete(settingsRef)
    return true
  })
}

export async function deleteDraftTermAsAdmin(termId: string) {
  const { firestore } = await getVerifiedAdminFirebaseContext()
  const termRef = doc(firestore, 'terms', termId)
  const settingsRef = doc(firestore, 'settings', 'currentTerm')
  return runTransaction(firestore, async (transaction) => {
    const [termSnapshot, settingsSnapshot] = await Promise.all([
      transaction.get(termRef),
      transaction.get(settingsRef),
    ])
    if (!termSnapshot.exists()) return false
    if (termSnapshot.data().status !== 'draft') {
      throw new Error('ลบได้เฉพาะภาคเรียนร่างที่ยังไม่เคยเปิดใช้งาน')
    }
    if (settingsSnapshot.data()?.termId === termId) {
      throw new Error('ไม่สามารถลบภาคเรียนปัจจุบัน')
    }
    transaction.delete(termRef)
    return true
  })
}

function isBookStatus(value: unknown): value is BookStatus {
  return ['liked', 'saved', 'reading', 'read'].includes(String(value))
}

function isLoanStatus(value: unknown): value is LoanStatus {
  return ['pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled'].includes(String(value))
}

export async function loadTermReportAsAdmin(term: AcademicTerm): Promise<TermReport> {
  const { firestore } = await getVerifiedAdminFirebaseContext()
  const [progressSnapshot, userBooksSnapshot, loansSnapshot] = await Promise.all([
    getDocsFromServer(query(collection(firestore, 'progress'), where('termId', '==', term.id))),
    getDocsFromServer(query(collection(firestore, 'userBooks'), where('termId', '==', term.id))),
    getDocsFromServer(query(collection(firestore, 'loans'), where('termId', '==', term.id))),
  ])
  const readers: Reader[] = progressSnapshot.docs.map((item) => {
    const data = item.data()
    return {
      uid: String(data.uid ?? ''),
      displayName: String(data.displayName ?? ''),
      className: String(data.className ?? ''),
      readCount: Math.max(0, Number(data.readCount ?? 0)),
      likedCount: Math.max(0, Number(data.likedCount ?? 0)),
      eligible: data.eligible !== false,
      lastReadAt: data.lastReadAt ? asIso(data.lastReadAt) : null,
    }
  })
  const userBooks: TermReportUserBook[] = userBooksSnapshot.docs.flatMap((item) => {
    const data = item.data()
    if (!isBookStatus(data.status)) return []
    return [{
      uid: String(data.uid ?? ''),
      status: data.status,
      rating: typeof data.rating === 'number' ? data.rating : null,
      review: typeof data.review === 'string' ? data.review : null,
    }]
  })
  const loans: TermReportLoan[] = loansSnapshot.docs.flatMap((item) => {
    const data = item.data()
    if (!isLoanStatus(data.status)) return []
    return [{ uid: String(data.uid ?? ''), status: data.status }]
  })
  return buildTermReport(term, readers, userBooks, loans)
}
