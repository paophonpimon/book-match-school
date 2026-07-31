import { useState } from 'react'
import { BookOpen, ChevronRight, Library, LoaderCircle, MessageSquareText, Play, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { BookCover } from '../../components/BookCover'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import type { BookStatus } from '../../types'
import { activeLoanForBook, canStartReadingBook } from '../../utils/loans'
import { readShelfBooks } from '../../utils/userBooks'

const tabs: { id: BookStatus | 'interest'; label: string }[] = [{ id: 'interest', label: 'สนใจ' }, { id: 'reading', label: 'กำลังอ่าน' }, { id: 'read', label: 'อ่านแล้ว' }]

export function ShelfPage() {
  const { books, userBooks, loans, currentTerm, syncing, setBookStatus, removeBookFromShelf } = useApp()
  const [tab, setTab] = useState<BookStatus | 'interest'>('interest')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const navigate = useNavigate()
  const statuses = tab === 'interest' ? ['liked', 'saved'] : [tab]
  const readBooks = readShelfBooks(books, userBooks, loans, currentTerm?.id ?? '')
  const list = tab === 'read'
    ? readBooks
    : books.filter((book) => statuses.includes(userBooks[book.id]?.status))

  async function confirmRemove(bookId: string, title: string) {
    if (!window.confirm(`ยืนยันนำ “${title}” ออกจากชั้นหนังสือใช่หรือไม่?`)) return
    setRemovingId(bookId)
    try {
      await removeBookFromShelf(bookId)
    } catch {
      // AppContext displays the Firestore error in the shared error banner.
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="page shelf-page">
      <PageHeader title="หนังสือของฉัน" />
      <section className="selection-heading selection-heading--compact"><p className="eyebrow">ชั้นหนังสือส่วนตัว</p><h1>เก็บทุกเล่มที่คุณเลือกไว้ตรงนี้</h1></section>
      <button className="loan-shortcut" type="button" onClick={() => navigate('/loans')}><Library /><span><strong>การยืมของฉัน</strong><small>ติดตามคำขอ วันรับ และวันกำหนดคืน</small></span><ChevronRight /></button>
      <div className="tabs" role="tablist">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}<span>{item.id === 'read' ? readBooks.length : books.filter((book) => item.id === 'interest' ? ['liked', 'saved'].includes(userBooks[book.id]?.status) : userBooks[book.id]?.status === item.id).length}</span></button>)}</div>
      {list.length === 0 ? <EmptyState title="ยังไม่มีหนังสือในหมวดนี้" detail="เริ่มปัดหาเล่ม แล้วหนังสือที่คุณเลือกจะมาอยู่ตรงนี้" action={<button className="button button--primary" onClick={() => navigate('/mood')}>เริ่มค้นหาเล่ม</button>} /> : <div className="shelf-list">{list.map((book, index) => {
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
          className={`shelf-item${opensDetails ? ' shelf-item--clickable' : ''}`}
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
        ><BookCover book={book} loading={index < 3 ? 'eager' : 'lazy'} /><div><span className={`status status--${awaitingReview ? 'review' : item?.status ?? 'read'}`}>{awaitingReview ? 'รอรีวิว' : statusText(item?.status ?? 'read')}</span><h2>{book.title}</h2><p>{book.author}</p><small>{reviewed && item.readAt ? `อ่านจบ ${formatReadDate(item.readAt)}` : awaitingReview && returnedLoan?.returnedAt ? `คืนแล้ว ${formatReadDate(returnedLoan.returnedAt)}` : item ? `อัปเดต ${formatReadDate(item.updatedAt)}` : ''}</small>{reviewed && <div className="shelf-history-summary">{item.rating && <span aria-label={`ให้คะแนน ${item.rating} จาก 5`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span>}{item.review && <p>“{item.review}”</p>}</div>}</div><div className="shelf-item__actions">{item && ['liked', 'saved'].includes(item.status) && tab !== 'read' && <><button className="button button--small button--remove" onClick={() => void confirmRemove(book.id, book.title)} disabled={removingId !== null}>{removingId === book.id ? <LoaderCircle className="spin" /> : <Trash2 />} {removingId === book.id ? 'กำลังนำออก' : 'นำออก'}</button>{canStartReading ? <button className="button button--small" onClick={() => setBookStatus(book.id, 'reading')} disabled={removingId !== null}><Play /> เริ่มอ่าน</button> : <button className="button button--small" onClick={() => navigate(`/books/${book.id}`)} disabled={removingId !== null}><Library /> {loanActionLabel}</button>}</>}{item?.status === 'reading' && tab !== 'read' && <button className="button button--small button--primary" onClick={() => navigate(`/review/${book.id}`)}><BookOpen /> อ่านจบแล้ว</button>}{awaitingReview && <button className="button button--small button--primary" type="button" disabled={syncing} onClick={() => { setBookStatus(book.id, 'reading'); navigate(`/review/${book.id}`) }}><BookOpen /> เขียนรีวิว</button>}{reviewed && <button className="button button--small button--history" type="button" onClick={() => navigate(detailsPath)}><MessageSquareText /> ดูรีวิวของฉัน</button>}</div></article>
      })}</div>}
    </div>
  )
}

function formatReadDate(value: string) {
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function statusText(status: BookStatus) {
  return ({ liked: 'ถูกใจ', saved: 'เก็บไว้', reading: 'กำลังอ่าน', read: 'อ่านแล้ว' } as Record<BookStatus, string>)[status]
}
