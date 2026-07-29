import {
  Ban,
  BookCheck,
  CalendarClock,
  Check,
  Clock3,
  History,
  Library,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  approveLoanAsAdmin,
  loadAdminLoans,
  pickupLoanAsAdmin,
  rejectLoanAsAdmin,
  renewLoanAsAdmin,
  returnLoanAsAdmin,
} from '../../services/loans'
import type { Loan } from '../../types'
import {
  DEFAULT_LOAN_DAYS,
  filterAdminLoans,
  formatThaiLoanDate,
  isLoanOverdue,
  loanStatusLabel,
  MAX_RENEW_COUNT,
  overdueLoanDays,
  type AdminLoanBucket,
} from '../../utils/loans'

const loanTabs: Array<{ id: AdminLoanBucket; label: string; icon: typeof Clock3 }> = [
  { id: 'pending', label: 'รออนุมัติ', icon: Clock3 },
  { id: 'approved', label: 'รอรับหนังสือ', icon: BookCheck },
  { id: 'borrowed', label: 'กำลังยืม', icon: Library },
  { id: 'overdue', label: 'เกินกำหนด', icon: CalendarClock },
  { id: 'returned', label: 'ประวัติการคืน', icon: History },
  { id: 'closed', label: 'ไม่อนุมัติ/ยกเลิก', icon: Ban },
]

type AdminLoanAction = 'approve' | 'reject' | 'pickup' | 'renew' | 'return'

interface AdminLoanDialogState {
  loan: Loan
  action: AdminLoanAction
  days: string
  note: string
}

