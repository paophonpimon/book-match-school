import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Play,
  Printer,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import type { AcademicTerm, LoanStatus } from '../../types'
import {
  activateTermAsAdmin,
  closeTermAsAdmin,
  createTermAsAdmin,
  deleteDraftTermAsAdmin,
  listTermsAsAdmin,
  loadTermReportAsAdmin,
} from '../../services/adminTerms'
import { termReportToCsv, type TermReport } from '../../utils/termReports'

const confirmation = 'การเปลี่ยนภาคเรียนจะเริ่มสถิติและอันดับนักอ่านรอบใหม่ ข้อมูลภาคเรียนเดิม ประวัติสมาชิก เลเวลสะสม และประวัติยืม–คืนจะยังคงอยู่'
const currentCalendarYear = new Date().getFullYear()
const statusLabels = { draft: 'ร่าง', active: 'กำลังใช้งาน', closed: 'ปิดแล้ว' }
const loanLabels: Record<LoanStatus, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  borrowed: 'กำลังยืม',
  returned: 'คืนแล้ว',
  rejected: 'ไม่อนุมัติ',
  cancelled: 'ยกเลิก',
}

type TermAction = 'activate' | 'close' | 'remove'

interface AdminTermManagementProps {
  refreshVersion?: number
  onRefreshComplete?: () => void
}

