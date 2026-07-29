import { deleteApp, initializeApp } from 'firebase/app'
import { getAuth, inMemoryPersistence, setPersistence, signInAnonymously, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { loadEnv } from 'vite'

const REQUEST_COUNT = 5
const env = loadEnv('development', process.cwd(), '')
const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]
const missingKeys = requiredKeys.filter((key) => !env[key])

if (missingKeys.length) {
  throw new Error(`Firebase config ไม่ครบ: ${missingKeys.join(', ')}`)
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}, `book-match-loan-bot-${Date.now()}`)

const auth = getAuth(app)
const db = getFirestore(app)

function errorText(error) {
  const code = error && typeof error === 'object' && 'code' in error ? ` (${error.code})` : ''
  const message = error instanceof Error ? error.message : String(error)
  return `${message}${code}`
}

async function createBotProfile(uid) {
  const profileRef = doc(db, 'profiles', uid)
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(profileRef)
    if (existing.exists()) return
    transaction.set(profileRef, {
      uid,
      displayName: 'BOT ทดสอบระบบยืม',
      className: 'ม.5/1',
      studentNumber: '99',
      studentId: '9900000000001',
      firstName: 'บอต',
      lastName: 'ทดสอบระบบ',
      gradeLevel: '5/1',
      interests: ['ทดสอบระบบยืม'],
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    })
  })
}

async function loadAvailableBooks() {
  const [booksSnapshot, locksSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'books'),
      where('active', '==', true),
      orderBy('displayOrder', 'asc'),
      limit(30),
    )),
    getDocs(collection(db, 'bookLoanLocks')),
  ])
  const lockedBookIds = new Set(locksSnapshot.docs.map((item) => item.id))
  return booksSnapshot.docs
    .filter((item) => !lockedBookIds.has(item.id))
    .slice(0, REQUEST_COUNT)
}

async function requestBook(uid, bookSnapshot) {
  const bookId = bookSnapshot.id
  const loanRef = doc(collection(db, 'loans'))
  const auditRef = doc(collection(db, 'loanAuditLogs'))
  const activeRef = doc(db, 'studentLoanActiveKeys', `${uid}_${bookId}`)
  const lockRef = doc(db, 'bookLoanLocks', bookId)
  const bookRef = doc(db, 'books', bookId)

  await runTransaction(db, async (transaction) => {
    const [activeSnapshot, lockSnapshot, currentBookSnapshot] = await Promise.all([
      transaction.get(activeRef),
      transaction.get(lockRef),
      transaction.get(bookRef),
    ])
    if (activeSnapshot.exists()) throw new Error(`มีคำขอ active สำหรับ ${bookId} อยู่แล้ว`)
    if (lockSnapshot.exists()) throw new Error(`หนังสือ ${bookId} ถูกล็อกแล้ว`)
    if (!currentBookSnapshot.exists() || currentBookSnapshot.data().active !== true) {
      throw new Error(`หนังสือ ${bookId} ไม่พร้อมให้ยืม`)
    }

    const book = currentBookSnapshot.data()
    const timestamp = serverTimestamp()
    transaction.set(loanRef, {
      id: loanRef.id,
      uid,
      bookId,
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
      loanDays: 7,
      adminNote: '',
      studentDisplayName: 'BOT ทดสอบระบบยืม',
      studentFirstName: 'บอต',
      studentLastName: 'ทดสอบระบบ',
      studentClassroom: 'ม.5/1',
      studentNumber: '99',
      studentId: '9900000000001',
      bookTitle: String(book.title ?? ''),
      bookAuthor: String(book.author ?? ''),
      bookCoverUrl: String(book.coverUrl ?? ''),
      createdAt: timestamp,
      updatedAt: timestamp,
      lastAuditId: auditRef.id,
    })
    transaction.set(activeRef, {
      uid,
      bookId,
      loanId: loanRef.id,
      status: 'pending',
      updatedAt: timestamp,
      lastAuditId: auditRef.id,
    })
    transaction.set(auditRef, {
      action: 'request',
      loanId: loanRef.id,
      bookId,
      studentUid: uid,
      previousStatus: null,
      nextStatus: 'pending',
      actorUid: uid,
      actorEmail: null,
      note: '',
      createdAt: timestamp,
    })
  })

  return {
    loanId: loanRef.id,
    bookId,
    title: String(bookSnapshot.data().title ?? ''),
    status: 'pending',
  }
}

let uid = ''
let phase = 'anonymous-auth'
try {
  await setPersistence(auth, inMemoryPersistence)
  const credential = await signInAnonymously(auth)
  uid = credential.user.uid
  phase = 'create-profile'
  await createBotProfile(uid)

  phase = 'load-available-books'
  const books = await loadAvailableBooks()
  if (books.length < REQUEST_COUNT) {
    throw new Error(`พบหนังสือว่างเพียง ${books.length} เล่ม ต้องการ ${REQUEST_COUNT} เล่ม`)
  }

  const requests = []
  for (const [index, book] of books.entries()) {
    phase = `request-loan-${index + 1}:${book.id}`
    requests.push(await requestBook(uid, book))
  }

  console.log(JSON.stringify({
    ok: true,
    bot: {
      uid,
      displayName: 'BOT ทดสอบระบบยืม',
      className: 'ม.5/1',
      studentNumber: '99',
    },
    requestCount: requests.length,
    requests,
  }, null, 2))
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    uid: uid || null,
    phase,
    error: errorText(error),
  }, null, 2))
  process.exitCode = 1
} finally {
  if (auth.currentUser) await signOut(auth).catch(() => undefined)
  await deleteApp(app)
}

