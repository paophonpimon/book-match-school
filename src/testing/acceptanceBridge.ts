import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getAdminAuthForAcceptance } from '../services/adminAuth'
import { archiveBookAsAdmin, createBookAsAdmin, restoreBookAsAdmin, updateBookAsAdmin } from '../services/adminAuth'
import { updateMembershipStatusAsAdmin } from '../services/adminStudents'
import { createTermAsAdmin, deleteDraftTermAsAdmin, listTermsAsAdmin, loadTermReportAsAdmin } from '../services/adminTerms'
import { auth } from '../services/firebase'
import { approveLoanAsAdmin, loadAdminLoans, pickupLoanAsAdmin, rejectLoanAsAdmin, renewLoanAsAdmin, returnLoanAsAdmin } from '../services/loans'

export interface AcceptanceBridge {
  signInStudent(email: string, password: string): Promise<{ uid: string; email: string | null }>
  signOutStudent(): Promise<void>
  signInAdmin(email: string, password: string): Promise<{ uid: string; email: string | null }>
  signOutAdmin(): Promise<void>
  transitionLoan(loanId: string, action: 'approve' | 'reject' | 'pickup' | 'renew' | 'return'): Promise<unknown>
  exerciseAdminData(studentId: string): Promise<{ bookId: string; auditExpected: number; reportMembers: number }>
}

declare global {
  interface Window {
    __BOOK_MATCH_ACCEPTANCE__?: AcceptanceBridge
  }
}

export function installAcceptanceBridge() {
  if (!auth) throw new Error('Student Authentication ยังไม่พร้อมใช้งาน')
  const studentAuth = auth
  window.__BOOK_MATCH_ACCEPTANCE__ = {
    async signInStudent(email, password) {
      await setPersistence(studentAuth, browserLocalPersistence)
      const credential = await signInWithEmailAndPassword(studentAuth, email, password)
      return { uid: credential.user.uid, email: credential.user.email }
    },
    signOutStudent: () => signOut(studentAuth),
    async signInAdmin(email, password) {
      const adminAuth = getAdminAuthForAcceptance()
      await setPersistence(adminAuth, browserLocalPersistence)
      const credential = await signInWithEmailAndPassword(adminAuth, email, password)
      return { uid: credential.user.uid, email: credential.user.email }
    },
    signOutAdmin: () => signOut(getAdminAuthForAcceptance()),
    async transitionLoan(loanId, action) {
      const loan = (await loadAdminLoans()).find((item) => item.id === loanId)
      if (!loan) throw new Error(`ไม่พบ loan ${loanId}`)
      if (action === 'approve') return approveLoanAsAdmin(loan, 7)
      if (action === 'reject') return rejectLoanAsAdmin(loan, 'E2E acceptance rejection')
      if (action === 'pickup') return pickupLoanAsAdmin(loan, 7)
      if (action === 'renew') return renewLoanAsAdmin(loan)
      return returnLoanAsAdmin(loan)
    },
    async exerciseAdminData(studentId) {
      const input = {
        title: 'TEST Acceptance Admin Book', author: 'E2E Author', categoryCode: '000', category: 'ความรู้ทั่วไป',
        description: 'หนังสือจำลองสำหรับทดสอบ create update archive restore ใน Emulator เท่านั้น',
        coverUrl: 'http://127.0.0.1:4173/acceptance-cover.svg', audioUrl: '', isbn: 'TEST-ISBN',
        callNumber: 'TEST-000', tags: ['TEST'], moods: ['อยากได้ความรู้'], readingLevel: 'ปานกลาง',
        recommendedGrades: 'ม.1-ม.6', matchReason: 'Automated acceptance test', active: true,
      }
      const bookId = await createBookAsAdmin(input)
      await updateBookAsAdmin(bookId, { ...input, title: 'TEST Acceptance Admin Book Updated' })
      await archiveBookAsAdmin(bookId)
      await restoreBookAsAdmin(bookId)
      await updateMembershipStatusAsAdmin(studentId, 'suspended')
      await updateMembershipStatusAsAdmin(studentId, 'active')
      await createTermAsAdmin({
        id: '2999-2', name: 'TEST Draft Acceptance', academicYear: 2999, semester: 2,
        startDate: '2999-06-01', endDate: '2999-10-31',
      })
      await deleteDraftTermAsAdmin('2999-2')
      const currentTerm = (await listTermsAsAdmin()).find((term) => term.id === '2999-1')
      if (!currentTerm) throw new Error('ไม่พบภาคเรียน E2E ปัจจุบัน')
      const report = await loadTermReportAsAdmin(currentTerm)
      return { bookId, auditExpected: 4, reportMembers: report.studentCount }
    },
  }
}
