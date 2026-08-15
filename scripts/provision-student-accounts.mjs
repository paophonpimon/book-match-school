import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const PROJECT_ID = 'book-match-school'
const APPLY = process.argv.includes('--apply')
const rosterFlagIndex = process.argv.indexOf('--roster')
const rosterPath = rosterFlagIndex >= 0 ? process.argv[rosterFlagIndex + 1] : ''
const duplicateStudentIds = new Set(['06269', '06465', '07092', '07192', '07389'])
const INTERNAL_DOMAIN = 'student.bookmatch.local'

if (!rosterPath) {
  throw new Error('ต้องระบุไฟล์ด้วย --roster <path> (ค่าเริ่มต้นเป็น DRY RUN)')
}

const require = createRequire(import.meta.url)
const cliRoot = path.join(process.env.APPDATA ?? '', 'npm', 'node_modules', 'firebase-tools')
const firebaseCliAuth = require(path.join(cliRoot, 'lib', 'auth.js'))
const firebaseCliConfigPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')

class FirebaseCliCredential {
  async getAccessToken() {
    const config = JSON.parse(await readFile(firebaseCliConfigPath, 'utf8'))
    const tokens = config.tokens
    if (!tokens?.refresh_token) throw new Error('Firebase CLI ยังไม่ได้เข้าสู่ระบบ')
    const refreshed = await firebaseCliAuth.getAccessToken(tokens.refresh_token, tokens.scopes ?? [])
    return { access_token: refreshed.access_token, expires_in: 3600 }
  }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some((item) => item !== '')) rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }
  if (value || row.length) {
    row.push(value)
    rows.push(row)
  }
  const [headers, ...body] = rows
  return body.map((items) => Object.fromEntries(headers.map((header, index) => [header.trim(), (items[index] ?? '').trim()])))
}

function normalizeRosterRecord(record) {
  const studentId = String(record.studentId ?? '').trim()
  const className = String(record.className ?? '').trim()
  return {
    studentId,
    firstName: String(record.firstName ?? '').trim(),
    lastName: String(record.lastName ?? '').trim(),
    className,
    gradeLevel: className.replace(/^ม\./u, ''),
    studentNumber: String(record.studentNumber ?? '').trim(),
  }
}

function validateRosterRecord(record) {
  if (!/^\d{5,6}$/u.test(record.studentId)) return 'studentId ต้องเป็นตัวเลข 5–6 หลัก'
  if (!record.firstName || !record.lastName) return 'ชื่อหรือนามสกุลว่าง'
  if (!/^ม\.[1-6]\/[1-9]\d?$/u.test(record.className)) return 'ชั้น/ห้องไม่ตรงรูปแบบ ม.1/1'
  if (!/^[1-9]\d{0,2}$/u.test(record.studentNumber)) return 'เลขที่ไม่ถูกต้อง'
  return null
}

function decodeValue(value) {
  if (!value || typeof value !== 'object') return null
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('booleanValue' in value) return Boolean(value.booleanValue)
  if ('timestampValue' in value) return value.timestampValue
  return null
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

function encodeValue(value) {
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  throw new Error(`Unsupported Firestore value: ${typeof value}`)
}

async function api(accessToken, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url} -> ${response.status}: ${await response.text()}`)
  return response.status === 204 ? null : response.json()
}

async function listCollection(accessToken, collectionId) {
  const documents = []
  let pageToken = ''
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionId}`)
    url.searchParams.set('pageSize', '1000')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const result = await api(accessToken, url)
    documents.push(...(result.documents ?? []).map((document) => ({
      id: document.name.slice(document.name.lastIndexOf('/') + 1),
      data: decodeFields(document.fields),
    })))
    pageToken = result.nextPageToken ?? ''
  } while (pageToken)
  return documents
}

function createWrite(collectionId, documentId, values) {
  const name = `projects/${PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}`
  return {
    update: {
      name,
      fields: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, encodeValue(value)])),
    },
    currentDocument: { exists: false },
    updateTransforms: [
      { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
      { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
    ],
  }
}

async function listAuthUsers(auth) {
  const users = []
  let pageToken
  do {
    const page = await auth.listUsers(1000, pageToken)
    users.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)
  return users
}

function directoryData(record, uid) {
  return {
    studentId: record.studentId,
    uid,
    firstName: record.firstName,
    lastName: record.lastName,
    className: record.className,
    gradeLevel: record.gradeLevel,
    studentNumber: record.studentNumber,
  }
}

