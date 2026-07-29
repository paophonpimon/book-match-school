import { useState } from 'react'
import { BookOpen, ChevronRight, Library, LoaderCircle, Play, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { BookCover } from '../../components/BookCover'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import type { BookStatus } from '../../types'

const tabs: { id: BookStatus | 'interest'; label: string }[] = [{ id: 'interest', label: 'สนใจ' }, { id: 'reading', label: 'กำลังอ่าน' }, { id: 'read', label: 'อ่านแล้ว' }]

export function ShelfPage() {
  const { books, userBooks, setBookStatus, removeBookFromShelf } = useApp()
  const [tab, setTab] = useState<BookStatus | 'interest'>('interest')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const navigate = useNavigate()
  const statuses = tab === 'interest' ? ['liked', 'saved'] : [tab]
  const list = books.filter((book) => statuses.includes(userBooks[book.id]?.status))

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
      <div className="tabs" role="tablist">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}<span>{books.filter((book) => item.id === 'interest' ? ['liked', 'saved'].includes(userBooks[book.id]?.status) : userBooks[book.id]?.status === item.id).length}</span></button>)}</div>
      {list.length === 0 ? <EmptyState title="ยังไม่มีหนังสือในหมวดนี้" detail="เริ่มปัดหาเล่ม แล้วหนังสือที่คุณเลือกจะมาอยู่ตรงนี้" action={<button className="button button--primary" onClick={() => navigate('/mood')}>เริ่มค้นหาเล่ม</button>} /> : <div className="shelf-list">{list.map((book, index) => {
        const item = userBooks[book.id]
        return <article className="shelf-item" key={book.id}><BookCover book={book} loading={index < 3 ? 'eager' : 'lazy'} /><div><span className={`status status--${item.status}`}>{statusText(item.status)}</span><h2>{book.title}</h2><p>{book.author}</p><small>อัปเดต {new Date(item.updatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</small></div><div className="shelf-item__actions">{['liked', 'saved'].includes(item.status) && <><button className="button button--small button--remove" onClick={() => void confirmRemove(book.id, book.title)} disabled={removingId !== null}>{removingId === book.id ? <LoaderCircle className="spin" /> : <Trash2 />} {removingId === book.id ? 'กำลังนำออก' : 'นำออก'}</button><button className="button button--small" onClick={() => setBookStatus(book.id, 'reading')} disabled={removingId !== null}><Play /> เริ่มอ่าน</button></>}{item.status === 'reading' && <button className="button button--small button--primary" onClick={() => navigate(`/review/${book.id}`)}><BookOpen /> อ่านจบแล้ว</button>}{item.status === 'read' && <button className="icon-button" onClick={() => navigate(`/books/${book.id}`)} aria-label={`ดู ${book.title}`}><ChevronRight /></button>}</div></article>
      })}</div>}
    </div>
  )
}

function statusText(status: BookStatus) {
  return ({ liked: 'ถูกใจ', saved: 'เก็บไว้', reading: 'กำลังอ่าน', read: 'อ่านแล้ว' } as Record<BookStatus, string>)[status]
}
