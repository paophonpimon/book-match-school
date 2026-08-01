import { LoaderCircle, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { Brand } from '../../components/Brand'
import { LoadingScreen } from '../../components/AppShell'
import { getStudentEntryRoute } from '../../utils/studentRouting'
import welcomeBookArt from '../../../img/logo-book.png'

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
  } = useApp()
  const entryRoute = getStudentEntryRoute({
    loading,
    signedIn: Boolean(authUser),
    hasActiveTerm: Boolean(currentTerm),
    hasProfile: Boolean(profile),
  })
  if (entryRoute === 'loading') return <LoadingScreen />
  if (entryRoute === 'home') return <Navigate to="/home" replace />
  if (entryRoute === 'setup') return <Navigate to="/setup" replace />
  return (
    <main className="welcome-page">
      <div className="welcome-spark welcome-spark--top-left" aria-hidden="true">✦</div>
      <div className="welcome-spark welcome-spark--top-right" aria-hidden="true">✦</div>
      <div className="welcome-spark welcome-spark--middle" aria-hidden="true">✦</div>
      <div className="welcome-botanical welcome-botanical--top" aria-hidden="true"><i /><i /><i /></div>
      <div className="welcome-botanical welcome-botanical--bottom" aria-hidden="true"><i /><i /><i /></div>
      <div className="welcome-flower" aria-hidden="true">✿</div>
      <section className="welcome-card">
        <Brand />
        <div className="welcome-art" aria-hidden="true"><img src={welcomeBookArt} alt="" fetchPriority="high" decoding="async" /></div>
        <div className="welcome-heading">
          <p><span>✦</span> ค้นพบหนังสือที่ตรงกับคุณ <span>✦</span></p>
          <h1>หนังสือที่ใช่<br /><em>สำหรับอารมณ์วันนี้</em></h1>
        </div>
        <div className="welcome-login-panel">
          <div className="welcome-login-icon" aria-hidden="true"><UserRoundCheck /></div>
          <p className="welcome-copy">เข้าสู่ระบบเพื่อบันทึกประวัติการอ่าน<br />การยืม และระดับนักอ่าน</p>
          {(syncError || currentTermError) && <p className="form-error" role="alert">{syncError || currentTermError}</p>}
          {!authUser && (
            <button className="button button--primary button--wide welcome-google-button" type="button" onClick={() => void signInWithGoogle()} disabled={syncing}>
              {syncing ? <><LoaderCircle className="spin" /> กำลังเข้าสู่ระบบ…</> : <><GoogleMark /> เข้าสู่ระบบด้วย Google</>}
            </button>
          )}
          <div className="welcome-note"><ShieldCheck /> <span>ใช้บัญชี Google เดิมทุกครั้ง<br />เพื่อรักษาประวัติการอ่านและการยืม</span></div>
        </div>
      </section>
    </main>
  )
}
