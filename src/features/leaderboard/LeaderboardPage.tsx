import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Library, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { studentAvatarSrc } from '../../data/avatars'
import type { Reader } from '../../types'
import { bookMatchCompletedReadCount, bookMatchLibraryBorrowCount, cumulativeLibraryBorrowCount, legacyLibraryBorrowCount } from '../../utils/legacyBorrowCounts'
import { sortLeaderboard } from '../../utils/leaderboard'
import { isSafeProfileDisplayName } from '../../utils/profile'

const leaderboardAssets = '/assets/book-match/leaderboard'
const READERS_PER_PAGE = 10

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
  const cumulativeBorrowCount = cumulativeLibraryBorrowCount(reader)
  const legacyBorrowCount = legacyLibraryBorrowCount(reader)
  const bookMatchBorrowCount = bookMatchLibraryBorrowCount(reader)
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
      <span>อ่านจบใน Book Match {bookMatchCompletedReadCount(reader)} เล่ม</span>
      <b>ยอดยืมสะสม {cumulativeBorrowCount} เล่ม</b>
      <small className="leaderboard-podium__legacy">เดิม {legacyBorrowCount} · ผ่าน Book Match {bookMatchBorrowCount}</small>
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
  const { readers, profile, userBooks } = useApp()
  const [search] = useSearchParams()
  const [scope, setScope] = useState<'all' | 'class'>('all')
  const [page, setPage] = useState(1)
  const myReads = Object.values(userBooks).filter((item) => item.status === 'read').length
  const merged = useMemo(() => {
    const safeReaders = readers.filter((reader) => isSafeProfileDisplayName(reader.displayName))
    if (!profile || safeReaders.some((reader) => reader.uid === profile.uid)) return sortLeaderboard(safeReaders)
    const lastReadAt = Object.values(userBooks).filter((item) => item.status === 'read' && item.readAt).map((item) => item.readAt!).sort().at(-1) ?? null
    return sortLeaderboard([...safeReaders, { uid: profile.uid, avatarId: profile.avatarId, firstName: profile.firstName, lastName: profile.lastName, displayName: profile.displayName, className: profile.className, readCount: myReads, legacyBorrowCount: 0, bookMatchBorrowCount: 0, likedCount: 0, eligible: true, lastReadAt }])
  }, [readers, profile, myReads, userBooks])
  const filtered = scope === 'class' ? merged.filter((reader) => reader.className === profile?.className) : merged
  const pageCount = Math.max(1, Math.ceil(filtered.length / READERS_PER_PAGE))
  const activePage = Math.min(page, pageCount)
  const pageStart = (activePage - 1) * READERS_PER_PAGE
  const visibleReaders = filtered.slice(pageStart, pageStart + READERS_PER_PAGE)
  const myRank = merged.findIndex((reader) => reader.uid === profile?.uid) + 1
  const myBookCount = merged.find((reader) => reader.uid === profile?.uid)
  const myDisplayedCount = myBookCount ? cumulativeLibraryBorrowCount(myBookCount) : 0
  const myCompletedReadCount = myBookCount ? bookMatchCompletedReadCount(myBookCount) : myReads

  return (
    <div className="page leaderboard-page">
      <PageHeader title="อันดับยอดยืม" />
      {search.get('completed') === '1' && <div className="success-banner"><Sparkles /> ยืนยันการอ่านสำเร็จ! เพิ่มอีก 1 เล่มแล้ว</div>}
      <section className="leaderboard-heading">
        <p className="eyebrow">สถิติการยืมห้องสมุดสะสม</p>
        <div className="leaderboard-heading__title">
          <img src={`${leaderboardAssets}/rank-laurel-pair.png`} alt="" aria-hidden="true" />
          <h1>อันดับยอดยืมสะสม</h1>
        </div>
        <p>นับจากยอดยืมเดิม และรายการรับหนังสือผ่าน Book Match หลังวันที่สรุปยอดเดิม</p>
      </section>

      <div className="leaderboard-segment" role="group" aria-label="ขอบเขตอันดับยอดยืม">
        <button className={scope === 'all' ? 'active' : ''} type="button" aria-pressed={scope === 'all'} onClick={() => { setScope('all'); setPage(1) }}>อันดับรวม</button>
        <button className={scope === 'class' ? 'active' : ''} type="button" aria-pressed={scope === 'class'} onClick={() => { setScope('class'); setPage(1) }}>ในห้อง {profile?.className}</button>
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
            <em>
              <strong>ยืมหนังสือ {myDisplayedCount} เล่ม</strong>
              <small>อ่านจบใน Book Match {myCompletedReadCount} เล่ม</small>
            </em>
          </section>

          <section className="leaderboard-table" aria-labelledby="leaderboard-list-title">
            <div className="leaderboard-table__heading">
              <div><p className="eyebrow">อันดับจากยอดยืมสะสม</p><h2 id="leaderboard-list-title">รายชื่อนักเรียน</h2></div>
              <span>{filtered.length} คน</span>
            </div>
            <div className="ranking-list">
              {visibleReaders.map((reader, index) => (
                <article key={reader.uid} className={reader.uid === profile?.uid ? 'current' : ''}>
                  <span className={`ranking-list__position ranking-list__position--${Math.min(pageStart + index + 1, 4)}`}>{pageStart + index + 1}</span>
                  <img className="reader-avatar reader-avatar--small" src={studentAvatarSrc(reader.avatarId)} alt="" />
                  <div className="ranking-list__reader">
                    <strong>{readerNickname(reader)}</strong>
                    <small className="ranking-list__real-name">{readerFullName(reader)}</small>
                    <small>{reader.className} · อ่านจบใน Book Match {bookMatchCompletedReadCount(reader)} เล่ม</small>
                    <small className="ranking-list__legacy">เดิม {legacyLibraryBorrowCount(reader)} · ผ่าน Book Match {bookMatchLibraryBorrowCount(reader)}</small>
                  </div>
                  <b><Library aria-hidden="true" /> {cumulativeLibraryBorrowCount(reader)} <small>เล่มที่ยืม</small></b>
                </article>
              ))}
            </div>
            {pageCount > 1 && (
              <nav className="leaderboard-pagination" aria-label="หน้ารายชื่อนักอ่าน">
                <button type="button" aria-label="หน้าก่อนหน้า" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}><ChevronLeft /></button>
                <div className="leaderboard-pagination__pages">
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={pageNumber === activePage ? 'active' : ''}
                      aria-label={`หน้า ${pageNumber}`}
                      aria-current={pageNumber === activePage ? 'page' : undefined}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>
                <button type="button" aria-label="หน้าถัดไป" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)}><ChevronRight /></button>
              </nav>
            )}
          </section>
        </>
      ) : (
        <section className="leaderboard-empty">
          <img src={`${leaderboardAssets}/rank-trophy.png`} alt="" aria-hidden="true" />
          <strong>ยังไม่มีอันดับยอดยืม</strong>
          <p>{scope === 'class' ? 'ห้องนี้ยังไม่มีข้อมูลการยืมห้องสมุด' : 'เมื่อมีข้อมูลการยืม อันดับจะปรากฏที่นี่'}</p>
        </section>
      )}
    </div>
  )
}
