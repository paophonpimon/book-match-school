import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  linkWithPopup,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Firestore,
} from 'firebase/firestore'
import type {
  AcademicTerm,
  BookRatingSummary,
  BookReview,
  BookStatus,
  Profile,
  Reader,
  ReaderStats,
  StudentMembership,
  StudentDirectoryEntry,
  UserBook,
} from '../types'
import { normalizeStudentAvatarId } from '../data/avatars'
import { applyCompletion, applyStatusTransition, countersForCurrentStatus, emptyBookCounters, planLikeTransaction, planSavedTransaction, type BookCounters } from '../utils/firestoreCounters'
import { getReaderLevel } from '../utils/readerLevels'
import { studentFirebasePassword, studentInternalEmail, validateStudentIdCredentials } from '../utils/studentAuth'
import { planLifetimeReadCredit } from '../utils/readerStats'
import { env, firebaseConfigured } from './env'
import { bookStatsWriteFields, buildUserBookWritePayload, hasExactFields, progressWriteFields, userBookWriteFields } from './firestorePayloads'

let firebaseApp: FirebaseApp | null = null
let authInstance: Auth | null = null
let firestoreInstance: Firestore | null = null
let initializationError: Error | null = null
let emulatorsConnected = false

if (firebaseConfigured) {
  try {
    firebaseApp = getApps()[0] ?? initializeApp(env.firebase)
    authInstance = getAuth(firebaseApp)
    try {
      firestoreInstance = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      })
    } catch {
      firestoreInstance = getFirestore(firebaseApp)
    }
    if (env.useFirebaseEmulators && !emulatorsConnected) {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true })
      connectFirestoreEmulator(firestoreInstance, '127.0.0.1', 8080)
      emulatorsConnected = true
    }
  } catch (error) {
    initializationError = error instanceof Error ? error : new Error('Firebase initialization failed')
  }
}

export const auth = authInstance
export const db = firestoreInstance

export function getFirebaseRuntimeStatus() {
  return {
    configured: firebaseConfigured,
    available: Boolean(firebaseApp && auth && db && !initializationError),
    error: initializationError,
  }
}

export function subscribeStudentUser(
  callback: (user: User | null) => void,
  onError?: (error: Error) => void,
) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback, (error) => onError?.(error))
}

export function currentStudentUser() {
  return auth?.currentUser ?? null
}

export async function signInStudentWithGoogle() {
  if (!auth) throw new Error('Firebase Authentication ยังไม่พร้อมใช้งาน')
  await setPersistence(auth, browserLocalPersistence)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    if (auth.currentUser?.isAnonymous) {
      return (await linkWithPopup(auth.currentUser, provider)).user
    }
    return (await signInWithPopup(auth, provider)).user
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code.includes('credential-already-in-use') || code.includes('email-already-in-use')) {
      throw new Error('บัญชี Google นี้มีสมาชิกอยู่แล้ว กรุณาออกจากบัญชีชั่วคราวและเข้าสู่ระบบด้วยบัญชี Google เดิม')
    }
    if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
      throw new Error('ยกเลิกการเข้าสู่ระบบด้วย Google แล้ว')
    }
    if (code.includes('popup-blocked') || code.includes('operation-not-supported-in-this-environment')) {
      throw new Error('เบราว์เซอร์ปิดกั้นหน้าต่างเข้าสู่ระบบ กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้แล้วลองอีกครั้ง')
    }
    if (code.includes('web-storage-unsupported') || code.includes('missing-initial-state')) {
      throw new Error('เบราว์เซอร์นี้ปิดกั้นข้อมูลชั่วคราวสำหรับเข้าสู่ระบบ กรุณาเปิดลิงก์ด้วย Chrome หรือ Safari แล้วลองอีกครั้ง')
    }
    throw error
  }
}

export async function signInStudentWithId(studentId: string, password: string) {
  if (!auth) throw new Error('Firebase Authentication ยังไม่พร้อมใช้งาน')
  const normalized = validateStudentIdCredentials(studentId, password)
  await setPersistence(auth, browserLocalPersistence)
  try {
    return (await signInWithEmailAndPassword(auth, studentInternalEmail(normalized), studentFirebasePassword(normalized, password))).user
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code.includes('invalid-credential') || code.includes('user-not-found') || code.includes('wrong-password')) {
      throw new Error('เลขประจำตัวนักเรียนหรือรหัสผ่านไม่ถูกต้อง')
    }
    if (code.includes('user-disabled')) throw new Error('บัญชีนี้ถูกระงับ กรุณาติดต่อบรรณารักษ์')
    if (code.includes('too-many-requests')) throw new Error('ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่')
    throw error
  }
}

