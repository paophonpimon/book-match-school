import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const PROJECT_ID = 'book-match-school'
const SOURCE = 'google-sheets'
const APPLY = process.argv.includes('--apply')
const CONFIRM_CUTOFF = process.argv.includes('--confirm-cutoff')
const csvFlagIndex = process.argv.indexOf('--csv')
const csvPath = csvFlagIndex >= 0 ? process.argv[csvFlagIndex + 1] : ''
const asOfFlagIndex = process.argv.indexOf('--as-of')
const asOf = asOfFlagIndex >= 0 ? String(process.argv[asOfFlagIndex + 1] ?? '').trim() : ''
const requiredHeaders = ['เลขประจำตัว', 'ชื่อนักเรียน', 'นามสกุล', 'รวมเล่ม']

function endOfThaiDateUtc(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return null
  const calendarDate = new Date(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date) return null
  const timestamp = Date.parse(`${date}T23:59:59.999+07:00`)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
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
      if (row.some((item) => item.trim() !== '')) rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }
  if (value || row.length) {
    row.push(value)
    if (row.some((item) => item.trim() !== '')) rows.push(row)
  }
  return rows
}

export function normalizeLegacyStudentId(value) {
  const studentId = String(value ?? '').trim()
  if (!/^\d{3,20}$/u.test(studentId)) return ''
  return studentId.length < 5 ? studentId.padStart(5, '0') : studentId
}

export function parseLegacyBorrowCsv(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/u, ''))
  const headerIndex = rows.findIndex((row) => requiredHeaders.every((header) => row.map((item) => item.trim()).includes(header)))
  if (headerIndex < 0) throw new Error(`ไม่พบหัวตารางที่ต้องการ: ${requiredHeaders.join(', ')}`)
  const headers = rows[headerIndex].map((item) => item.trim())
  const sourceRows = rows.slice(headerIndex + 1).filter((row) => row.some((item) => item.trim() !== ''))
  const byStudentId = new Map()
  const duplicates = []
  const conflicts = []
  const validationErrors = []

  sourceRows.forEach((values, offset) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? '').trim()]))
    const studentId = normalizeLegacyStudentId(record['เลขประจำตัว'])
    const rawCount = record['รวมเล่ม']
    const count = Number(rawCount)
    if (!studentId || !/^\d+$/u.test(rawCount) || !Number.isSafeInteger(count) || count < 0) {
      validationErrors.push({ row: headerIndex + offset + 2, studentId: record['เลขประจำตัว'], count: rawCount })
      return
    }
    const normalized = {
      studentId,
      firstName: record['ชื่อนักเรียน'],
      lastName: record['นามสกุล'],
      legacyBorrowCount: count,
    }
    const previous = byStudentId.get(studentId)
    if (!previous) {
      byStudentId.set(studentId, normalized)
      return
    }
    if (previous.legacyBorrowCount !== count) {
      conflicts.push({ studentId, counts: [...new Set([previous.legacyBorrowCount, count])] })
      return
    }
    duplicates.push({ studentId, legacyBorrowCount: count })
  })

  return {
    csvRows: sourceRows.length,
    records: [...byStudentId.values()],
    duplicates,
    conflicts,
    validationErrors,
  }
}

export function createLegacyBorrowUpdateWrite(uid, count, bookMatchBorrowCount, legacyBorrowAsOf = asOf, updatedAt = new Date().toISOString()) {
  if (!endOfThaiDateUtc(legacyBorrowAsOf)) throw new Error('ต้องระบุวันสิ้นสุดข้อมูลที่ยืนยันแล้วด้วย --as-of YYYY-MM-DD')
  return {
    update: {
      name: `projects/${PROJECT_ID}/databases/(default)/documents/studentBorrowStats/${uid}`,
      fields: {
        uid: { stringValue: uid },
        legacyBorrowCount: { integerValue: String(count) },
        legacyBorrowSource: { stringValue: SOURCE },
        legacyBorrowAsOf: { stringValue: legacyBorrowAsOf },
        bookMatchBorrowCount: { integerValue: String(bookMatchBorrowCount) },
        updatedAt: { timestampValue: updatedAt },
      },
    },
    updateMask: {
      fieldPaths: ['uid', 'legacyBorrowCount', 'legacyBorrowSource', 'legacyBorrowAsOf', 'bookMatchBorrowCount', 'updatedAt'],
    },
  }
}

