export type BookStatus = 'liked' | 'saved' | 'reading' | 'read'
export type SwipeAction = BookStatus | 'skipped'

export interface Book {
  id: string
  title: string
  author: string
  categoryId: string
  categoryCode?: string
  category?: string
  moodTags: string[]
  moods?: string[]
  tags?: string[]
  description: string
  coverUrl: string
  audioUrl?: string
  isbn?: string
  callNumber?: string
  readingLevel?: string
  recommendedGrades?: string
  matchReason?: string
  shelfCode: string
  shelfDescription: string
  featured: boolean
  active: boolean
  popularity: number
  accent: string
}

export interface Category {
  id: string
  name: string
  icon: string
  active: boolean
  displayOrder: number
}

export interface Profile {
  uid: string
  displayName: string
  className: string
  studentNumber: string
  studentId?: string
  firstName?: string
  lastName?: string
  gradeLevel?: string
  interests: string[]
  createdAt: string
  lastActiveAt: string
}

export type MembershipStatus = 'active' | 'suspended' | 'graduated' | 'transferred'

export interface StudentMembership {
  studentId: string
  uid: string
  email: string
  status: MembershipStatus
  createdAt: string
  updatedAt: string
}

export type TermStatus = 'draft' | 'active' | 'closed'

export interface AcademicTerm {
  id: string
  name: string
  academicYear: number
  semester: 1 | 2
  startDate: string
  endDate: string
  status: TermStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface ReaderStats {
  uid: string
  lifetimeReadCount: number
  currentLevel: number
  updatedAt: string
  lastCreditedUserBookId: string | null
}

export interface UserBook {
  uid: string
  termId: string
  bookId: string
  loanId?: string | null
  status: BookStatus
  rating: number | null
  review: string | null
  moodAfterReading: string | null
  favoriteAspect: string | null
  likedAt: string | null
  startedAt: string | null
  readAt: string | null
  updatedAt: string
  lifetimeReadCredited?: boolean
  lifetimeCreditedAt?: string | null
}

export interface BookReview {
  id: string
  uid: string
  termId: string
  bookId: string
  displayName: string
  rating: number
  review: string
  moodAfterReading: string
  favoriteAspect: string
  readAt: string
  createdAt: string
}

export interface BookRatingSummary {
  ratingAverage: number
  ratingCount: number
}

export interface Reader {
  uid: string
  displayName: string
  className: string
  readCount: number
  likedCount: number
  eligible: boolean
  lastReadAt: string | null
}

export interface Settings {
  schoolName: string
  projectName: string
  termId: string
  termName: string
  announcement: string
  reviewMinChars: number
  leaderboardEnabled: boolean
}

export interface CatalogPayload {
  books: Book[]
  categories: Category[]
  settings: Settings
}

export interface SwipeHistoryItem {
  bookId: string
  previousStatus?: BookStatus
  action: SwipeAction
}

export type LoanStatus =
  | 'pending'
  | 'approved'
  | 'borrowed'
  | 'returned'
  | 'rejected'
  | 'cancelled'

export type LoanAuditAction =
  | 'request'
  | 'cancel'
  | 'approve'
  | 'reject'
  | 'pickup'
  | 'renew'
  | 'return'

export interface Loan {
  id: string
  uid: string
  termId: string
  bookId: string
  status: LoanStatus
  requestedAt: string
  approvedAt: string | null
  borrowedAt: string | null
  dueAt: string | null
  returnedAt: string | null
  rejectedAt: string | null
  cancelledAt: string | null
  approvedBy: string | null
  returnedBy: string | null
  renewCount: number
  loanDays: number
  adminNote: string
  studentDisplayName: string
  studentFirstName: string
  studentLastName: string
  studentClassroom: string
  studentNumber: string
  studentId: string
  bookTitle: string
  bookAuthor: string
  bookCoverUrl: string
  createdAt: string
  updatedAt: string
  lastAuditId: string
}

export interface BookLoanLock {
  bookId: string
  loanId: string
  status: 'approved' | 'borrowed'
  updatedAt: string
  lastAuditId: string
}
