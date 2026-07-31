import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const PROJECT_ID = 'book-match-school'
const ADMIN_EMAIL = 'paopornpimon@gmail.com'
const EXECUTE = process.argv.includes('--execute')
const RECONCILE_ALL_STATS = process.argv.includes('--reconcile-all-stats')
const RESET_ADMIN_STUDENT_DATA = process.argv.includes('--reset-admin-student-data')
const COLLECTIONS = [
  'profiles',
  'studentMemberships',
  'studentMembershipUids',
  'progress',
  'readerStats',
  'userBooks',
  'bookReviews',
  'loans',
  'studentLoanActiveKeys',
  'bookLoanLocks',
  'loanAuditLogs',
  'bookStats',
  'books',
]
const KNOWN_TEST_UIDS = new Set([
  '8NtP2zzamBO6SoRrFm8jpD6gSSv2',
  'LYD1aFksNHV3AG7qA2C7yjEndCj1',
])
const TEST_MARKER = /(?:\bBOT\b|\bTEST\b|\bE2E\b|ทดสอบ)/iu

const require = createRequire(import.meta.url)
const cliRoot = path.join(process.env.APPDATA ?? '', 'npm', 'node_modules', 'firebase-tools')
const firebaseAuth = require(path.join(cliRoot, 'lib', 'auth.js'))
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')

function firestoreValue(value) {
  if (!value || typeof value !== 'object') return null
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return Boolean(value.booleanValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('referenceValue' in value) return value.referenceValue
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(firestoreValue)
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {})
  return null
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, firestoreValue(value)]))
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)])) } }
  }
  throw new Error(`Unsupported Firestore value: ${typeof value}`)
}

function idFromName(name) {
  return name.slice(name.lastIndexOf('/') + 1)
}

function hasTestMarker(value) {
  return TEST_MARKER.test(JSON.stringify(value ?? {}))
}

async function getAccessToken() {
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const tokens = config.tokens
  if (!tokens?.refresh_token) throw new Error('Firebase CLI refresh token not found')
  const refreshed = await firebaseAuth.getAccessToken(tokens.refresh_token, tokens.scopes ?? [])
  return refreshed.access_token
}

async function api(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${options.method ?? 'GET'} ${url} -> ${response.status}: ${body}`)
  }
  if (response.status === 204) return null
  return response.json()
}

async function listCollection(token, collectionId) {
  const documents = []
  let pageToken = ''
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionId}`)
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const result = await api(token, url)
    documents.push(...(result.documents ?? []).map((raw) => ({
      id: idFromName(raw.name),
      name: raw.name,
      data: decodeFields(raw.fields),
      raw,
    })))
    pageToken = result.nextPageToken ?? ''
  } while (pageToken)
  return documents
}