export async function updateCurrentStudentPassword(password: string) {
  const user = auth?.currentUser
  if (!user) throw new Error('กรุณาเข้าสู่ระบบอีกครั้ง')
  try {
    await updatePassword(user, password)
  } catch {
    throw new Error('ยังบันทึกรหัสผ่านไม่ได้ กรุณาลองอีกครั้ง')
  }
}

export async function signOutStudentUser() {
  if (!auth) return
  await signOut(auth)
}

function asIso(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString()
  return typeof value === 'string' ? value : new Date().toISOString()
}

function isBookStatus(value: unknown): value is BookStatus {
  return ['liked', 'saved', 'reading', 'read'].includes(String(value))
}

function countersFrom(data: Record<string, unknown> | undefined): BookCounters {
  if (!data) return { ...emptyBookCounters }
  return {
    likeCount: Number(data.likeCount ?? 0),
    saveCount: Number(data.saveCount ?? 0),
    readingCount: Number(data.readingCount ?? 0),
    readCount: Number(data.readCount ?? 0),
    ratingTotal: Number(data.ratingTotal ?? 0),
    ratingCount: Number(data.ratingCount ?? 0),
  }
}

function requireFirestore() {
  if (!db) throw new Error('Firebase ยังไม่พร้อมใช้งาน')
  return db
}

function verifiedStudentUser() {
  const user = auth?.currentUser
  if (!user) throw new Error('กรุณาเข้าสู่ระบบบัญชีนักเรียนก่อน')
  if (!user.email || !user.emailVerified) {
    throw new Error('บัญชีนักเรียนต้องผ่านการยืนยันแล้ว')
  }
  return user
}

function normalizeStudentDirectory(data: Record<string, unknown>): StudentDirectoryEntry {
  return {
    studentId: String(data.studentId ?? ''),
    uid: String(data.uid ?? ''),
    firstName: String(data.firstName ?? ''),
    lastName: String(data.lastName ?? ''),
    className: String(data.className ?? ''),
    gradeLevel: String(data.gradeLevel ?? ''),
    studentNumber: String(data.studentNumber ?? ''),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  }
}

function normalizeMembership(data: Record<string, unknown>): StudentMembership {
  return {
    studentId: String(data.studentId ?? ''),
    uid: String(data.uid ?? ''),
    email: String(data.email ?? ''),
    status: ['active', 'suspended', 'graduated', 'transferred'].includes(String(data.status))
      ? data.status as StudentMembership['status']
      : 'suspended',
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  }
}

function normalizeReaderStats(uid: string, data?: Record<string, unknown>): ReaderStats {
  const lifetimeReadCount = Math.max(0, Number(data?.lifetimeReadCount ?? 0))
  return {
    uid,
    lifetimeReadCount,
    currentLevel: getReaderLevel(lifetimeReadCount).level,
    updatedAt: data?.updatedAt ? asIso(data.updatedAt) : new Date(0).toISOString(),
    lastCreditedUserBookId: typeof data?.lastCreditedUserBookId === 'string'
      ? data.lastCreditedUserBookId
      : null,
  }
}

