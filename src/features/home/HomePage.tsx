import { ArrowRight, BookHeart, BookOpen, Sparkles, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'

export function HomePage() {
  const { profile, settings, userBooks } = useApp()
  const values = Object.values(userBooks)
  const reading = values.filter((item) => item.status === 'reading').length
  const read = values.filter((item) => item.status === 'read').length
  return (
    <div className="page home-page">
      <PageHeader action={<span className="avatar">{profile?.displayName.charAt(0)}</span>} />
      <section className="home-hero">
        <div><p className="eyebrow">สวัสดี {profile?.displayName} 👋</p><h1>วันนี้หัวใจอยาก<br /><em>เปิดอ่านเรื่องอะไร?</em></h1><p>{settings.announcement}</p></div>
        <div className="floating-books" aria-hidden="true"><span>📕</span><span>📗</span><span>📘</span></div>
      </section>
      <Link className="start-card" to="/mood"><span className="feature-icon feature-icon--coral"><Sparkles /></span><span><strong>เริ่มปัดหาเล่ม</strong><small>เลือกจากอารมณ์ของคุณวันนี้</small></span><ArrowRight /></Link>
      <div className="section-heading"><h2>มุมของนักอ่าน</h2><Link to="/shelf">ดูทั้งหมด</Link></div>
      <section className="stat-grid">
        <Link to="/shelf" className="stat-card stat-card--green"><BookOpen /><strong>{reading}</strong><span>กำลังอ่าน</span></Link>
        <Link to="/shelf" className="stat-card stat-card--yellow"><BookHeart /><strong>{read}</strong><span>อ่านจบแล้ว</span></Link>
        <Link to="/leaderboard" className="stat-card stat-card--blue"><Trophy /><strong>#{Math.max(1, 37 - read)}</strong><span>อันดับของฉัน</span></Link>
      </section>
      <section className="quote-card"><span>“</span><p>หนังสือหนึ่งเล่ม อาจพาเราไปได้ไกลกว่าที่คิด</p><i>ชวนเพื่อนมาอ่านด้วยกันนะ</i></section>
    </div>
  )
}
