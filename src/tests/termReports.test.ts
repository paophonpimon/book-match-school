import { describe, expect, it } from 'vitest'
import type { AcademicTerm, Reader } from '../types'
import { buildTermReport, termReportToCsv } from '../utils/termReports'

const term: AcademicTerm = {
  id: '2569-1',
  name: 'ภาคเรียนที่ 1 ปีการศึกษา 2569',
  academicYear: 2569,
  semester: 1,
  startDate: '2026-05-01T00:00:00.000Z',
  endDate: '2026-10-31T00:00:00.000Z',
  status: 'closed',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'admin',
  updatedBy: 'admin',
}

const readers: Reader[] = [
  { uid: 'u1', displayName: 'มิน', className: 'ม.5/1', readCount: 3, likedCount: 2, eligible: true, lastReadAt: null },
  { uid: 'u2', displayName: 'พลอย', className: 'ม.5/2', readCount: 1, likedCount: 4, eligible: false, lastReadAt: null },
]

describe('term report', () => {
  it('summarizes reading, reviews, shelf states and loans', () => {
    const report = buildTermReport(term, readers, [
      { uid: 'u1', status: 'read', rating: 5, review: 'รีวิวหนังสือที่สมบูรณ์และยาวเพียงพอ' },
      { uid: 'u1', status: 'reading', rating: null, review: null },
      { uid: 'u2', status: 'saved', rating: null, review: null },
    ], [
      { uid: 'u1', status: 'returned' },
      { uid: 'u1', status: 'borrowed' },
      { uid: 'u2', status: 'rejected' },
    ], '2026-11-01T00:00:00.000Z')

    expect(report).toMatchObject({
      studentCount: 2,
      activeReaderCount: 2,
      totalReadCount: 4,
      totalLikedCount: 6,
      averageReadCount: 2,
      reviewCount: 1,
      averageRating: 5,
      shelfCounts: { liked: 0, saved: 1, reading: 1, read: 1 },
      loanCounts: { pending: 0, approved: 0, borrowed: 1, returned: 1, rejected: 1, cancelled: 0 },
    })
    expect(report.topReaders.map((reader) => reader.uid)).toEqual(['u1'])
    expect(report.students[0]).toMatchObject({ uid: 'u1', loanCount: 2, returnedLoanCount: 1 })
  })

  it('produces a Thai CSV with an Excel-safe BOM and cells', () => {
    const report = buildTermReport(term, [
      { ...readers[0], displayName: '=HYPERLINK("bad")' },
    ], [], [])
    const csv = termReportToCsv(report)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('รายงานภาคเรียน')
    expect(csv).toContain(`"'=HYPERLINK(""bad"")"`)
  })
})