export async function loadCurrentTermRemote(): Promise<AcademicTerm | null> {
  const firestore = requireFirestore()
  const settingsSnapshot = await getDoc(doc(firestore, 'settings', 'currentTerm'))
  const termId = String(settingsSnapshot.data()?.termId ?? '').trim()
  if (!termId) return null
  const termSnapshot = await getDoc(doc(firestore, 'terms', termId))
  if (!termSnapshot.exists()) throw new Error(`ไม่พบข้อมูลภาคเรียน ${termId}`)
  const data = termSnapshot.data()
  return {
    id: termSnapshot.id,
    name: String(data.name ?? termId),
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
}

export async function saveProfileRemote(profile: Profile, termId: string) {
  const firestore = requireFirestore()
  const user = verifiedStudentUser()
  await user.getIdToken(true)
  if (user.uid !== profile.uid) throw new Error('UID ของโปรไฟล์ไม่ตรงกับบัญชีนักเรียน')
  const profileRef = doc(firestore, 'profiles', profile.uid)
  const progressRef = doc(firestore, 'progress', `${termId}_${profile.uid}`)
  const membershipUidRef = doc(firestore, 'studentMembershipUids', profile.uid)
  let editingExistingProfile = false
  let studentId = profile.studentId?.trim() ?? ''
  try {
    await runTransaction(firestore, async (transaction) => {
      const membershipUidSnapshot = await transaction.get(membershipUidRef)
      if (!membershipUidSnapshot.exists()) {
        throw new Error('บัญชี Google นี้ยังไม่เคยเป็นสมาชิก Book Match กรุณาเข้าสู่ระบบด้วยเลขประจำตัวนักเรียน')
      }
      studentId = String(membershipUidSnapshot.data().studentId ?? '').trim()
      if (!studentId) throw new Error('ไม่พบเลขประจำตัวที่ผูกกับบัญชีนี้')
      const membershipRef = doc(firestore, 'studentMemberships', studentId)
      const directoryRef = doc(firestore, 'studentDirectory', studentId)
      const [profileSnapshot, progressSnapshot, membershipSnapshot, directorySnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(progressRef),
        transaction.get(membershipRef),
        transaction.get(directoryRef),
      ])
      editingExistingProfile = profileSnapshot.exists()
      const previousProfile = profileSnapshot.data()
      if (!membershipSnapshot.exists() || String(membershipSnapshot.data().uid ?? '') !== profile.uid) {
        throw new Error('ข้อมูลสมาชิกไม่สัมพันธ์กับบัญชีนักเรียน กรุณาติดต่อบรรณารักษ์')
      }
      if (membershipSnapshot.data().status !== 'active') throw new Error('บัญชีสมาชิกไม่ได้อยู่ในสถานะใช้งาน')
      if (!editingExistingProfile && !directorySnapshot.exists()) {
        throw new Error('บัญชี Google นี้ยังไม่เปิดรับสมัครสมาชิกใหม่ กรุณาเข้าสู่ระบบด้วยเลขประจำตัวนักเรียน')
      }
      const directory = directorySnapshot.data()
      if (directory && String(directory.uid ?? '') !== profile.uid) {
        throw new Error('ข้อมูลทะเบียนนักเรียนไม่สัมพันธ์กับบัญชีนี้')
      }
      const official = directory ? {
        studentId: String(directory.studentId),
        firstName: String(directory.firstName),
        lastName: String(directory.lastName),
        gradeLevel: String(directory.gradeLevel),
        className: String(directory.className),
        studentNumber: String(directory.studentNumber),
      } : {
        studentId: String(previousProfile?.studentId ?? profile.studentId ?? ''),
        firstName: String(profile.firstName ?? previousProfile?.firstName ?? ''),
        lastName: String(profile.lastName ?? previousProfile?.lastName ?? ''),
        gradeLevel: String(profile.gradeLevel ?? previousProfile?.gradeLevel ?? ''),
        className: profile.className,
        studentNumber: profile.studentNumber,
      }
      const timestamp = serverTimestamp()
      transaction.set(profileRef, {
        uid: profile.uid,
        avatarId: normalizeStudentAvatarId(profile.avatarId),
        displayName: profile.displayName,
        ...official,
        interests: profile.interests,
        createdAt: previousProfile?.createdAt ?? timestamp,
        lastActiveAt: timestamp,
      })
      const progress = progressSnapshot.data()
      transaction.set(progressRef, {
        uid: profile.uid,
        termId,
        avatarId: normalizeStudentAvatarId(profile.avatarId),
        firstName: official.firstName,
        lastName: official.lastName,
        displayName: profile.displayName,
        className: official.className,
        readCount: Number(progress?.readCount ?? 0),
        likedCount: Number(progress?.likedCount ?? 0),
        eligible: progress?.eligible !== false,
        lastReadAt: progress?.lastReadAt ?? null,
        updatedAt: timestamp,
      })
    })
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    console.error('[Firestore] register-student-membership failed', {
      code,
      operation: editingExistingProfile ? 'update-student-profile' : 'activate-provisioned-student',
      paths: [
        `profiles/${profile.uid}`,
        `studentMembershipUids/${profile.uid}`,
        `studentMemberships/${studentId}`,
        `studentDirectory/${studentId}`,
        `progress/${termId}_${profile.uid}`,
      ],
    })
    if (code.includes('permission-denied')) {
      if (editingExistingProfile) {
        throw new Error('แก้ไขโปรไฟล์ไม่สำเร็จ: ระบบ Firestore ยังไม่อนุญาตข้อมูลโปรไฟล์รูปแบบล่าสุด กรุณาติดต่อผู้ดูแลเพื่ออัปเดตกฎความปลอดภัย')
      }
      throw new Error('เปิดใช้งานบัญชีนักเรียนไม่สำเร็จ กรุณาติดต่อบรรณารักษ์')
    }
    throw error
  }
}

