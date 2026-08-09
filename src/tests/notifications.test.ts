import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const loans = readFileSync(resolve(process.cwd(), 'src/services/loans.ts'), 'utf8')
const notifications = readFileSync(resolve(process.cwd(), 'src/services/notifications.ts'), 'utf8')
const notificationCenter = readFileSync(resolve(process.cwd(), 'src/components/StudentNotificationCenter.tsx'), 'utf8')
const pageHeader = readFileSync(resolve(process.cwd(), 'src/components/PageHeader.tsx'), 'utf8')
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')

describe('student loan approval notifications', () => {
  it('creates one deterministic notification in the existing approval transaction', () => {
    expect(loans).toContain("notificationRef: doc(firestore, 'studentNotifications', loan.id)")
    expect(loans).toContain('transaction.set(refs.notificationRef')
    expect(loans).toContain("type: 'loan_approved'")
    expect(loans).toContain('createdAt: timestamp')
    expect(loans).toContain('readAt: null')
  })

  it('uses an owner-scoped realtime query and exposes listener cleanup', () => {
    expect(notifications).toContain('export function subscribeStudentNotifications')
    expect(notifications).toContain("where('uid', '==', uid)")
    expect(notifications).toMatch(/return onSnapshot\(query\(/)
    expect(notificationCenter).toContain('return unsubscribe')
    expect(notifications).toContain("code.includes('permission-denied')")
    expect(notifications).toContain('ระบบแจ้งเตือนยังไม่ได้รับสิทธิ์จาก Firestore')
  })

  it('adds the bell, unread badge, responsive panel and mark-all action to the shared header', () => {
    expect(pageHeader).toContain('<StudentNotificationCenter />')
    expect(notificationCenter).toContain('notification-badge')
    expect(notificationCenter).toContain('notification-panel')
    expect(notificationCenter).toContain('อ่านทั้งหมดแล้ว')
    expect(notificationCenter).toContain("navigate('/loans')")
  })

  it('limits reads and read-state updates to the notification owner', () => {
    const block = rules.slice(rules.indexOf('function validLoanApprovedNotification'), rules.indexOf('function validBookCore'))
    expect(block).toContain("request.resource.data.type == 'loan_approved'")
    expect(block).toContain('notificationId == request.resource.data.loanId')
    expect(block).toContain("loan.status == 'approved'")
    expect(block).toContain('loan.approvedAt == request.time')
    expect(block).toContain('resource.data.uid == request.auth.uid')
    expect(block).toContain("affectedKeys().hasOnly(['readAt'])")
    expect(block).toContain('resource.data.readAt == null')
    expect(block).toContain('request.resource.data.readAt == request.time')
    expect(block).toContain('allow delete: if false')
    expect(block).not.toContain('allow write: if signedIn()')
  })
})
