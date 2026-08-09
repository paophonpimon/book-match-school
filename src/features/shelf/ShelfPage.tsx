import { useState } from 'react'
import { BookOpen, ChevronRight, Library, LoaderCircle, MessageSquareText, Play, Trash2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { BookCover } from '../../components/BookCover'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import type { BookStatus } from '../../types'
import { activeLoanForBook, canStartReadingBook } from '../../utils/loans'
import { readShelfBooks } from '../../utils/userBooks'

const tabs: { id: BookStatus | 'interest'; label: string }[] = [{ id: 'interest', label: 'สนใจ' }, { id: 'reading', label: 'กำลังอ่าน' }, { id: 'read', label: 'อ่านแล้ว' }]
type ShelfTab = BookStatus | 'interest'

function isShelfTab(value: string | null): value is ShelfTab {
  return value !== null && tabs.some((tab) => tab.id === value)
}

export function ShelfPage() {
  const { books, userBooks, loans, currentTerm, syncing, setBookStatus, removeBookFromShelf } = useApp()
  const [search, setSearch] = useSearchParams()
  const requestedTab = search.get('tab')
  const [tab, setTab] = useState<ShelfTab>(isShelfTab(requestedTab) ? requestedTab : 'interest')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeConfirmation, setRemoveConfirmation] = useState<{ bookId: string; title: string } | null>(null)
  const navigate = useNavigate()
  const statuses = tab === 'interest' ? ['liked', 'saved'] : [tab]
  const readBooks = readShelfBooks(books, userBooks, loans, currentTerm?.id ?? '')
  const list = tab === 'read'
    ? readBooks
    : books.filter((book) => statuses.includes(userBooks[book.id]?.status))

  async function confirmRemove() {
    if (!removeConfirmation || removingId) return
    const { bookId } = removeConfirmation
    setRemovingId(bookId)
    try {
      await removeBookFromShelf(bookId)
      setRemoveConfirmation(null)
    } catch {
      // AppContext displays the Firestore error in the shared error banner.
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="page shelf-page">
      <PageHeader title="หนังสือของฉัน" />
      <section className="shelf-hero">
        <span className="shelf-hero__spark shelf-hero__spark--one" aria-hidden="true">✦</span>
        <span className="shelf-hero__spark shelf-hero__spark--two" aria-hidden="true">✧</span>
        <div className="shelf-hero__copy"><p className="eyebrow">ชั้นหนังสือส่วนตัว</p><h1>เก็บทุกเล่มที่คุณเลือกไว้ตรงนี้</h1><p>หยิบมาอ่านต่อหรือกลับมาดูรายละเอียดได้ทุกเมื่อ</p></div>
        <img src="/assets/book-match/home/home-reading-corner.webp" alt="" aria-hidden="true" />
      </section>
      <button className="loan-shortcut shelf-loan-shortcut" type="button" onClick={() => navigate('/loans')}><span className="shelf-loan-shortcut__icon"><Library /></span><span><strong>การยืมของฉัน</strong><small>ติดตามคำขอ วันรับ และวันกำหนดคืน</small></span><ChevronRight /></button>
      <div className="tabs shelf-tabs" role="tablist">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => { setTab(item.id); setSearch({ tab: item.id }, { replace: true }) }}>{item.label}<span>{item.id === 'read' ? readBooks.length : books.filter((book) => item.id === 'interest' ? ['liked', 'saved'].includes(userBooks[book.id]?.status) : userBooks[book.id]?.status === item.id).length}</span></button>)}</div>
      {list.length === 0 ? <div className="shelf-empty"><img src="/assets/book-match/empty-states/empty-bookshelf.png" alt="" aria-hidden="true" /><EmptyState title="ยังไม่มีหนังสือในหมวดนี้" detail="เริ่มปัดหาเล่ม แล้วหนังสือที่คุณเลือกจะมาอยู่ตรงนี้" action={<button className="button button--primary" onClick={() => navigate('/mood')}>เริ่มค้นหาเล่ม</button>} /></div> : <div className="shelf-list">{list.map((book, index) => {
        const item = userBooks[book.id]
        const returnedLoan = loans
          .filter((loan) => loan.bookId === book.id && loan.termId === currentTerm?.id && loan.status === 'returned')
          .sort((left, right) => (right.returnedAt ?? '').localeCompare(left.returnedAt ?? ''))[0]
        const reviewed = item?.status === 'read' && Boolean(item.review)
        const awaitingReview = tab === 'read' && !reviewed && Boolean(returnedLoan)
        const activeLoan = activeLoanForBook(loans, book.id)
        const canStartReading = canStartReadingBook(loans, book.id)
        const loanActionLabel = activeLoan?.status === 'pending'
          ? 'ดูคำขอ'
          : activeLoan?.status === 'approved'
            ? 'รอรับหนังสือ'
            : 'ขอยืม'
        const opensDetails = tab === 'interest' || tab === 'read'
        const detailsPath = reviewed
          ? `/books/${book.id}#my-review`
          : `/books/${book.id}`
        return <article
          className={`shelf-item shelf-item--${awaitingReview ? 'review' : item?.status ?? 'read'}${opensDetails ? ' shelf-item--clickable' : ''}`}
          key={book.id}
          role={opensDetails ? 'link' : undefined}
          tabIndex={opensDetails ? 0 : undefined}
          aria-label={opensDetails ? `ดูรายละเอียด ${book.title}` : undefined}
          onClick={(event) => {
            if (opensDetails && !(event.target as HTMLElement).closest('button, a')) navigate(detailsPath)
          }}
          onKeyDown={(event) => {
            if (opensDetails && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              navigate(detailsPath)
            }
          }}
        ><BookCover book={book} loading={index < 3 ? 'eager' : 'lazy'} /><div className="shelf-item__main"><span className={`status status--${awaitingReview ? 'review' : item?.status ?? 'read'}`}>{awaitingReview ? 'รอรีวิว' : statusText(item?.status ?? 'read')}</span><h2>{book.title}</h2><p>{book.author}</p><small>{reviewed && item.readAt ? `อ่านจบ ${formatReadDate(item.readAt)}` : awaitingReview && returnedLoan?.returnedAt ? `คืนแล้ว ${formatReadDate(returnedLoan.returnedAt)}` : item ? `อัปเดต ${formatReadDate(item.updatedAt)}` : ''}</small>{reviewed && <div className="shelf-history-summary">{item.rating && <span aria-label={`ให้คะแนน ${item.rating} จาก 5`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span>}{item.review && <p>“{item.review}”</p>}</div>}</div><div className="shelf-item__actions">{item && ['liked', 'saved'].includes(item.status) && tab !== 'read' && <><button className="button button--small button--remove" onClick={() => setRemoveConfirmation({ bookId: book.id, title: book.title })} disabled={removingId !== null}>{removingId === book.id ? <LoaderCircle className="spin" /> : <Trash2 />} {removingId === book.id ? 'กำลังนำออก' : 'นำออก'}</button>{canStartReading ? <button className="button button--small shelf-action--reading" onClick={() => setBookStatus(book.id, 'reading')} disabled={removingId !== null}><Play /> เริ่มอ่าน</button> : <button className="button button--small shelf-action--loan" onClick={() => navigate(`/books/${book.id}`)} disabled={removingId !== null}><Library /> {loanActionLabel}</button>}</>}{item?.status === 'reading' && tab !== 'read' && <button className="button button--small button--primary shelf-action--review" onClick={() => navigate(`/review/${book.id}`)}><BookOpen /> อ่านจบแล้ว</button>}{awaitingReview && <button className="button button--small button--primary shelf-action--review" type="button" disabled={syncing} onClick={() => { setBookStatus(book.id, 'reading'); navigate(`/review/${book.id}`) }}><BookOpen /> เขียนรีวิว</button>}{reviewed && <button className="button button--small button--history" type="button" onClick={() => navigate(detailsPath)}><MessageSquareText /> ดูรีวิวของฉัน</button>}</div></article>
      })}</div>}
      {removeConfirmation && <ConfirmationDialog
        eyebrow="จัดการชั้นหนังสือ"
        title={`นำ “${removeConfirmation.title}” ออกใช่ไหม?`}
        detail="หนังสือเล่มนี้จะถูกนำออกจากรายการสนใจของคุณ และสามารถกดชอบหรือเก็บไว้อีกครั้งได้ภายหลัง"
        confirmLabel="นำออกจากชั้น"
        cancelLabel="เก็บไว้ก่อน"
        icon={<Trash2 />}
        tone="danger"
        busy={removingId === removeConfirmation.bookId}
        busyLabel="กำลังนำออก"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveConfirmation(null)}
      />}
    </div>
  )
}

function formatReadDate(value: string) {
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function statusText(status: BookStatus) {
  return ({ liked: 'ถูกใจ', saved: 'เก็บไว้', reading: 'กำลังอ่าน', read: 'อ่านแล้ว' } as Record<BookStatus, string>)[status]
}