export async function loadRemoteStudentState(user: User, termId: string): Promise<{
  profile: Profile | null
  membership: StudentMembership | null
  directory: StudentDirectoryEntry | null
  readerStats: ReaderStats
  userBooks: Record<string, UserBook>
}> {
  const firestore = requireFirestore()
  const [profileSnapshot, membershipUidSnapshot] = await Promise.all([
    getDoc(doc(firestore, 'profiles', user.uid)),
    getDoc(doc(firestore, 'studentMembershipUids', user.uid)),
  ])
  const profileData = profileSnapshot.data()
  const studentId = typeof profileData?.studentId === 'string'
    ? profileData.studentId
    : String(membershipUidSnapshot.data()?.studentId ?? '')
  const [booksSnapshot, membershipSnapshot, directorySnapshot, readerStatsSnapshot] = await Promise.all([
    getDocs(query(collection(firestore, 'userBooks'), where('uid', '==', user.uid))),
    studentId ? getDoc(doc(firestore, 'studentMemberships', studentId)) : Promise.resolve(null),
    studentId ? getDoc(doc(firestore, 'studentDirectory', studentId)) : Promise.resolve(null),
    getDoc(doc(firestore, 'readerStats', user.uid)),
  ])
  const profile: Profile | null = profileData ? {
    uid: user.uid,
    avatarId: normalizeStudentAvatarId(profileData.avatarId),
    displayName: String(profileData.displayName ?? ''),
    className: String(profileData.className ?? ''),
    studentNumber: String(profileData.studentNumber ?? ''),
    studentId: typeof profileData.studentId === 'string' ? profileData.studentId : undefined,
    firstName: typeof profileData.firstName === 'string' ? profileData.firstName : undefined,
    lastName: typeof profileData.lastName === 'string' ? profileData.lastName : undefined,
    gradeLevel: typeof profileData.gradeLevel === 'string' ? profileData.gradeLevel : undefined,
    interests: Array.isArray(profileData.interests) ? profileData.interests.map(String) : [],
    createdAt: asIso(profileData.createdAt),
    lastActiveAt: asIso(profileData.lastActiveAt),
  } : null
  const userBooks: Record<string, UserBook> = {}
  booksSnapshot.forEach((snapshot) => {
    const data = snapshot.data()
    if (String(data.termId) !== termId || !isBookStatus(data.status)) return
    const bookId = String(data.bookId)
    userBooks[bookId] = {
      uid: user.uid,
      termId,
      bookId,
      loanId: typeof data.loanId === 'string' ? data.loanId : null,
      status: data.status,
      rating: typeof data.rating === 'number' ? data.rating : null,
      review: typeof data.review === 'string' ? data.review : null,
      moodAfterReading: typeof data.moodAfterReading === 'string' ? data.moodAfterReading : null,
      favoriteAspect: typeof data.favoriteAspect === 'string' ? data.favoriteAspect : null,
      likedAt: data.likedAt ? asIso(data.likedAt) : null,
      startedAt: data.startedAt ? asIso(data.startedAt) : null,
      readAt: data.readAt ? asIso(data.readAt) : null,
      updatedAt: asIso(data.updatedAt),
      lifetimeReadCredited: data.lifetimeReadCredited === true,
      lifetimeCreditedAt: data.lifetimeCreditedAt ? asIso(data.lifetimeCreditedAt) : null,
    }
  })
  return {
    profile,
    membership: membershipSnapshot?.exists() ? normalizeMembership(membershipSnapshot.data()) : null,
    directory: directorySnapshot?.exists() ? normalizeStudentDirectory(directorySnapshot.data()) : null,
    readerStats: normalizeReaderStats(user.uid, readerStatsSnapshot.data()),
    userBooks,
  }
}

export async function loadReadersRemote(termId: string): Promise<Reader[]> {
  const firestore = requireFirestore()
  const snapshot = await getDocs(query(collection(firestore, 'progress'), where('termId', '==', termId)))
  return snapshot.docs.map((item) => {
    const data = item.data()
    return {
      uid: String(data.uid),
      avatarId: normalizeStudentAvatarId(data.avatarId),
      firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
      lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
      displayName: String(data.displayName ?? ''),
      className: String(data.className ?? ''),
      readCount: Number(data.readCount ?? 0),
      likedCount: Number(data.likedCount ?? 0),
      eligible: data.eligible !== false,
      lastReadAt: data.lastReadAt ? asIso(data.lastReadAt) : null,
    }
  })
}

