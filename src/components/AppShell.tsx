import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { BookHeart, CheckCircle2, X } from 'lucide-react'
import { useApp } from '../app/AppContext'
import { BottomNav } from './BottomNav'
import { DemoBanner } from './DemoBanner'
import { validateStudentProfile } from '../utils/profile'

export function ProtectedShell() {
  const {
    authUser,
    profile,
    membership,
    currentTerm,
    currentTermError,
    loading,
    levelUp,
    loanApprovalToast,
    dismissLevelUp,
    dismissLoanApprovalToast,
  } = useApp()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!authUser) return <Navigate to="/welcome" state={{ from: location.pathname }} replace />
  if (currentTermError || !currentTerm) {
    return <main className="standalone-page"><section className="form-card"><h1>ระบบอยู่ระหว่างตั้งค่า</h1><p>{currentTermError ?? 'ยังไม่ได้กำหนดภาคเรียนปัจจุบัน กรุณาติดต่อผู้ดูแล'}</p></section></main>
  }
  if (!profile) return <Navigate to="/setup" state={{ from: location.pathname }} replace />
  if (!membership) return <Navigate to="/setup" state={{ from: location.pathname }} replace />
  const profileError = validateStudentProfile({
    studentId: profile.studentId ?? '',
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    gradeLevel: profile.gradeLevel ?? '',
    studentNumber: profile.studentNumber,
    displayName: profile.displayName,
  })
  if (profileError) return <Navigate to="/setup" state={{ from: location.pathname, profileError }} replace />
  return (
    <div className={`app-shell${location.pathname === '/discover' ? ' app-shell--discover' : ''}`}>
      <DemoBanner />
      <main className="app-main"><Outlet /></main>
      <BottomNav />
      {loanApprovalToast && (
        <aside className="loan-approval-toast" role="status" aria-live="polite">
          <CheckCircle2 aria-hidden="true" />
          <span>
            <strong>คำขอยืมได้รับการอนุมัติแล้ว</strong>
            <small>{loanApprovalToast.bookTitle} พร้อมดำเนินการยืมต่อ</small>
          </span>
          <button type="button" onClick={dismissLoanApprovalToast} aria-label="ปิดข้อความแจ้งเตือน"><X /></button>
        </aside>
      )}
      {levelUp && (
        <div className="dialog-backdrop" role="presentation">
          <section className="level-up-dialog" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
            <span className="level-up-dialog__spark level-up-dialog__spark--left" aria-hidden="true">✦</span>
            <span className="level-up-dialog__spark level-up-dialog__spark--right" aria-hidden="true">✦</span>
            <div className="level-up-dialog__art" aria-hidden="true">
              <img src="/assets/book-match/profile/profile-level-book.png" alt="" />
              <strong>{levelUp.level}</strong>
            </div>
            <p className="eyebrow">ปลดล็อกเลเวลใหม่</p>
            <h2 id="level-up-title">เลเวล {levelUp.level} — {levelUp.name}</h2>
            <p className="level-up-dialog__message">ยอดเยี่ยม! การอ่านเล่มล่าสุดพาคุณขึ้นสู่ระดับใหม่แล้ว</p>
            <button className="button button--primary button--wide" type="button" onClick={dismissLevelUp}>รับทราบ</button>
          </section>
        </div>
      )}
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label="กำลังโหลด Book Match">
      <div className="loading-screen__glow" aria-hidden="true" />
      <div className="loading-screen__mark" aria-hidden="true"><BookHeart /></div>
      <strong>กำลังเปิดเล่มที่ใช่</strong>
      <p>เตรียมหนังสือและข้อมูลนักอ่านของคุณสักครู่</p>
      <div className="loading-screen__progress" aria-hidden="true"><span /></div>
      <div className="loading-screen__books" aria-hidden="true"><i /><i /><i /><i /></div>
    </div>
  )
}
