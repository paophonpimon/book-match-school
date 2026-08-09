import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingScreen, ProtectedShell } from '../components/AppShell'
import { WelcomePage } from '../features/onboarding/WelcomePage'

const ProfileSetupPage = lazy(() => import('../features/onboarding/ProfileSetupPage').then((module) => ({ default: module.ProfileSetupPage })))
const HomePage = lazy(() => import('../features/home/HomePage').then((module) => ({ default: module.HomePage })))
const MoodPage = lazy(() => import('../features/discovery/MoodPage').then((module) => ({ default: module.MoodPage })))
const CategoryPage = lazy(() => import('../features/discovery/CategoryPage').then((module) => ({ default: module.CategoryPage })))
const DiscoverPage = lazy(() => import('../features/discovery/DiscoverPage').then((module) => ({ default: module.DiscoverPage })))
const BookDetailPage = lazy(() => import('../features/discovery/BookDetailPage').then((module) => ({ default: module.BookDetailPage })))
const ShelfPage = lazy(() => import('../features/shelf/ShelfPage').then((module) => ({ default: module.ShelfPage })))
const ReviewPage = lazy(() => import('../features/review/ReviewPage').then((module) => ({ default: module.ReviewPage })))
const LeaderboardPage = lazy(() => import('../features/leaderboard/LeaderboardPage').then((module) => ({ default: module.LeaderboardPage })))
const ProfilePage = lazy(() => import('../features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const AdminPage = lazy(() => import('../features/admin/AdminPage').then((module) => ({ default: module.AdminPage })))
const LoanListPage = lazy(() => import('../features/loans/LoanListPage').then((module) => ({ default: module.LoanListPage })))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

export function App() {
  return (
    <>
      <ScrollToTop />
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