export async function saveUserBookRemote(userBook: UserBook, profile: Profile) {
  if (userBook.status === 'read') throw new Error('ต้องยืนยันการอ่านผ่าน transaction เท่านั้น')
  if (userBook.status === 'liked') throw new Error('ต้องบันทึกการกดชอบผ่าน like transaction เท่านั้น')
  if (userBook.status === 'saved') throw new Error('ต้องบันทึกการเก็บหนังสือผ่าน save transaction เท่านั้น')
  const firestore = requireFirestore()
  const recordId = `${userBook.termId}_${userBook.uid}_${userBook.bookId}`
  const userBookRef = doc(firestore, 'userBooks', recordId)
  const progressRef = doc(firestore, 'progress', `${userBook.termId}_${userBook.uid}`)
  const statsRef = doc(firestore, 'bookStats', `${userBook.termId}_${userBook.bookId}`)
  await runTransaction(firestore, async (transaction) => {
    const [previousSnapshot, progressSnapshot, statsSnapshot] = await Promise.all([
      transaction.get(userBookRef),
      transaction.get(progressRef),
      transaction.get(statsRef),
    ])
    const previous = previousSnapshot.data()
    const previousStatus = isBookStatus(previous?.status) ? previous.status : undefined
    const nextCounters = statsSnapshot.exists()
      ? applyStatusTransition(countersFrom(statsSnapshot.data()), previousStatus, userBook.status)
      : countersForCurrentStatus(userBook.status, Boolean(previous?.likedAt) || userBook.status === 'liked')
    const progress = progressSnapshot.data()
    transaction.set(userBookRef, buildUserBookWritePayload(userBook, previous, userBook.status, serverTimestamp()))
    transaction.set(progressRef, {
      uid: userBook.uid,
      termId: userBook.termId,
      avatarId: normalizeStudentAvatarId(profile.avatarId),
      firstName: profile.firstName?.trim() || profile.displayName,
      lastName: profile.lastName?.trim() || '',
      displayName: profile.displayName,
      className: profile.className,
      readCount: Number(progress?.readCount ?? 0),
      likedCount: Number(progress?.likedCount ?? 0),
      eligible: progress?.eligible !== false,
      lastReadAt: progress?.lastReadAt ?? null,
      updatedAt: serverTimestamp(),
    })
    transaction.set(statsRef, {
      termId: userBook.termId,
      bookId: userBook.bookId,
      ...nextCounters,
      lastUpdatedBy: userBook.uid,
      updatedAt: serverTimestamp(),
    })
  })
}

type BookOperation = 'save-user-book' | 'update-progress-like' | 'update-book-stats-like' | 'update-book-stats-save'

function logBookTransactionFailure(error: unknown, operations: { operation: BookOperation; path: string }[]) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown'
  const message = error instanceof Error ? error.message : String(error)
  operations.forEach(({ operation, path }) => {
    console.error(`[Firestore] ${operation} failed`, { operation, path, code, message })
  })
}

function assertBookPayload(operation: BookOperation, path: string, payload: Record<string, unknown>, fields: readonly string[]) {
  if (hasExactFields(payload, fields)) return
  const error = new Error(`${operation} payload ไม่ตรง schema: ${path}`)
  console.error(`[Firestore] ${operation} failed`, { operation, path, code: 'invalid-payload', message: error.message })
  throw error
}

export async function saveLikedBookRemote(userBook: UserBook, profile: Profile) {
  if (userBook.status !== 'liked') throw new Error('like transaction รองรับเฉพาะสถานะ liked')
  const firestore = requireFirestore()
  const userBookPath = `userBooks/${userBook.termId}_${userBook.uid}_${userBook.bookId}`
  const progressPath = `progress/${userBook.termId}_${userBook.uid}`
  const statsPath = `bookStats/${userBook.termId}_${userBook.bookId}`
  const operations: { operation: BookOperation; path: string }[] = [
    { operation: 'save-user-book', path: userBookPath },
    { operation: 'update-progress-like', path: progressPath },
    { operation: 'update-book-stats-like', path: statsPath },
  ]
  const userBookRef = doc(firestore, userBookPath)
  const progressRef = doc(firestore, progressPath)
  const statsRef = doc(firestore, statsPath)
  try {
    return await runTransaction(firestore, async (transaction) => {
      const [previousSnapshot, progressSnapshot, statsSnapshot] = await Promise.all([
        transaction.get(userBookRef), transaction.get(progressRef), transaction.get(statsRef),
      ])
      const previous = previousSnapshot.data()
      const previousStatus = isBookStatus(previous?.status) ? previous.status : undefined
      const progress = progressSnapshot.data()
      const plan = planLikeTransaction(Number(progress?.likedCount ?? 0), countersFrom(statsSnapshot.data()), previousStatus)
      const nextCounters = statsSnapshot.exists()
        ? plan.counters
        : countersForCurrentStatus(plan.status, Boolean(previous?.likedAt) || plan.status === 'liked', typeof previous?.rating === 'number' ? previous.rating : null)
      const timestamp = serverTimestamp()
      const userBookPayload = buildUserBookWritePayload(userBook, previous, plan.status, timestamp)
      const progressPayload = {
        uid: userBook.uid,
        termId: userBook.termId,
        avatarId: normalizeStudentAvatarId(profile.avatarId),
        firstName: profile.firstName?.trim() || profile.displayName,
        lastName: profile.lastName?.trim() || '',
        displayName: profile.displayName,
        className: profile.className,
        readCount: Number(progress?.readCount ?? 0),
        likedCount: plan.progressLikedCount,
        eligible: progress?.eligible !== false,
        lastReadAt: progress?.lastReadAt ?? null,
        updatedAt: timestamp,
      }
      const statsPayload = {
        termId: userBook.termId,
        bookId: userBook.bookId,
        ...nextCounters,
        lastUpdatedBy: userBook.uid,
        updatedAt: timestamp,
      }
      assertBookPayload('save-user-book', userBookPath, userBookPayload, userBookWriteFields)
      assertBookPayload('update-progress-like', progressPath, progressPayload, progressWriteFields)
      assertBookPayload('update-book-stats-like', statsPath, statsPayload, bookStatsWriteFields)
      transaction.set(userBookRef, userBookPayload)
      transaction.set(progressRef, progressPayload)
      transaction.set(statsRef, statsPayload)
      return { status: plan.status, counted: plan.counted }
    })
  } catch (error) {
    logBookTransactionFailure(error, operations)
    throw error
  }
}

