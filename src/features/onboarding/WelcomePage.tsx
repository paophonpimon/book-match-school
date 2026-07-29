import { BookOpen, LoaderCircle, LogIn, Sparkles } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { Brand } from '../../components/Brand'
import { LoadingScreen } from '../../components/AppShell'
import { getStudentEntryRoute } from '../../utils/studentRouting'

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
      <div className="welcome-decoration welcome-decoration--one">✦</div>
      <div className="welcome-decoration welcome-decoration--two">❋</div>
      <section className="welcome-card">
        <Brand />
        <div className="welcome-art" aria-hidden="true"><span><BookOpen size={78} strokeWidth={1.35} /></span><i>✦</i><b>❋</b></div>
        <p className="eyebrow">ห้องสมุดที่เริ่มจากความรู้สึกของคุณ</p>
        <h1>หนังสือที่ใช่<br /><em>สำหรับอารมณ์ของคุณ</em></h1>
        <p className="welcome-copy">เข้าสู่ระบบด้วยบัญชี Google เพื่อเก็บประวัติการอ่าน การยืม และระดับนักอ่านไว้อย่างถาวร</p>
        {(syncError || currentTermError) && <p className="form-error" role="alert">{syncError || currentTermError}</p>}
        {!authUser && (
          <button className="button button--primary button--wide" type="button" onClick={() => void signInWithGoogle()} disabled={syncing}>
            {syncing ? <><LoaderCircle className="spin" /> กำลังเข้าสู่ระบบ…</> : <><LogIn /> เข้าสู่ระบบด้วย Google</>}
          </button>
        )}
        <div className="welcome-note"><Sparkles size={16} /> โปรดใช้บัญชี Google เดิมทุกครั้ง เพื่อรักษาประวัติการอ่านและการยืม</div>
      </section>
    </main>
  )
}
