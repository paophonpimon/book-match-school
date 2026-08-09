import { useState } from 'react'
import { Award, BookHeart, BookOpen, ChevronRight, Library, LogOut, Pencil, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { PageHeader } from '../../components/PageHeader'
import { studentAvatarSrc } from '../../data/avatars'
import { getReaderLevel, getTermReaderRank } from '../../utils/readerLevels'

const profileAssetRoot = '/assets/book-match/profile'

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
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const values = Object.values(userBooks)
  const currentProgress = readers.find((reader) => reader.uid === profile?.uid)
  const termReadCount = currentProgress?.readCount ?? values.filter((item) => item.status === 'read').length
  const level = getReaderLevel(readerStats.lifetimeReadCount)
  const termRank = getTermReaderRank(termReadCount)
  const progressPercent = Math.round(level.progress * 100)
  const rankArtwork = termRank.key === 'bronze'
    ? `${profileAssetRoot}/profile-reader-badge-bronze.png`
    : `${profileAssetRoot}/profile-star-medal.png`
  const stats = [
    { icon: BookHeart, value: values.filter((item) => ['liked', 'saved'].includes(item.status)).length, label: 'สนใจ', tone: 'coral', shelfTab: 'interest' },
    { icon: BookOpen, value: values.filter((item) => item.status === 'reading').length, label: 'กำลังอ่าน', tone: 'blue', shelfTab: 'reading' },
    { icon: Award, value: termReadCount, label: 'อ่านจบเทอมนี้', tone: 'green', shelfTab: 'read' },
  ]
  const interests = categories.filter((item) => profile?.interests.includes(item.id))

  return (
    <div className="page profile-page">
      <PageHeader title="โปรไฟล์" action={<button className="icon-button" onClick={() => navigate('/setup')} aria-label="แก้ไขโปรไฟล์"><Pencil /></button>} />

      <section className="profile-hero" aria-labelledby="profile-name">
        <span className="profile-spark profile-spark--one" aria-hidden="true">✦</span>
        <span className="profile-spark profile-spark--two" aria-hidden="true">✦</span>
        <button className="profile-avatar profile-avatar--button" type="button" onClick={() => navigate('/setup')} aria-label="เปลี่ยนอวตาร">
          <img src={studentAvatarSrc(profile?.avatarId)} alt="" />
          <span aria-hidden="true"><Pencil /></span>
        </button>
        <div className="profile-identity">
          <h1 id="profile-name">{profile?.displayName}</h1>
          <p>{profile?.className} <b aria-hidden="true">•</b> เลขที่ {profile?.studentNumber}</p>
          <small>{authUser?.email}</small>
          <span className={`member-badge member-badge--${membership?.status ?? 'suspended'}`}>
            <img src={`${profileAssetRoot}/profile-active-member-shield.png`} alt="" aria-hidden="true" />
            สมาชิก: {membership ? membershipLabels[membership.status] : 'ไม่พบข้อมูล'}
          </span>
        </div>
        <div className="profile-hero__books" aria-hidden="true">
          <i /><i /><i />
        </div>
      </section>

      <section className="reader-level-card" aria-labelledby="reader-level-heading">
        <img className="reader-level-card__art" src={`${profileAssetRoot}/profile-level-book.png`} alt="" aria-hidden="true" />
        <div className="reader-level-card__content">
          <p className="eyebrow">ระดับนักอ่านของเรา</p>
          <h2 id="reader-level-heading">เลเวล {level.level} — {level.name}</h2>
          <strong>อ่านสะสม {readerStats.lifetimeReadCount.toLocaleString('th-TH')} เล่ม</strong>
          <div className="mini-progress" aria-label={`ความคืบหน้า ${progressPercent} เปอร์เซ็นต์`}>
            <span style={{ width: `${level.progress * 100}%` }} />
          </div>
          <p>{level.nextThreshold === null ? 'คุณอยู่ในระดับสูงสุดแล้ว' : `เหลืออีก ${level.remainingBooks} เล่มเพื่อขึ้นเลเวล ${level.level + 1}`}</p>
        </div>
      </section>

      <section className="term-rank-card" aria-labelledby="term-rank-heading">
        <div className="term-rank-card__content">
          <p className="eyebrow">ภาคเรียนปัจจุบัน</p>
          <h2 id="term-rank-heading">{currentTerm?.name}</h2>
          <span className="term-rank-card__rank">
            <img src={rankArtwork} alt="" aria-hidden="true" />
            แรงก์ประจำเทอม: <strong>{termRank.name}</strong>
          </span>
          <p>อ่านจบในเทอมนี้ {termReadCount.toLocaleString('th-TH')} เล่ม</p>
        </div>
        <img className="term-rank-card__art" src={`${profileAssetRoot}/profile-term-medal-books.png`} alt="" aria-hidden="true" />
      </section>

      <section className="profile-stats" aria-label="สถิติการอ่าน">
        {stats.map(({ icon: Icon, value, label, tone, shelfTab }) => (
          <button
            className={`profile-stat profile-stat--${tone}`}
            key={label}
            type="button"
            aria-label={`ดูหนังสือ${label} ${value.toLocaleString('th-TH')} เล่ม`}
            onClick={() => navigate(`/shelf?tab=${shelfTab}`)}
          >
            <span><Icon /></span>
            <strong>{value.toLocaleString('th-TH')}</strong>
            <small>{label}</small>
          </button>
        ))}
      </section>

      <section className="profile-section">
        <div className="section-heading">
          <h2>หมวดที่สนใจ</h2>
          <button onClick={() => navigate('/categories')}>แก้ไข</button>
        </div>
        <div className="chip-grid profile-interest-list">
          {interests.length
            ? interests.map((item) => <span key={item.id}>{item.icon} {item.name}</span>)
            : <p>ยังไม่ได้เลือกหมวดโปรด</p>}
        </div>
      </section>

      <section className="settings-list" aria-label="เมนูโปรไฟล์">
        <button onClick={() => navigate('/loans')}>
          <span className="settings-list__icon settings-list__icon--coral"><Library /></span>
          <span><strong>การยืมของฉัน</strong><small>ดูเล่ม หนังสือที่กำลังยืม และประวัติการคืน</small></span>
          <ChevronRight />
        </button>
        <button onClick={() => navigate('/admin')}>
          <span className="settings-list__icon settings-list__icon--green"><Settings /></span>
          <span><strong>Dashboard บรรณารักษ์</strong><small>สำหรับครูและผู้ดูแลโครงการ</small></span>
          <ChevronRight />
        </button>
        <button className="danger" onClick={() => setShowLogoutConfirmation(true)}>
          <span className="settings-list__icon settings-list__icon--red"><LogOut /></span>
          <span><strong>ออกจากระบบ</strong><small>ข้อมูลใน Firebase ยังอยู่ครบ และกลับมาได้ด้วยบัญชี Google เดิม</small></span>
          <ChevronRight />
        </button>
      </section>

      {showLogoutConfirmation && (
        <ConfirmationDialog
          eyebrow="ออกจากระบบ"
          title="ออกจากระบบบนอุปกรณ์นี้ใช่ไหม?"
          detail="ข้อมูลการอ่าน การยืม และโปรไฟล์ยังอยู่ใน Firebase ครบ คุณกลับมาใช้งานต่อได้ด้วยบัญชี Google เดิม"
          confirmLabel="ออกจากระบบ"
          cancelLabel="อยู่ต่อ"
          icon={<LogOut />}
          tone="danger"
          onConfirm={() => {
            setShowLogoutConfirmation(false)
            resetDevice()
            navigate('/welcome')
          }}
          onCancel={() => setShowLogoutConfirmation(false)}
        />
      )}
    </div>
  )
}
