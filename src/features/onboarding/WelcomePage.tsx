import { useEffect, useId, useState, type FormEvent } from 'react'
import { CircleHelp, KeyRound, LoaderCircle, ShieldCheck, UserRoundCheck, X } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { LoadingScreen } from '../../components/AppShell'
import { getStudentEntryRoute } from '../../utils/studentRouting'

function GoogleMark() {
  return (
    <span className="google-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path fill="#4285f4" d="M20.64 12.21c0-.64-.06-1.26-.16-1.85H12v3.49h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.91c1.7-1.57 2.68-3.87 2.68-6.61Z" />
        <path fill="#34a853" d="M12 21c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.59-5.04-3.72H3.96v2.34A9 9 0 0 0 12 21Z" />
        <path fill="#fbbc05" d="M6.96 13.7A5.4 5.4 0 0 1 6.68 12c0-.59.1-1.17.28-1.7V7.96h-3A9 9 0 0 0 3 12c0 1.45.35 2.83.96 4.04l3-2.34Z" />
        <path fill="#ea4335" d="M12 6.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C16.46 3.89 14.43 3 12 3a9 9 0 0 0-8.04 4.96l3 2.34C7.67 8.16 9.66 6.58 12 6.58Z" />
      </svg>
    </span>
  )
}

export function WelcomePage() {
  const {
    authUser,
    profile,
    loading,
    syncing,
    syncError,
    currentTerm,
    currentTermError,
    signInWithGoogle,
    signInWithStudentId,
  } = useApp()
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const forgotPasswordTitleId = useId()
  const entryRoute = getStudentEntryRoute({
    loading,
    signedIn: Boolean(authUser),
    hasActiveTerm: Boolean(currentTerm),
    hasProfile: Boolean(profile),
  })
  useEffect(() => {
    if (!forgotPasswordOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setForgotPasswordOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [forgotPasswordOpen])

  if (entryRoute === 'loading') return <LoadingScreen />
  if (entryRoute === 'home') return <Navigate to="/home" replace />
  if (entryRoute === 'setup') return <Navigate to="/setup" replace />

  async function submitStudentLogin(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    try {
      await signInWithStudentId(studentId, password)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง')
    }
  }

  return (
    <main className="welcome-page">
      <div className="welcome-spark welcome-spark--top-left" aria-hidden="true">✦</div>
      <div className="welcome-spark welcome-spark--top-right" aria-hidden="true">✦</div>
      <div className="welcome-spark welcome-spark--middle" aria-hidden="true">✦</div>
      <div className="welcome-botanical welcome-botanical--top" aria-hidden="true"><i /><i /><i /></div>
      <div className="welcome-botanical welcome-botanical--bottom" aria-hidden="true"><i /><i /><i /></div>
      <div className="welcome-flower" aria-hidden="true">✿</div>
      <section className="welcome-card">
        <img
          className="welcome-wordmark"
          src="/assets/book-match/logos/book-match-wordmark.webp"
          alt="เล่มที่ใช่ Book Match"
          fetchPriority="high"
          decoding="async"
        />
        <div className="welcome-heading">
          <p><span>✦</span> ค้นพบหนังสือที่ตรงกับคุณ <span>✦</span></p>
          <h1>หนังสือที่ใช่<br /><em>สำหรับอารมณ์วันนี้</em></h1>
        </div>
        <div className="welcome-login-panel">
          <div className="welcome-login-icon" aria-hidden="true"><KeyRound /></div>
          <h2>เข้าสู่ Book Match</h2>
          <p className="welcome-copy">ใช้เลขประจำตัวนักเรียนเพื่อเข้าสู่ระบบ</p>
          {(loginError || syncError || currentTermError) && <p className="form-error" role="alert">{loginError || syncError || currentTermError}</p>}
          {!authUser && (
            <>
              <form className="welcome-student-login" onSubmit={submitStudentLogin} noValidate>
                <label>
                  เลขประจำตัวนักเรียน
                  <input required inputMode="numeric" autoComplete="username" maxLength={6} value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="กรอกเลขประจำตัวนักเรียน" />
                </label>
                <label>
                  รหัสผ่าน
                  <input required type="password" autoComplete="current-password" maxLength={64} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="กรอกรหัสผ่าน" />
                  <span className="welcome-password-help">เข้าใช้ครั้งแรก? ให้กรอกเลขประจำตัวนักเรียนซ้ำอีกครั้ง</span>
                  <span className="welcome-password-example">เช่น เลขประจำตัว 07143 → รหัสผ่านครั้งแรก 07143</span>
                </label>
                <button className="welcome-forgot-button" type="button" onClick={() => setForgotPasswordOpen(true)}>ลืมรหัสผ่าน?</button>
                <button className="button button--primary button--wide welcome-student-button" type="submit" disabled={syncing}>
                  {syncing ? <><LoaderCircle className="spin" /> กำลังเข้าสู่ระบบ…</> : <><UserRoundCheck /> เข้าสู่ระบบ</>}
                </button>
              </form>
              <div className="welcome-login-divider"><span>หรือ</span></div>
              <p className="welcome-legacy-label">สมาชิกเดิมที่เคยสมัครด้วย Google</p>
              <button className="button button--secondary button--wide welcome-google-button" type="button" onClick={() => void signInWithGoogle()} disabled={syncing}>
                <GoogleMark /> เข้าสู่ระบบด้วย Google
              </button>
            </>
          )}
          <div className="welcome-note"><ShieldCheck /> <span>บัญชีเดิมและประวัติการอ่านของคุณยังคงปลอดภัย</span></div>
        </div>
      </section>
      {forgotPasswordOpen && (
        <div className="confirmation-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setForgotPasswordOpen(false)
        }}>
          <section className="confirmation-dialog welcome-help-dialog" role="dialog" aria-modal="true" aria-labelledby={forgotPasswordTitleId}>
            <button className="confirmation-dialog__close" type="button" onClick={() => setForgotPasswordOpen(false)} aria-label="ปิด"><X /></button>
            <span className="confirmation-dialog__icon" aria-hidden="true"><CircleHelp /></span>
            <p className="eyebrow">ช่วยเหลือการเข้าสู่ระบบ</p>
            <h2 id={forgotPasswordTitleId}>ลืมรหัสผ่านใช่ไหม?</h2>
            <p>ไม่เป็นไร 😊 กรุณาแจ้งบรรณารักษ์เพื่อขอรีเซ็ตรหัสผ่าน</p>
            <p>เตรียมชื่อ–นามสกุล และเลขประจำตัวนักเรียน เพื่อให้บรรณารักษ์ตรวจสอบบัญชี</p>
            <div className="confirmation-dialog__actions welcome-help-dialog__actions">
              <button className="button button--primary" type="button" onClick={() => setForgotPasswordOpen(false)}>เข้าใจแล้ว</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
