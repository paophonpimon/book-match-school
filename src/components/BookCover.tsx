import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { Book } from '../types'
import { coverFallbackNeeded } from '../utils/userBooks'

const SLOW_LOADING_NOTICE_MS = 10_000
const RETRY_BACKOFF_MS = 600
const MAX_RETRIES = 1

type CoverLoading = 'eager' | 'lazy'
type CoverStatus = 'loading' | 'retrying' | 'loaded' | 'failed'

interface BookCoverProps {
  book: Book
  className?: string
  loading?: CoverLoading
}

export function BookCover({ book, className = '', loading = 'lazy' }: BookCoverProps) {
  const coverUrl = book.coverUrl.trim()

  if (coverFallbackNeeded(coverUrl)) {
    return <CoverFallback book={book} className={className} />
  }

  return (
    <CoverRequest
      key={coverUrl}
      book={book}
      className={className}
      coverUrl={coverUrl}
      loading={loading}
    />
  )
}

function CoverRequest({ book, className = '', coverUrl, loading }: BookCoverProps & { coverUrl: string }) {
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<CoverStatus>('loading')
  const [isSlow, setIsSlow] = useState(false)

  useEffect(() => {
    if (status !== 'loading') return
    const timer = window.setTimeout(() => setIsSlow(true), SLOW_LOADING_NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [attempt, status])

  useEffect(() => {
    if (status !== 'retrying') return
    const timer = window.setTimeout(() => {
      setAttempt((current) => current + 1)
      setStatus('loading')
    }, RETRY_BACKOFF_MS)
    return () => window.clearTimeout(timer)
  }, [status])

  if (status === 'failed') {
    return <CoverFallback book={book} className={className} />
  }

  const loaded = status === 'loaded'
  return (
    <div
      className={`book-cover book-cover--media ${loaded ? 'book-cover--loaded' : 'book-cover--loading'} ${className}`}
      role="img"
      aria-label={`ปกหนังสือ ${book.title}`}
      aria-busy={!loaded}
    >
      <img
        key={attempt}
        className="book-cover__image"
        src={coverUrl}
        alt=""
        aria-hidden="true"
        loading={loading}
        decoding="async"
        onLoad={() => {
          setIsSlow(false)
          setStatus('loaded')
        }}
        onError={() => {
          setIsSlow(false)
          setStatus(attempt < MAX_RETRIES ? 'retrying' : 'failed')
        }}
      />
      {isSlow && status === 'loading' && (
        <span className="book-cover__slow-note" role="status">กำลังโหลดภาพปกนานกว่าปกติ</span>
      )}
    </div>
  )
}

function CoverFallback({ book, className }: { book: Book; className: string }) {
  return (
    <div
      className={`book-cover book-cover--fallback ${className}`}
      style={{ '--cover-accent': book.accent } as React.CSSProperties}
      role="img"
      aria-label={`ไม่มีภาพปกสำหรับ ${book.title}`}
    >
      <BookOpen />
      <strong>ไม่มีภาพปก</strong>
      <span>{book.title}</span>
    </div>
  )
}
