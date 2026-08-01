import { Heart, Sparkles } from 'lucide-react'
import { BookCover } from '../../components/BookCover'
import type { Book } from '../../types'

export function MatchCelebration({ book }: { book: Book }) {
  return (
    <div className="match-celebration" data-testid="match-celebration" role="status" aria-live="assertive" aria-label={`เจอเล่มที่ใช่ ${book.title}`}>
      <span className="match-celebration__spark match-celebration__spark--one" aria-hidden="true">✦</span>
      <span className="match-celebration__spark match-celebration__spark--two" aria-hidden="true">✦</span>
      <span className="match-celebration__spark match-celebration__spark--three" aria-hidden="true">✦</span>
      <div className="match-celebration__panel">
        <p className="match-celebration__eyebrow"><Sparkles /> BOOK MATCH</p>
        <h2><span>เจอ</span>เล่มที่ใช่!</h2>
        <div className="match-celebration__book" aria-hidden="true">
          <Heart className="match-celebration__heart" />
          <BookCover book={book} loading="eager" />
        </div>
        <strong>{book.title}</strong>
        <p className="match-celebration__loading">กำลังพาไปดูรายละเอียด...</p>
      </div>
    </div>
  )
}