export function createLegacyBorrowImportPlan(parsed, memberships, loans, legacyBorrowAsOf = asOf) {
  const asOfEndUtc = endOfThaiDateUtc(legacyBorrowAsOf)
  if (!asOfEndUtc) throw new Error('ต้องระบุวันสิ้นสุดข้อมูลที่ยืนยันแล้วด้วย --as-of YYYY-MM-DD')
  const membershipById = new Map(memberships.map((item) => [item.id, item]))
  const matched = []
  const unmatched = []
  const writes = []
  const postBaselineBorrowCountByUid = new Map()
  let totalPostBaselineBookMatchBorrows = 0
  loans.forEach((loan) => {
    if (!['borrowed', 'returned'].includes(String(loan.data.status))) return
    const borrowedAt = typeof loan.data.borrowedAt === 'string' ? loan.data.borrowedAt : ''
    if (!borrowedAt || !Number.isFinite(Date.parse(borrowedAt)) || Date.parse(borrowedAt) <= Date.parse(asOfEndUtc)) return
    const uid = String(loan.data.uid ?? '')
    if (uid) postBaselineBorrowCountByUid.set(uid, (postBaselineBorrowCountByUid.get(uid) ?? 0) + 1)
  })

  parsed.records.forEach((record) => {
    const membership = membershipById.get(record.studentId)
    if (!membership) {
      unmatched.push(record)
      return
    }
    matched.push(record)
    const uid = String(membership.data.uid ?? '')
    if (!uid) throw new Error(`studentMemberships/${record.studentId} ไม่มี uid`)
    const bookMatchBorrowCount = postBaselineBorrowCountByUid.get(uid) ?? 0
    totalPostBaselineBookMatchBorrows += bookMatchBorrowCount
    writes.push(createLegacyBorrowUpdateWrite(uid, record.legacyBorrowCount, bookMatchBorrowCount, legacyBorrowAsOf))
  })

  return {
    matched,
    unmatched,
    writes,
    plannedBorrowStatsUpdates: writes.length,
    totalPostBaselineBookMatchBorrows,
  }
}

function timestampSummary(documents, fieldName, asOfEndUtc = null) {
  const timestamps = documents
    .map((item) => item.data[fieldName])
    .filter((value) => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(left) - Date.parse(right))
  return {
    documents: documents.length,
    documentsWithTimestamp: timestamps.length,
    documentsMissingTimestamp: documents.length - timestamps.length,
    earliestTimestamp: timestamps.at(0) ?? null,
    latestTimestamp: timestamps.at(-1) ?? null,
    onOrBeforeLegacyAsOf: asOfEndUtc ? timestamps.filter((value) => Date.parse(value) <= Date.parse(asOfEndUtc)).length : null,
    afterLegacyAsOf: asOfEndUtc ? timestamps.filter((value) => Date.parse(value) > Date.parse(asOfEndUtc)).length : null,
  }
}

export function analyzeBookMatchReadActivity(progress, userBooks, termId, legacyBorrowAsOf = asOf) {
  const asOfEndUtc = endOfThaiDateUtc(legacyBorrowAsOf)
  const currentProgress = progress.filter((item) => item.data.termId === termId)
  const allReadDocuments = userBooks.filter((item) => item.data.status === 'read')
  const currentTermReadDocuments = allReadDocuments.filter((item) => item.data.termId === termId)
  const currentTermProgressReadCount = currentProgress.reduce((sum, item) => {
    const value = Number(item.data.readCount ?? 0)
    return sum + (Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0)
  }, 0)
  const allReadActivity = timestampSummary(allReadDocuments, 'readAt', asOfEndUtc)
  const currentTermReadActivity = timestampSummary(currentTermReadDocuments, 'readAt', asOfEndUtc)
  const progressLastReadAt = timestampSummary(currentProgress.filter((item) => Number(item.data.readCount ?? 0) > 0), 'lastReadAt', asOfEndUtc)
  const currentTermEventsMatchProgress = currentTermProgressReadCount === currentTermReadDocuments.length
  const currentTermEventHistoryComplete = currentTermReadActivity.documentsMissingTimestamp === 0 && currentTermEventsMatchProgress

  return {
    legacyAsOfEndUtc: asOfEndUtc,
    progress: {
      documents: currentProgress.length,
      aggregateReadCount: currentTermProgressReadCount,
      lastReadAt: progressLastReadAt,
      reconstructableByDateFromProgressAlone: false,
    },
    userBookReadEvents: {
      allTerms: allReadActivity,
      currentTerm: currentTermReadActivity,
      currentTermEventsMatchProgress,
      currentTermEventHistoryComplete,
      safePostBaselineCountFromUserBooks: currentTermEventHistoryComplete,
    },
  }
}

