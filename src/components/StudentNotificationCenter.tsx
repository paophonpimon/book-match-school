import { Bell, BellRing, CheckCheck, LoaderCircle, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import {
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
  studentNotificationErrorMessage,
  subscribeStudentNotifications,
} from '../services/notifications'
import type { StudentNotification } from '../types'

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function StudentNotificationCenter() {
  const { authUser } = useApp()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<StudentNotification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(Boolean(authUser))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const unreadCount = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications])

  useEffect(() => {
    if (!authUser) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeStudentNotifications(authUser.uid, (items) => {
      setNotifications(items)
      setLoading(false)
      setError('')
    }, (nextError) => {
      setError(nextError.message || 'โหลดการแจ้งเตือนไม่สำเร็จ')
      setLoading(false)
    })
    return unsubscribe
  }, [authUser])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function openNotification(notification: StudentNotification) {
    setSaving(true)
    setError('')
    try {
      await markStudentNotificationRead(notification)
      setOpen(false)
      navigate('/loans')
    } catch (nextError) {
      setError(studentNotificationErrorMessage(nextError, 'บันทึกสถานะการแจ้งเตือนไม่สำเร็จ'))
    } finally {
      setSaving(false)
    }
  }

  async function markAllRead() {
    setSaving(true)
    setError('')
    try {
      await markAllStudentNotificationsRead(notifications)
    } catch (nextError) {
      setError(studentNotificationErrorMessage(nextError, 'บันทึกสถานะการแจ้งเตือนไม่สำเร็จ'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="student-notifications">
      <button
        className="icon-button notification-bell"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unreadCount ? `การแจ้งเตือนที่ยังไม่ได้อ่าน ${unreadCount} รายการ` : 'การแจ้งเตือน'}
      >
        {unreadCount ? <BellRing /> : <Bell />}
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="notification-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-panel-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div><p className="eyebrow">อัปเดตจากห้องสมุด</p><h2 id="notification-panel-title">การแจ้งเตือน</h2></div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="ปิดการแจ้งเตือน"><X /></button>
            </header>
            <div className="notification-panel__toolbar">
              <span>{unreadCount ? `ยังไม่ได้อ่าน ${unreadCount} รายการ` : 'อ่านครบแล้ว'}</span>
              <button type="button" onClick={() => void markAllRead()} disabled={!unreadCount || saving}>
                {saving ? <LoaderCircle className="spin" /> : <CheckCheck />} อ่านทั้งหมดแล้ว
              </button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="notification-list">
              {loading ? (
                <div className="notification-empty"><LoaderCircle className="spin" /><p>กำลังโหลดการแจ้งเตือน…</p></div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty"><Bell /><p>ยังไม่มีการแจ้งเตือน</p></div>
              ) : notifications.map((notification) => (
                <button
                  className={`notification-item${notification.readAt ? '' : ' notification-item--unread'}`}
                  key={notification.id}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  disabled={saving}
                >
                  <span className="notification-item__icon"><BellRing /></span>
                  <span className="notification-item__content">
                    <strong>คำขอยืมได้รับการอนุมัติแล้ว</strong>
                    <span>“{notification.bookTitle}” พร้อมดำเนินการยืมต่อ</span>
                    <small>{formatNotificationDate(notification.createdAt)}</small>
                  </span>
                  {!notification.readAt && <i aria-label="ยังไม่ได้อ่าน" />}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
