import {
  collection,
  doc,
  documentId,
  getDocFromServer,
  getDocsFromServer,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import type { MembershipStatus, StudentMembership } from '../types'
import { getAdminFirebaseContext, getVerifiedAdminFirebaseContext } from './adminAuth'

export interface AdminStudentMember extends StudentMembership {
  firstName: string
  lastName: string
  displayName: string
  className: string
  studentNumber: string
  lifetimeReadCount: number
  currentTermReadCount: number
  activeLoanCount: number
}

function asIso(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  return typeof value === 'string' ? value : new Date(0).toISOString()
}

function chunks<T>(items: T[], size = 30) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

async function docsByIds(collectionName: string, ids: string[]) {
  const { firestore } = getAdminFirebaseContext()
  const entries = await Promise.all(chunks([...new Set(ids.filter(Boolean))]).map(async (idsChunk) => {
    if (!idsChunk.length) return []
    const snapshot = await getDocsFromServer(query(
      collection(firestore, collectionName),
      where(documentId(), 'in', idsChunk),
    ))
    return snapshot.docs
  }))
  return new Map(entries.flat().map((item) => [item.id, item.data()]))
}

function membershipFrom(snapshot: QueryDocumentSnapshot<DocumentData>): StudentMembership {
  const data = snapshot.data()
  return {
    studentId: snapshot.id,
    uid: String(data.uid ?? ''),
    email: String(data.email ?? ''),
    status: ['active', 'suspended', 'graduated', 'transferred'].includes(String(data.status))
      ? data.status as MembershipStatus
      : 'suspended',
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  }
}

export async function loadAdminStudentMembers(): Promise<AdminStudentMember[]> {
  const { firestore } = getAdminFirebaseContext()
  const membershipSnapshot = await getDocsFromServer(query(
    collection(firestore, 'studentMemberships'),
    orderBy('createdAt', 'desc'),
  ))
  const memberships = membershipSnapshot.docs.map(membershipFrom)
  const currentTermSnapshot = await getDocFromServer(doc(firestore, 'settings', 'currentTerm'))
  const termId = String(currentTermSnapshot.data()?.termId ?? '')
  const uids = memberships.map((item) => item.uid)
  const [profiles, stats, progress, activeLoansSnapshot] = await Promise.all([
    docsByIds('profiles', uids),
    docsByIds('readerStats', uids),
    docsByIds('progress', termId ? uids.map((uid) => `${termId}_${uid}`) : []),
    getDocsFromServer(query(collection(firestore, 'loans'), where('status', 'in', ['pending', 'approved', 'borrowed']))),
  ])
  const activeLoanCounts = new Map<string, number>()
  activeLoansSnapshot.forEach((item) => {
    const uid = String(item.data().uid ?? '')
    activeLoanCounts.set(uid, (activeLoanCounts.get(uid) ?? 0) + 1)
  })
  return memberships.map((membership) => {
    const profile = profiles.get(membership.uid) ?? {}
    const readerStats = stats.get(membership.uid) ?? {}
    const currentProgress = progress.get(`${termId}_${membership.uid}`) ?? {}
    return {
      ...membership,
      firstName: String(profile.firstName ?? ''),
      lastName: String(profile.lastName ?? ''),
      displayName: String(profile.displayName ?? ''),
      className: String(profile.className ?? ''),
      studentNumber: String(profile.studentNumber ?? ''),
      lifetimeReadCount: Math.max(0, Number(readerStats.lifetimeReadCount ?? 0)),
      currentTermReadCount: Math.max(0, Number(currentProgress.readCount ?? 0)),
      activeLoanCount: activeLoanCounts.get(membership.uid) ?? 0,
    }
  })
}

export async function updateMembershipStatusAsAdmin(studentId: string, status: MembershipStatus) {
  const { firestore } = await getVerifiedAdminFirebaseContext()
  const membershipRef = doc(firestore, 'studentMemberships', studentId)
  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(membershipRef)
    if (!snapshot.exists()) throw new Error('ไม่พบสมาชิกนักเรียน')
    if (snapshot.data().status === status) return false
    transaction.update(membershipRef, { status, updatedAt: serverTimestamp() })
    return true
  })
}
