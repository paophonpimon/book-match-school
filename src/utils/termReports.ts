import type { AcademicTerm, BookStatus, LoanStatus, Reader } from '../types'

export interface TermReportUserBook {
  uid: string
  status: BookStatus
  rating: number | null
  review: string | null
}

export interface TermReportLoan {
  uid: string
  status: LoanStatus
}

export interface TermReportStudentRow extends Reader {
  loanCount: number
  returnedLoanCount: number
}

export interface TermReport {
  term: AcademicTerm
  generatedAt: string
  studentCount: number
  activeReaderCount: number
  totalReadCount: number
  totalLikedCount: number
  averageReadCount: number
  shelfCounts: Record<BookStatus, number>
  reviewCount: number
  averageRating: number | null
  loanCounts: Record<LoanStatus, number>
  topReaders: TermReportStudentRow[]
  students: TermReportStudentRow[]
}

const bookStatuses: BookStatus[] = ['liked', 'saved', 'reading', 'read']
const loanStatuses: LoanStatus[] = ['pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled']

export function buildTermReport(
  term: AcademicTerm,
  readers: Reader[],
  userBooks: TermReportUserBook[],
  loans: TermReportLoan[],
  generatedAt = new Date().toISOString(),
): TermReport {
  const shelfCounts = Object.fromEntries(bookStatuses.map((status) => [status, 0])) as Record<BookStatus, number>
  userBooks.forEach((book) => { shelfCounts[book.status] += 1 })

  const reviewedBooks = userBooks.filter((book) => (
    book.status === 'read'
    && typeof book.rating === 'number'
    && book.rating >= 1
    && book.rating <= 5
    && Boolean(book.review?.trim())
  ))
  const averageRating = reviewedBooks.length
    ? reviewedBooks.reduce((sum, book) => sum + (book.rating ?? 0), 0) / reviewedBooks.length
    : null

  const loanCounts = Object.fromEntries(loanStatuses.map((status) => [status, 0])) as Record<LoanStatus, number>
  const loansByUid = new Map<string, { total: number; returned: number }>()
  loans.forEach((loan) => {
    loanCounts[loan.status] += 1
    const current = loansByUid.get(loan.uid) ?? { total: 0, returned: 0 }
    current.total += 1
    if (loan.status === 'returned') current.returned += 1
    loansByUid.set(loan.uid, current)
  })

  const students = readers
    .map((reader): TermReportStudentRow => {
      const studentLoans = loansByUid.get(reader.uid)
      return {
        ...reader,
        loanCount: studentLoans?.total ?? 0,
        returnedLoanCount: studentLoans?.returned ?? 0,
      }
    })
    .sort((left, right) => (
      right.readCount - left.readCount
      || right.likedCount - left.likedCount
      || left.displayName.localeCompare(right.displayName, 'th')
    ))

  const totalReadCount = readers.reduce((sum, reader) => sum + Math.max(0, reader.readCount), 0)
  const totalLikedCount = readers.reduce((sum, reader) => sum + Math.max(0, reader.likedCount), 0)

  return {
    term,
    generatedAt,
    studentCount: readers.length,
    activeReaderCount: readers.filter((reader) => reader.readCount > 0).length,
    totalReadCount,
    totalLikedCount,
    averageReadCount: readers.length ? totalReadCount / readers.length : 0,
    shelfCounts,
    reviewCount: reviewedBooks.length,
    averageRating,
    loanCounts,
    topReaders: students.filter((reader) => reader.eligible !== false).slice(0, 10),
    students,
  }
}

function csvCell(value: string | number | boolean) {
  let text = String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function termReportToCsv(report: TermReport) {
  const rows: Array<Array<string | number | boolean>> = [
    ['รายงานภาคเรียน', report.term.name],
    ['รหัสภาคเรียน', report.term.id],
    ['สร้างรายงานเมื่อ', new Date(report.generatedAt).toLocaleString('th-TH')],
    [],
    ['ลำดับ', 'ชื่อที่แสดง', 'ชั้นเรียน', 'อ่านจบ', 'สนใจ', 'ยืมทั้งหมด', 'คืนแล้ว', 'มีสิทธิ์จัดอันดับ'],
    ...report.students.map((student, index) => [
      index + 1,
      student.displayName,
      student.className,
      student.readCount,
      student.likedCount,
      student.loanCount,
      student.returnedLoanCount,
      student.eligible !== false ? 'ใช่' : 'ไม่ใช่',
    ]),
  ]
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}
