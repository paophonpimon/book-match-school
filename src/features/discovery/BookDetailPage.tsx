import { Bookmark, BookOpen, CalendarClock, Heart, Library, LoaderCircle, MapPin, Pause, Play, Sparkles, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { BookCover } from '../../components/BookCover'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { activeLoanForBook, formatThaiLoanDate, latestLoanForBook, loanAvailability, overdueLoanDays } from '../../utils/loans'

export function BookDetailPage() {
  const { bookId } = useParams()
  const [search] = useSearchParams()
  const { books, categories, userBooks, loans, bookLoanLocks, setBookStatus, requestLoan, cancelLoan } = useApp()
  const [loanSubmitting, setLoanSubmitting] = useState(false)
  const [loanError, setLoanError] = useState('')
  const navigate = useNavigate()
  const book = books.find((item) => item.id === bookId)
  if (!book) return <div className="page"><PageHeader back /><EmptyState title="ไม่พบหนังสือเล่มนี้" detail="รายการอาจถูกนำออกหรือปิดใช้งานชั่วคราว" /></div>
  const status = userBooks[book.id]?.status
  const category = categories.find((item) => item.id === book.categoryId)?.name
  const isMatch = search.get('match') === '1'
  const activeLoan = activeLoanForBook(loans, book.id)
  const latestLoan = latestLoanForBook(loans, book.id)
  const availability = loanAvailability(activeLoan, bookLoanLocks[book.id])

  async function submitLoanRequest() {
    if (!window.confirm('ยืนยันส่งคำขอยืมหนังสือเล่มนี้? หลังบรรณารักษ์อนุมัติ กรุณามารับหนังสือที่ห้องสมุด')) return
    setLoanSubmitting(true)
    setLoanError('')
    try {
      await requestLoan(book!.id)
    } catch (error) {
      setLoanError(error instanceof Error ? error.message : 'ส่งคำขอยืมไม่สำเร็จ')
    } finally {
      setLoanSubmitting(false)
    }
  }

  async function submitCancellation() {
    if (!activeLoan || !window.confirm('ยืนยันยกเลิกคำขอยืมหนังสือเล่มนี้?')) return
    setLoanSubmitting(true)
    setLoanError('')
    try {
      await cancelLoan(activeLoan.id)
    } catch (error) {
      setLoanError(error instanceof Error ? error.message : 'ยกเลิกคำขอไม่สำเร็จ')
    } finally {
      setLoanSubmitting(false)
    }
  }

  return (
    <div className="page detail-page">
      <PageHeader title={isMatch ? 'เจอเล่มที่ใช่!' : 'รายละเอียดหนังสือ'} back />
      {isMatch && <div className="match-confetti" aria-hidden="true">✦ <Sparkles /> ❋</div>}
      <section className="detail-hero">
        <BookCover book={book} />
        <div className="detail-summary"><div className="badge-row"><span>{category}</span>{book.featured && <span>เล่มแนะนำ</span>}</div><h1>{book.title}</h1><p>{book.author}</p><div className="detail-rating">★ 4.8 <span>· จากนักอ่าน 24 คน</span></div></div>
      </section>
      <section className="shelf-location"><MapPin /><div><small>พบหนังสือได้ที่</small><strong>{book.shelfCode}</strong><p>{book.shelfDescription}</p></div></section>
      <section className="detail-copy"><h2>เรื่องนี้เกี่ยวกับอะไร?</h2><p>{book.description}</p><div className="mood-tags">{book.moodTags.map((mood) => <span key={mood}>#{mood}</span>)}</div></section>
      {book.audioUrl?.trim() && <AudioNarration title={book.title} audioUrl={book.audioUrl} />}
      <section className={`loan-card loan-card--${availability.tone}`}>
        <div className="loan-card__heading">
          <span><Library /></span>
          <div><small>บริการยืมหนังสือ</small><strong>{availability.label}</strong></div>
        </div>
        {activeLoan?.status === 'pending' && (
          <>
            <p>บรรณารักษ์กำลังตรวจสอบคำขอของคุณ กรุณารอการอนุมัติก่อนมารับหนังสือ</p>
            <button className="button button--secondary button--wide" type="button" onClick={() => void submitCancellation()} disabled={loanSubmitting}>
              {loanSubmitting ? <LoaderCircle className="spin" /> : null} ยกเลิกคำขอ
            </button>
          </>
        )}
        {activeLoan?.status === 'approved' && <p>อนุมัติแล้ว กรุณามารับหนังสือที่ห้องสมุด</p>}
        {activeLoan?.status === 'borrowed' && (
          <div className="loan-due">
            <CalendarClock />
            <p>
              <strong>{overdueLoanDays(activeLoan) > 0 ? `เกินกำหนดคืน ${overdueLoanDays(activeLoan).toLocaleString('th-TH')} วัน` : `กำหนดคืน ${formatThaiLoanDate(activeLoan.dueAt)}`}</strong>
              <span>รับหนังสือเมื่อ {formatThaiLoanDate(activeLoan.borrowedAt)}</span>
            </p>
          </div>
        )}
        {!activeLoan && !bookLoanLocks[book.id] && (
          <>
            {latestLoan?.status === 'returned' && <p>คุณเคยยืมและคืนหนังสือเล่มนี้แล้ว สามารถส่งคำขอใหม่ได้</p>}
            {latestLoan?.status === 'rejected' && <p>คำขอก่อนหน้านี้ไม่ได้รับการอนุมัติ คุณสามารถส่งคำขอใหม่ได้</p>}
            {latestLoan?.status === 'cancelled' && <p>คำขอก่อนหน้านี้ถูกยกเลิกแล้ว คุณสามารถส่งคำขอใหม่ได้</p>}
            <button className="button button--primary button--wide" type="button" onClick={() => void submitLoanRequest()} disabled={loanSubmitting}>
              {loanSubmitting ? <LoaderCircle className="spin" /> : <Library />} {loanSubmitting ? 'กำลังส่งคำขอ…' : 'ขอยืมหนังสือ'}
            </button>
          </>
        )}
        {!activeLoan && bookLoanLocks[book.id] && <p>หนังสือเล่มนี้ยังไม่พร้อมให้ยืมในขณะนี้ กรุณากลับมาตรวจสอบอีกครั้ง</p>}
        {loanError && <p className="loan-card__error" role="alert">{loanError}</p>}
        <button className="text-button loan-history-link" type="button" onClick={() => navigate('/loans')}>ดูการยืมของฉัน</button>
      </section>
      <div className="detail-actions">
        {status !== 'reading' && status !== 'read' && <button className="button button--primary button--wide" onClick={() => { setBookStatus(book.id, 'reading'); navigate('/shelf') }}><Play /> เริ่มอ่านเล่มนี้</button>}
        <div className="button-row"><button className="button button--secondary" onClick={() => setBookStatus(book.id, 'saved')}><Bookmark /> เก็บไว้ก่อน</button><button className="button button--secondary" onClick={() => navigate('/discover')}><Heart /> ปัดต่อไป</button></div>
        {status === 'reading' && <button className="button button--primary button--wide" onClick={() => navigate(`/review/${book.id}`)}><BookOpen /> อ่านจบแล้ว</button>}
      </div>
    </div>
  )
}

function AudioNarration({ title, audioUrl }: { title: string; audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => audioRef.current?.pause(), [])

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return
    setError('')
    if (!audio.paused) {
      audio.pause()
      return
    }
    try {
      await audio.play()
    } catch {
      setError('เปิดเสียงพากย์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง')
    }
  }

  return (
    <section className="book-audio">
      <div className="book-audio__icon"><Volume2 aria-hidden="true" /></div>
      <div>
        <strong>เสียงพากย์หนังสือ</strong>
        <small>ฟังเรื่องย่อของ “{title}”</small>
      </div>
      <button className="button button--secondary" type="button" onClick={togglePlayback}>
        {isPlaying ? <Pause /> : <Play />}
        {isPlaying ? 'หยุดฟัง' : 'ฟังเสียง'}
      </button>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false)
          setError('โหลดเสียงพากย์ไม่ได้ กรุณาลองใหม่ภายหลัง')
        }}
      />
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