async function main() {
  // Keep the import source outside the repository. Never log names or passwords.
  const rosterText = (await readFile(path.resolve(rosterPath), 'utf8')).replace(/^\uFEFF/u, '')
  const roster = parseCsv(rosterText).map(normalizeRosterRecord)
  const counts = new Map()
  roster.forEach(({ studentId }) => counts.set(studentId, (counts.get(studentId) ?? 0) + 1))
  const unexpectedDuplicates = [...counts.entries()].filter(([studentId, count]) => count > 1 && !duplicateStudentIds.has(studentId))
  const skipDuplicates = roster.filter(({ studentId }) => duplicateStudentIds.has(studentId))
  const candidates = roster.filter(({ studentId }) => !duplicateStudentIds.has(studentId))
  const validationErrors = candidates
    .map((record) => ({ studentId: record.studentId, error: validateRosterRecord(record) }))
    .filter(({ error }) => error)

  if (roster.length !== 827 || skipDuplicates.length !== 10 || candidates.length !== 817) {
    throw new Error(`Safety Gate ไม่ตรง: ทั้งหมด=${roster.length}, duplicate-skip=${skipDuplicates.length}, candidates=${candidates.length}`)
  }
  if (unexpectedDuplicates.length || validationErrors.length) {
    console.error(JSON.stringify({ unexpectedDuplicates, validationErrors }, null, 2))
    throw new Error('พบ conflict ใหม่ใน roster จึงหยุดก่อนเขียน Production')
  }

  const credential = new FirebaseCliCredential()
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID, credential })
  const auth = getAuth(app)
  const { access_token: accessToken } = await credential.getAccessToken()
  const [authUsers, membershipsSnapshot, uidLocksSnapshot, profilesSnapshot, progressSnapshot, directorySnapshot] = await Promise.all([
    listAuthUsers(auth),
    listCollection(accessToken, 'studentMemberships'),
    listCollection(accessToken, 'studentMembershipUids'),
    listCollection(accessToken, 'profiles'),
    listCollection(accessToken, 'progress'),
    listCollection(accessToken, 'studentDirectory'),
  ])

  const memberships = new Map(membershipsSnapshot.map((doc) => [doc.id, doc.data]))
  const uidLocks = new Map(uidLocksSnapshot.map((doc) => [doc.id, doc.data]))
  const profilesByStudentId = new Map()
  profilesSnapshot.forEach((doc) => {
    const studentId = String(doc.data.studentId ?? '')
    if (studentId) profilesByStudentId.set(studentId, doc.id)
  })
  const directoryIds = new Set(directorySnapshot.map((doc) => doc.id))
  const authByEmail = new Map(authUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]))

  const existing = []
  const ready = []
  const conflicts = []
  for (const record of candidates) {
    const membership = memberships.get(record.studentId)
    if (membership) {
      existing.push(record)
      continue
    }
    const internalEmail = `${record.studentId}@${INTERNAL_DOMAIN}`
    if (profilesByStudentId.has(record.studentId)) {
      conflicts.push({ studentId: record.studentId, reason: 'profile-without-membership' })
      continue
    }
    if (directoryIds.has(record.studentId)) {
      conflicts.push({ studentId: record.studentId, reason: 'directory-without-membership' })
      continue
    }
    if (authByEmail.has(internalEmail)) {
      conflicts.push({ studentId: record.studentId, reason: 'auth-without-membership' })
      continue
    }
    ready.push(record)
  }

  const baseline = {
    authUsers: authUsers.length,
    memberships: membershipsSnapshot.length,
    profiles: profilesSnapshot.length,
    progress: progressSnapshot.length,
    directory: directorySnapshot.length,
  }
  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
    roster: roster.length,
    duplicateRecordsSkipped: skipDuplicates.length,
    duplicateStudentIds: [...duplicateStudentIds],
    uniqueCandidates: candidates.length,
    existingSkipped: existing.length,
    readyToCreate: ready.length,
    conflicts: conflicts.length,
    conflictDetails: conflicts,
    baseline,
  }, null, 2))

  if (conflicts.length) throw new Error('พบ conflict ใหม่ จึงไม่เขียน Production')
  if (!APPLY) return

  let created = 0
  for (const record of ready) {
    const email = `${record.studentId}@${INTERNAL_DOMAIN}`
    let user
    try {
      user = await auth.createUser({
        email,
        password: `${record.studentId}!Bm`,
        emailVerified: true,
        disabled: false,
      })
      const writes = [createWrite('studentMemberships', record.studentId, {
        studentId: record.studentId,
        uid: user.uid,
        email,
        status: 'active',
      }), createWrite('studentMembershipUids', user.uid, {
        uid: user.uid,
        studentId: record.studentId,
        email,
      }), createWrite('studentDirectory', record.studentId, directoryData(record, user.uid))]
      await api(accessToken, `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`, {
        method: 'POST',
        body: JSON.stringify({ writes }),
      })
      created += 1
    } catch (error) {
      if (user?.uid) await auth.deleteUser(user.uid).catch(() => {})
      throw new Error(`Provision ล้มเหลวที่ studentId=${record.studentId}; rollback Auth แล้ว`, { cause: error })
    }
  }

  const [authAfter, membershipsAfter, profilesAfter, progressAfter, directoryAfter] = await Promise.all([
    listAuthUsers(auth),
    listCollection(accessToken, 'studentMemberships'),
    listCollection(accessToken, 'profiles'),
    listCollection(accessToken, 'progress'),
    listCollection(accessToken, 'studentDirectory'),
  ])
  const after = {
    authUsers: authAfter.length,
    memberships: membershipsAfter.length,
    profiles: profilesAfter.length,
    progress: progressAfter.length,
    directory: directoryAfter.length,
  }
  if (after.authUsers !== baseline.authUsers + created
    || after.memberships !== baseline.memberships + created
    || after.directory !== baseline.directory + created
    || after.profiles !== baseline.profiles
    || after.progress !== baseline.progress) {
    throw new Error(`Post-import verification ไม่ผ่าน: ${JSON.stringify({ baseline, created, after })}`)
  }
  console.log(JSON.stringify({ applied: true, created, after, existingUnchanged: existing.length }, null, 2))
}

await main()