export async function saveSavedBookRemote(userBook: UserBook) {
  if (userBook.status !== 'saved') throw new Error('save transaction รองรับเฉพาะสถานะ saved')
  const firestore = requireFirestore()
  const userBookPath = `userBooks/${userBook.termId}_${userBook.uid}_${userBook.bookId}`
  const statsPath = `bookStats/${userBook.termId}_${userBook.bookId}`
  const operations: { operation: BookOperation; path: string }[] = [
    { operation: 'save-user-book', path: userBookPath },
    { operation: 'update-book-stats-save', path: statsPath },
  ]
  const userBookRef = doc(firestore, userBookPath)
  const statsRef = doc(firestore, statsPath)
  try {
    return await runTransaction(firestore, async (transaction) => {
      const [previousSnapshot, statsSnapshot] = await Promise.all([
        transaction.get(userBookRef), transaction.get(statsRef),
      ])
      const previous = previousSnapshot.data()
      const previousStatus = isBookStatus(previous?.status) ? previous.status : undefined
      const plan = planSavedTransaction(countersFrom(statsSnapshot.data()), previousStatus)
      const nextCounters = statsSnapshot.exists()
        ? plan.counters
        : countersForCurrentStatus(plan.status, Boolean(previous?.likedAt), typeof previous?.rating === 'number' ? previous.rating : null)
      const timestamp = serverTimestamp()
      const userBookPayload = buildUserBookWritePayload(userBook, previous, plan.status, timestamp)
      const statsPayload = {
        termId: userBook.termId,
        bookId: userBook.bookId,
        ...nextCounters,
        lastUpdatedBy: userBook.uid,
        updatedAt: timestamp,
      }
      assertBookPayload('save-user-book', userBookPath, userBookPayload, userBookWriteFields)
      assertBookPayload('update-book-stats-save', statsPath, statsPayload, bookStatsWriteFields)
      transaction.set(userBookRef, userBookPayload)
      transaction.set(statsRef, statsPayload)
      return { status: plan.status, counted: plan.counted }
    })
  } catch (error) {
    logBookTransactionFailure(error, operations)
    throw error
  }
}

export async function deleteUserBookRemote(userBook: UserBook, profile: Profile) {
  const firestore = requireFirestore()
  const userBookRef = doc(firestore, 'userBooks', `${userBook.termId}_${userBook.uid}_${userBook.bookId}`)
  const progressRef = doc(firestore, 'progress', `${userBook.termId}_${userBook.uid}`)
  const statsRef = doc(firestore, 'bookStats', `${userBook.termId}_${userBook.bookId}`)
  await runTransaction(firestore, async (transaction) => {
    const [previousSnapshot, progressSnapshot, statsSnapshot] = await Promise.all([
      transaction.get(userBookRef), transaction.get(progressRef), transaction.get(statsRef),
    ])
    const previous = previousSnapshot.data()
    if (!previousSnapshot.exists() || !isBookStatus(previous?.status)) return
    const nextCounters = applyStatusTransition(countersFrom(statsSnapshot.data()), previous.status, undefined)
    const progress = progressSnapshot.data()
    transaction.delete(userBookRef)
    transaction.set(progressRef, {
      uid: userBook.uid,
      termId: userBook.termId,
      avatarId: normalizeStudentAvatarId(profile.avatarId),
      firstName: profile.firstName?.trim() || profile.displayName,
      lastName: profile.lastName?.trim() || '',
      displayName: profile.displayName,
      className: profile.className,
      readCount: Number(progress?.readCount ?? 0),
      likedCount: Math.max(0, Number(progress?.likedCount ?? 0) - (previous.status === 'liked' ? 1 : 0)),
      eligible: progress?.eligible !== false,
      lastReadAt: progress?.lastReadAt ?? null,
      updatedAt: serverTimestamp(),
    })
    if (statsSnapshot.exists()) {
      transaction.set(statsRef, {
        termId: userBook.termId,
        bookId: userBook.bookId,
        ...nextCounters,
        lastUpdatedBy: userBook.uid,
        updatedAt: serverTimestamp(),
      })
    }
  })
}

