import { useMemo, useState } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { studentAvatarSrc } from '../../data/avatars'
import type { Reader } from '../../types'
import { sortLeaderboard } from '../../utils/leaderboard'
import { isSafeProfileDisplayName } from '../../utils/profile'
import { getTermReaderRank } from '../../utils/readerLevels'

const leaderboardAssets = '/assets/book-match/leaderboard'

const podiumPlaces = [
  { sourceIndex: 1, rank: 2, medal: 'rank-medal-silver.png' },
  { sourceIndex: 0, rank: 1, medal: 'rank-medal-gold.png' },
  { sourceIndex: 2, rank: 3, medal: 'rank-medal-bronze.png' },
] as const

function readerNickname(reader: Pick<Reader, 'displayName'>) {
  return reader.displayName.trim()
}

function readerFullName(reader: Pick<Reader, 'firstName' | 'lastName' | 'displayName'>) {
  return [reader.firstName?.trim(), reader.lastName?.trim()].filter(Boolean).join(' ') || readerNickname(reader)
}

function PodiumReader({ reader, rank, medal }: { reader: Reader; rank: 1 | 2 | 3; medal: string }) {
  const nickname = readerNickname(reader)
  const fullName = readerFullName(reader)
  return (
    <article className={`leaderboard-podium__card leaderboard-podium__card--${rank}`} aria-label={`อันดับ ${rank} ${nickname} ${fullName}`}>
      {rank === 1 && <img className="leaderboard-podium__crown" src={`${leaderboardAssets}/rank-crown.png`} alt="" aria-hidden="true" />}
      <img className="leaderboard-podium__medal" src={`${leaderboardAssets}/${medal}`} alt="" aria-hidden="true" />
      <div className="leaderboard-podium__avatar-wrap">
        <img className="leaderboard-podium__laurel" src={`${leaderboardAssets}/rank-laurel-pair.png`} alt="" aria-hidden="true" />
        <img className="reader-avatar" src={studentAvatarSrc(reader.avatarId)} alt="" />
      </div>
      <strong className="leaderboard-podium__nickname" title={nickname}>{nickname}</strong>
      <small className="leaderboard-podium__real-name" title={fullName}>{fullName}</small>
      <small className="leaderboard-podium__class">{reader.className}</small>
      <span>{getTermReaderRank(reader.readCount).name}</span>
      <b>{reader.readCount} เล่ม</b>
      {rank === 1 && <img className="leaderboard-podium__winner-base" src={`${leaderboardAssets}/rank-first-place-base.png`} alt="" aria-hidden="true" />}
    </article>
  )
}

function EmptyPodiumPlace({ rank, medal }: { rank: 1 | 2 | 3; medal: string }) {
  return (
    <article className={`leaderboard-podium__card leaderboard-podium__card--${rank} leaderboard-podium__card--empty`} aria-label={`อันดับ ${rank} ยังไม่มีนักอ่าน`}>
      <img className="leaderboard-podium__medal" src={`${leaderboardAssets}/${medal}`} alt="" aria-hidden="true" />
      <div className="leaderboard-podium__avatar-wrap">
        <img className="leaderboard-podium__laurel" src={`${leaderboardAssets}/rank-laurel-pair.png`} alt="" aria-hidden="true" />
        <div className="reader-avatar reader-avatar--empty">{rank}</div>
      </div>
      <strong>ยังไม่มีอันดับ</strong>
      <small>รอนักอ่านคนถัดไป</small>
      {rank === 1 && <img className="leaderboard-podium__winner-base" src={`${leaderboardAssets}/rank-first-place-base.png`} alt="" aria-hidden="true" />}
    </article>
  )
}

