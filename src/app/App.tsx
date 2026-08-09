import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingScreen, ProtectedShell } from '../components/AppShell'
import { WelcomePage } from '../features/onboarding/WelcomePage'

const loadProfileSetupPage = () => import('../features/onboarding/ProfileSetupPage')
const loadHomePage = () => import('../features/home/HomePage')
const loadMoodPage = () => import('../features/discovery/MoodPage')
const loadCategoryPage = () => import('../features/discovery/CategoryPage')
const loadDiscoverPage = () => import('../features/discovery/DiscoverPage')
const loadBookDetailPage = () => import('../features/discovery/BookDetailPage')
const loadShelfPage = () => import('../features/shelf/ShelfPage')
const loadReviewPage = () => import('../features/review/ReviewPage')
const loadLeaderboardPage = () => import('../features/leaderboard/LeaderboardPage')
const loadProfilePage = () => import('../features/profile/ProfilePage')
const loadAdminPage = () => import('../features/admin/AdminPage')
const loadLoanListPage = () => import('../features/loans/LoanListPage')

const CHUNK_RELOAD_KEY = 'book-match:chunk-reload'

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(message)
}

function lazyNamed<T extends Record<K, ComponentType>, K extends keyof T & string>(loader: () => Promise<T>, exportName: K) {
  return lazy(async () => {
    try {
      const module = await loader()
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      return { default: module[exportName] }
    } catch (error) {
      if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, window.location.pathname)
        window.location.reload()
        return await new Promise<never>(() => undefined)
      }
      throw error
    }
  })
}

const ProfileSetupPage = lazyNamed(loadProfileSetupPage, 'ProfileSetupPage')
const HomePage = lazyNamed(loadHomePage, 'HomePage')
const MoodPage = lazyNamed(loadMoodPage, 'MoodPage')
const CategoryPage = lazyNamed(loadCategoryPage, 'CategoryPage')
const DiscoverPage = lazyNamed(loadDiscoverPage, 'DiscoverPage')
const BookDetailPage = lazyNamed(loadBookDetailPage, 'BookDetailPage')
const ShelfPage = lazyNamed(loadShelfPage, 'ShelfPage')
const ReviewPage = lazyNamed(loadReviewPage, 'ReviewPage')
const LeaderboardPage = lazyNamed(loadLeaderboardPage, 'LeaderboardPage')
const ProfilePage = lazyNamed(loadProfilePage, 'ProfilePage')
const AdminPage = lazyNamed(loadAdminPage, 'AdminPage')
const LoanListPage = lazyNamed(loadLoanListPage, 'LoanListPage')

function StudentRoutePreloader() {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (connection?.saveData || connection?.effectiveType?.includes('2g')) return
    const primaryTimer = window.setTimeout(() => {
      void Promise.allSettled([loadHomePage(), loadMoodPage(), loadDiscoverPage(), loadShelfPage(), loadLeaderboardPage(), loadProfilePage()])
    }, 700)
    const secondaryTimer = window.setTimeout(() => {
      void Promise.allSettled([loadCategoryPage(), loadBookDetailPage(), loadLoanListPage(), loadReviewPage(), loadProfileSetupPage()])
    }, 2600)
    return () => {
      window.clearTimeout(primaryTimer)
      window.clearTimeout(secondaryTimer)
    }
  }, [])
  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <StudentRoutePreloader />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/welcome" replace />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/setup" element={<ProfileSetupPage />} />
          <Route element={<ProtectedShell />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/mood" element={<MoodPage />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/books/:bookId" element={<BookDetailPage />} />
            <Route path="/shelf" element={<ShelfPage />} />
            <Route path="/loans" element={<LoanListPage />} />
            <Route path="/review/:bookId" element={<ReviewPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
