export const ACCEPTANCE_PROJECT_ID = 'demo-book-match-acceptance'
export const ACCEPTANCE_PASSWORD = 'BookMatch-E2E-2569!'
export const TERM_ID = '2999-1'

export const accounts = {
  admin: { email: 'paopornpimon@gmail.com', studentId: '' },
  studentA: { email: 'student-a@test.book-match.invalid', studentId: '99001' },
  studentB: { email: 'student-b@test.book-match.invalid', studentId: '99002' },
  studentC: { email: 'student-c@test.book-match.invalid', studentId: '99003' },
  suspended: { email: 'student-suspended@test.book-match.invalid', studentId: '99004' },
  studentNew: { email: 'student-new@test.book-match.invalid', studentId: '99005' },
} as const

export const bookIds = Array.from({ length: 12 }, (_, index) => `E2E-BOOK-${String(index + 1).padStart(2, '0')}`)
