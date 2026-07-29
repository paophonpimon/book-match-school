import { useState, type FormEvent } from 'react'
import { Award, Check, Star } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { BookCover } from '../../components/BookCover'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { ProgressSteps } from '../../components/ProgressSteps'
import { validateReview } from '../../utils/review'

const feelings = [['happy', '😊', 'ชอบมาก'], ['fun', '😄', 'สนุกดี'], ['okay', '😌', 'ได้ข้อคิด'], ['calm', '🌿', 'สบายใจ'], ['sad', '🥹', 'ซาบซึ้ง']]
const aspects = ['เนื้อเรื่อง', 'ตัวละคร', 'ความรู้', 'ภาพประกอบ', 'ภาษา']

export function ReviewPage() {
  const { bookId } = useParams()
  const { books, settings, completeBook } = useApp()
  const navigate = useNavigate()
  const book = books.find((item) => item.id === bookId)
  const [rating, setRating] = useState(0)
  const [moodAfterReading, setMood] = useState('')
  const [favoriteAspect, setAspect] = useState('')
  const [review, setReview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (!book) return <div className="page"><PageHeader back /><EmptyState title="ไม่พบหนังสือ" detail="กลับไปที่ชั้นหนังสือแล้วลองอีกครั้ง" /></div>

  async function submit(event: FormEvent) {
    event.preventDefault()
    const message = validateReview(review, rating, settings.reviewMinChars)
    if (message) { setError(message); return }
    if (!moodAfterReading || !favoriteAspect) { setError('กรุณาเลือกความรู้สึกและสิ่งที่ชอบ'); return }
    setSaving(true)
    try {
      await completeBook(book!.id, { rating, review: review.trim(), moodAfterReading, favoriteAspect })
      navigate('/leaderboard?completed=1')
    } catch {
      setError('ส่งรีวิวไม่สำเร็จ กรุณาลองอีกครั้ง')
      setSaving(false)
    }
  }

  return (
    <div className="page review-page">
      <PageHeader title="รีวิวเพื่อยืนยัน" back />
      <ProgressSteps active={5} />
      <section className="review-book"><BookCover book={book} loading="eager" /><div><p className="eyebrow">อ่านจบแล้ว!</p><h1>{book.title}</h1><p>{book.author}</p></div></section>
      <form onSubmit={submit} className="review-form">
        <fieldset><legend>ให้ดาวหนังสือเล่มนี้</legend><div className="stars">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={rating >= value ? 'active' : ''} onClick={() => setRating(value)} aria-label={`${value} ดาว`}><Star fill={rating >= value ? 'currentColor' : 'none'} /></button>)}</div></fieldset>
        <fieldset><legend>ความรู้สึกหลังอ่าน</legend><div className="feeling-grid">{feelings.map(([id, icon, label]) => <button type="button" key={id} className={moodAfterReading === id ? 'active' : ''} onClick={() => setMood(id)}><span>{icon}</span><small>{label}</small></button>)}</div></fieldset>
        <fieldset><legend>ชอบอะไรที่สุด?</legend><div className="chip-grid">{aspects.map((aspect) => <button type="button" key={aspect} className={favoriteAspect === aspect ? 'active' : ''} onClick={() => setAspect(aspect)}>{favoriteAspect === aspect && <Check />} {aspect}</button>)}</div></fieldset>
        <label>เล่าให้เพื่อนฟังสั้น ๆ<textarea value={review} onChange={(event) => setReview(event.target.value)} maxLength={300} rows={4} placeholder={`อย่างน้อย ${settings.reviewMinChars} ตัวอักษร เช่น “ชอบตรงที่ตัวละครไม่ยอมแพ้ ทำให้อยากลองทำสิ่งใหม่”`} /><small className={review.trim().length < settings.reviewMinChars ? 'counter counter--warning' : 'counter'}>{review.length}/300</small></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button--primary button--wide" disabled={saving}><Award /> {saving ? 'กำลังยืนยัน…' : 'ส่งรีวิวและยืนยันการอ่าน'}</button>
      </form>
    </div>
  )
}
