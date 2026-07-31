import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
const adminAuth = readFileSync(resolve(process.cwd(), 'src/services/adminAuth.ts'), 'utf8')
const adminPage = readFileSync(resolve(process.cwd(), 'src/features/admin/AdminPage.tsx'), 'utf8')
const adminLoans = readFileSync(resolve(process.cwd(), 'src/features/admin/AdminLoanManagement.tsx'), 'utf8')
const firebaseService = readFileSync(resolve(process.cwd(), 'src/services/firebase.ts'), 'utf8')

describe('loan Firestore security boundary', () => {
  it('keeps the exact verified Admin identity check', () => {
    expect(rules).toContain("request.auth.token.email_verified == true")
    expect(rules).toContain("request.auth.token.email == 'paopornpimon@gmail.com'")
  })

  it('limits student loan reads to the owner', () => {
    expect(rules).toContain("resource.data.uid == request.auth.uid")
  })

  it('allows student cancellation only from pending', () => {
    expect(rules).toContain("resource.data.status == 'pending'")
    expect(rules).toContain("request.resource.data.status == 'cancelled'")
  })

  it('does not allow general users to write book loan locks', () => {
    const lockBlock = rules.slice(rules.indexOf('match /bookLoanLocks'), rules.indexOf('function validLoanAuditCreate'))
    expect(lockBlock).toContain('allow create: if isAdmin()')
    expect(lockBlock).toContain('allow update: if isAdmin()')
    expect(lockBlock).not.toContain('allow write: if signedIn()')
  })

  it('requires active keys and book locks to match the same loan after an Admin transaction', () => {
    expect(rules).toContain('function activeKeyMatchesLoan()')
    expect(rules).toContain('function bookLoanLockMatchesLoan(bookId)')
    expect(rules).toContain('loan.lastAuditId == request.resource.data.lastAuditId')
  })

  it('keeps Admin loan updates narrow without a broad write grant', () => {
    const loanBlock = rules.slice(rules.indexOf('match /loans/{loanId}'), rules.indexOf('function validActiveKey'))
    expect(rules).toContain('function validAdminLoanUpdate(loanId)')
    expect(rules).toContain('request.resource.data.updatedAt == request.time')
    expect(rules).toContain("request.resource.data.diff(resource.data).affectedKeys().hasOnly")
    expect(loanBlock).toContain('validAdminLoanUpdate(loanId)')
    expect(loanBlock).toContain('validLoanSchema(loanId)')
    expect(loanBlock).toContain('validLoanStatusShape()')
    expect(loanBlock).not.toContain('allow update: if isAdmin();')
  })

  it('keeps request audits deterministic without a circular loan lookup', () => {
    expect(rules).toContain('function validLoanAuditCreate(auditId)')
    expect(rules).toContain("auditId == request.resource.data.loanId")
    expect(rules).toContain("request.resource.data.actorUid == request.auth.uid")
    const auditBlock = rules.slice(rules.indexOf('function validLoanAuditCreate'), rules.indexOf('match /loanAuditLogs'))
    expect(auditBlock).not.toContain('getAfter(loanPath)')
  })

  it('never permits permanent deletion of loan history', () => {
    const loanBlock = rules.slice(rules.indexOf('match /loans/{loanId}'), rules.indexOf('function validActiveKey'))
    expect(loanBlock).toContain('allow delete: if false')
  })

  it('requires a matching borrowed or returned loan before reading and review', () => {
    expect(rules).toContain('function validLoanForReading(uid, termId, bookId, loanId)')
    expect(rules).toContain("loan.status in ['borrowed', 'returned']")
    expect(rules).toContain('loan.uid == uid')
    expect(rules).toContain('loan.termId == termId')
    expect(rules).toContain('loan.bookId == bookId')
    expect(rules).toContain("request.resource.data.status in ['liked', 'saved', 'reading'])")
    expect(rules).not.toContain("request.resource.data.status in ['liked', 'saved', 'reading', 'read'])")
  })

  it('does not let the completion transaction skip the reading state', () => {
    expect(firebaseService).toContain("if (previousStatus !== 'reading')")
    expect(firebaseService).toContain('ต้องเริ่มอ่านหนังสือหลังรับจากห้องสมุดก่อนจึงจะส่งรีวิวได้')
  })

  it('publishes only a validated review projection without exposing profile fields', () => {
    const reviewBlock = rules.slice(rules.indexOf('function validBookReview'), rules.indexOf('function validProgress'))
    expect(reviewBlock).toContain('match /bookReviews/{reviewId}')
    expect(reviewBlock).toContain('allow read: if signedIn()')
    expect(reviewBlock).toContain('allow create: if validBookReview(reviewId)')
    expect(reviewBlock).toContain('allow update, delete: if false')
    expect(reviewBlock).toContain("completedBook.status == 'read'")
    expect(reviewBlock).toContain('request.resource.data.review == completedBook.review')
    expect(reviewBlock).not.toContain('studentId')
    expect(reviewBlock).not.toContain('studentNumber')
    expect(firebaseService).toContain("transaction.set(reviewRef")
    expect(firebaseService).toContain('publishOwnBookReviewRemote')
  })

  it('refreshes and verifies Admin ID-token claims before approval writes', () => {
    expect(adminAuth).toContain('getIdTokenResult(true)')
    expect(adminAuth).toContain("token.claims.email_verified !== true")
  })

  it('uses an in-page responsive confirmation flow and mobile Admin navigation', () => {
    expect(adminPage).toContain('className="admin-mobile-nav"')
    expect(adminLoans).toContain('className="admin-loan-dialog"')
    expect(adminLoans).not.toContain('window.prompt')
    expect(adminLoans).not.toContain('window.confirm')
  })
})
