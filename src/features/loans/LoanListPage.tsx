import { BookOpen, CalendarClock, Library, LoaderCircle, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import type { Loan, LoanStatus } from '../../types'
import { formatThaiLoanDate, isLoanOverdue, loanStatusLabel, overdueLoanDays } from '../../utils/loans'

type LoanTab = 'pending' | 'approved' | 'borrowed' | 'history'

const tabs: Array<{ id: LoanTab; label: string }> = [
  { id: 'pending', label: 'รออนุมัติ' },
  { id: 'approved', label: 'รอรับ' },
  { id: 'borrowed', label: 'กำลังยืม' },
  { id: 'history', label: 'ประวัติ' },
]

export function LoanListPage() {
  const { loans, userBooks, setBookStatus, cancelLoan, reloadLoans, syncing } = useApp()
  const [tab, setTab] = useState<LoanTab>('pending')
  const [cancellingId, setCancellingId] = useState('')
  const [cancelConfirmation, setCancelConfirmation] = useState<Loan | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const visible = useMemo(() => loans.filter((loan) => (
    tab === 'history'
      ? ['returned', 'rejected', 'cancelled'].includes(loan.status)
      : loan.status === tab
  )), [loans, tab])

  async function cancel(loan: Loan) {
    setCancelConfirmation(null)
    setCancellingId(loan.id)
    setError('')
    try {
      await cancelLoan(loan.id)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'ยกเลิกคำขอไม่สำเร็จ')
    } finally {
      setCancellingId('')
    }
  }

  return (
    <div className="page loans-page">
      <PageHeader title="การยืมของฉัน" action={<button className="icon-button" type="button" onClick={() => void reloadLoans()} disabled={syncing} aria-label="โหลดรายการยืมใหม่"><RotateCcw className={syncing ? 'spin' : ''} /></button>} />
      <section className="selection-heading selection-heading--compact">
        <p className="eyebrow">ยืม–รับ–คืน</p>
        <h1>ติดตามหนังสือที่คุณขอยืม</h1>
      </section>
      <div className="loan-tabs" role="tablist">
        {tabs.map((item) => (
          <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            {item.label}
            <span>{loans.filter((loan) => item.id === 'history' ? ['returned', 'rejected', 'cancelled'].includes(loan.status) : loan.status === item.id).length}</span>
          </button>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {visible.length === 0 ? (
        <EmptyState
          title="ยังไม่มีรายการในหมวดนี้"
          detail="เมื่อคุณขอยืมหนังสือ สถานะจะมาแสดงให้ติดตามที่นี่"
          action={<button className="button button--primary" onClick={() => navigate('/discover')}>ค้นหาหนังสือ</button>}
        />
      ) : (
        <div className="loan-list">
          {visible.map((loan) => <StudentLoanCard
            key={loan.id}
            loan={loan}
            read={userBooks[loan.bookId]?.status === 'read'}
            cancelling={cancellingId === loan.id}
            onCancel={() => setCancelConfirmation(loan)}
            onReview={() => {
              if (userBooks[loan.bookId]?.status === 'read') {
                navigate(`/books/${loan.bookId}#my-review`)
                return
              }
              setBookStatus(loan.bookId, 'reading')
              navigate(`/review/${loan.bookId}`)
            }}
          />)}
        </div>
      )}
      {cancelConfirmation && (
        <ConfirmationDialog
          eyebrow="ยกเลิกคำขอยืม"
          title={`ยกเลิก “${cancelConfirmation.bookTitle}” ใช่ไหม?`}
          detail="คำขอนี้จะย้ายไปอยู่ในประวัติ และคุณสามารถส่งคำขอยืมหนังสือเล่มนี้ใหม่ได้ภายหลัง"
          confirmLabel="ยืนยันยกเลิก"
          cancelLabel="กลับไปก่อน"
          onConfirm={() => void cancel(cancelConfirmation)}
          onCancel={() => setCancelConfirmation(null)}
        />
      )}
    </div>
  )
}

function StudentLoanCard({ loan, read, cancelling, onCancel, onReview }: { loan: Loan; read: boolean; cancelling: boolean; onCancel: () => void; onReview: () => void }) {
  const overdue = isLoanOverdue(loan)
  return (
    <article className={`loan-list-item ${overdue ? 'loan-list-item--overdue' : ''}`}>
      <div className="loan-list-cover">
        {loan.bookCoverUrl
          ? <img src={loan.bookCoverUrl} alt={`ปกหนังสือ ${loan.bookTitle}`} loading="lazy" />
          : <Library aria-hidden="true" />}
      </div>
      <div className="loan-list-main">
        <span className={`loan-status loan-status--${overdue ? 'overdue' : loan.status}`}>{overdue ? 'เกินกำหนดคืน' : loanStatusLabel(loan.status)}</span>
        <h2>{loan.bookTitle}</h2>
        <p>{loan.bookAuthor || 'ไม่ระบุผู้แต่ง'}</p>
        <dl className="loan-dates">
          <LoanDate label="ขอยืม" value={loan.requestedAt} />
          {loan.approvedAt && <LoanDate label="อนุมัติ" value={loan.approvedAt} />}
          {loan.borrowedAt && <LoanDate label="รับหนังสือ" value={loan.borrowedAt} />}
          {loan.dueAt && <LoanDate label={overdue ? `เกินกำหนด ${overdueLoanDays(loan)} วัน` : 'กำหนดคืน'} value={loan.dueAt} />}
          {loan.returnedAt && <LoanDate label="คืนแล้ว" value={loan.returnedAt} />}
          {loan.rejectedAt && <LoanDate label="ไม่อนุมัติ" value={loan.rejectedAt} />}
          {loan.cancelledAt && <LoanDate label="ยกเลิก" value={loan.cancelledAt} />}
        </dl>
        {loan.adminNote && <p className="loan-note">หมายเหตุ: {loan.adminNote}</p>}
      </div>
      {loan.status === 'pending' && (
        <button className="button button--secondary button--small" type="button" onClick={onCancel} disabled={cancelling}>
          {cancelling ? <LoaderCircle className="spin" /> : null} {cancelling ? 'กำลังยกเลิก…' : 'ยกเลิกคำขอ'}
        </button>
      )}
      {loan.status === 'returned' && (
        <button className="button button--primary button--small" type="button" onClick={onReview}>
          <BookOpen /> {read ? 'ดูรีวิวของฉัน' : 'รีวิวหนังสือ'}
        </button>
      )}
    </article>
  )
}

function LoanDate({ label, value }: { label: string; value: string }) {
  return <div><dt><CalendarClock /> {label}</dt><dd>{formatThaiLoanDate(value)}</dd></div>
}

export function loanTabForStatus(status: LoanStatus): LoanTab {
  if (status === 'pending' || status === 'approved' || status === 'borrowed') return status
  return 'history'
}
