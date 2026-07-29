import { Award, BookHeart, BookOpen, ChevronRight, Library, LogOut, Pencil, Settings, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { getReaderLevel, getTermReaderRank } from '../../utils/readerLevels'

const membershipLabels = {
  active: 'ใช้งาน',
  suspended: 'ระงับชั่วคราว',
  graduated: 'สำเร็จการศึกษา',
  transferred: 'ย้ายสถานศึกษา',
}

export function ProfilePage() {
  const {
    authUser,
    profile,
    membership,
    readerStats,
    currentTerm,
    readers,
    userBooks,
    categories,
    resetDevice,
  } = useApp()
  const navigate = useNavigate()
  const values = Object.values(userBooks)
  const currentProgress = readers.find((reader) => reader.uid === profile?.uid)
  const termReadCount = currentProgress?.readCount ?? values.filter((item) => item.status === 'read').length
  const level = getReaderLevel(readerStats.lifetimeReadCount)
  const termRank = getTermReaderRank(termReadCount)
  const stats = [
    { icon: BookHeart, value: values.filter((item) => ['liked', 'saved'].includes(item.status)).length, label: 'สนใจ' },
    { icon: BookOpen, value: values.filter((item) => item.status === 'reading').length, label: 'กำลังอ่าน' },
    { icon: Award, value: termReadCount, label: 'อ่านจบเทอมนี้' },
  ]
  const interests = categories.filter((item) => profile?.interests.includes(item.id))
  return (
    <div className="page profile-page">
      <PageHeader title="โปรไฟล์" action={<button className="icon-button" onClick={() => navigate('/setup')} aria-label="แก้ไขโปรไฟล์"><Pencil /></button>} />
      <section className="profile-card">
        <div className="profile-avatar">{profile?.displayName.charAt(0)}<span><Sparkles /></span></div>
        <h1>{profile?.displayName}</h1>
        <p>{profile?.className} · เลขที่ {profile?.studentNumber}</p>
        <small>{authUser?.email}</small>
        <span className={`member-badge member-badge--${membership?.status ?? 'suspended'}`}><ShieldCheck /> สมาชิก: {membership ? membershipLabels[membership.status] : 'ไม่พบข้อมูล'}</span>
      </section>

      <section className="reader-level-card">
        <div><p className="eyebrow">ระดับนักอ่านถาวร</p><h2>เลเวล {level.level} — {level.name}</h2></div>
        <strong>อ่านสะสม {readerStats.lifetimeReadCount.toLocaleString('th-TH')} เล่ม</strong>
        <div className="mini-progress" aria-label={`ความคืบหน้า ${Math.round(level.progress * 100)} เปอร์เซ็นต์`}><span style={{ width: `${level.progress * 100}%` }} /></div>
        <p>{level.nextThreshold === null ? 'คุณอยู่ในระดับสูงสุดแล้ว' : `เหลืออีก ${level.remainingBooks} เล่มเพื่อขึ้นเลเวล ${level.level + 1}`}</p>
      </section>

      <section className="term-rank-card">
        <div><p className="eyebrow">ภาคเรียนปัจจุบัน</p><h2>{currentTerm?.name}</h2></div>
        <span><Award /> แรงก์ประจำเทอม: <strong>{termRank.name}</strong></span>
        <p>อ่านจบในเทอมนี้ {termReadCount.toLocaleString('th-TH')} เล่ม</p>
      </section>

      <section className="profile-stats">{stats.map(({ icon: Icon, value, label }) => <article key={label}><Icon /><strong>{value}</strong><small>{label}</small></article>)}</section>
      <section className="profile-section"><div className="section-heading"><h2>หมวดที่สนใจ</h2><button onClick={() => navigate('/categories')}>แก้ไข</button></div><div className="chip-grid">{interests.length ? interests.map((item) => <span key={item.id}>{item.icon} {item.name}</span>) : <p>ยังไม่ได้เลือกหมวดโปรด</p>}</div></section>
      <section className="settings-list">
        <button onClick={() => navigate('/loans')}><Library /><span><strong>การยืมของฉัน</strong><small>ดูคำขอ หนังสือที่กำลังยืม และประวัติการคืน</small></span><ChevronRight /></button>
        <button onClick={() => navigate('/admin')}><Settings /><span><strong>Dashboard บรรณารักษ์</strong><small>สำหรับครูและผู้ดูแลโครงการ</small></span><ChevronRight /></button>
        <button className="danger" onClick={() => { if (window.confirm('ออกจากระบบบนอุปกรณ์นี้หรือไม่?')) { resetDevice(); navigate('/welcome') } }}><LogOut /><span><strong>ออกจากระบบ</strong><small>ข้อมูลใน Firebase จะยังคงอยู่ และกลับมาได้ด้วยบัญชี Google เดิม</small></span><ChevronRight /></button>
      </section>
    </div>
  )
}
