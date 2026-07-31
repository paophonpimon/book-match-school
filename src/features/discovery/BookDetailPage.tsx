import { Bookmark, BookOpen, CalendarClock, Heart, Library, LoaderCircle, MapPin, MessageSquareText, Pause, Play, Sparkles, Star, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { BookCover } from '../../components/BookCover'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { loadBookReviewsRemote, publishOwnBookReviewRemote, type BookReviewSummary } from '../../services/firebase'
import type { BookReview, UserBook } from '../../types'
import { activeLoanForBook, canStartReadingBook, formatThaiLoanDate, latestLoanForBook, loanAvailability, overdueLoanDays } from '../../utils/loans'

export function BookDetailPage() {
  const { bookId } = useParams()
  const [search] = useSearchParams()
  const { books, categories, currentTerm, profile, userBooks, loans, bookLoanLocks, setBookStatus, requestLoan, cancelLoan } = useApp()
  const [loanSubmitting, setLoanSubmitting] = useState(false)
  const [loanError, setLoanError] = useState('')
  const [loanConfirmation, setLoanConfirmation] = useState<'request' | 'cancel' | null>(null)
  const [reviewSummary, setReviewSummary] = useState<BookReviewSummary>({ reviews: [], ratingAverage: 0, ratingCount: 0 })
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const book = books.find((item) => item.id === bookId)
  const ownBookRecord = userBooks[bookId ?? '']
  const bookStatus = ownBookRecord?.status
  useEffect(() => {
    if (location.hash !== '#my-review') return
    const frame = requestAnimationFrame(() => document.getElementById('my-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [location.hash, bookId, bookStatus])
  useEffect(() => {
    let current = true
    if (!bookId || !currentTerm?.id) {
      setReviewSummary({ reviews: [], ratingAverage: 0, ratingCount: 0 })
      setReviewsLoading(false)
      return () => { current = false }
    }
    setReviewsLoading(true)
    setReviewsError('')
    void loadBookReviewsRemote(currentTerm.id, bookId).then(async (loadedSummary) => {
      let summary = loadedSummary
      if (profile && ownBookRecord?.status === 'read' && ownBookRecord.review
        && !summary.reviews.some((review) => review.uid === profile.uid)) {
        try {
          const published = await publishOwnBookReviewRemote(ownBookRecord, profile)
          if (published) summary = await loadBookReviewsRemote(currentTerm.id, bookId)
        } catch {
          // The owner's review is still shown from private state below.
        }
      }
      if (current) setReviewSummary(summary)
    }).catch(() => {
      if (current) setReviewsError('โหลดรีวิวจากนักอ่านไม่สำเร็จ กรุณาลองใหม่ภายหลัง')
    }).finally(() => {
      if (current) setReviewsLoading(false)
    })
    return () => { current = false }
  }, [bookId, currentTerm?.id, ownBookRecord, profile])
  if (!book) return <div className="page"><PageHeader back /><EmptyState title="ไม่พบหนังสือเล่มนี้" detail="รายการอาจถูกนำออกหรือปิดใช้งานชั่วคราว" /></div>
  const userBook = userBooks[book.id]
  const status = userBook?.status
  const category = categories.find((item) => item.id === book.categoryId)?.name
  const isMatch = search.get('match') === '1'
  const activeLoan = activeLoanForBook(loans, book.id)
  const latestLoan = latestLoanForBook(loans, book.id)
  const availability = loanAvailability(activeLoan, bookLoanLocks[book.id])
  const canStartReading = canStartReadingBook(loans, book.id)
  const visibleReviews = includeOwnReview(reviewSummary.reviews, userBook, profile?.displayName ?? '')

  async function submitLoanRequest() {
    if (loanSubmitting) return
    setLoanConfirmation(null)
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
    if (!activeLoan || loanSubmitting) return
    setLoanConfirmation(null)
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
        <BookCover book={book} loading="eager" />
        <div className="detail-summary"><div className="badge-row"><span>{category}</span>{book.featured && <span>เล่มแนะนำ</span>}</div><h1>{book.title}</h1><p>{book.author}</p><div className="detail-rating">{reviewSummary.ratingCount > 0 ? <>★ {reviewSummary.ratingAverage.toFixed(1)} <span>· จาก {reviewSummary.ratingCount.toLocaleString('th-TH')} รีวิว</span></> : <span>{reviewsLoading ? 'กำลังโหลดคะแนน…' : 'ยังไม่มีคะแนนรีวิว'}</span>}</div></div>
      </section>
      {book.audioUrl?.trim() && <AudioNarration title={book.title} audioUrl={book.audioUrl} />}
      <section className={`loan-card loan-card--${availability.tone}`}>
        <div className="loan-card__heading">
          <span><Library /></span>
          <div><small>บริการยืมหนังสือ</small><strong>{availability.label}</strong></div>
        </div>
        {activeLoan?.status === 'pending' && (
          <>
            <p>บรรณารักษ์กำลังตรวจสอบคำขอของคุณ กรุณารอการอนุมัติก่อนมารับหนังสือ</p>
            <button className="button button--secondary button--wide" type="button" onClick={() => setLoanConfirmation('cancel')} disabled={loanSubmitting}>
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
            <button className="button button--primary button--wide" type="button" onClick={() => setLoanConfirmation('request')} disabled={loanSubmitting}>
              {loanSubmitting ? <LoaderCircle className="spin" /> : <Library />} {loanSubmitting ? 'กำลังส่งคำขอ…' : 'ขอยืมหนังสือ'}
            </button>
          </>
        )}
        {!activeLoan && bookLoanLocks[book.id] && <p>หนังสือเล่มนี้ยังไม่พร้อมให้ยืมในขณะนี้ กรุณากลับมาตรวจสอบอีกครั้ง</p>}
        {loanError && <p className="loan-card__error" role="alert">{loanError}</p>}
        <button className="text-button loan-history-link" type="button" onClick={() => navigate('/loans')}>ดูการยืมของฉัน</button>
      </section>
      <section className="detail-copy"><h2>เรื่องนี้เกี่ยวกับอะไร?</h2><p>{book.description}</p><div className="mood-tags">{book.moodTags.map((mood) => <span key={mood}>#{mood}</span>)}</div></section>
      <section className="shelf-location"><MapPin /><div><small>พบหนังสือได้ที่</small><strong>{book.shelfCode}</strong><p>{book.shelfDescription}</p></div></section>
      {status === 'read' && userBook.review && (
        <section className="my-review-card" id="my-review">
          <p className="eyebrow">บันทึกการอ่านของฉัน</p>
          <div className="my-review-card__heading">
            <h2>รีวิวของฉัน</h2>
            <span aria-label={`${userBook.rating ?? 0} ดาว`}>{'★'.repeat(userBook.rating ?? 0)}</span>
          </div>
          <blockquote>{userBook.review}</blockquote>
          <div className="my-review-card__meta">
            {userBook.moodAfterReading && <span>{reviewMoodLabel(userBook.moodAfterReading)}</span>}
            {userBook.favoriteAspect && <span>ชอบที่สุด: {userBook.favoriteAspect}</span>}
          </div>
          {userBook.readAt && <small>อ่านจบเมื่อ {new Date(userBook.readAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</small>}
        </section>
      )}
      <div className="detail-actions">
        {status !== 'reading' && status !== 'read' && canStartReading && <button className="button button--primary button--wide" onClick={() => { setBookStatus(book.id, 'reading'); navigate('/shelf') }}><Play /> เริ่มอ่านเล่มนี้</button>}
        <div className="button-row"><button className="button button--secondary" onClick={() => setBookStatus(book.id, 'saved')}><Bookmark /> เก็บไว้ก่อน</button><button className="button button--secondary" onClick={() => navigate('/discover')}><Heart /> ปัดต่อไป</button></div>
        {status === 'reading' && <button className="button button--primary button--wide" onClick={() => navigate(`/review/${book.id}`)}><BookOpen /> อ่านจบแล้ว</button>}
      </div>
      <ReaderReviews
        reviews={visibleReviews}
        ratingAverage={reviewSummary.ratingAverage}
        ratingCount={reviewSummary.ratingCount}
        loading={reviewsLoading}
        error={reviewsError}
        ownUid={profile?.uid ?? ''}
      />
      {loanConfirmation && (
        <ConfirmationDialog
          title={loanConfirmation === 'request' ? `ขอยืม “${book.title}”` : `ยกเลิกคำขอยืม “${book.title}”`}
          detail={loanConfirmation === 'request'
            ? 'เมื่อบรรณารักษ์อนุมัติแล้ว กรุณามารับหนังสือที่ห้องสมุด'
            : 'รายการนี้จะถูกยกเลิก และคุณสามารถส่งคำขอใหม่ภายหลังได้'}
          confirmLabel={loanConfirmation === 'request' ? 'ส่งคำขอยืม' : 'ยืนยันยกเลิก'}
          onConfirm={() => void (loanConfirmation === 'request' ? submitLoanRequest() : submitCancellation())}
          onCancel={() => setLoanConfirmation(null)}
        />
      )}
    </div>
  )
}

function includeOwnReview(reviews: BookReview[], userBook: UserBook | undefined, displayName: string) {
  if (userBook?.status !== 'read' || !userBook.review || !userBook.rating) return reviews
  if (reviews.some((review) => review.uid === userBook.uid)) return reviews
  return [{
    id: `local-${userBook.bookId}`,
    uid: userBook.uid,
    termId: userBook.termId,
    bookId: userBook.bookId,
    displayName: displayName || 'ฉัน',
    rating: userBook.rating,
    review: userBook.review,
    moodAfterReading: userBook.moodAfterReading ?? '',
    favoriteAspect: userBook.favoriteAspect ?? '',
    readAt: userBook.readAt ?? userBook.updatedAt,
    createdAt: userBook.readAt ?? userBook.updatedAt,
  }, ...reviews]
}

function ReaderReviews({ reviews, ratingAverage, ratingCount, loading, error, ownUid }: { reviews: BookReview[]; ratingAverage: number; ratingCount: number; loading: boolean; error: string; ownUid: string }) {
  return (
    <section className="reader-reviews" aria-labelledby="reader-reviews-title">
      <div className="reader-reviews__heading">
        <div><p className="eyebrow">เสียงจากนักอ่าน</p><h2 id="reader-reviews-title">รีวิวหนังสือเล่มนี้</h2></div>
        {ratingCount > 0 && <div className="reader-reviews__score"><strong>{ratingAverage.toFixed(1)}</strong><span>★</span><small>{ratingCount.toLocaleString('th-TH')} รีวิว</small></div>}
      </div>
      {loading && <div className="reader-reviews__state"><LoaderCircle className="spin" /> กำลังโหลดรีวิว…</div>}
      {!loading && error && <p className="reader-reviews__error" role="alert">{error}</p>}
      {!loading && !error && reviews.length === 0 && <div className="reader-reviews__empty"><MessageSquareText /><strong>ยังไม่มีรีวิวจากนักอ่าน</strong><span>อ่านจบแล้วมาเป็นคนแรกที่แบ่งปันความคิดเห็นกัน</span></div>}
      {!loading && reviews.length > 0 && <div className="reader-review-list">{reviews.map((review) => (
        <article className="reader-review" key={review.id}>
          <div className="reader-review__avatar" aria-hidden="true">{review.displayName.trim().charAt(0) || 'น'}</div>
          <div className="reader-review__body">
            <div className="reader-review__top"><strong>{review.displayName}{review.uid === ownUid ? ' (คุณ)' : ''}</strong><span aria-label={`${review.rating} ดาว`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} fill={star <= review.rating ? 'currentColor' : 'none'} />)}</span></div>
            <p>{review.review}</p>
            <div className="reader-review__meta">{review.moodAfterReading && <span>{reviewMoodLabel(review.moodAfterReading)}</span>}{review.favoriteAspect && <span>ชอบ: {review.favoriteAspect}</span>}<time dateTime={review.readAt}>{new Date(review.readAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</time></div>
          </div>
        </article>
      ))}</div>}
    </section>
  )
}

function reviewMoodLabel(mood: string) {
  return ({
    happy: '😊 ชอบมาก',
    fun: '😄 สนุกดี',
    okay: '😌 ได้ข้อคิด',
    calm: '🌿 สบายใจ',
    sad: '🥹 ซาบซึ้ง',
  } as Record<string, string>)[mood] ?? mood
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