export function LeaderboardPage() {
  const { readers, profile, userBooks, settings } = useApp()
  const [search] = useSearchParams()
  const [scope, setScope] = useState<'all' | 'class'>('all')
  const myReads = Object.values(userBooks).filter((item) => item.status === 'read').length
  const merged = useMemo(() => {
    const safeReaders = readers.filter((reader) => isSafeProfileDisplayName(reader.displayName))
    if (!profile || safeReaders.some((reader) => reader.uid === profile.uid)) return sortLeaderboard(safeReaders)
    const lastReadAt = Object.values(userBooks).filter((item) => item.status === 'read' && item.readAt).map((item) => item.readAt!).sort().at(-1) ?? null
    return sortLeaderboard([...safeReaders, { uid: profile.uid, avatarId: profile.avatarId, firstName: profile.firstName, lastName: profile.lastName, displayName: profile.displayName, className: profile.className, readCount: myReads, likedCount: 0, eligible: true, lastReadAt }])
  }, [readers, profile, myReads, userBooks])
  const filtered = scope === 'class' ? merged.filter((reader) => reader.className === profile?.className) : merged
  const myRank = merged.findIndex((reader) => reader.uid === profile?.uid) + 1

  return (
    <div className="page leaderboard-page">
      <PageHeader title="อันดับนักอ่าน" />
      {search.get('completed') === '1' && <div className="success-banner"><Sparkles /> ยืนยันการอ่านสำเร็จ! เพิ่มอีก 1 เล่มแล้ว</div>}
      <section className="leaderboard-heading">
        <p className="eyebrow">{settings.termName}</p>
        <div className="leaderboard-heading__title">
          <img src={`${leaderboardAssets}/rank-laurel-pair.png`} alt="" aria-hidden="true" />
          <h1>สุดยอดนักอ่าน</h1>
        </div>
        <p>ทุกรีวิวที่ตั้งใจ คืออีกหนึ่งก้าวบนเส้นทางนักอ่าน</p>
      </section>

      <div className="leaderboard-segment" role="group" aria-label="ขอบเขตอันดับนักอ่าน">
        <button className={scope === 'all' ? 'active' : ''} type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>อันดับรวม</button>
        <button className={scope === 'class' ? 'active' : ''} type="button" aria-pressed={scope === 'class'} onClick={() => setScope('class')}>ในห้อง {profile?.className}</button>
      </div>

      {filtered.length > 0 ? (
        <>
          <section className="leaderboard-podium" aria-label="สามอันดับแรก">
            <span className="leaderboard-podium__spark leaderboard-podium__spark--one" aria-hidden="true">✦</span>
            <span className="leaderboard-podium__spark leaderboard-podium__spark--two" aria-hidden="true">✧</span>
            {podiumPlaces.map(({ sourceIndex, rank, medal }) => {
              const reader = filtered[sourceIndex]
              return reader
                ? <PodiumReader key={reader.uid} reader={reader} rank={rank} medal={medal} />
                : <EmptyPodiumPlace key={`empty-${rank}`} rank={rank} medal={medal} />
            })}
          </section>

          <section className="my-rank" aria-label="อันดับของฉัน">
            <img src={`${leaderboardAssets}/rank-trophy.png`} alt="" aria-hidden="true" />
            <span><small>อันดับของฉัน</small><strong>{profile ? readerNickname(profile) : ''} · {profile?.className}</strong></span>
            <b>#{myRank || merged.length + 1}</b>
            <em>{myReads} เล่ม</em>
          </section>

          <section className="leaderboard-table" aria-labelledby="leaderboard-list-title">
            <div className="leaderboard-table__heading">
              <div><p className="eyebrow">อันดับนักอ่าน</p><h2 id="leaderboard-list-title">รายชื่อนักอ่าน</h2></div>
              <span>{filtered.length} คน</span>
            </div>
            <div className="ranking-list">
              {filtered.map((reader, index) => (
                <article key={reader.uid} className={reader.uid === profile?.uid ? 'current' : ''}>
                  <span className={`ranking-list__position ranking-list__position--${Math.min(index + 1, 4)}`}>{index + 1}</span>
                  <img className="reader-avatar reader-avatar--small" src={studentAvatarSrc(reader.avatarId)} alt="" />
                  <div className="ranking-list__reader">
                    <strong>{readerNickname(reader)}</strong>
                    <small className="ranking-list__real-name">{readerFullName(reader)}</small>
                    <small>{reader.className} · {getTermReaderRank(reader.readCount).name}</small>
                  </div>
                  <b><BookOpen aria-hidden="true" /> {reader.readCount} <small>เล่ม</small></b>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="leaderboard-empty">
          <img src={`${leaderboardAssets}/rank-trophy.png`} alt="" aria-hidden="true" />
          <strong>ยังไม่มีอันดับนักอ่าน</strong>
          <p>{scope === 'class' ? 'ห้องนี้ยังไม่มีข้อมูลการอ่านในภาคเรียนปัจจุบัน' : 'เมื่อมีการอ่านจบ อันดับจะปรากฏที่นี่'}</p>
        </section>
      )}
    </div>
  )
}
