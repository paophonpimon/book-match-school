import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  BookCheck,
  BookOpen,
  BookPlus,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Library,
  CalendarDays,
  UsersRound,
} from 'lucide-react'
import type { User } from 'firebase/auth'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../../components/Brand'
import {
  ADMIN_EMAIL,
  ADMIN_PAGE_SIZE,
  filterAdminBooks,
  type AdminBook,
  type AdminBookStats,
  type AdminBookStatusFilter,
} from '../../services/adminBooks'
import {
  archiveBookAsAdmin,
  listBooksAsAdmin,
  loadAdminBookStats,
  loadAdminFilteredCount,
  restoreBookAsAdmin,
  signInAdminWithGoogle,
  signOutAdmin,
  subscribeAdminUser,
} from '../../services/adminAuth'
import { BookForm } from './BookForm'
import { AdminLoanManagement } from './AdminLoanManagement'
import { AdminStudentMembers } from './AdminStudentMembers'
import { AdminTermManagement } from './AdminTermManagement'

type FormState = { mode: 'create' } | { mode: 'edit'; book: AdminBook } | null
type AdminSection = 'dashboard' | 'books' | 'hidden' | 'loans' | 'members' | 'terms'

const emptyStats: AdminBookStats = {
  total: 0,
  active: 0,
  hidden: 0,
  byCategory: Array.from({ length: 10 }, (_, index) => ({
    categoryCode: String(index * 100).padStart(3, '0'),
    count: 0,
  })),
}