async function listAuthUsers(token) {
  const users = []
  let nextPageToken = ''
  do {
    const url = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchGet`)
    url.searchParams.set('maxResults', '1000')
    if (nextPageToken) url.searchParams.set('nextPageToken', nextPageToken)
    const result = await api(token, url)
    users.push(...(result.users ?? []))
    nextPageToken = result.nextPageToken ?? ''
  } while (nextPageToken)
  return users
}

function summarize(collections, candidateNames) {
  return Object.fromEntries(COLLECTIONS.map((name) => [
    name,
    (collections[name] ?? []).filter((doc) => candidateNames.has(doc.name)).length,
  ]))
}

function aggregateBookStats(retainedUserBooks) {
  const result = new Map()
  for (const document of retainedUserBooks) {
    const { termId, bookId, status, rating, likedAt } = document.data
    if (typeof termId !== 'string' || typeof bookId !== 'string') continue
    const id = `${termId}_${bookId}`
    const counters = result.get(id) ?? {
      termId,
      bookId,
      likeCount: 0,
      saveCount: 0,
      readingCount: 0,
      readCount: 0,
      ratingTotal: 0,
      ratingCount: 0,
    }
    if (likedAt) counters.likeCount += 1
    if (status === 'saved') counters.saveCount += 1
    if (status === 'reading') counters.readingCount += 1
    if (status === 'read') {
      counters.readCount += 1
      if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
        counters.ratingTotal += rating
        counters.ratingCount += 1
      }
    }
    result.set(id, counters)
  }
  return result
}

async function commitWrites(token, writes) {
  for (let index = 0; index < writes.length; index += 400) {
    const chunk = writes.slice(index, index + 400)
    await api(token, `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`, {
      method: 'POST',
      body: JSON.stringify({ writes: chunk }),
    })
  }
}

async function main() {
  const token = await getAccessToken()
  const [authUsers, collectionEntries] = await Promise.all([
    listAuthUsers(token),
    Promise.all(COLLECTIONS.map(async (name) => [name, await listCollection(token, name)])),
  ])
  const collections = Object.fromEntries(collectionEntries)
  const booksBefore = collections.books.length

  const profilesByUid = new Map(collections.profiles.map((doc) => [doc.id, doc]))
  const membershipsByUid = new Map(collections.studentMemberships.map((doc) => [doc.data.uid, doc]))
  const candidateUids = new Set(KNOWN_TEST_UIDS)
  const candidateReasons = new Map()

  if (RESET_ADMIN_STUDENT_DATA) {
    const adminUser = authUsers.find((user) => String(user.email ?? '').toLowerCase() === ADMIN_EMAIL)
    if (adminUser) {
      candidateUids.add(adminUser.localId)
      candidateReasons.set(adminUser.localId, 'reset Admin student-side test data only')
    }
  }

  for (const user of authUsers) {
    const uid = user.localId
    const email = String(user.email ?? '').toLowerCase()
    if (email === ADMIN_EMAIL) continue
    const profile = profilesByUid.get(uid)?.data
    const membership = membershipsByUid.get(uid)?.data
    const anonymous = !user.email && !(user.providerUserInfo?.length > 0)
    const explicit = hasTestMarker(profile) || hasTestMarker(membership) || KNOWN_TEST_UIDS.has(uid)
    if (anonymous || explicit) {
      candidateUids.add(uid)
      candidateReasons.set(uid, explicit ? 'explicit TEST/BOT fixture' : 'legacy anonymous account')
    }
  }

  for (const profile of collections.profiles) {
    if (profile.data.email?.toLowerCase?.() === ADMIN_EMAIL) continue
    if (hasTestMarker(profile.data)) {
      candidateUids.add(profile.id)
      candidateReasons.set(profile.id, 'profile contains TEST/BOT marker')
    }
  }

  const candidateStudentIds = new Set()
  for (const profile of collections.profiles) {
    if (candidateUids.has(profile.id) && typeof profile.data.studentId === 'string') candidateStudentIds.add(profile.data.studentId)
  }
  for (const membership of collections.studentMemberships) {
    if (candidateUids.has(membership.data.uid) || hasTestMarker(membership.data)) {
      candidateUids.add(membership.data.uid)
      candidateStudentIds.add(membership.id)
    }
  }

  const candidateLoanIds = new Set(collections.loans
    .filter((doc) => candidateUids.has(doc.data.uid) || candidateStudentIds.has(doc.data.studentId) || hasTestMarker(doc.data))
    .map((doc) => doc.id))

  const candidateNames = new Set()
  const addWhere = (name, predicate) => {
    for (const document of collections[name]) if (predicate(document)) candidateNames.add(document.name)
  }
  addWhere('profiles', (doc) => candidateUids.has(doc.id))
  addWhere('studentMemberships', (doc) => candidateUids.has(doc.data.uid) || candidateStudentIds.has(doc.id))
  addWhere('studentMembershipUids', (doc) => candidateUids.has(doc.id) || candidateStudentIds.has(doc.data.studentId))
  addWhere('progress', (doc) => candidateUids.has(doc.data.uid))
  addWhere('readerStats', (doc) => candidateUids.has(doc.id) || candidateUids.has(doc.data.uid))
  addWhere('userBooks', (doc) => candidateUids.has(doc.data.uid))
  addWhere('bookReviews', (doc) => candidateUids.has(doc.data.uid))
  addWhere('loans', (doc) => candidateLoanIds.has(doc.id))
  addWhere('studentLoanActiveKeys', (doc) => candidateUids.has(doc.data.uid) || candidateLoanIds.has(doc.data.loanId))
  addWhere('bookLoanLocks', (doc) => candidateLoanIds.has(doc.data.loanId))
  addWhere('loanAuditLogs', (doc) => candidateUids.has(doc.data.studentUid) || candidateUids.has(doc.data.actorUid) || candidateLoanIds.has(doc.data.loanId))

  const affectedStatIds = new Set(collections.userBooks
    .filter((doc) => candidateNames.has(doc.name))
    .map((doc) => `${doc.data.termId}_${doc.data.bookId}`))
  if (RECONCILE_ALL_STATS) {
    for (const document of collections.bookStats) affectedStatIds.add(document.id)
  }
  const retainedUserBooks = collections.userBooks.filter((doc) => !candidateNames.has(doc.name))
  const calculatedStats = aggregateBookStats(retainedUserBooks)
  const statsUpdates = collections.bookStats
    .filter((doc) => affectedStatIds.has(doc.id))
    .map((doc) => ({ doc, counters: calculatedStats.get(doc.id) ?? {
      termId: doc.data.termId,
      bookId: doc.data.bookId,
      likeCount: 0,
      saveCount: 0,
      readingCount: 0,
      readCount: 0,
      ratingTotal: 0,
      ratingCount: 0,
    } }))

  const candidateAuthUsers = authUsers.filter((user) => candidateUids.has(user.localId) && String(user.email ?? '').toLowerCase() !== ADMIN_EMAIL)
  const backupPath = path.join(os.tmpdir(), `book-match-test-cleanup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  const backup = {
    generatedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    execute: EXECUTE,
    booksBefore,
    candidateReasons: Object.fromEntries(candidateReasons),
    candidateAuthUsers,
    candidateDocuments: COLLECTIONS.flatMap((name) => collections[name].filter((doc) => candidateNames.has(doc.name)).map((doc) => doc.raw)),
    statsBefore: statsUpdates.map(({ doc }) => doc.raw),
  }
  await writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8')

  const result = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    backupPath,
    authTotalBefore: authUsers.length,
    authCandidates: candidateAuthUsers.length,
    candidateAccounts: candidateAuthUsers.map((user) => ({
      uid: user.localId,
      email: user.email ?? null,
      studentId: profilesByUid.get(user.localId)?.data.studentId ?? membershipsByUid.get(user.localId)?.id ?? null,
      displayName: profilesByUid.get(user.localId)?.data.displayName ?? membershipsByUid.get(user.localId)?.data.displayName ?? null,
      reason: candidateReasons.get(user.localId) ?? 'linked TEST/BOT data',
    })),
    documents: summarize(collections, candidateNames),
    collectionTotals: Object.fromEntries(COLLECTIONS.map((name) => [name, collections[name].length])),
    bookStatsToRecalculate: statsUpdates.length,
    nonzeroBookStats: collections.bookStats.filter((doc) => [
      'likeCount', 'saveCount', 'readingCount', 'readCount', 'ratingTotal', 'ratingCount',
    ].some((field) => Number(doc.data[field] ?? 0) !== 0)).length,
    retainedProfiles: collections.profiles
      .filter((doc) => !candidateNames.has(doc.name))
      .map((doc) => ({
        uid: doc.id,
        studentId: doc.data.studentId ?? null,
        displayName: doc.data.displayName ?? null,
      })),
    retainedUserBooks: collections.userBooks
      .filter((doc) => !candidateNames.has(doc.name))
      .map((doc) => ({ uid: doc.data.uid, termId: doc.data.termId, bookId: doc.data.bookId, status: doc.data.status })),
    booksBefore,
  }

  if (!EXECUTE) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const writes = [...candidateNames].map((name) => ({ delete: name }))
  for (const { doc, counters } of statsUpdates) {
    const fields = {
      ...counters,
      lastUpdatedBy: 'production-test-cleanup',
    }
    writes.push({
      update: { name: doc.name, fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encodeValue(value)])) },
      updateMask: { fieldPaths: Object.keys(fields) },
      updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
    })
  }
  await commitWrites(token, writes)

  for (const user of candidateAuthUsers) {
    await api(token, `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`, {
      method: 'POST',
      body: JSON.stringify({ localId: user.localId }),
    })
  }

  const [authAfter, booksAfter, locksAfter] = await Promise.all([
    listAuthUsers(token),
    listCollection(token, 'books'),
    listCollection(token, 'bookLoanLocks'),
  ])
  const remainingCandidateAuth = authAfter.filter((user) => (
    candidateUids.has(user.localId) && String(user.email ?? '').toLowerCase() !== ADMIN_EMAIL
  ))
  const remainingBotLocks = locksAfter.filter((doc) => candidateLoanIds.has(doc.data.loanId))
  Object.assign(result, {
    authTotalAfter: authAfter.length,
    authCandidatesRemaining: remainingCandidateAuth.length,
    booksAfter: booksAfter.length,
    botLocksRemaining: remainingBotLocks.length,
  })
  if (booksAfter.length !== booksBefore) throw new Error(`Book count changed: ${booksBefore} -> ${booksAfter.length}`)
  if (remainingCandidateAuth.length > 0) throw new Error(`${remainingCandidateAuth.length} test Auth accounts remain`)
  if (remainingBotLocks.length > 0) throw new Error(`${remainingBotLocks.length} test book locks remain`)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
