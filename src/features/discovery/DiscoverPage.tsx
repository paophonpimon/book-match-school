import { AnimatePresence, motion, useMotionValue, useTransform, type MotionStyle, type MotionValue } from 'framer-motion'
import { Bookmark, Heart, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { BookCover } from '../../components/BookCover'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { ProgressSteps } from '../../components/ProgressSteps'
import { moods } from '../../data/demoData'
import type { SwipeAction } from '../../types'
import { rankBooks } from '../../utils/bookRanking'
import { activeLoanForBook, loanAvailability } from '../../utils/loans'

export function DiscoverPage() {
  const { books, categories, loans, bookLoanLocks, selectedMoods, selectedCategories, seenBookIds, swipeHistory, setBookStatus, undoSwipe, resetRound } = useApp()
  const navigate = useNavigate()
  const seed = sessionStorage.getItem('book-match-seed') ?? crypto.randomUUID()
  sessionStorage.setItem('book-match-seed', seed)
  const ranked = useMemo(() => rankBooks(books, selectedMoods, selectedCategories, seed, seenBookIds), [books, selectedMoods, selectedCategories, seed, seenBookIds])
  const current = ranked[0]
  const nextBook = ranked[1]
  const moodLabels = moods.filter((item) => selectedMoods.includes(item.id)).map((item) => item.label)
  const moodLabel = moodLabels.length ? moodLabels.join(' · ') : 'ทุกอารมณ์'
  const swipeX = useMotionValue(0)
  const swipeY = useMotionValue(0)
  const noActionScale = useTransform(swipeX, [-170, -24, 0], [1.38, 1.03, 1])
  const likeActionScale = useTransform(swipeX, [0, 24, 170], [1, 1.03, 1.38])
  const saveActionScale = useTransform(swipeY, [-150, -24, 0], [1.38, 1.03, 1])
  const noActionColor = useTransform(swipeX, [-170, -24, 0], ['#e34840', '#b36d66', '#8d6f68'])
  const noActionBackground = useTransform(swipeX, [-170, -24, 0], ['#fff0ee', '#fff6f2', '#f6efeb'])
  const noActionBorder = useTransform(swipeX, [-170, -24, 0], ['#e34840', '#edc8c1', '#e7d3ca'])
  const likeActionColor = useTransform(swipeX, [0, 24, 170], ['#b36f83', '#f7d4cf', '#ffffff'])
  const likeActionBackground = useTransform(swipeX, [0, 24, 170], ['#faedf1', '#f3a59b', '#e96758'])
  const likeActionBorder = useTransform(swipeX, [0, 24, 170], ['#eccbd4', '#ec9388', '#e96758'])
  const saveActionColor = useTransform(swipeY, [-150, -24, 0], ['#c38320', '#b08b4d', '#a5782d'])
  const saveActionBackground = useTransform(swipeY, [-150, -24, 0], ['#fff2c9', '#fff6df', '#fbf3da'])
  const saveActionBorder = useTransform(swipeY, [-150, -24, 0], ['#d7a13f', '#e3c476', '#ead7a8'])
  const currentAvailability = current ? loanAvailability(activeLoanForBook(loans, current.id), bookLoanLocks[current.id]) : null

  useEffect(() => {
    swipeX.set(0)
    swipeY.set(0)
  }, [current?.id, swipeX, swipeY])

  function decide(status: SwipeAction) {
    if (!current) return
    setBookStatus(current.id, status)
    if (status === 'liked') navigate(`/books/${current.id}?match=1`)
  }

  if (!current) {
    return <div className="page"><PageHeader title="ปัดหาเล่ม" /><EmptyState title="ปัดครบรอบนี้แล้ว!" detail="เก่งมาก ลองเริ่มรอบใหม่หรือเปลี่ยนอารมณ์เพื่อเจอหนังสืออีกชุด" action={<div className="button-row"><button className="button button--secondary" onClick={resetRound}>เริ่มรอบใหม่</button><button className="button button--primary" onClick={() => navigate('/mood')}>เปลี่ยนอารมณ์</button></div>} /></div>
  }

  return (
    <div className="page discover-page">
      <PageHeader title="ปัดหาเล่ม" action={<button className="icon-button" onClick={() => navigate('/categories')} aria-label="ปรับตัวกรอง"><SlidersHorizontal /></button>} />
      <ProgressSteps active={3} />
      <div className="discovery-filter"><span>{moodLabel}</span><span>{selectedCategories.length ? `${selectedCategories.length} หมวด` : 'ทุกหมวด'}</span><button onClick={() => navigate('/mood')}>เปลี่ยน</button></div>
      <div className="swipe-layout">
        <aside className="swipe-aside swipe-aside--left"><p className="eyebrow">เลือกมาเพื่อคุณ</p><h2>{moodLabel}</h2><p>ลำดับจะคงเดิมตลอดรอบนี้ เพื่อให้เลือกได้อย่างสบายใจ</p><div className="mini-progress"><span style={{ width: `${Math.min(100, ((seenBookIds.length + 1) / books.length) * 100)}%` }} /></div><small>{seenBookIds.length + 1} / {books.length} เล่ม</small></aside>
        <section className="swipe-stage" aria-live="polite">
          {nextBook && (
            <article key={nextBook.id} className="swipe-card swipe-card--next" aria-hidden="true">
              <BookCover book={nextBook} />
              <div className="swipe-card__info">
                <div className="badge-row">
                  <span>{categories.find((item) => item.id === nextBook.categoryId)?.name ?? nextBook.categoryId}</span>
                  {nextBook.featured && <span>แนะนำ</span>}
                  <span className={`loan-badge loan-badge--${loanAvailability(activeLoanForBook(loans, nextBook.id), bookLoanLocks[nextBook.id]).tone}`}>{loanAvailability(activeLoanForBook(loans, nextBook.id), bookLoanLocks[nextBook.id]).label}</span>
                </div>
                <h2>{nextBook.title}</h2>
                <p>{nextBook.author}</p>
                <small>{nextBook.description}</small>
              </div>
            </article>
          )}
          <AnimatePresence mode="popLayout">
            <SwipeCard key={current.id} book={current} category={categories.find((item) => item.id === current.categoryId)?.name ?? current.categoryId} availability={currentAvailability!} x={swipeX} y={swipeY} onDecision={decide} />
          </AnimatePresence>
          {ranked.slice(1, 3).map((book) => <link key={book.id} rel="preload" as="image" href={book.coverUrl} />)}
        </section>
        <aside className="swipe-aside swipe-aside--right"><span className="shelf-badge">{current.shelfCode}</span><h3>{current.title}</h3><p>{current.description}</p><button className="text-button" onClick={() => navigate(`/books/${current.id}`)}>ดูรายละเอียดก่อนเลือก</button></aside>
      </div>
      <div className="swipe-actions" aria-label="ตัวเลือกการปัด">
        <Action icon={<RotateCcw />} label="ย้อนกลับ" tone="undo" onClick={undoSwipe} disabled={!swipeHistory.length} />
        <Action icon={<X />} label="ไม่ใช่" tone="no" scale={noActionScale} feedbackStyle={{ color: noActionColor, backgroundColor: noActionBackground, borderColor: noActionBorder }} onClick={() => decide('skipped')} />
        <Action icon={<Heart />} label="ชอบ" tone="like" scale={likeActionScale} feedbackStyle={{ color: likeActionColor, backgroundColor: likeActionBackground, borderColor: likeActionBorder }} onClick={() => decide('liked')} />
        <Action icon={<Bookmark />} label="เก็บไว้ก่อน" tone="save" scale={saveActionScale} feedbackStyle={{ color: saveActionColor, backgroundColor: saveActionBackground, borderColor: saveActionBorder }} onClick={() => decide('saved')} />
      </div>
      <p className="swipe-hint">ปัดซ้ายเพื่อข้าม · ปัดขวาเพื่อชอบ · ปัดขึ้นเพื่อเก็บไว้</p>
    </div>
  )
}

function SwipeCard({ book, category, availability, x, y, onDecision }: { book: ReturnType<typeof rankBooks>[number]; category: string; availability: ReturnType<typeof loanAvailability>; x: MotionValue<number>; y: MotionValue<number>; onDecision: (status: SwipeAction) => void }) {
  const rotate = useTransform(x, [-220, 220], [-10, 10])
  const likeOpacity = useTransform(x, [12, 70, 150], [0, 0.55, 1])
  const likeScale = useTransform(x, [12, 90, 180], [0.55, 1, 1.18])
  const likeY = useTransform(x, [12, 180], [18, -18])
  const noOpacity = useTransform(x, [-150, -70, -12], [1, 0.55, 0])
  const noScale = useTransform(x, [-180, -90, -12], [1.18, 1, 0.55])
  const noY = useTransform(x, [-180, -12], [-18, 18])
  const saveOpacity = useTransform(y, [-120, -25], [1, 0])
  return (
    <motion.article
      className="swipe-card"
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      style={{ x, y, rotate }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 110) onDecision('liked')
        else if (info.offset.x < -110) onDecision('skipped')
        else if (info.offset.y < -100) onDecision('saved')
      }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      whileTap={{ cursor: 'grabbing' }}
    >
      <motion.span
        className="swipe-feedback swipe-feedback--like"
        style={{ opacity: likeOpacity, scale: likeScale, y: likeY }}
        aria-hidden="true"
      >
        <Heart />
      </motion.span>
      <motion.span
        className="swipe-feedback swipe-feedback--no"
        style={{ opacity: noOpacity, scale: noScale, y: noY }}
        aria-hidden="true"
      >
        <X />
      </motion.span>
      <motion.span className="swipe-stamp swipe-stamp--save" style={{ opacity: saveOpacity }}>เก็บไว้</motion.span>
      <BookCover book={book} />
      <div className="swipe-card__info"><div className="badge-row"><span>{category}</span>{book.featured && <span>แนะนำ</span>}<span className={`loan-badge loan-badge--${availability.tone}`}>{availability.label}</span></div><h2>{book.title}</h2><p>{book.author}</p><small>{book.description}</small></div>
    </motion.article>
  )
}

function Action({ icon, label, tone, scale, feedbackStyle, onClick, disabled = false }: { icon: React.ReactNode; label: string; tone: string; scale?: MotionValue<number>; feedbackStyle?: MotionStyle; onClick: () => void; disabled?: boolean }) {
  return <button className={`swipe-action swipe-action--${tone}`} onClick={onClick} disabled={disabled} aria-label={label}><motion.span style={{ ...feedbackStyle, scale }}>{icon}</motion.span><small>{label}</small></button>
}
