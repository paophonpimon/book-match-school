import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { Book } from '../types'
import { coverFallbackNeeded } from '../utils/userBooks'

export function BookCover({ book, className = '' }: { book: Book; className?: string }) {
  const [failed, setFailed] = useState(coverFallbackNeeded(book.coverUrl))
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (failed || loaded) return
    const timeout = window.setTimeout(() => setFailed(true), 10_000)
    return () => window.clearTimeout(timeout)
  }, [failed, loaded])

  if (failed) {
    return <div className={`book-cover book-cover--fallback ${className}`} style={{ '--cover-accent': book.accent } as React.CSSProperties} role="img" aria-label={`ปกหนังสือ ${book.title}`}><BookOpen /><strong>{book.title}</strong><span>{book.author}</span></div>
  }
  return <img key={book.coverUrl} className={`book-cover ${className}`} src={book.coverUrl} alt={`ปกหนังสือ ${book.title}`} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} loading="eager" decoding="async" />
}
