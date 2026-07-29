import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ProtectedShell } from '../components/AppShell'
import { WelcomePage } from '../features/onboarding/WelcomePage'
import { ProfileSetupPage } from '../features/onboarding/ProfileSetupPage'
import { HomePage } from '../features/home/HomePage'
import { MoodPage } from '../features/discovery/MoodPage'
import { CategoryPage } from '../features/discovery/CategoryPage'
import { DiscoverPage } from '../features/discovery/DiscoverPage'
import { BookDetailPage } from '../features/discovery/BookDetailPage'
import { ShelfPage } from '../features/shelf/ShelfPage'
import { ReviewPage } from '../features/review/ReviewPage'
import { LeaderboardPage } from '../features/leaderboard/LeaderboardPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { AdminPage } from '../features/admin/AdminPage'
import { LoanListPage } from '../features/loans/LoanListPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

export function App() {
  return (
    <>
      <ScrollToTop />
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
    </>
  )
}
