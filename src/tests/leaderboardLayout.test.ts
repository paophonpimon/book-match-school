import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/features/leaderboard/LeaderboardPage.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

describe('student leaderboard visual structure', () => {
  it('uses the shared student header and labels cumulative library borrows explicitly', () => {
    expect(page).toContain('<PageHeader title="อันดับยอดยืม" />')
    expect(page).toContain('สถิติการยืมห้องสมุดสะสม')
    expect(page).not.toContain('ProgressSteps')
    expect(page).not.toContain('rank-reading-journey.png')
    expect(page).not.toContain('ภาคเรียนที่ 1 ปีการศึกษา 2569')
  })

  it('keeps the existing real ranking and classroom filtering logic', () => {
    expect(page).toContain('sortLeaderboard')
    expect(page).toContain("scope === 'class'")
    expect(page).toContain('reader.className === profile?.className')
    expect(page).toContain('visibleReaders.map((reader, index)')
    expect(page).toContain('className="leaderboard-table"')
  })

  it('paginates the real reader list ten readers at a time', () => {
    expect(page).toContain('const READERS_PER_PAGE = 10')
    expect(page).toContain('filtered.slice(pageStart, pageStart + READERS_PER_PAGE)')
    expect(page).toContain('className="leaderboard-pagination"')
    expect(page).toContain("aria-current={pageNumber === activePage ? 'page' : undefined}")
    expect(page).toContain('{pageStart + index + 1}')
    expect(css).toContain('.leaderboard-pagination {')
  })

  it('uses supplied ranking artwork as decoration around real HTML content', () => {
    expect(page).toContain('/assets/book-match/leaderboard')
    expect(page).toContain('rank-medal-gold.png')
    expect(page).toContain('rank-medal-silver.png')
    expect(page).toContain('rank-medal-bronze.png')
    expect(page).toContain('rank-first-place-base.png')
    expect(page).toContain('rank === 1 && <img className="leaderboard-podium__winner-base"')
    expect(page).not.toContain('rank-podium-v2.png')
    expect(page).toContain('rank-trophy.png')
    expect(page).toContain('rank-laurel-pair.png')
    expect(page).toContain('readerNickname(reader)')
    expect(page).toContain('readerFullName(reader)')
    expect(page).toContain("reader.lastName?.trim()")
    expect(page).toContain('leaderboard-podium__nickname')
    expect(page).toContain('leaderboard-podium__real-name')
    expect(css).toContain('.leaderboard-podium__card--1 .leaderboard-podium__nickname')
    expect(css).toContain('.leaderboard-podium__card--2 .leaderboard-podium__nickname')
    expect(css).toContain('.leaderboard-podium__card--3 .leaderboard-podium__nickname')
    expect(page).toContain('<b>ยอดยืมสะสม {cumulativeBorrowCount} เล่ม</b>')
    expect(page).toContain('{cumulativeLibraryBorrowCount(reader)} <small>เล่มที่ยืม</small>')
    expect(page).toContain('อ่านจบใน Book Match {bookMatchCompletedReadCount(reader)} เล่ม')
  })

  it('handles fewer than three readers without placeholder students', () => {
    expect(page).toContain('const reader = filtered[sourceIndex]')
    expect(page).toContain('<EmptyPodiumPlace')
    expect(page).toContain('ยังไม่มีอันดับ')
    expect(page).toContain('filtered.length > 0')
    expect(page).not.toContain('สายลมแห่งใจ')
  })

  it('keeps the current student rank visually distinct and data driven', () => {
    expect(page).toContain("merged.findIndex((reader) => reader.uid === profile?.uid) + 1")
    expect(page).toContain('className={reader.uid === profile?.uid ? \'current\' : \'\'}')
    expect(page).toContain('aria-label="อันดับของฉัน"')
    expect(page).toContain('ยืมหนังสือ {myDisplayedCount} เล่ม')
  })

  it('has scoped mobile and desktop leaderboard treatments', () => {
    expect(css).toContain('.leaderboard-podium {')
    expect(css).toContain('.leaderboard-podium__card--empty')
    expect(css).toContain('.leaderboard-podium__winner-base')
    expect(css).toContain('.leaderboard-table {')
    expect(css).toContain('@media (min-width: 700px)')
    expect(css).toContain('@media (max-width: 370px)')
  })

  it('aligns the winner base with the lower edge of the side ranking cards', () => {
    expect(css).toContain('.leaderboard-podium__card--2 { margin-bottom: 42px; }.leaderboard-podium__card--1 { margin-bottom: 104px; }.leaderboard-podium__card--3 { margin-bottom: 42px; }')
    expect(css).toContain('.leaderboard-podium__winner-base { position: absolute')
  })
})
