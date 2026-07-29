import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, LoaderCircle, RefreshCw } from 'lucide-react'
import type { AcademicTerm } from '../../types'
import { activateTermAsAdmin, createTermAsAdmin, listTermsAsAdmin } from '../../services/adminTerms'

const confirmation = 'การเปลี่ยนภาคเรียนจะเริ่มสถิติและอันดับนักอ่านรอบใหม่ ข้อมูลภาคเรียนเดิม ประวัติสมาชิก เลเวลสะสม และประวัติยืม–คืนจะยังคงอยู่'
const currentCalendarYear = new Date().getFullYear()

export function AdminTermManagement() {
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    id: '',
    name: '',
    academicYear: new Date().getFullYear() + 543,
    semester: 1 as 1 | 2,
    startDate: `${currentCalendarYear}-05-01`,
    endDate: `${currentCalendarYear}-10-31`,
  })

  async function load() {
    setLoading(true)
    setError('')
    try {
      setTerms(await listTermsAsAdmin())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลภาคเรียนไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await createTermAsAdmin(form)
      setMessage(`สร้างภาคเรียน ${form.id} แล้ว`)
      setForm((current) => ({ ...current, id: '', name: '' }))
      await load()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'สร้างภาคเรียนไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function activate(term: AcademicTerm) {
    if (!window.confirm(`${confirmation}\n\nยืนยันเปิดใช้ “${term.name}” หรือไม่?`)) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await activateTermAsAdmin(term.id)
      setMessage(`เปิดใช้ ${term.name} เป็นภาคเรียนปัจจุบันแล้ว`)
      await load()
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : 'เปลี่ยนภาคเรียนไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dashboard-card admin-terms" id="term-management">
      <div className="section-heading"><div><p className="eyebrow">การตั้งค่ารอบการอ่าน</p><h2><CalendarDays /> จัดการภาคเรียน</h2></div><button className="button button--secondary button--small" type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> รีเฟรช</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}
      {!loading && !terms.some((term) => term.status === 'active') && <p className="form-error" role="alert">ยังไม่ได้กำหนดภาคเรียนปัจจุบัน นักเรียนจะเห็นหน้าปิดปรับปรุงจนกว่าจะเปิดใช้ภาคเรียน</p>}
      <form className="admin-term-form" onSubmit={create}>
        <h3>สร้างภาคเรียนใหม่</h3>
        <div className="form-row"><label>รหัสภาคเรียน<input required value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} placeholder="2569-1" /></label><label>ชื่อภาคเรียน<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="ภาคเรียนที่ 1 / 2569" /></label></div>
        <div className="form-row"><label>ปีการศึกษา<input required type="number" value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: Number(event.target.value) })} /></label><label>ภาคเรียน<select value={form.semester} onChange={(event) => setForm({ ...form, semester: Number(event.target.value) as 1 | 2 })}><option value={1}>1</option><option value={2}>2</option></select></label></div>
        <div className="form-row"><label>วันเริ่มต้น<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label>วันสิ้นสุด<input required type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></div>
        <button className="button button--primary" disabled={saving}>{saving ? <><LoaderCircle className="spin" /> กำลังบันทึก…</> : 'สร้างภาคเรียน'}</button>
      </form>
      {loading ? <div className="admin-list-state"><LoaderCircle className="spin" /><p>กำลังโหลดภาคเรียน…</p></div>
        : terms.length === 0 ? <div className="admin-list-state"><CalendarDays /><p>ยังไม่มีภาคเรียน</p></div>
          : <div className="admin-term-list">{terms.map((term) => <article key={term.id}><div><span className={`status-pill status-pill--${term.status}`}>{term.status}</span><h3>{term.name}</h3><p>{term.id} · {new Date(term.startDate).toLocaleDateString('th-TH')} – {new Date(term.endDate).toLocaleDateString('th-TH')}</p></div><button className="button button--secondary button--small" type="button" disabled={saving || term.status === 'active' || term.status === 'closed'} onClick={() => void activate(term)}>{term.status === 'active' ? 'กำลังใช้งาน' : term.status === 'closed' ? 'ปิดแล้ว' : 'ตั้งเป็นภาคเรียนปัจจุบัน'}</button></article>)}</div>}
    </section>
  )
}