export function AdminLoanManagement() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [bucket, setBucket] = useState<AdminLoanBucket>('pending')
  const [search, setSearch] = useState('')
  const [classroom, setClassroom] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mutatingId, setMutatingId] = useState('')
  const [dialog, setDialog] = useState<AdminLoanDialogState | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load(showLoading = false) {
    if (showLoading) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      setLoans(await loadAdminLoans())
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'โหลดรายการยืมจาก Firestore ไม่สำเร็จ')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load(true)
  }, [])

  const classrooms = useMemo(
    () => [...new Set(loans.map((loan) => loan.studentClassroom).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')),
    [loans],
  )
  const visible = useMemo(
    () => filterAdminLoans(loans, { bucket, search, classroom }),
    [loans, bucket, search, classroom],
  )

  function countFor(nextBucket: AdminLoanBucket) {
    return filterAdminLoans(loans, { bucket: nextBucket, search: '', classroom: '' }).length
  }

  function openMutation(loan: Loan, action: AdminLoanAction) {
    setError('')
    setMessage('')
    setDialog({
      loan,
      action,
      days: String(loan.loanDays || DEFAULT_LOAN_DAYS),
      note: action === 'approve' || action === 'reject' ? loan.adminNote : '',
    })
  }

  async function mutate({ loan, action, days: daysText, note: noteText }: AdminLoanDialogState) {
    const days = Number(daysText)
    const note = noteText.trim()
    if ((action === 'approve' || action === 'pickup')
      && (!Number.isInteger(days) || days < 1 || days > 30)) {
      setError('จำนวนวันยืมต้องเป็นจำนวนเต็ม 1–30 วัน')
      return
    }
    if (action === 'reject' && !note) {
      setError('กรุณาระบุเหตุผลที่ไม่อนุมัติ')
      return
    }
    setMutatingId(loan.id)
    setError('')
    setMessage('')
    try {
      if (action === 'approve') await approveLoanAsAdmin(loan, days, note)
      if (action === 'reject') await rejectLoanAsAdmin(loan, note)
      if (action === 'pickup') await pickupLoanAsAdmin(loan, days)
      if (action === 'renew') await renewLoanAsAdmin(loan)
      if (action === 'return') await returnLoanAsAdmin(loan)
      setMessage(({
        approve: 'อนุมัติคำขอแล้ว นักเรียนสามารถมารับหนังสือได้',
        reject: 'บันทึกการไม่อนุมัติแล้ว',
        pickup: 'ยืนยันการรับหนังสือและตั้งวันกำหนดคืนแล้ว',
        renew: 'ขยายเวลายืมแล้ว',
        return: 'ยืนยันคืนหนังสือและปลดล็อกหนังสือแล้ว',
      } satisfies Record<typeof action, string>)[action])
      setDialog(null)
      await load(false)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'เปลี่ยนสถานะการยืมไม่สำเร็จ')
    } finally {
      setMutatingId('')
    }
  }

  return (
    <section className="dashboard-card admin-loans-panel" id="loan-management">
      <div className="section-heading">
        <div><p className="eyebrow">ระบบยืม–คืน</p><h2>จัดการคำขอยืมและการคืนหนังสือ</h2></div>
        <button className="button button--secondary button--small" type="button" onClick={() => void load(false)} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'spin' : ''} /> รีเฟรช
        </button>
      </div>
      {error && <p className="form-error admin-notice" role="alert">{error}</p>}
      {message && <p className="admin-success admin-notice" role="status"><Check /> {message}</p>}
      <div className="admin-loan-tabs" role="tablist">
        {loanTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={bucket === id} className={bucket === id ? 'active' : ''} onClick={() => setBucket(id)}>
            <Icon /><span>{label}</span><b>{countFor(id).toLocaleString('th-TH')}</b>
          </button>
        ))}
      </div>
      <div className="admin-filters admin-loan-filters">
        <label className="admin-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหานักเรียนหรือหนังสือ" aria-label="ค้นหานักเรียนหรือหนังสือ" /></label>
        <label><span>ชั้น/ห้อง</span><select value={classroom} onChange={(event) => setClassroom(event.target.value)}><option value="">ทุกชั้น</option>{classrooms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>สถานะ</span><select value={bucket} onChange={(event) => setBucket(event.target.value as AdminLoanBucket)}>{loanTabs.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      {loading ? (
        <div className="admin-list-state"><LoaderCircle className="spin" /><p>กำลังโหลดรายการยืมจาก Firestore…</p></div>
      ) : visible.length === 0 ? (
        <div className="admin-list-state"><Library /><p>ไม่มีรายการตามเงื่อนไขที่เลือก</p></div>
      ) : (
        <div className="admin-loan-list">
          {visible.map((loan) => (
            <AdminLoanCard
              key={loan.id}
              loan={loan}
              busy={mutatingId === loan.id}
              onAction={(action) => openMutation(loan, action)}
            />
          ))}
        </div>
      )}
      {loans.length >= 300 && <p className="admin-loan-limit">กำลังแสดงข้อมูลล่าสุด 300 รายการ กรุณาใช้ตัวกรองเพื่อค้นหา</p>}
      {dialog && (
        <div className="admin-loan-dialog-backdrop" role="presentation" onMouseDown={() => !mutatingId && setDialog(null)}>
          <section
            className="admin-loan-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-loan-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="admin-loan-dialog-close" type="button" onClick={() => setDialog(null)} disabled={Boolean(mutatingId)} aria-label="ปิด">
              <X />
            </button>
            <p className="eyebrow">ยืนยันรายการยืม–คืน</p>
            <h3 id="admin-loan-dialog-title">{loanActionTitle(dialog.action)}</h3>
            <p className="admin-loan-dialog-book">“{dialog.loan.bookTitle}”</p>
            <p>นักเรียน: <strong>{dialog.loan.studentDisplayName}</strong> · {dialog.loan.studentClassroom} เลขที่ {dialog.loan.studentNumber}</p>
            {(dialog.action === 'approve' || dialog.action === 'pickup') && (
              <label>
                <span>จำนวนวันยืม (1–30 วัน)</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  inputMode="numeric"
                  value={dialog.days}
                  onChange={(event) => setDialog({ ...dialog, days: event.target.value })}
                  disabled={Boolean(mutatingId)}
                />
              </label>
            )}
            {(dialog.action === 'approve' || dialog.action === 'reject') && (
              <label>
                <span>{dialog.action === 'reject' ? 'เหตุผลที่ไม่อนุมัติ (ต้องระบุ)' : 'หมายเหตุถึงนักเรียน (เว้นว่างได้)'}</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={dialog.note}
                  onChange={(event) => setDialog({ ...dialog, note: event.target.value })}
                  disabled={Boolean(mutatingId)}
                />
              </label>
            )}
            <div className="admin-loan-dialog-actions">
              <button className="button button--secondary" type="button" onClick={() => setDialog(null)} disabled={Boolean(mutatingId)}>ยกเลิก</button>
              <button className="button button--primary" type="button" onClick={() => void mutate(dialog)} disabled={Boolean(mutatingId)}>
                {mutatingId ? <LoaderCircle className="spin" /> : <Check />} {loanActionButtonLabel(dialog.action)}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function loanActionTitle(action: AdminLoanAction) {
  return ({
    approve: 'อนุมัติคำขอยืม',
    reject: 'ไม่อนุมัติคำขอยืม',
    pickup: 'ยืนยันการรับหนังสือ',
    renew: 'ขยายเวลายืม',
    return: 'ยืนยันการคืนหนังสือ',
  } satisfies Record<AdminLoanAction, string>)[action]
}

function loanActionButtonLabel(action: AdminLoanAction) {
  return ({
    approve: 'ยืนยันอนุมัติ',
    reject: 'ยืนยันไม่อนุมัติ',
    pickup: 'ยืนยันรับหนังสือ',
    renew: 'ยืนยันขยายเวลา',
    return: 'ยืนยันคืนหนังสือ',
  } satisfies Record<AdminLoanAction, string>)[action]
}

function AdminLoanCard({ loan, busy, onAction }: { loan: Loan; busy: boolean; onAction: (action: AdminLoanAction) => void }) {
  const overdue = isLoanOverdue(loan)
  return (
    <article className={`admin-loan-card ${overdue ? 'admin-loan-card--overdue' : ''}`}>
      <div className="admin-loan-cover">
        {loan.bookCoverUrl ? <img src={loan.bookCoverUrl} alt={`ปกหนังสือ ${loan.bookTitle}`} loading="lazy" /> : <Library />}
      </div>
      <div className="admin-loan-main">
        <div className="admin-loan-heading">
          <span className={`loan-status loan-status--${overdue ? 'overdue' : loan.status}`}>{overdue ? `เกินกำหนด ${overdueLoanDays(loan)} วัน` : loanStatusLabel(loan.status)}</span>
          <small>Loan ID: {loan.id}</small>
        </div>
        <h3>{loan.bookTitle}</h3>
        <p>{loan.bookAuthor || 'ไม่ระบุผู้แต่ง'}</p>
        <div className="admin-student-info">
          <strong>{loan.studentFirstName} {loan.studentLastName} · “{loan.studentDisplayName}”</strong>
          <span>{loan.studentClassroom} · เลขที่ {loan.studentNumber} · รหัส {loan.studentId}</span>
        </div>
        <dl className="admin-loan-dates">
          <DateItem label="ขอยืม" value={loan.requestedAt} />
          {loan.approvedAt && <DateItem label="อนุมัติ" value={loan.approvedAt} />}
          {loan.borrowedAt && <DateItem label="รับหนังสือ" value={loan.borrowedAt} />}
          {loan.dueAt && <DateItem label="กำหนดคืน" value={loan.dueAt} />}
          {loan.returnedAt && <DateItem label="คืนแล้ว" value={loan.returnedAt} />}
        </dl>
        {loan.adminNote && <p className="loan-note">หมายเหตุ: {loan.adminNote}</p>}
      </div>
      <div className="admin-loan-actions">
        {loan.status === 'pending' && <>
          <button className="button button--primary button--small" onClick={() => onAction('approve')} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Check />} อนุมัติ</button>
          <button className="button button--secondary button--small" onClick={() => onAction('reject')} disabled={busy}><Ban /> ไม่อนุมัติ</button>
        </>}
        {loan.status === 'approved' && <>
          <button className="button button--primary button--small" onClick={() => onAction('pickup')} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <BookCheck />} ยืนยันรับหนังสือแล้ว</button>
          <button className="button button--secondary button--small" onClick={() => onAction('reject')} disabled={busy}><Undo2 /> ยกเลิกการอนุมัติ</button>
        </>}
        {loan.status === 'borrowed' && <>
          <button className="button button--primary button--small" onClick={() => onAction('return')} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <RotateCcw />} ยืนยันคืนแล้ว</button>
          <button className="button button--secondary button--small" onClick={() => onAction('renew')} disabled={busy || loan.renewCount >= MAX_RENEW_COUNT}><CalendarClock /> {loan.renewCount >= MAX_RENEW_COUNT ? 'ขยายเวลาแล้ว' : 'ขยายเวลายืม'}</button>
        </>}
      </div>
    </article>
  )
}

function DateItem({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{formatThaiLoanDate(value, true)}</dd></div>
}