export function AdminTermManagement({ refreshVersion = 0, onRefreshComplete }: AdminTermManagementProps) {
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [report, setReport] = useState<TermReport | null>(null)
  const [reportLoadingId, setReportLoadingId] = useState('')
  const [termConfirmation, setTermConfirmation] = useState<{ term: AcademicTerm; action: TermAction } | null>(null)
  const previousRefreshVersion = useRef(refreshVersion)
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

  useEffect(() => {
    if (refreshVersion === previousRefreshVersion.current) return
    previousRefreshVersion.current = refreshVersion
    void load().finally(() => onRefreshComplete?.())
  }, [refreshVersion, onRefreshComplete])

  async function create(event: FormEvent) {
    event.preventDefault()
    setSavingId('create')
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
      setSavingId('')
    }
  }

  async function activate(term: AcademicTerm) {
    setSavingId(term.id)
    setError('')
    setMessage('')
    try {
      await activateTermAsAdmin(term.id)
      setMessage(`เปิดใช้ ${term.name} เป็นภาคเรียนปัจจุบันแล้ว`)
      await load()
      setTermConfirmation(null)
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : 'เปลี่ยนภาคเรียนไม่สำเร็จ')
    } finally {
      setSavingId('')
    }
  }

  async function close(term: AcademicTerm) {
    setSavingId(term.id)
    setError('')
    setMessage('')
    try {
      await closeTermAsAdmin(term.id)
      setMessage(`ปิด ${term.name} แล้ว ข้อมูลย้อนหลังยังคงอยู่`)
      await load()
      setTermConfirmation(null)
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'ปิดภาคเรียนไม่สำเร็จ')
    } finally {
      setSavingId('')
    }
  }

  async function remove(term: AcademicTerm) {
    setSavingId(term.id)
    setError('')
    setMessage('')
    try {
      await deleteDraftTermAsAdmin(term.id)
      if (report?.term.id === term.id) setReport(null)
      setMessage(`ลบภาคเรียนร่าง ${term.id} แล้ว`)
      await load()
      setTermConfirmation(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'ลบภาคเรียนไม่สำเร็จ')
    } finally {
      setSavingId('')
    }
  }

  async function showReport(term: AcademicTerm) {
    setReportLoadingId(term.id)
    setError('')
    try {
      setReport(await loadTermReportAsAdmin(term))
      requestAnimationFrame(() => document.getElementById('term-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'โหลดรายงานภาคเรียนไม่สำเร็จ')
    } finally {
      setReportLoadingId('')
    }
  }

  function downloadCsv() {
    if (!report) return
    const blob = new Blob([termReportToCsv(report)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `book-match-${report.term.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="dashboard-card admin-terms" id="term-management">
      <div className="section-heading">
        <div><p className="eyebrow">การตั้งค่ารอบการอ่าน</p><h2><CalendarDays /> จัดการภาคเรียน</h2></div>
        <button className="button button--secondary button--small" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'spin' : ''} /> รีเฟรช
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}
      {!loading && !terms.some((term) => term.status === 'active') && (
        <p className="form-error" role="alert">ยังไม่ได้กำหนดภาคเรียนปัจจุบัน นักเรียนจะเห็นหน้าปิดปรับปรุงจนกว่าจะเปิดใช้ภาคเรียน</p>
      )}

      <form className="admin-term-form" onSubmit={create}>
        <h3>สร้างภาคเรียนใหม่</h3>
        <div className="form-row"><label>รหัสภาคเรียน<input required value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} placeholder="2569-1" /></label><label>ชื่อภาคเรียน<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="ภาคเรียนที่ 1 / 2569" /></label></div>
        <div className="form-row"><label>ปีการศึกษา<input required type="number" value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: Number(event.target.value) })} /></label><label>ภาคเรียน<select value={form.semester} onChange={(event) => setForm({ ...form, semester: Number(event.target.value) as 1 | 2 })}><option value={1}>1</option><option value={2}>2</option></select></label></div>
        <div className="form-row"><label>วันเริ่มต้น<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label>วันสิ้นสุด<input required type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></div>
        <button className="button button--primary" disabled={Boolean(savingId)}>
          {savingId === 'create' ? <><LoaderCircle className="spin" /> กำลังบันทึก…</> : 'สร้างภาคเรียน'}
        </button>
      </form>

      {loading ? <div className="admin-list-state"><LoaderCircle className="spin" /><p>กำลังโหลดภาคเรียน…</p></div>
        : terms.length === 0 ? <div className="admin-list-state"><CalendarDays /><p>ยังไม่มีภาคเรียน</p></div>
          : <div className="admin-term-list">{terms.map((term) => (
            <article key={term.id}>
              <div>
                <span className={`status-pill status-pill--${term.status}`}>{statusLabels[term.status]}</span>
                <h3>{term.name}</h3>
                <p>{term.id} · {new Date(term.startDate).toLocaleDateString('th-TH')} – {new Date(term.endDate).toLocaleDateString('th-TH')}</p>
              </div>
              <div className="admin-term-actions">
                <button className="button button--secondary button--small" type="button" onClick={() => void showReport(term)} disabled={Boolean(reportLoadingId)}>
                  {reportLoadingId === term.id ? <LoaderCircle className="spin" /> : <BarChart3 />} ดูสรุป
                </button>
                {term.status === 'active' ? (
                  <button className="button button--secondary button--small button--danger" type="button" disabled={Boolean(savingId)} onClick={() => setTermConfirmation({ term, action: 'close' })}>
                    {savingId === term.id ? <LoaderCircle className="spin" /> : <LockKeyhole />} ปิดภาคเรียน
                  </button>
                ) : (
                  <button className="button button--secondary button--small" type="button" disabled={Boolean(savingId)} onClick={() => setTermConfirmation({ term, action: 'activate' })}>
                    {savingId === term.id ? <LoaderCircle className="spin" /> : <Play />} {term.status === 'closed' ? 'เปิดใช้อีกครั้ง' : 'เปิดใช้งาน'}
                  </button>
                )}
                {term.status === 'draft' && (
                  <button className="button button--secondary button--small button--danger" type="button" disabled={Boolean(savingId)} onClick={() => setTermConfirmation({ term, action: 'remove' })}>
                    <Trash2 /> ลบร่าง
                  </button>
                )}
              </div>
            </article>
          ))}</div>}

      {report && <TermReportView report={report} onDownloadCsv={downloadCsv} />}
      {termConfirmation && (
        <ConfirmationDialog
          eyebrow="จัดการภาคเรียน"
          title={termConfirmation.action === 'activate'
            ? `${termConfirmation.term.status === 'closed' ? 'เปิดใช้อีกครั้ง' : 'เปิดใช้'} “${termConfirmation.term.name}” ใช่ไหม?`
            : termConfirmation.action === 'close'
              ? `ปิด “${termConfirmation.term.name}” ใช่ไหม?`
              : `ลบภาคเรียนร่าง “${termConfirmation.term.name}” ใช่ไหม?`}
          detail={termConfirmation.action === 'activate'
            ? confirmation
            : termConfirmation.action === 'close'
              ? 'ข้อมูลเดิมและรายงานจะยังอยู่ครบ แต่นักเรียนจะสร้างกิจกรรมใหม่ไม่ได้จนกว่าจะเปิดภาคเรียนอีกครั้ง'
              : 'ลบได้เฉพาะภาคเรียนร่างที่ยังไม่เคยเปิดใช้งาน การดำเนินการนี้ย้อนกลับไม่ได้'}
          confirmLabel={termConfirmation.action === 'activate'
            ? (termConfirmation.term.status === 'closed' ? 'เปิดใช้อีกครั้ง' : 'เปิดใช้งาน')
            : termConfirmation.action === 'close' ? 'ปิดภาคเรียน' : 'ลบภาคเรียนร่าง'}
          cancelLabel="ยกเลิก"
          icon={termConfirmation.action === 'activate' ? <Play /> : termConfirmation.action === 'close' ? <LockKeyhole /> : <Trash2 />}
          tone={termConfirmation.action === 'activate' ? 'default' : 'danger'}
          busy={savingId === termConfirmation.term.id}
          busyLabel="กำลังบันทึก"
          onConfirm={() => {
            if (termConfirmation.action === 'activate') void activate(termConfirmation.term)
            else if (termConfirmation.action === 'close') void close(termConfirmation.term)
            else void remove(termConfirmation.term)
          }}
          onCancel={() => setTermConfirmation(null)}
        />
      )}
    </section>
  )
}

function TermReportView({ report, onDownloadCsv }: { report: TermReport; onDownloadCsv: () => void }) {
  const summaryCards = [
    ['นักเรียนในรายงาน', report.studentCount],
    ['นักอ่านที่อ่านจบ', report.activeReaderCount],
    ['อ่านจบรวม', report.totalReadCount],
    ['สนใจรวม', report.totalLikedCount],
    ['เฉลี่ยต่อคน', report.averageReadCount.toLocaleString('th-TH', { maximumFractionDigits: 1 })],
    ['คะแนนรีวิวเฉลี่ย', report.averageRating?.toLocaleString('th-TH', { maximumFractionDigits: 2 }) ?? '–'],
  ]
  return (
    <section className="term-report-print" id="term-report" aria-labelledby="term-report-title">
      <header className="term-report-header">
        <div>
          <p className="eyebrow">สรุปข้อมูลรายภาคเรียน</p>
          <h2 id="term-report-title"><FileText /> {report.term.name}</h2>
          <p>{report.term.id} · {new Date(report.term.startDate).toLocaleDateString('th-TH')} – {new Date(report.term.endDate).toLocaleDateString('th-TH')}</p>
        </div>
        <div className="term-report-actions">
          <button className="button button--secondary button--small" type="button" onClick={onDownloadCsv}><Download /> ดาวน์โหลด CSV</button>
          <button className="button button--primary button--small" type="button" onClick={() => window.print()}><Printer /> พิมพ์ / บันทึก PDF</button>
        </div>
      </header>

      <div className="term-report-stats">
        {summaryCards.map(([label, value]) => <article key={label}><small>{label}</small><strong>{typeof value === 'number' ? value.toLocaleString('th-TH') : value}</strong></article>)}
      </div>

      <div className="term-report-breakdown">
        <section>
          <h3>ชั้นหนังสือของนักเรียน</h3>
          <dl>
            <div><dt>สนใจ</dt><dd>{report.shelfCounts.liked.toLocaleString('th-TH')}</dd></div>
            <div><dt>เก็บไว้ก่อน</dt><dd>{report.shelfCounts.saved.toLocaleString('th-TH')}</dd></div>
            <div><dt>กำลังอ่าน</dt><dd>{report.shelfCounts.reading.toLocaleString('th-TH')}</dd></div>
            <div><dt>อ่านแล้ว</dt><dd>{report.shelfCounts.read.toLocaleString('th-TH')}</dd></div>
            <div><dt>รีวิวที่สมบูรณ์</dt><dd>{report.reviewCount.toLocaleString('th-TH')}</dd></div>
          </dl>
        </section>
        <section>
          <h3>การยืม–คืน</h3>
          <dl>
            {(Object.entries(report.loanCounts) as Array<[LoanStatus, number]>).map(([status, count]) => (
              <div key={status}><dt>{loanLabels[status]}</dt><dd>{count.toLocaleString('th-TH')}</dd></div>
            ))}
          </dl>
        </section>
      </div>

      <section className="term-report-ranking">
        <h3>10 อันดับนักอ่านประจำภาคเรียน</h3>
        {report.topReaders.length === 0 ? <p>ยังไม่มีข้อมูลการอ่านในภาคเรียนนี้</p> : (
          <div className="term-report-table-wrap">
            <table>
              <thead><tr><th>อันดับ</th><th>ชื่อที่แสดง</th><th>ชั้น</th><th>อ่านจบ</th><th>สนใจ</th><th>ยืม</th><th>คืนแล้ว</th></tr></thead>
              <tbody>{report.topReaders.map((reader, index) => (
                <tr key={reader.uid}>
                  <td>{index + 1}</td><td>{reader.displayName || 'ไม่ระบุชื่อ'}</td><td>{reader.className || '–'}</td>
                  <td>{reader.readCount}</td><td>{reader.likedCount}</td><td>{reader.loanCount}</td><td>{reader.returnedLoanCount}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      <small className="term-report-generated">สร้างรายงานเมื่อ {new Date(report.generatedAt).toLocaleString('th-TH')} · ข้อมูลมาจาก Firestore ตามรหัสภาคเรียน</small>
    </section>
  )
}
