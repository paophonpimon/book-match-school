import { useMemo, useState } from 'react'
import { Crown, Medal, Sparkles, Trophy } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { ProgressSteps } from '../../components/ProgressSteps'
import { sortLeaderboard } from '../../utils/leaderboard'
import { isSafeProfileDisplayName } from '../../utils/profile'
import { getTermReaderRank } from '../../utils/readerLevels'

export function LeaderboardPage() {
  const { readers, profile, userBooks, settings } = useApp()
  const [search] = useSearchParams()
  const [scope, setScope] = useState<'all' | 'class'>('all')
  const myReads = Object.values(userBooks).filter((item) => item.status === 'read').length
  const merged = useMemo(() => {
    const safeReaders = readers.filter((reader) => isSafeProfileDisplayName(reader.displayName))
    if (!profile || safeReaders.some((reader) => reader.uid === profile.uid)) return sortLeaderboard(safeReaders)
    const lastReadAt = Object.values(userBooks).filter((item) => item.status === 'read' && item.readAt).map((item) => item.readAt!).sort().at(-1) ?? null
    return sortLeaderboard([...safeReaders, { uid: profile.uid, displayName: profile.displayName, className: profile.className, readCount: myReads, likedCount: 0, eligible: true, lastReadAt }])
  }, [readers, profile, myReads, userBooks])
  const filtered = scope === 'class' ? merged.filter((reader) => reader.className === profile?.className) : merged
  const myRank = merged.findIndex((reader) => reader.uid === profile?.uid) + 1
  return (
    <div className="page leaderboard-page">
      <PageHeader title="อันดับนักอ่าน" />
      {search.get('completed') === '1' && <div className="success-banner"><Sparkles /> ยืนยันการอ่านสำเร็จ! เพิ่มอีก 1 เล่มแล้ว</div>}
      <ProgressSteps active={6} />
      <section className="selection-heading selection-heading--compact"><p className="eyebrow">{settings.termName}</p><h1>สุดยอดนักอ่าน</h1><p>ทุกรีวิวที่ตั้งใจ คืออีกหนึ่งก้าวบนเส้นทางนักอ่าน</p></section>
      <div className="segment"><button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>อันดับรวม</button><button className={scope === 'class' ? 'active' : ''} onClick={() => setScope('class')}>ในห้อง {profile?.className}</button></div>
      <section className="podium" aria-label="สามอันดับแรก">
        {[filtered[1], filtered[0], filtered[2]].map((reader, index) => reader && <article key={reader.uid} className={`podium__item podium__item--${[2, 1, 3][index]}`}><span className="podium__medal">{index === 1 ? <Crown /> : <Medal />}</span><div className="reader-avatar">{reader.displayName.charAt(0)}</div><strong>{reader.displayName}</strong><small>{reader.className} · {getTermReaderRank(reader.readCount).name}</small><b>{reader.readCount} เล่ม</b></article>)}
      </section>
      <div className="ranking-list">{filtered.slice(3).map((reader, index) => <article key={reader.uid} className={reader.uid === profile?.uid ? 'current' : ''}><span>{index + 4}</span><div className="reader-avatar reader-avatar--small">{reader.displayName.charAt(0)}</div><div><strong>{reader.displayName}</strong><small>{reader.className} · {getTermReaderRank(reader.readCount).name}</small></div><b>{reader.readCount} <small>เล่ม</small></b></article>)}</div>
      <section className="my-rank"><Trophy /><span><small>อันดับของฉัน</small><strong>{profile?.displayName} · {profile?.className}</strong></span><b>#{myRank || merged.length + 1}</b><em>{myReads} เล่ม</em></section>
    </div>
  )
}
