import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { BottomNav } from './BottomNav'
import { DemoBanner } from './DemoBanner'
import { validateStudentProfile } from '../utils/profile'

export function ProtectedShell() {
  const { authUser, profile, membership, currentTerm, currentTermError, loading, levelUp, dismissLevelUp } = useApp()
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
    <div className="app-shell">
      <DemoBanner />
      <main className="app-main"><Outlet /></main>
      <BottomNav />
      {levelUp && (
        <div className="dialog-backdrop" role="presentation">
          <section className="level-up-dialog" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
            <span aria-hidden="true">✨</span>
            <p className="eyebrow">เลเวลใหม่</p>
            <h2 id="level-up-title">เลเวล {levelUp.level} — {levelUp.name}</h2>
            <p>ยอดเยี่ยม! การอ่านเล่มล่าสุดพาคุณขึ้นสู่ระดับใหม่แล้ว</p>
            <button className="button button--primary" type="button" onClick={dismissLevelUp}>รับทราบ</button>
          </section>
        </div>
      )}
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="loading-screen" aria-live="polite">
      <div className="skeleton skeleton--logo" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--card" />
    </div>
  )
}
