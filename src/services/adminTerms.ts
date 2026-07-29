import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import type { AcademicTerm } from '../types'
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
  const snapshot = await getDocs(query(collection(firestore, 'terms'), orderBy('academicYear', 'desc')))
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
  const activeSnapshot = await getDocs(query(collection(firestore, 'terms'), where('status', '==', 'active')))
  const selectedRef = doc(firestore, 'terms', termId)
  const settingsRef = doc(firestore, 'settings', 'currentTerm')
  const activeRefs = activeSnapshot.docs.filter((item) => item.id !== termId).map((item) => item.ref)
  return runTransaction(firestore, async (transaction) => {
    const [selectedSnapshot] = await Promise.all([
      transaction.get(selectedRef),
      ...activeRefs.map((reference) => transaction.get(reference)),
    ])
    if (!selectedSnapshot.exists()) throw new Error('ไม่พบภาคเรียนที่เลือก')
    if (selectedSnapshot.data().status === 'closed') throw new Error('ไม่สามารถเปิดใช้ภาคเรียนที่ปิดแล้ว')
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
