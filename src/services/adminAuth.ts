import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getDocsFromCache,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from 'firebase/firestore'
import {
  ADMIN_EMAIL,
  changedAdminBookFields,
  cleanAdminBookInput,
  normalizeAdminBook,
  normalizeBookIdentity,
  sortAdminBooks,
  validateAdminBook,
  type AdminBook,
  type AdminBookInput,
  type AdminBookMutationAction,
} from './adminBooks'
import { env, firebaseConfigured } from './env'

const ADMIN_APP_NAME = 'book-match-admin'
let adminApp: FirebaseApp | null = null
let adminAuth: Auth | null = null
let adminDb: Firestore | null = null
let adminEmulatorsConnected = false

if (firebaseConfigured) {
  adminApp = getApps().find((app) => app.name === ADMIN_APP_NAME)
    ?? initializeApp(env.firebase, ADMIN_APP_NAME)
  adminAuth = getAuth(adminApp)
  // Admin screens must reflect authoritative server state. Keeping the Admin
  // app in memory prevents deleted members/loans from being restored from an
  // old IndexedDB snapshot, while the student app keeps its persistent cache.
  adminDb = getFirestore(adminApp)
  if (env.useFirebaseEmulators && !adminEmulatorsConnected) {
    connectAuthEmulator(adminAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(adminDb, '127.0.0.1', 8080)
    adminEmulatorsConnected = true
  }
}

export function getAdminAuthForAcceptance() {
  if (!env.acceptanceMode) throw new Error('Acceptance auth ใช้ได้เฉพาะ local acceptance mode')
  if (!adminAuth) throw new Error('Firebase Admin Authentication ยังไม่พร้อมใช้งาน')
  return adminAuth
}

export function isAllowedAdmin(user: User | null) {
  return user?.emailVerified === true
    && user.email?.toLocaleLowerCase('en-US') === ADMIN_EMAIL
}

export function subscribeAdminUser(callback: (user: User | null, unauthorized?: boolean) => void) {
  if (!adminAuth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(adminAuth, (user) => {
    if (user && !isAllowedAdmin(user)) {
      void signOut(adminAuth as Auth).finally(() => callback(null, true))
      return
    }
    callback(user, false)
  })
}

export async function signInAdminWithGoogle() {
  if (!adminAuth) throw new Error('Firebase Authentication ยังไม่พร้อมใช้งาน')
  await setPersistence(adminAuth, browserLocalPersistence)
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(adminAuth, provider)
  if (!isAllowedAdmin(result.user)) {
    await signOut(adminAuth)
    throw new Error(`บัญชีนี้ไม่มีสิทธิ์ กรุณาใช้ ${ADMIN_EMAIL}`)
  }
  return result.user
}

export async function signOutAdmin() {
  if (adminAuth) await signOut(adminAuth)
}

function adminContext() {
  const user = adminAuth?.currentUser
  if (!user || !isAllowedAdmin(user)) throw new Error(`กรุณาเข้าสู่ระบบด้วย ${ADMIN_EMAIL}`)
  if (!adminDb) throw new Error('Firebase ยังไม่พร้อมใช้งาน')
  return { user, firestore: adminDb }
}

export function getAdminFirebaseContext() {
  return adminContext()
}

export async function getVerifiedAdminFirebaseContext() {
  const context = adminContext()
  const token = await context.user.getIdTokenResult(true)
  const tokenEmail = typeof token.claims.email === 'string'
    ? token.claims.email.toLocaleLowerCase('en-US')
    : ''
  if (token.claims.email_verified !== true || tokenEmail !== ADMIN_EMAIL) {
    throw new Error(`สิทธิ์ Admin หมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ด้วย ${ADMIN_EMAIL}`)
  }
  return context
}

export interface AdminBooksListOptions {
  source?: 'cache' | 'server'
}

function buildListQuery() {
  return query(collection(adminContext().firestore, 'books'))
}

export function listBooksAsAdmin(options: AdminBooksListOptions = {}) {
  return Promise.resolve().then(async () => {
    const snapshot = options.source === 'cache'
      ? await getDocsFromCache(buildListQuery())
      : await getDocs(buildListQuery())
    return sortAdminBooks(
      snapshot.docs.map((item) => normalizeAdminBook({ id: item.id, ...item.data() })),
    )
  })
}

export async function buildBookUniqueKey(title: string, author: string) {
  const identity = `${normalizeBookIdentity(title)}\u0000${normalizeBookIdentity(author)}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function planBookIdentityMutation(
  previousBook: Pick<AdminBook, 'title' | 'author'> | null,
  nextBook: Pick<AdminBookInput, 'title' | 'author'>,
  storedPreviousUniqueKey: unknown,
) {
  const nextUniqueKey = await buildBookUniqueKey(nextBook.title, nextBook.author)
  const previousUniqueKey = typeof storedPreviousUniqueKey === 'string'
    ? storedPreviousUniqueKey
    : previousBook
      ? await buildBookUniqueKey(previousBook.title, previousBook.author)
      : null
  return {
    previousUniqueKey,
    nextUniqueKey,
    rotatesUniqueKey: previousUniqueKey !== null && previousUniqueKey !== nextUniqueKey,
  }
}

async function mutateBook(
  action: AdminBookMutationAction,
  requestedBookId: string | null,
  requestedInput: AdminBookInput | null,
) {
  const { user, firestore } = await getVerifiedAdminFirebaseContext()
  const bookRef = requestedBookId
    ? doc(firestore, 'books', requestedBookId)
    : doc(collection(firestore, 'books'))
  const auditRef = doc(collection(firestore, 'bookAuditLogs'))

  return runTransaction(firestore, async (transaction) => {
    const previousSnapshot = action === 'create' ? null : await transaction.get(bookRef)
    if (action !== 'create' && !previousSnapshot?.exists()) throw new Error('ไม่พบหนังสือที่ต้องการ')
    if (action === 'create' && previousSnapshot?.exists()) throw new Error('bookId นี้ถูกใช้งานแล้ว')

    const previousData = previousSnapshot?.data() ?? null
    const previousBook = previousData
      ? normalizeAdminBook({ id: bookRef.id, ...previousData })
      : null
    const previousInput = previousBook
      ? cleanAdminBookInput({ ...previousBook, id: undefined } as unknown as AdminBookInput)
      : null

    let nextInput: AdminBookInput
    if (action === 'create' || action === 'update') {
      if (!requestedInput) throw new Error('ไม่พบข้อมูลหนังสือ')
      nextInput = cleanAdminBookInput(requestedInput)
    } else {
      if (!previousInput) throw new Error('ไม่พบข้อมูลหนังสือเดิม')
      nextInput = { ...previousInput, active: action === 'restore' }
    }
    const validationError = validateAdminBook(nextInput)
    if (validationError) throw new Error(validationError)

    const normalizedTitle = normalizeBookIdentity(nextInput.title)
    const normalizedAuthor = normalizeBookIdentity(nextInput.author)
    const { nextUniqueKey, previousUniqueKey } = await planBookIdentityMutation(
      previousBook,
      nextInput,
      previousData?.bookUniqueKey,
    )
    const nextUniqueRef = doc(firestore, 'bookUniqueKeys', nextUniqueKey)
    const previousUniqueRef = previousUniqueKey && previousUniqueKey !== nextUniqueKey
      ? doc(firestore, 'bookUniqueKeys', previousUniqueKey)
      : null

    const nextUniqueSnapshot = await transaction.get(nextUniqueRef)
    if (previousUniqueRef) await transaction.get(previousUniqueRef)
    if (nextUniqueSnapshot.exists() && nextUniqueSnapshot.data().bookId !== bookRef.id) {
      throw new Error('มีหนังสือชื่อและผู้แต่งนี้อยู่แล้ว')
    }

    const changedFields = action === 'archive' || action === 'restore'
      ? ['active']
      : changedAdminBookFields(previousInput, nextInput)
    if (action !== 'create' && changedFields.length === 0) return bookRef.id

    const bookPayload = {
      ...(previousData ?? {}),
      ...nextInput,
      id: bookRef.id,
      normalizedTitle,
      normalizedAuthor,
      normalizedTitleAuthor: `${normalizedTitle}\u0000${normalizedAuthor}`,
      bookUniqueKey: nextUniqueKey,
      createdAt: previousData?.createdAt instanceof Timestamp ? previousData.createdAt : serverTimestamp(),
      createdBy: typeof previousData?.createdBy === 'string' ? previousData.createdBy : user.uid,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
      lastAuditId: auditRef.id,
    }
    const uniquePayload = {
      bookId: bookRef.id,
      normalizedTitle,
      normalizedAuthor,
      updatedAt: serverTimestamp(),
      lastAuditId: auditRef.id,
    }
    const auditPayload = {
      action,
      bookId: bookRef.id,
      actorUid: user.uid,
      actorEmail: user.email?.toLocaleLowerCase('en-US') ?? '',
      title: nextInput.title,
      author: nextInput.author,
      beforeActive: previousBook?.active ?? null,
      afterActive: nextInput.active,
      beforeUniqueKey: previousUniqueKey,
      afterUniqueKey: nextUniqueKey,
      changedFields,
      createdAt: serverTimestamp(),
    }

    transaction.set(bookRef, bookPayload)
    transaction.set(nextUniqueRef, uniquePayload)
    if (previousUniqueRef) transaction.delete(previousUniqueRef)
    transaction.set(auditRef, auditPayload)
    return bookRef.id
  })
}

export function createBookAsAdmin(book: AdminBookInput) {
  return mutateBook('create', null, book)
}

export function updateBookAsAdmin(bookId: string, book: AdminBookInput) {
  return mutateBook('update', bookId, book)
}

export function archiveBookAsAdmin(bookId: string) {
  return mutateBook('archive', bookId, null).then(() => undefined)
}

export function restoreBookAsAdmin(bookId: string) {
  return mutateBook('restore', bookId, null).then(() => undefined)
}