export function analyzeLoanActivity(loans, auditLogs, legacyBorrowAsOf = asOf) {
  const asOfEndUtc = endOfThaiDateUtc(legacyBorrowAsOf)
  const statusCounts = Object.fromEntries(['pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled'].map((status) => [
    status,
    loans.filter((item) => item.data.status === status).length,
  ]))
  const successfulLoans = loans.filter((item) => ['borrowed', 'returned'].includes(String(item.data.status)))
  const successfulSummary = timestampSummary(successfulLoans, 'borrowedAt', asOfEndUtc)
  const invalidSuccessfulLoanIds = successfulLoans
    .filter((item) => typeof item.data.borrowedAt !== 'string' || !Number.isFinite(Date.parse(item.data.borrowedAt)))
    .map((item) => item.id)
  const nonSuccessfulWithBorrowedAt = loans
    .filter((item) => !['borrowed', 'returned'].includes(String(item.data.status)) && typeof item.data.borrowedAt === 'string')
    .map((item) => item.id)
  const pickupAudits = auditLogs.filter((item) => item.data.action === 'pickup')
  const pickupAuditCounts = new Map()
  pickupAudits.forEach((item) => {
    const loanId = String(item.data.loanId ?? '')
    if (loanId) pickupAuditCounts.set(loanId, (pickupAuditCounts.get(loanId) ?? 0) + 1)
  })
  const pickupLoanIds = new Set(pickupAudits.map((item) => String(item.data.loanId ?? '')))
  const successfulLoanIds = new Set(successfulLoans.map((item) => item.id))
  const duplicatePickupAuditLoanIds = [...pickupAuditCounts.entries()].filter(([, count]) => count > 1).map(([loanId]) => loanId)
  return {
    statusCounts,
    successfulBorrowDefinition: "loan.status in ['borrowed', 'returned'] with valid borrowedAt",
    successfulLoans: successfulSummary,
    invalidSuccessfulLoanIds,
    nonSuccessfulWithBorrowedAt,
    pickupAuditDocuments: pickupAudits.length,
    duplicatePickupAuditLoanIds,
    successfulLoansWithoutPickupAudit: [...successfulLoanIds].filter((loanId) => !pickupLoanIds.has(loanId)),
    pickupAuditsWithoutSuccessfulLoan: [...pickupLoanIds].filter((loanId) => !successfulLoanIds.has(loanId)),
    safeToCountEachLoanOnce: invalidSuccessfulLoanIds.length === 0
      && nonSuccessfulWithBorrowedAt.length === 0
      && duplicatePickupAuditLoanIds.length === 0
      && [...successfulLoanIds].every((loanId) => pickupLoanIds.has(loanId)),
  }
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

async function main() {
  if (!csvPath) throw new Error('ต้องระบุไฟล์ด้วย --csv <path> (ค่าเริ่มต้นเป็น DRY RUN)')
  if (APPLY && (!endOfThaiDateUtc(asOf) || !CONFIRM_CUTOFF)) {
    throw new Error('ห้าม APPLY จนกว่าจะระบุ --as-of YYYY-MM-DD พร้อม --confirm-cutoff')
  }
  const parsed = parseLegacyBorrowCsv(await readFile(path.resolve(csvPath), 'utf8'))
  if (parsed.validationErrors.length || parsed.conflicts.length) {
    console.log(JSON.stringify({
      mode: APPLY ? 'APPLY' : 'DRY_RUN',
      csvRows: parsed.csvRows,
      uniqueStudents: parsed.records.length,
      duplicates: parsed.duplicates,
      conflicts: parsed.conflicts,
      validationErrors: parsed.validationErrors,
      plannedFirestoreUpdates: 0,
    }, null, 2))
    throw new Error('พบข้อมูลขัดแย้งหรือแถวไม่ถูกต้อง จึงไม่อ่านหรือเขียน Firestore')
  }

  const require = createRequire(import.meta.url)
  const cliRoot = path.join(process.env.APPDATA ?? '', 'npm', 'node_modules', 'firebase-tools')
  const firebaseCliAuth = require(path.join(cliRoot, 'lib', 'auth.js'))
  const firebaseCliConfigPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')
  const config = JSON.parse(await readFile(firebaseCliConfigPath, 'utf8'))
  if (!config.tokens?.refresh_token) throw new Error('Firebase CLI ยังไม่ได้เข้าสู่ระบบ')
  const refreshed = await firebaseCliAuth.getAccessToken(config.tokens.refresh_token, config.tokens.scopes ?? [])
  const accessToken = refreshed.access_token
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  const [memberships, profiles, progress, userBooks, loans, auditLogs, currentTermDocument] = await Promise.all([
    listCollection(accessToken, 'studentMemberships'),
    listCollection(accessToken, 'profiles'),
    listCollection(accessToken, 'progress'),
    listCollection(accessToken, 'userBooks'),
    listCollection(accessToken, 'loans'),
    listCollection(accessToken, 'loanAuditLogs'),
    api(accessToken, `${base}/settings/currentTerm`),
  ])
  const termId = String(decodeFields(currentTermDocument.fields).termId ?? '')
  if (!termId) throw new Error('ไม่พบ settings/currentTerm.termId')
  const progressById = new Map(progress.filter((item) => item.data.termId === termId).map((item) => [item.id, item]))
  const loanActivity = analyzeLoanActivity(loans, auditLogs, asOf)
  if (APPLY && !loanActivity.safeToCountEachLoanOnce) throw new Error('ข้อมูล loan/audit ไม่ปลอดภัยสำหรับนับยอดยืม จึงยกเลิก APPLY')
  const canPlanWrites = Boolean(asOf && CONFIRM_CUTOFF && loanActivity.safeToCountEachLoanOnce)
  const plan = canPlanWrites ? createLegacyBorrowImportPlan(parsed, memberships, loans, asOf) : {
    matched: parsed.records.filter((record) => memberships.some((item) => item.id === record.studentId)),
    unmatched: parsed.records.filter((record) => !memberships.some((item) => item.id === record.studentId)),
    writes: [],
    plannedBorrowStatsUpdates: 0,
    totalPostBaselineBookMatchBorrows: null,
  }
  const membershipByStudentId = new Map(memberships.map((item) => [item.id, item]))
  const profileUids = new Set(profiles.map((item) => item.id))
  const matchedProfilesWithoutProgress = plan.matched.flatMap((record) => {
    const uid = String(membershipByStudentId.get(record.studentId)?.data.uid ?? '')
    return uid && profileUids.has(uid) && !progressById.has(`${termId}_${uid}`) ? [record.studentId] : []
  })
  const readActivity = analyzeBookMatchReadActivity(progress, userBooks, termId, asOf)
  const report = {
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
    sourceCsv: path.resolve(csvPath),
    legacyBorrowSource: SOURCE,
    legacyBorrowAsOf: asOf || null,
    cutoffStatus: !asOf
      ? 'UNCONFIRMED_CSV_HAS_NO_CUTOFF_DATE'
      : CONFIRM_CUTOFF
        ? 'EXPLICITLY_CONFIRMED_BY_COMMAND'
        : 'SUPPLIED_BUT_NOT_CONFIRMED_ZERO_WRITES',
    currentTermId: termId,
    csvRows: parsed.csvRows,
    uniqueStudents: parsed.records.length,
    matchedStudents: plan.matched.length,
    unmatchedStudents: plan.unmatched.length,
    duplicates: parsed.duplicates,
    conflicts: parsed.conflicts,
    totalLegacyBorrowCount: parsed.records.reduce((sum, record) => sum + record.legacyBorrowCount, 0),
    plannedBorrowStatsUpdates: plan.plannedBorrowStatsUpdates,
    totalPostBaselineBookMatchBorrows: plan.totalPostBaselineBookMatchBorrows,
    plannedFirestoreUpdates: plan.writes.length,
    matchedProfilesWithoutProgress,
    readActivity,
    loanActivity,
    unmatchedRecords: plan.unmatched.map(({ studentId, firstName, lastName, legacyBorrowCount }) => ({ studentId, firstName, lastName, legacyBorrowCount })),
  }
  console.log(JSON.stringify(report, null, 2))
  if (!APPLY) return

  for (let index = 0; index < plan.writes.length; index += 450) {
    await api(accessToken, `${base}:commit`, {
      method: 'POST',
      body: JSON.stringify({ writes: plan.writes.slice(index, index + 450) }),
    })
  }
  console.log(JSON.stringify({ applied: true, updatedDocuments: plan.writes.length }, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