export function AdminPage() {
  const navigate = useNavigate()
  const [adminUser, setAdminUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [books, setBooks] = useState<AdminBook[]>([])
  const [stats, setStats] = useState<AdminBookStats>(emptyStats)
  const [totalFiltered, setTotalFiltered] = useState(0)
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [refreshingBooks, setRefreshingBooks] = useState(false)
  const [booksError, setBooksError] = useState('')
  const [message, setMessage] = useState('')
  const [formState, setFormState] = useState<FormState>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdminBookStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageStartCursors, setPageStartCursors] = useState<Array<QueryDocumentSnapshot | null>>([null])
  const [pageEndCursor, setPageEndCursor] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [mutatingId, setMutatingId] = useState('')
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const navigationTargetRef = useRef<AdminSection | null>(null)
  const navigationReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadBooks = useCallback(async (showFullLoading = false, preferCache = true) => {
    if (showFullLoading) setLoadingBooks(true)
    else setRefreshingBooks(true)
    setBooksError('')
    const options = {
      status: statusFilter,
      categoryCode: categoryFilter,
      cursor: pageStartCursors[page - 1] ?? null,
    }
    try {
      if (preferCache) {
        try {
          const cached = await listBooksAsAdmin({ ...options, source: 'cache' })
          if (cached.books.length) {
            setBooks(cached.books)
            setPageEndCursor(cached.cursor)
            setHasMore(cached.hasMore)
            setLoadingBooks(false)
          }
        } catch {
          // Firestore cache can be empty on the first visit; the server read below remains authoritative.
        }
      }
      const [server, nextStats, count] = await Promise.all([
        listBooksAsAdmin({ ...options, source: 'server' }),
        loadAdminBookStats(),
        loadAdminFilteredCount(statusFilter, categoryFilter),
      ])
      setBooks(server.books)
      setPageEndCursor(server.cursor)
      setHasMore(server.hasMore)
      setStats(nextStats)
      setTotalFiltered(count)
    } catch (error) {
      setBooksError(error instanceof Error ? error.message : 'โหลดรายการหนังสือจาก Firestore ไม่สำเร็จ')
    } finally {
      setLoadingBooks(false)
      setRefreshingBooks(false)
    }
  }, [categoryFilter, page, pageStartCursors, statusFilter])

  useEffect(() => subscribeAdminUser((user, unauthorized) => {
    if (unauthorized) {
      navigate('/home', { replace: true })
      return
    }
    setAdminUser(user)
    setAuthLoading(false)
  }), [navigate])

  useEffect(() => {
    if (adminUser) void loadBooks(true)
  }, [adminUser, loadBooks])

  useEffect(() => {
    if (!adminUser) return
    let animationFrame = 0
    const updateActiveSection = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(() => {
        if (navigationTargetRef.current) {
          setActiveSection(navigationTargetRef.current)
          return
        }
        const booksSection = document.getElementById('books')
        const loansSection = document.getElementById('loan-management')
        if (loansSection && loansSection.getBoundingClientRect().top <= 180 && loansSection.getBoundingClientRect().bottom > 180) {
          setActiveSection('loans')
          return
        }
        if (!booksSection) return
        const showingBooks = booksSection.getBoundingClientRect().top <= 180
        setActiveSection(showingBooks ? (statusFilter === 'hidden' ? 'hidden' : 'books') : 'dashboard')
      })
    }
    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [adminUser, statusFilter])

  useEffect(() => () => {
    if (navigationReleaseTimerRef.current) clearTimeout(navigationReleaseTimerRef.current)
  }, [])

  const visibleBooks = useMemo(
    () => filterAdminBooks(books, search),
    [books, search],
  )
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ADMIN_PAGE_SIZE))

  function resetPagination() {
    setPage(1)
    setPageStartCursors([null])
    setPageEndCursor(null)
  }

  function selectCategory(categoryCode: string) {
    setCategoryFilter(categoryCode)
    setActiveSection('books')
    resetPagination()
    document.getElementById('books')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function selectStatus(status: AdminBookStatusFilter) {
    setStatusFilter(status)
    setActiveSection(status === 'hidden' ? 'hidden' : 'books')
    resetPagination()
  }

  function openAdminSection(section: AdminSection) {
    navigationTargetRef.current = section
    if (navigationReleaseTimerRef.current) clearTimeout(navigationReleaseTimerRef.current)
    setActiveSection(section)
    if (section === 'hidden') selectStatus('hidden')
    if (section === 'books' && statusFilter === 'hidden') selectStatus('all')
    requestAnimationFrame(() => {
      document.getElementById(
        section === 'dashboard'
          ? 'dashboard'
          : section === 'loans'
            ? 'loan-management'
            : section === 'members'
              ? 'student-members'
              : section === 'terms'
                ? 'term-management'
                : 'books',
      )
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    navigationReleaseTimerRef.current = setTimeout(() => {
      navigationTargetRef.current = null
      navigationReleaseTimerRef.current = null
    }, 900)
  }

  async function login() {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      setAdminUser(await signInAdminWithGoogle())
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function mutateStatus(book: AdminBook, action: 'archive' | 'restore') {
    if (action === 'archive' && !window.confirm(`ยืนยันซ่อนหนังสือ “${book.title}” ใช่หรือไม่?`)) return
    setMutatingId(book.id)
    setBooksError('')
    setMessage('')
    try {
      if (action === 'archive') await archiveBookAsAdmin(book.id)
      else await restoreBookAsAdmin(book.id)
      setMessage(action === 'archive' ? `ซ่อน “${book.title}” แล้ว` : `กู้คืน “${book.title}” แล้ว`)
      await loadBooks(false, false)
    } catch (error) {
      setBooksError(error instanceof Error ? error.message : 'เปลี่ยนสถานะหนังสือไม่สำเร็จ')
    } finally {
      setMutatingId('')
    }
  }

  async function saved(bookId: string) {
    setMessage(`${formState?.mode === 'edit' ? 'แก้ไข' : 'เพิ่ม'}หนังสือสำเร็จ · bookId: ${bookId}`)
    setFormState(null)
    await loadBooks(false, false)
  }

  function nextPage() {
    if (!hasMore || !pageEndCursor) return
    setPageStartCursors((current) => {
      const next = [...current]
      next[page] = pageEndCursor
      return next
    })
    setPage((current) => current + 1)
  }

  if (authLoading) {
    return <main className="admin-login"><section><LoaderCircle className="spin" /><h1>กำลังตรวจสอบสิทธิ์ผู้ดูแล…</h1></section></main>
  }

  if (!adminUser) {
    return (
      <main className="admin-login">
        <section>
          <Brand />
          <span className="feature-icon"><LockKeyhole /></span>
          <p className="eyebrow">พื้นที่บรรณารักษ์</p>
          <h1>เข้าสู่ Admin Dashboard</h1>
          <p>เข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาต</p>
          {authError && <p className="form-error" role="alert">{authError}</p>}
          <button className="button button--primary button--wide" onClick={() => void login()} disabled={authSubmitting}>
            {authSubmitting ? <><LoaderCircle className="spin" /> กำลังเข้าสู่ระบบ…</> : <><LogIn /> เข้าสู่ระบบด้วย Google</>}
          </button>
          <small>อนุญาตเฉพาะ {ADMIN_EMAIL}</small>
          <Link to="/home">กลับหน้าของนักเรียน</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Brand />
        <nav>
          <a className={activeSection === 'dashboard' ? 'active' : ''} aria-current={activeSection === 'dashboard' ? 'page' : undefined} href="#dashboard" onClick={(event) => { event.preventDefault(); openAdminSection('dashboard') }}><BookCheck /> ภาพรวมหนังสือ</a>
          <a className={activeSection === 'books' ? 'active' : ''} aria-current={activeSection === 'books' ? 'page' : undefined} href="#books" onClick={(event) => { event.preventDefault(); openAdminSection('books') }}><BookOpen /> รายการหนังสือ</a>
          <a className={activeSection === 'hidden' ? 'active' : ''} aria-current={activeSection === 'hidden' ? 'page' : undefined} href="#books" onClick={(event) => { event.preventDefault(); openAdminSection('hidden') }}><EyeOff /> หนังสือที่ซ่อน</a>
          <a className={activeSection === 'loans' ? 'active' : ''} aria-current={activeSection === 'loans' ? 'page' : undefined} href="#loan-management" onClick={(event) => { event.preventDefault(); openAdminSection('loans') }}><Library /> ระบบยืม–คืน</a>
          <a className={activeSection === 'members' ? 'active' : ''} aria-current={activeSection === 'members' ? 'page' : undefined} href="#student-members" onClick={(event) => { event.preventDefault(); openAdminSection('members') }}><UsersRound /> สมาชิกนักเรียน</a>
          <a className={activeSection === 'terms' ? 'active' : ''} aria-current={activeSection === 'terms' ? 'page' : undefined} href="#term-management" onClick={(event) => { event.preventDefault(); openAdminSection('terms') }}><CalendarDays /> จัดการภาคเรียน</a>
        </nav>
        <Link to="/home">← กลับหน้าแอปนักเรียน</Link>
      </aside>

      <nav className="admin-mobile-nav" aria-label="เมนูผู้ดูแล">
        <button type="button" className={activeSection === 'dashboard' ? 'active' : ''} aria-current={activeSection === 'dashboard' ? 'page' : undefined} onClick={() => openAdminSection('dashboard')}><BookCheck />ภาพรวม</button>
        <button type="button" className={activeSection === 'books' ? 'active' : ''} aria-current={activeSection === 'books' ? 'page' : undefined} onClick={() => openAdminSection('books')}><BookOpen />หนังสือ</button>
        <button type="button" className={activeSection === 'hidden' ? 'active' : ''} aria-current={activeSection === 'hidden' ? 'page' : undefined} onClick={() => openAdminSection('hidden')}><EyeOff />ที่ซ่อน</button>
        <button type="button" className={activeSection === 'loans' ? 'active' : ''} aria-current={activeSection === 'loans' ? 'page' : undefined} onClick={() => openAdminSection('loans')}><Library />ยืม–คืน</button>
        <button type="button" className={activeSection === 'members' ? 'active' : ''} aria-current={activeSection === 'members' ? 'page' : undefined} onClick={() => openAdminSection('members')}><UsersRound />สมาชิก</button>
        <button type="button" className={activeSection === 'terms' ? 'active' : ''} aria-current={activeSection === 'terms' ? 'page' : undefined} onClick={() => openAdminSection('terms')}><CalendarDays />ภาคเรียน</button>
      </nav>

      <div className="admin-content" id="dashboard">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Cloud Firestore · Production migration</p>
            <h1>จัดการคลังหนังสือ</h1>
            <p>{adminUser.email}</p>
          </div>
          <div>
            <button className="button button--secondary" onClick={() => void loadBooks(false, false)} disabled={refreshingBooks}>
              <RefreshCw className={refreshingBooks ? 'spin' : ''} /> รีเฟรช
            </button>
            <button className="button button--primary" onClick={() => { setFormState({ mode: 'create' }); setMessage(''); setActiveSection('dashboard') }}>
              <BookPlus /> เพิ่มหนังสือ
            </button>
            <button className="button button--secondary" onClick={() => void signOutAdmin()}><LogOut /> ออกจากระบบ</button>
          </div>
        </header>

        {booksError && <p className="form-error admin-notice" role="alert">{booksError} <button className="text-button" onClick={() => void loadBooks(books.length === 0, false)}>ลองอีกครั้ง</button></p>}
        {message && <p className="admin-success admin-notice" role="status"><BookCheck /> {message}</p>}

        {activeSection === 'loans' && <AdminLoanManagement />}
        {activeSection === 'members' && <AdminStudentMembers />}
        {activeSection === 'terms' && <AdminTermManagement />}

        {!['loans', 'members', 'terms'].includes(activeSection) && <>
        <section className="admin-stats">
          {[
            { label: 'หนังสือทั้งหมด', value: stats.total, icon: BookOpen },
            { label: 'เปิดใช้งาน', value: stats.active, icon: BookCheck },
            { label: 'หนังสือที่ซ่อน', value: stats.hidden, icon: EyeOff },
          ].map(({ label, value, icon: Icon }) => (
            <article key={label}><span><Icon /></span><div><small>{label}</small><strong>{value.toLocaleString('th-TH')}</strong></div></article>
          ))}
        </section>

        <section className="dashboard-card admin-category-stats" aria-labelledby="category-stats-title">
          <div className="section-heading"><div><p className="eyebrow">หมวดดิวอี้</p><h2 id="category-stats-title">จำนวนหนังสือแยกตามหมวด 000–900</h2></div></div>
          <div>
            {stats.byCategory.map(({ categoryCode, count }) => (
              <button key={categoryCode} type="button" onClick={() => selectCategory(categoryCode)}>
                <strong>{categoryCode}</strong><span>{count.toLocaleString('th-TH')} เล่ม</span>
              </button>
            ))}
          </div>
        </section>

        {formState && (
          <BookForm
            key={formState.mode === 'edit' ? formState.book.id : 'create'}
            editingBook={formState.mode === 'edit' ? formState.book : null}
            books={books}
            onSaved={saved}
            onCancel={() => setFormState(null)}
          />
        )}

        <section className="dashboard-card admin-books-panel" id="books">
          <div className="section-heading">
            <div><p className="eyebrow">รายการหนังสือ</p><h2>{totalFiltered.toLocaleString('th-TH')} รายการ</h2></div>
            {statusFilter === 'hidden' && <span id="hidden">กำลังแสดงหนังสือที่ซ่อน</span>}
          </div>

          <div className="admin-filters">
            <label className="admin-search"><Search /><input aria-label="ค้นหาหนังสือในหน้านี้" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือผู้แต่งในหน้านี้" /></label>
            <label><span>หมวด</span><select value={categoryFilter} onChange={(event) => selectCategory(event.target.value)}><option value="">ทุกหมวด</option>{stats.byCategory.map(({ categoryCode }) => <option key={categoryCode} value={categoryCode}>{categoryCode}</option>)}</select></label>
            <label><span>สถานะ</span><select value={statusFilter} onChange={(event) => selectStatus(event.target.value as AdminBookStatusFilter)}><option value="all">ทั้งหมด</option><option value="active">เปิดใช้งาน</option><option value="hidden">ซ่อน</option></select></label>
          </div>

          {loadingBooks ? (
            <div className="admin-list-state"><LoaderCircle className="spin" /><p>กำลังโหลดหนังสือจาก Firestore…</p></div>
          ) : visibleBooks.length === 0 ? (
            <div className="admin-list-state"><BookOpen /><p>ไม่พบหนังสือตามเงื่อนไขที่เลือก</p></div>
          ) : (
            <div className="admin-book-list">
              {visibleBooks.map((book) => (
                <article key={book.id}>
                  <div className="admin-list-cover">
                    {book.coverUrl ? <img src={book.coverUrl} alt={`ปกหนังสือ ${book.title}`} loading="lazy" /> : <BookOpen aria-hidden="true" />}
                  </div>
                  <div className="admin-book-main">
                    <span>{book.categoryCode} {book.category && `· ${book.category}`}</span>
                    <h3>{book.title}</h3>
                    <p>{book.author || 'ไม่ระบุผู้แต่ง'}</p>
                    <div className="admin-mood-chips">{book.moods.map((mood) => <small key={mood}>{mood}</small>)}</div>
                  </div>
                  <span className={book.active ? 'status-pill' : 'status-pill status-pill--hidden'}>{book.active ? 'เปิดใช้งาน' : 'ซ่อน'}</span>
                  <div className="admin-book-actions">
                    <button className="button button--secondary button--small" onClick={() => { setFormState({ mode: 'edit', book }); setMessage(''); setActiveSection('dashboard'); document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><Pencil /> แก้ไข</button>
                    {book.active
                      ? <button className="button button--secondary button--small" onClick={() => void mutateStatus(book, 'archive')} disabled={mutatingId === book.id}>{mutatingId === book.id ? <LoaderCircle className="spin" /> : <Archive />} ซ่อน</button>
                      : <button className="button button--secondary button--small" onClick={() => void mutateStatus(book, 'restore')} disabled={mutatingId === book.id}>{mutatingId === book.id ? <LoaderCircle className="spin" /> : <RotateCcw />} กู้คืน</button>}
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalFiltered > 0 && (
            <nav className="admin-pagination" aria-label="แบ่งหน้ารายการหนังสือ">
              <button className="button button--secondary button--small" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>ก่อนหน้า</button>
              <span>หน้า {page.toLocaleString('th-TH')} / {totalPages.toLocaleString('th-TH')}</span>
              <button className="button button--secondary button--small" disabled={!hasMore} onClick={nextPage}>ถัดไป</button>
            </nav>
          )}
        </section>
        </>}
      </div>
    </main>
  )
}

