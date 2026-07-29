import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
const adminAuth = readFileSync(resolve(process.cwd(), 'src/services/adminAuth.ts'), 'utf8')
const adminPage = readFileSync(resolve(process.cwd(), 'src/features/admin/AdminPage.tsx'), 'utf8')
const adminLoans = readFileSync(resolve(process.cwd(), 'src/features/admin/AdminLoanManagement.tsx'), 'utf8')

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
    expect(loanBlock).toContain('validLoanSchema(loanId)')
    expect(loanBlock).toContain('validLoanStatusShape()')
    expect(loanBlock).toContain('loanImmutableFieldsValid()')
    expect(loanBlock).toContain('validAdminLoanUpdate()')
    expect(loanBlock).not.toContain('allow update: if isAdmin();')
  })

  it('requires every audit log to match the resulting loan document', () => {
    expect(rules).toContain('function validLoanAuditCreate(auditId)')
    expect(rules).toContain('loan.lastAuditId == auditId')
    expect(rules).toContain('loan.status == request.resource.data.nextStatus')
  })

  it('never permits permanent deletion of loan history', () => {
    const loanBlock = rules.slice(rules.indexOf('match /loans/{loanId}'), rules.indexOf('function validActiveKey'))
    expect(loanBlock).toContain('allow delete: if false')
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
