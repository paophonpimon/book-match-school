import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bookMatchCompletedReadCount, bookMatchLibraryBorrowCount, cumulativeLibraryBorrowCount, hasLibraryBorrowStats, legacyLibraryBorrowCount } from '../utils/legacyBorrowCounts'

async function loadMigrationModule() {
  // @ts-expect-error The one-time migration intentionally remains a plain Node ESM script.
  return import('../../scripts/import-legacy-borrow-counts.mjs')
}

describe('legacy borrow baseline', () => {
  it('keeps historical library borrows separate from Book Match completed reads', () => {
    const reader = { readCount: 3, legacyBorrowCount: 7, bookMatchBorrowCount: 4 }
    expect(bookMatchCompletedReadCount(reader)).toBe(3)
    expect(legacyLibraryBorrowCount(reader)).toBe(7)
    expect(bookMatchLibraryBorrowCount(reader)).toBe(4)
    expect(cumulativeLibraryBorrowCount(reader)).toBe(11)
  })

  it('keeps zero or absent historical library borrows at zero', () => {
    expect(bookMatchCompletedReadCount({ readCount: 4 })).toBe(4)
    expect(legacyLibraryBorrowCount({ legacyBorrowCount: 0 })).toBe(0)
    expect(legacyLibraryBorrowCount({})).toBe(0)
  })

  it('distinguishes an imported zero baseline from a missing borrow-stat document', () => {
    expect(hasLibraryBorrowStats({ legacyBorrowCount: 0, legacyBorrowSource: 'google-sheets', legacyBorrowAsOf: '2026-08-27', bookMatchBorrowCount: 0 })).toBe(true)
    expect(hasLibraryBorrowStats({ legacyBorrowCount: 0, legacyBorrowSource: '', legacyBorrowAsOf: '', bookMatchBorrowCount: 0 })).toBe(false)
  })

  it('deduplicates identical student IDs after adding the leading zero', async () => {
    const { parseLegacyBorrowCsv } = await loadMigrationModule()
    const parsed = parseLegacyBorrowCsv([
      'เลขประจำตัว,ชื่อนักเรียน,นามสกุล,รวมเล่ม',
      '7211,เด็กหญิงจุฬาลักษณ์,วรรธนะพงศ์,10',
      '7211,เด็กหญิงจุฬาลักษณ์,วรรธนะพงศ์,10',
    ].join('\n'))
    expect(parsed.records).toEqual([expect.objectContaining({ studentId: '07211', legacyBorrowCount: 10 })])
    expect(parsed.duplicates).toHaveLength(1)
    expect(parsed.conflicts).toHaveLength(0)
  })

  it('reports conflicting duplicate counts instead of guessing', async () => {
    const { parseLegacyBorrowCsv } = await loadMigrationModule()
    const parsed = parseLegacyBorrowCsv([
      'เลขประจำตัว,ชื่อนักเรียน,นามสกุล,รวมเล่ม',
      '7211,เด็กหญิงจุฬาลักษณ์,วรรธนะพงศ์,10',
      '07211,เด็กหญิงจุฬาลักษณ์,วรรธนะพงศ์,11',
    ].join('\n'))
    expect(parsed.conflicts).toEqual([{ studentId: '07211', counts: [10, 11] }])
  })

  it('builds idempotent SET/REPLACE writes without increments', async () => {
    const { createLegacyBorrowUpdateWrite } = await loadMigrationModule()
    const updatedAt = '2026-08-28T00:00:00.000Z'
    const first = createLegacyBorrowUpdateWrite('uid-1', 10, 2, '2026-08-27', updatedAt)
    const retry = createLegacyBorrowUpdateWrite('uid-1', 10, 2, '2026-08-27', updatedAt)
    expect(retry).toEqual(first)
    expect(first.update.name).toContain('/studentBorrowStats/uid-1')
    expect(first.update.fields.legacyBorrowCount).toEqual({ integerValue: '10' })
    expect(first.update.fields.bookMatchBorrowCount).toEqual({ integerValue: '2' })
    expect(first.updateMask.fieldPaths).toContain('legacyBorrowCount')
    expect(JSON.stringify(first)).not.toContain('increment')
  })

  it('keeps the script dry-run by default and requires explicit cutoff confirmation', () => {
    const script = readFileSync(resolve(process.cwd(), 'scripts/import-legacy-borrow-counts.mjs'), 'utf8')
    expect(script).toContain("const APPLY = process.argv.includes('--apply')")
    expect(script).toContain("const CONFIRM_CUTOFF = process.argv.includes('--confirm-cutoff')")
    expect(script).toContain("if (!APPLY) return")
    expect(script).toContain('SUPPLIED_BUT_NOT_CONFIRMED_ZERO_WRITES')
    expect(script).toContain('studentBorrowStats/${uid}')
    expect(script).not.toContain('increment')
  })

  it('counts only successful Book Match loans strictly after the confirmed Thai cutoff', async () => {
    const { createLegacyBorrowImportPlan } = await loadMigrationModule()
    const parsed = { records: [{ studentId: '07211', legacyBorrowCount: 10 }] }
    const memberships = [{ id: '07211', data: { uid: 'uid-1' } }]
    const loans = [
      { id: 'before', data: { uid: 'uid-1', status: 'returned', borrowedAt: '2026-08-27T16:59:59.999Z' } },
      { id: 'after', data: { uid: 'uid-1', status: 'returned', borrowedAt: '2026-08-27T17:00:00.000Z' } },
      { id: 'request', data: { uid: 'uid-1', status: 'pending', borrowedAt: null } },
    ]
    const plan = createLegacyBorrowImportPlan(parsed, memberships, loans, '2026-08-27')
    expect(plan.writes).toHaveLength(1)
    expect(plan.totalPostBaselineBookMatchBorrows).toBe(1)
    expect(plan.writes[0].update.fields.bookMatchBorrowCount).toEqual({ integerValue: '1' })
  })

  it('refuses to construct writes without an explicit cutoff', async () => {
    const { createLegacyBorrowImportPlan } = await loadMigrationModule()
    expect(() => createLegacyBorrowImportPlan({ records: [] }, [], [], '')).toThrow('ต้องระบุวันสิ้นสุดข้อมูล')
  })

  it('reports that aggregate progress cannot be reconstructed by date on its own', async () => {
    const { analyzeBookMatchReadActivity } = await loadMigrationModule()
    const report = analyzeBookMatchReadActivity(
      [{ id: 'term_u1', data: { termId: 'term', readCount: 1, lastReadAt: '2026-08-28T00:00:00.000Z' } }],
      [{ id: 'term_u1_b1', data: { termId: 'term', status: 'read', readAt: '2026-08-28T00:00:00.000Z' } }],
      'term',
    )
    expect(report.progress.reconstructableByDateFromProgressAlone).toBe(false)
    expect(report.userBookReadEvents.currentTermEventsMatchProgress).toBe(true)
    expect(report.userBookReadEvents.safePostBaselineCountFromUserBooks).toBe(true)
  })

  it('keeps borrow statistics in one admin-owned collection and out of progress', () => {
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
    const borrowStatsBlock = rules.slice(rules.indexOf('match /studentBorrowStats/{uid}'), rules.indexOf('function validBookStats'))
    const progressBlock = rules.slice(rules.indexOf('function validProgress'), rules.indexOf('function validStudentBorrowStats'))
    expect(borrowStatsBlock).toContain('allow read: if signedIn()')
    expect(borrowStatsBlock).toContain('allow create: if isAdmin()')
    expect(borrowStatsBlock).toContain('request.resource.data.bookMatchBorrowCount == resource.data.bookMatchBorrowCount + 1')
    expect(progressBlock).not.toContain('legacyBorrowCount')
  })
})