export interface CompleteBookResult {
  counted: boolean
  levelUp: boolean
  readerStats: ReaderStats
}

export interface BookReviewSummary {
  reviews: BookReview[]
  ratingAverage: number
  ratingCount: number
}

export async function loadBookRatingsRemote(termId: string): Promise<Record<string, BookRatingSummary>> {
  if (!db || !termId) return {}
  const snapshot = await getDocs(query(collection(db, 'bookStats'), where('termId', '==', termId)))
  return Object.fromEntries(snapshot.docs.flatMap((statsSnapshot) => {
    const data = statsSnapshot.data()
    const bookId = String(data.bookId ?? '')
    const ratingCount = Math.max(0, Number(data.ratingCount ?? 0))
    const ratingTotal = Math.max(0, Number(data.ratingTotal ?? 0))
    if (!bookId || ratingCount <= 0 || ratingTotal <= 0) return []
    return [[bookId, {
      ratingAverage: Math.min(5, ratingTotal / ratingCount),
      ratingCount,
    }]]
  }))
}

export async function loadBookReviewsRemote(termId: string, bookId: string): Promise<BookReviewSummary> {
  if (!db || !termId || !bookId) return { reviews: [], ratingAverage: 0, ratingCount: 0 }
  const [reviewsSnapshot, statsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'bookReviews'), where('bookId', '==', bookId))),
    getDoc(doc(db, 'bookStats', `${termId}_${bookId}`)),
  ])
  const reviews = reviewsSnapshot.docs.map((reviewSnapshot): BookReview | null => {
    const data = reviewSnapshot.data()
    if (data.termId !== termId || data.bookId !== bookId) return null
    const rating = Number(data.rating ?? 0)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof data.review !== 'string') return null
    return {
      id: reviewSnapshot.id,
      uid: String(data.uid ?? ''),
      termId: String(data.termId ?? ''),
      bookId: String(data.bookId ?? ''),
      displayName: String(data.displayName ?? 'นักอ่าน'),
      rating,
      review: data.review,
      moodAfterReading: String(data.moodAfterReading ?? ''),
      favoriteAspect: String(data.favoriteAspect ?? ''),
      readAt: asIso(data.readAt),
      createdAt: asIso(data.createdAt),
    }
  }).filter((review): review is BookReview => review !== null)
    .sort((left, right) => right.readAt.localeCompare(left.readAt))
    .slice(0, 20)
  const stats = statsSnapshot.data()
  const ratingCount = Math.max(0, Number(stats?.ratingCount ?? 0))
  const ratingTotal = Math.max(0, Number(stats?.ratingTotal ?? 0))
  return {
    reviews,
    ratingAverage: ratingCount > 0 ? ratingTotal / ratingCount : 0,
    ratingCount,
  }
}

export async function publishOwnBookReviewRemote(userBook: UserBook, profile: Profile) {
  if (userBook.status !== 'read' || !userBook.rating || !userBook.review) return false
  const firestore = requireFirestore()
  const userBookRef = doc(firestore, 'userBooks', `${userBook.termId}_${userBook.uid}_${userBook.bookId}`)
  const reviewRef = doc(firestore, 'bookReviews', `${userBook.termId}_${userBook.bookId}_${userBook.uid}`)
  return runTransaction(firestore, async (transaction) => {
    const [reviewSnapshot, completedSnapshot] = await Promise.all([
      transaction.get(reviewRef),
      transaction.get(userBookRef),
    ])
    if (reviewSnapshot.exists()) return false
    const completed = completedSnapshot.data()
    if (!completedSnapshot.exists() || completed?.status !== 'read') return false
    transaction.set(reviewRef, {
      uid: userBook.uid,
      termId: userBook.termId,
      bookId: userBook.bookId,
      displayName: profile.displayName,
      rating: completed.rating,
      review: completed.review,
      moodAfterReading: completed.moodAfterReading,
      favoriteAspect: completed.favoriteAspect,
      readAt: completed.readAt,
      createdAt: serverTimestamp(),
    })
    return true
  })
}

