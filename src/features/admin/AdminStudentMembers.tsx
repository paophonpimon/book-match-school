import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, RefreshCw, Search, UsersRound } from 'lucide-react'
import type { MembershipStatus } from '../../types'
import { loadAdminStudentMembers, updateMembershipStatusAsAdmin, type AdminStudentMember } from '../../services/adminStudents'
import { getReaderLevel, getTermReaderRank } from '../../utils/readerLevels'

const PAGE_SIZE = 20
const statusLabels: Record<MembershipStatus, string> = {
  active: 'ใช้งาน',
  suspended: 'ระงับชั่วคราว',
  graduated: 'สำเร็จการศึกษา',
  transferred: 'ย้ายสถานศึกษา',
}

export function AdminStudentMembers() {
  const [members, setMembers] = useState<AdminStudentMember[]>([])
  const [search, setSearch] = useState('')
  const [classroom, setClassroom] = useState('')
  const [status, setStatus] = useState<MembershipStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [mutatingId, setMutatingId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setMembers(await loadAdminStudentMembers())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'โหลดรายชื่อสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const classrooms = useMemo(
    () => [...new Set(members.map((member) => member.className).filter(Boolean))].sort(),
    [members],
  )
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th-TH')
    return members.filter((member) => {
      const haystack = `${member.studentId} ${member.firstName} ${member.lastName} ${member.displayName}`.toLocaleLowerCase('th-TH')
      return (!keyword || haystack.includes(keyword))
        && (!classroom || member.className === classroom)
        && (status === 'all' || member.status === status)
    })
  }, [classroom, members, search, status])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function changeStatus(member: AdminStudentMember, nextStatus: MembershipStatus) {
    if (nextStatus === member.status) return
    if (!window.confirm(`เปลี่ยนสถานะสมาชิก ${member.displayName || member.studentId} เป็น “${statusLabels[nextStatus]}” หรือไม่?`)) return
    setMutatingId(member.studentId)
    setError('')
    try {
      await updateMembershipStatusAsAdmin(member.studentId, nextStatus)
      setMembers((current) => current.map((item) => item.studentId === member.studentId
        ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
        : item))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'เปลี่ยนสถานะสมาชิกไม่สำเร็จ')
    } finally {
      setMutatingId('')
    }
  }

  return (
    <section className="dashboard-card admin-members" id="student-members">
      <div className="section-heading">
        <div><p className="eyebrow">สมาชิกถาวร</p><h2><UsersRound /> สมาชิกนักเรียน</h2><p>แสดงสูงสุด 100 บัญชีล่าสุด</p></div>
        <button className="button button--secondary button--small" type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> รีเฟรช</button>
      </div>
      <div className="admin-filters">
        <label className="admin-search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="ค้นหาชื่อหรือเลขประจำตัวนักเรียน" /></label>
        <label><span>ห้องเรียน</span><select value={classroom} onChange={(event) => { setClassroom(event.target.value); setPage(1) }}><option value="">ทุกห้อง</option>{classrooms.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>สถานะ</span><select value={status} onChange={(event) => { setStatus(event.target.value as MembershipStatus | 'all'); setPage(1) }}><option value="all">ทุกสถานะ</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="admin-list-state"><LoaderCircle className="spin" /><p>กำลังโหลดสมาชิก…</p></div>
        : visible.length === 0 ? <div className="admin-list-state"><UsersRound /><p>ไม่พบสมาชิกตามเงื่อนไข</p></div>
          : <div className="admin-member-list">{visible.map((member) => {
              const level = getReaderLevel(member.lifetimeReadCount)
              const rank = getTermReaderRank(member.currentTermReadCount)
              return (
                <article key={member.studentId}>
                  <div><span className={`status-pill status-pill--${member.status}`}>{statusLabels[member.status]}</span><h3>{member.firstName} {member.lastName}</h3><p>{member.displayName} · {member.className} เลขที่ {member.studentNumber}</p></div>
                  <dl>
                    <div><dt>เลขประจำตัว</dt><dd>{member.studentId}</dd></div>
                    <div><dt>Google</dt><dd>{member.email}</dd></div>
                    <div><dt>สมัครเมื่อ</dt><dd>{new Date(member.createdAt).toLocaleDateString('th-TH')}</dd></div>
                    <div><dt>อ่านสะสม</dt><dd>{member.lifetimeReadCount} เล่ม · Lv.{level.level}</dd></div>
                    <div><dt>เทอมนี้</dt><dd>{member.currentTermReadCount} เล่ม · {rank.name}</dd></div>
                    <div><dt>ยืมค้าง</dt><dd>{member.activeLoanCount}</dd></div>
                  </dl>
                  <label>เปลี่ยนสถานะ<select value={member.status} disabled={mutatingId === member.studentId} onChange={(event) => void changeStatus(member, event.target.value as MembershipStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                </article>
              )
            })}</div>}
      {filtered.length > PAGE_SIZE && <nav className="admin-pagination"><button className="button button--secondary button--small" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>ก่อนหน้า</button><span>หน้า {page} / {totalPages}</span><button className="button button--secondary button--small" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>ถัดไป</button></nav>}
    </section>
  )
}
