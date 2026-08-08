import { ArrowRight, BookHeart, Search, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { sortLeaderboard } from '../../utils/leaderboard'
import { isSafeProfileDisplayName } from '../../utils/profile'
import { getReaderLevel } from '../../utils/readerLevels'

const assetRoot = '/assets/book-match'

export function HomePage() {
  const { profile, settings, userBooks, readers, readerStats } = useApp()
  const values = useMemo(() => Object.values(userBooks), [userBooks])
  const reading = values.filter((item) => item.status === 'reading').length
  const read = values.filter((item) => item.status === 'read').length
  const readerLevel = getReaderLevel(readerStats.lifetimeReadCount)

  const rankedReaders = useMemo(() => {
    const safeReaders = readers.filter((reader) => isSafeProfileDisplayName(reader.displayName))
    if (!profile || safeReaders.some((reader) => reader.uid === profile.uid)) return sortLeaderboard(safeReaders)

    const lastReadAt = values
      .filter((item) => item.status === 'read' && item.readAt)
      .map((item) => item.readAt!)
      .sort()
      .at(-1) ?? null

    return sortLeaderboard([
      ...safeReaders,
      {
        uid: profile.uid,
        displayName: profile.displayName,
        className: profile.className,
        readCount: read,
        likedCount: 0,
        eligible: true,
        lastReadAt,
      },
    ])
  }, [profile, readers, read, values])

  const rankIndex = rankedReaders.findIndex((reader) => reader.uid === profile?.uid)
  const myRank = rankIndex >= 0 ? `#${rankIndex + 1}` : '—'
  const displayName = profile?.displayName || 'นักอ่าน'

  return (
    <div className="page home-page">
      <PageHeader
        center={<div className="home-level" aria-label={`เลเวล ${readerLevel.level} ${readerLevel.name}`}>
          <small>เลเวล</small><strong>{readerLevel.level}</strong>
        </div>}
        action={<Link className="avatar home-avatar" to="/profile" aria-label="เปิดโปรไฟล์">
          {displayName.charAt(0)}
        </Link>}
      />

      <section className="home-hero">
        <span className="home-sparkle home-sparkle--one" aria-hidden="true">✦</span>
        <span className="home-sparkle home-sparkle--two" aria-hidden="true">✧</span>
        <div className="home-hero__content">
          <p className="home-hero__greeting">สวัสดี {displayName} 👋</p>
          <h1>วันนี้หัวใจอยาก<br /><em>เปิดอ่านเรื่องอะไร?</em></h1>
          <p className="home-hero__announcement">{settings.announcement}</p>
          <Link className="home-hero__button" to="/mood">
            <Sparkles aria-hidden="true" />
            <span>เริ่มปัดหาเล่ม</span>
          </Link>
        </div>
        <img
          className="home-hero__art"
          src={`${assetRoot}/home/home-hero-books.png`}
          alt="กองหนังสือสีสันสดใส"
          loading="eager"
        />
      </section>

      <Link className="home-start-card" to="/mood">
        <span className="home-start-card__icon"><Search aria-hidden="true" /></span>
        <span><strong>เริ่มค้นหาเล่มที่ใช่</strong><small>เลือกจากอารมณ์ของคุณวันนี้</small></span>
        <ArrowRight aria-hidden="true" />
      </Link>

      <div className="section-heading home-section-heading">
        <h2>มุมของนักอ่าน</h2>
        <Link to="/shelf">ดูทั้งหมด <ArrowRight aria-hidden="true" /></Link>
      </div>

      <section className="home-stat-grid" aria-label="สถิติการอ่านของฉัน">
        <Link to="/shelf" className="home-stat-card home-stat-card--green">
          <img src={`${assetRoot}/home/home-reading-corner.png`} alt="" aria-hidden="true" />
          <strong>{reading}</strong>
          <span>กำลังอ่าน</span>
        </Link>
        <Link to="/shelf" className="home-stat-card home-stat-card--yellow">
          <span className="home-stat-card__icon"><BookHeart aria-hidden="true" /></span>
          <strong>{read}</strong>
          <span>อ่านจบแล้ว</span>
        </Link>
        <Link to="/leaderboard" className="home-stat-card home-stat-card--blue">
          <img src={`${assetRoot}/leaderboard/rank-trophy.png`} alt="" aria-hidden="true" />
          <strong>{myRank}</strong>
          <span>อันดับของฉัน</span>
        </Link>
      </section>

      <section className="home-quote-card">
        <div>
          <span aria-hidden="true">✦</span>
          <p>หนังสือหนึ่งเล่ม<br />อาจพาเราไปได้ไกลกว่าที่คิด</p>
          <i>ชวนเพื่อนมาอ่านด้วยกันนะ</i>
        </div>
        <img src={`${assetRoot}/home/home-quote-books-coffee.png`} alt="หนังสือและแก้วเครื่องดื่ม" loading="lazy" />
      </section>
    </div>
  )
}