export async function completeBookRemote(userBook: UserBook, profile: Profile): Promise<CompleteBookResult> {
  if (!userBook.rating || userBook.rating < 1 || userBook.rating > 5) throw new Error('คะแนนรีวิวไม่ถูกต้อง')
  const review = userBook.review?.trim() ?? ''
  if (review.length < 20 || review.length > 300 || !userBook.moodAfterReading || !userBook.favoriteAspect) throw new Error('ข้อมูลรีวิวไม่ครบถ้วน')
  const firestore = requireFirestore()
  const userBookRef = doc(firestore, 'userBooks', `${userBook.termId}_${userBook.uid}_${userBook.bookId}`)
  const progressRef = doc(firestore, 'progress', `${userBook.termId}_${userBook.uid}`)
  const statsRef = doc(firestore, 'bookStats', `${userBook.termId}_${userBook.bookId}`)
  const readerStatsRef = doc(firestore, 'readerStats', userBook.uid)
  const reviewRef = doc(firestore, 'bookReviews', `${userBook.termId}_${userBook.bookId}_${userBook.uid}`)
  return runTransaction(firestore, async (transaction) => {
    const [previousSnapshot, progressSnapshot, statsSnapshot, readerStatsSnapshot] = await Promise.all([
      transaction.get(userBookRef), transaction.get(progressRef), transaction.get(statsRef),
      transaction.get(readerStatsRef),
    ])
    const previous = previousSnapshot.data()
    const previousStatus = isBookStatus(previous?.status) ? previous.status : undefined
    const previousReaderStats = normalizeReaderStats(userBook.uid, readerStatsSnapshot.data())
    if (previousStatus === 'read' || previous?.lifetimeReadCredited === true) {
      return { counted: false, levelUp: false, readerStats: previousReaderStats }
    }
    if (previousStatus !== 'reading') {
      throw new Error('ต้องเริ่มอ่านหนังสือหลังรับจากห้องสมุดก่อนจึงจะส่งรีวิวได้')
    }
    const progress = progressSnapshot.data()
    const creditPlan = planLifetimeReadCredit(
      previousStatus,
      previous?.lifetimeReadCredited === true,
      previousReaderStats.lifetimeReadCount,
    )
    const nextLifetimeReadCount = creditPlan.lifetimeReadCount
    const nextLevel = creditPlan.currentLevel
    const timestamp = serverTimestamp()
    const userBookRecordId = `${userBook.termId}_${userBook.uid}_${userBook.bookId}`
    const nextCounters = statsSnapshot.exists()
      ? applyCompletion(countersFrom(statsSnapshot.data()), previousStatus, userBook.rating!)
      : countersForCurrentStatus('read', Boolean(previous?.likedAt), userBook.rating!)
    transaction.set(userBookRef, {
      uid: userBook.uid,
      termId: userBook.termId,
      bookId: userBook.bookId,
      loanId: userBook.loanId ?? (typeof previous?.loanId === 'string' ? previous.loanId : null),
      status: 'read',
      rating: userBook.rating,
      review,
      moodAfterReading: userBook.moodAfterReading,
      favoriteAspect: userBook.favoriteAspect,
      likedAt: previous?.likedAt ?? null,
      startedAt: previous?.startedAt ?? null,
      readAt: timestamp,
      updatedAt: timestamp,
      lifetimeReadCredited: true,
      lifetimeCreditedAt: timestamp,
    })
    transaction.set(progressRef, {
      uid: userBook.uid,
      termId: userBook.termId,
      avatarId: normalizeStudentAvatarId(profile.avatarId),
      firstName: profile.firstName?.trim() || profile.displayName,
      lastName: profile.lastName?.trim() || '',
      displayName: profile.displayName,
      className: profile.className,
      readCount: Number(progress?.readCount ?? 0) + 1,
      likedCount: Number(progress?.likedCount ?? 0),
      eligible: progress?.eligible !== false,
      lastReadAt: timestamp,
      updatedAt: timestamp,
    })
    transaction.set(statsRef, {
      termId: userBook.termId,
      bookId: userBook.bookId,
      ...nextCounters,
      lastUpdatedBy: userBook.uid,
      updatedAt: timestamp,
    })
    transaction.set(readerStatsRef, {
      uid: userBook.uid,
      lifetimeReadCount: nextLifetimeReadCount,
      currentLevel: nextLevel,
      updatedAt: timestamp,
      lastCreditedUserBookId: userBookRecordId,
    })
    transaction.set(reviewRef, {
      uid: userBook.uid,
      termId: userBook.termId,
      bookId: userBook.bookId,
      displayName: profile.displayName,
      rating: userBook.rating,
      review,
      moodAfterReading: userBook.moodAfterReading,
      favoriteAspect: userBook.favoriteAspect,
      readAt: timestamp,
      createdAt: timestamp,
    })
    return {
      counted: true,
      levelUp: creditPlan.levelUp,
      readerStats: {
        uid: userBook.uid,
        lifetimeReadCount: nextLifetimeReadCount,
        currentLevel: nextLevel,
        updatedAt: new Date().toISOString(),
        lastCreditedUserBookId: userBookRecordId,
      },
    }
  })
}
