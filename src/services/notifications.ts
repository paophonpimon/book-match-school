import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type { StudentNotification } from '../types'
import { currentStudentUser, db } from './firebase'

const MAX_BATCH_UPDATES = 450

export function studentNotificationErrorMessage(error: unknown, fallback = 'โหลดการแจ้งเตือนไม่สำเร็จ') {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message.trim() : ''
  if (code.includes('permission-denied')) {
    return 'ระบบแจ้งเตือนยังไม่ได้รับสิทธิ์จาก Firestore กรุณาติดต่อผู้ดูแลเพื่ออัปเดตกฎความปลอดภัย'
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'เชื่อมต่อระบบแจ้งเตือนไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง'
  }
  return message || fallback
}

function requireNotificationContext() {
  const user = currentStudentUser()
  if (!db || !user) throw new Error('กรุณาเข้าสู่ระบบก่อนเปิดการแจ้งเตือน')
  return { firestore: db, user }
}

function asIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  return typeof value === 'string' ? value : new Date(0).toISOString()
}

function normalizeNotification(snapshot: QueryDocumentSnapshot<DocumentData>): StudentNotification {
  const data = snapshot.data()
  if (data.type !== 'loan_approved') throw new Error(`ประเภทการแจ้งเตือน ${snapshot.id} ไม่ถูกต้อง`)
  return {
    id: snapshot.id,
    uid: String(data.uid ?? ''),
    type: data.type,
    loanId: String(data.loanId ?? ''),
    bookId: String(data.bookId ?? ''),
    bookTitle: String(data.bookTitle ?? ''),
    createdAt: asIso(data.createdAt),
    readAt: data.readAt == null ? null : asIso(data.readAt),
  }
}

export function subscribeStudentNotifications(
  uid: string,
  onNotifications: (notifications: StudentNotification[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { firestore, user } = requireNotificationContext()
  if (user.uid !== uid) throw new Error('ไม่มีสิทธิ์อ่านการแจ้งเตือนของผู้ใช้อื่น')

  return onSnapshot(query(
    collection(firestore, 'studentNotifications'),
    where('uid', '==', uid),
  ), (snapshot) => {
    try {
      const notifications = snapshot.docs
        .map(normalizeNotification)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      onNotifications(notifications)
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)))
    }
  }, (error) => onError(new Error(studentNotificationErrorMessage(error))))
}

export async function markStudentNotificationRead(notification: StudentNotification) {
  if (notification.readAt) return false
  const { firestore, user } = requireNotificationContext()
  if (notification.uid !== user.uid) throw new Error('ไม่มีสิทธิ์แก้การแจ้งเตือนของผู้ใช้อื่น')
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, 'studentNotifications', notification.id), { readAt: serverTimestamp() })
  await batch.commit()
  return true
}

export async function markAllStudentNotificationsRead(notifications: StudentNotification[]) {
  const { firestore, user } = requireNotificationContext()
  const unread = notifications.filter((item) => !item.readAt)
  if (unread.some((item) => item.uid !== user.uid)) throw new Error('ไม่มีสิทธิ์แก้การแจ้งเตือนของผู้ใช้อื่น')

  for (let start = 0; start < unread.length; start += MAX_BATCH_UPDATES) {
    const batch = writeBatch(firestore)
    unread.slice(start, start + MAX_BATCH_UPDATES).forEach((item) => {
      batch.update(doc(firestore, 'studentNotifications', item.id), { readAt: serverTimestamp() })
    })
    await batch.commit()
  }
  return unread.length
}
