import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { demoSettings } from '../data/demoData'
import { loadCatalog, type CatalogResult, type CatalogSource } from '../services/catalog'
import {
  completeBookRemote,
  completeStudentRedirectSignIn,
  currentStudentUser,
  deleteUserBookRemote,
  getFirebaseRuntimeStatus,
  loadCurrentTermRemote,
  loadReadersRemote,
  loadRemoteStudentState,
  saveLikedBookRemote,
  saveProfileRemote,
  saveSavedBookRemote,
  saveUserBookRemote,
  signInStudentWithGoogle,
  signOutStudentUser,
  subscribeStudentUser,
} from '../services/firebase'
import { readStored, writeStored } from '../services/storage'
import { readSwipeSession, removeSwipeSession, swipeStorageKey, writeSwipeSession } from '../services/swipeStorage'
import { cancelLoanRemote, loadBookLoanLocks, loadStudentLoans, requestLoanRemote } from '../services/loans'
import { readingLoanForBook } from '../utils/loans'
import type {
  AcademicTerm,
  Book,
  BookLoanLock,
  Category,
  Loan,
  Profile,
  Reader,
  ReaderStats,
  Settings,
  StudentMembership,
  SwipeAction,
  SwipeHistoryItem,
  UserBook,
} from '../types'
import { validateStudentProfile } from '../utils/profile'
import { getReaderLevel, type ReaderLevelResult } from '../utils/readerLevels'

interface AppState {
  books: Book[]
  categories: Category[]
  settings: Settings
  currentTerm: AcademicTerm | null
  currentTermError: string | null
  readers: Reader[]
  authUser: User | null
  profile: Profile | null
  membership: StudentMembership | null
  readerStats: ReaderStats
  userBooks: Record<string, UserBook>
  loans: Loan[]
  bookLoanLocks: Record<string, BookLoanLock>
  selectedMoods: string[]
  selectedCategories: string[]
  seenBookIds: string[]
  swipeHistory: SwipeHistoryItem[]
  loading: boolean
  syncing: boolean
  syncError: string | null
  catalogError: string | null
  catalogSource: CatalogSource
  levelUp: ReaderLevelResult | null
  signInWithGoogle: () => Promise<void>
  setSelectedMoods: (moods: string[]) => void
  setSelectedCategories: (ids: string[]) => void
  saveProfile: (profile: Omit<Profile, 'uid' | 'createdAt' | 'lastActiveAt'>) => Promise<void>
  setBookStatus: (bookId: string, status: SwipeAction) => void
  removeBookFromShelf: (bookId: string) => Promise<void>
  undoSwipe: () => void
  completeBook: (bookId: string, review: Pick<UserBook, 'rating' | 'review' | 'moodAfterReading' | 'favoriteAspect'>) => Promise<void>
  requestLoan: (bookId: string) => Promise<void>
  cancelLoan: (loanId: string) => Promise<void>
  reloadLoans: () => Promise<void>
  reloadCatalog: () => Promise<void>
  retrySync: () => void
  resetDevice: () => void
  resetRound: () => void
  dismissLevelUp: () => void
}

const AppContext = createContext<AppState | null>(null)
const DISCOVERY_KEY = 'book-match-discovery'
const firebaseRuntime = getFirebaseRuntimeStatus()
const emptyReaderStats: ReaderStats = {
  uid: '',
  lifetimeReadCount: 0,
  currentLevel: 1,
  updatedAt: new Date(0).toISOString(),
  lastCreditedUserBookId: null,
}

function firebaseErrorMessage(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const detail = typeof error === 'object' && error && 'message' in error ? String(error.message).trim() : ''
  if (code.includes('auth/unauthorized-domain')) return 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Authentication'
  if (code.includes('auth/operation-not-allowed')) return 'ยังไม่ได้เปิด Google Provider ใน Firebase Authentication'
  if (code.includes('permission-denied')) return `${fallback}: Firestore ปฏิเสธสิทธิ์คำขอนี้${detail ? ` (${detail})` : ''}`
  if (code.includes('unavailable') || code.includes('network')) return `ติดต่อ Firebase ไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง`
  return detail ? `${fallback}: ${detail}` : fallback
}

function withTermSettings(settings: Settings, term: AcademicTerm): Settings {
  return { ...settings, termId: term.id, termName: term.name }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<Settings>({ ...demoSettings, termId: '', termName: 'ยังไม่ได้ตั้งค่าภาคเรียน' })
  const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null)
  const [currentTermError, setCurrentTermError] = useState<string | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [membership, setMembership] = useState<StudentMembership | null>(null)
  const [readerStats, setReaderStats] = useState<ReaderStats>(emptyReaderStats)
  const [userBooks, setUserBooks] = useState<Record<string, UserBook>>({})
  const [loans, setLoans] = useState<Loan[]>([])
  const [bookLoanLocks, setBookLoanLocks] = useState<Record<string, BookLoanLock>>({})
  const initialDiscovery = readStored<{ moods?: string[]; mood?: string; selectedCategories: string[] }>(
    DISCOVERY_KEY,
    { moods: [], selectedCategories: [] },
  )
  const initialMoods = Array.isArray(initialDiscovery.moods)
    ? initialDiscovery.moods
    : initialDiscovery.mood
      ? [initialDiscovery.mood]
      : []
  const [selectedMoods, setSelectedMoods] = useState<string[]>(initialMoods)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialDiscovery.selectedCategories)
  const [skippedBookIds, setSkippedBookIds] = useState<string[]>([])
  const [seenBookIds, setSeenBookIds] = useState<string[]>([])
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([])
  const [swipeStorageScope, setSwipeStorageScope] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(
    firebaseRuntime.error ? 'เริ่มต้น Firebase ไม่สำเร็จ กรุณาตรวจการตั้งค่า' : null,
  )
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogSource, setCatalogSource] = useState<CatalogSource>('error')
  const [readers, setReaders] = useState<Reader[]>([])
  const [levelUp, setLevelUp] = useState<ReaderLevelResult | null>(null)
  const profileUid = profile?.uid

  const applyCatalog = useCallback((catalog: CatalogResult, term: AcademicTerm) => {
    setBooks(catalog.data.books)
    setCategories(catalog.data.categories)
    setSettings(withTermSettings(catalog.data.settings, term))
    setCatalogSource(catalog.source)
    setCatalogError(catalog.error ?? null)
  }, [])

  const clearStudentState = useCallback(() => {
    setProfile(null)
    setMembership(null)
    setReaderStats(emptyReaderStats)
    setUserBooks({})
    setReaders([])
    setLoans([])
    setBookLoanLocks({})
    setCurrentTerm(null)
    setCurrentTermError(null)
    setBooks([])
    setCategories([])
  }, [])

  const hydrate = useCallback(async (user: User) => {
    setLoading(true)
    setSyncing(true)
    setSyncError(null)
    try {
      const term = await loadCurrentTermRemote()
      if (!term || term.status !== 'active') {
        clearStudentState()
        setAuthUser(user)
        setCurrentTermError('ระบบยังไม่ได้ตั้งค่าภาคเรียนปัจจุบัน กรุณาติดต่อผู้ดูแล')
        return
      }
      setCurrentTerm(term)
      setCurrentTermError(null)
      const [catalog, student, nextReaders, nextLoans, nextLocks] = await Promise.all([
        loadCatalog(),
        loadRemoteStudentState(user, term.id),
        loadReadersRemote(term.id),
        loadStudentLoans(user.uid),
        loadBookLoanLocks(),
      ])
      applyCatalog(catalog, term)
      setProfile(student.profile)
      setMembership(student.membership)
      setReaderStats(student.readerStats)
      setUserBooks(student.userBooks)
      setReaders(nextReaders)
      setLoans(nextLoans)
      setBookLoanLocks(nextLocks)
      if (catalog.refresh) {
        void catalog.refresh.then((fresh) => applyCatalog(fresh, term))
      }
    } catch (error) {
      setSyncError(firebaseErrorMessage(error, 'โหลดข้อมูลนักเรียนจาก Firebase ไม่สำเร็จ'))
    } finally {
      setSyncing(false)
      setLoading(false)
    }
  }, [applyCatalog, clearStudentState])

  useEffect(() => {
    let active = true
    void completeStudentRedirectSignIn().catch((error) => {
      if (active) setSyncError(firebaseErrorMessage(error, 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ'))
    })
    const unsubscribe = subscribeStudentUser((user) => {
      if (!active) return
      setAuthUser(user)
      if (!user) {
        clearStudentState()
        setLoading(false)
        return
      }
      void hydrate(user)
    }, (error) => {
      if (active) {
        setSyncError(firebaseErrorMessage(error, 'ตรวจสอบสถานะบัญชี Google ไม่สำเร็จ'))
        setLoading(false)
      }
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [clearStudentState, hydrate])

  useLayoutEffect(() => {
    if (!profileUid || !currentTerm) {
      setSkippedBookIds([])
      setSeenBookIds([])
      setSwipeHistory([])
      setSwipeStorageScope(null)
      return
    }
    const session = readSwipeSession(profileUid, currentTerm.id)
    setSkippedBookIds(session.skippedBookIds)
    setSeenBookIds(session.seenBookIds)
    setSwipeHistory(session.swipeHistory)
    setSwipeStorageScope(swipeStorageKey(profileUid, currentTerm.id))
  }, [profileUid, currentTerm])

  useEffect(() => {
    writeStored(DISCOVERY_KEY, { moods: selectedMoods, selectedCategories })
  }, [selectedMoods, selectedCategories])

  useEffect(() => {
    if (!profileUid || !currentTerm || swipeStorageScope !== swipeStorageKey(profileUid, currentTerm.id)) return
    writeSwipeSession(profileUid, currentTerm.id, { skippedBookIds, seenBookIds, swipeHistory })
  }, [profileUid, currentTerm, skippedBookIds, seenBookIds, swipeHistory, swipeStorageScope])

  const requireActiveMember = () => {
    if (membership?.status !== 'active') {
      throw new Error('บัญชีสมาชิกไม่ได้อยู่ในสถานะใช้งาน กรุณาติดต่อผู้ดูแล')
    }
  }

  const refreshReaders = async () => {
    if (!currentTerm) return
    setReaders(await loadReadersRemote(currentTerm.id))
  }

  const reloadCatalog = async () => {
    if (!currentTerm) throw new Error('ยังไม่ได้ตั้งค่าภาคเรียนปัจจุบัน')
    setSyncing(true)
    try {
      applyCatalog(await loadCatalog({ force: true }), currentTerm)
    } finally {
      setSyncing(false)
    }
  }

  const retrySync = () => {
    const user = currentStudentUser()
    if (user) void hydrate(user)
  }

  const signInWithGoogle = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      await signInStudentWithGoogle()
    } catch (error) {
      const message = firebaseErrorMessage(error, 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ')
      setSyncError(message)
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const saveProfile = async (values: Omit<Profile, 'uid' | 'createdAt' | 'lastActiveAt'>) => {
    if (!authUser) throw new Error('กรุณาเข้าสู่ระบบด้วย Google ก่อน')
    if (!currentTerm) throw new Error('ยังไม่ได้ตั้งค่าภาคเรียนปัจจุบัน')
    const validationError = validateStudentProfile({
      studentId: values.studentId ?? '',
      firstName: values.firstName ?? '',
      lastName: values.lastName ?? '',
      gradeLevel: values.gradeLevel ?? '',
      studentNumber: values.studentNumber,
      displayName: values.displayName,
    })
    if (validationError) throw new Error(validationError)
    setSyncing(true)
    setSyncError(null)
    try {
      const now = new Date().toISOString()
      const next: Profile = {
        ...values,
        uid: authUser.uid,
        createdAt: profile?.createdAt ?? now,
        lastActiveAt: now,
      }
      await saveProfileRemote(next, currentTerm.id)
      const remote = await loadRemoteStudentState(authUser, currentTerm.id)
      setProfile(remote.profile)
      setMembership(remote.membership)
      setReaderStats(remote.readerStats)
      setUserBooks(remote.userBooks)
      await refreshReaders()
    } catch (error) {
      setSyncError(firebaseErrorMessage(error, 'บันทึกโปรไฟล์และสมาชิกไม่สำเร็จ'))
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const setBookStatus = (bookId: string, status: SwipeAction) => {
    if (!profile || !currentTerm || status === 'read') return
    const previous = userBooks[bookId]
    if (status === 'skipped') {
      setSkippedBookIds((current) => [...new Set([...current, bookId])])
      setSeenBookIds((current) => [...new Set([...current, bookId])])
      setSwipeHistory((current) => [...current.slice(-19), { bookId, previousStatus: previous?.status, action: status }])
      return
    }
    try {
      requireActiveMember()
      if (status === 'reading' && !readingLoanForBook(loans, bookId)) {
        throw new Error('ต้องได้รับหนังสือจากห้องสมุดก่อนจึงจะเริ่มอ่านได้')
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'บัญชีสมาชิกไม่พร้อมใช้งาน')
      return
    }
    const now = new Date().toISOString()
    const next: UserBook = {
      uid: profile.uid,
      termId: currentTerm.id,
      bookId,
      loanId: status === 'reading'
        ? (previous?.loanId ?? readingLoanForBook(loans, bookId)?.id ?? null)
        : (previous?.loanId ?? null),
      status,
      rating: previous?.rating ?? null,
      review: previous?.review ?? null,
      moodAfterReading: previous?.moodAfterReading ?? null,
      favoriteAspect: previous?.favoriteAspect ?? null,
      likedAt: status === 'liked' ? (previous?.likedAt ?? now) : (previous?.likedAt ?? null),
      startedAt: status === 'reading' ? (previous?.startedAt ?? now) : (previous?.startedAt ?? null),
      readAt: previous?.readAt ?? null,
      updatedAt: now,
      lifetimeReadCredited: previous?.lifetimeReadCredited ?? false,
      lifetimeCreditedAt: previous?.lifetimeCreditedAt ?? null,
    }
    setUserBooks((current) => ({ ...current, [bookId]: next }))
    if (status === 'liked' || status === 'saved') {
      setSeenBookIds((current) => [...new Set([...current, bookId])])
      setSwipeHistory((current) => [...current.slice(-19), { bookId, previousStatus: previous?.status, action: status }])
    }
    setSyncing(true)
    setSyncError(null)
    const request = status === 'liked'
      ? saveLikedBookRemote(next, profile).then((result) => {
          if (result.status === 'liked' || !previous) return
          setUserBooks((current) => current[bookId]?.status === 'liked' ? { ...current, [bookId]: previous } : current)
        })
      : status === 'saved'
        ? saveSavedBookRemote(next).then((result) => {
            if (result.status === 'saved' || !previous) return
            setUserBooks((current) => current[bookId]?.status === 'saved' ? { ...current, [bookId]: previous } : current)
          })
        : saveUserBookRemote(next, profile)
    void request.catch((error) => {
      setUserBooks((current) => {
        const restored = { ...current }
        if (previous) restored[bookId] = previous
        else delete restored[bookId]
        return restored
      })
      setSyncError(firebaseErrorMessage(error, 'บันทึกสถานะหนังสือไม่สำเร็จ'))
    }).finally(() => setSyncing(false))
  }

  const undoSwipe = () => {
    const last = swipeHistory.at(-1)
    if (!last || !profile) return
    setSeenBookIds((current) => current.filter((id) => id !== last.bookId))
    setSwipeHistory((current) => current.slice(0, -1))
    if (last.action === 'skipped') {
      setSkippedBookIds((current) => current.filter((id) => id !== last.bookId))
      return
    }
    const currentBook = userBooks[last.bookId]
    setUserBooks((current) => {
      const next = { ...current }
      if (!last.previousStatus) delete next[last.bookId]
      else next[last.bookId] = { ...next[last.bookId], status: last.previousStatus, updatedAt: new Date().toISOString() }
      return next
    })
    if (!currentBook) return
    const restoredBook = last.previousStatus
      ? { ...currentBook, status: last.previousStatus, updatedAt: new Date().toISOString() }
      : null
    const request = !restoredBook
      ? deleteUserBookRemote(currentBook, profile)
      : restoredBook.status === 'liked'
        ? saveLikedBookRemote(restoredBook, profile)
        : restoredBook.status === 'saved'
          ? saveSavedBookRemote(restoredBook)
          : saveUserBookRemote(restoredBook, profile)
    setSyncing(true)
    void request.catch((error) => setSyncError(firebaseErrorMessage(error, 'ย้อนการปัดใน Firestore ไม่สำเร็จ')))
      .finally(() => setSyncing(false))
  }

  const removeBookFromShelf = async (bookId: string) => {
    if (!profile) throw new Error('ไม่พบโปรไฟล์นักอ่าน')
    requireActiveMember()
    const previous = userBooks[bookId]
    if (!previous || !['liked', 'saved'].includes(previous.status)) {
      throw new Error('นำออกได้เฉพาะหนังสือที่สนใจหรือเก็บไว้ก่อน')
    }
    setSyncing(true)
    setSyncError(null)
    try {
      await deleteUserBookRemote(previous, profile)
      setUserBooks((current) => {
        const next = { ...current }
        delete next[bookId]
        return next
      })
      setSwipeHistory((current) => current.filter((item) => item.bookId !== bookId))
    } catch (error) {
      setSyncError(firebaseErrorMessage(error, 'นำหนังสือออกจากชั้นไม่สำเร็จ'))
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const completeBook = async (
    bookId: string,
    review: Pick<UserBook, 'rating' | 'review' | 'moodAfterReading' | 'favoriteAspect'>,
  ) => {
    if (!profile || !currentTerm || !authUser) throw new Error('ไม่พบโปรไฟล์นักอ่าน')
    requireActiveMember()
    const previous = userBooks[bookId]
    const readingLoan = readingLoanForBook(loans, bookId)
    if (previous?.status !== 'reading' || !readingLoan) {
      throw new Error('ต้องเริ่มอ่านหนังสือหลังรับจากห้องสมุดก่อนจึงจะส่งรีวิวได้')
    }
    const now = new Date().toISOString()
    const next: UserBook = {
      ...previous,
      uid: profile.uid,
      termId: currentTerm.id,
      bookId,
      loanId: previous.loanId ?? readingLoan.id,
      status: 'read',
      ...review,
      likedAt: previous?.likedAt ?? null,
      startedAt: previous?.startedAt ?? null,
      readAt: previous?.readAt ?? now,
      updatedAt: now,
      lifetimeReadCredited: true,
      lifetimeCreditedAt: previous?.lifetimeCreditedAt ?? now,
    }
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await completeBookRemote(next, profile)
      if (result.counted) {
        setUserBooks((current) => ({ ...current, [bookId]: next }))
        setReaderStats(result.readerStats)
        if (result.levelUp) setLevelUp(getReaderLevel(result.readerStats.lifetimeReadCount))
      } else {
        const remote = await loadRemoteStudentState(authUser, currentTerm.id)
        setUserBooks(remote.userBooks)
        setReaderStats(remote.readerStats)
      }
      await refreshReaders()
    } catch (error) {
      setSyncError(firebaseErrorMessage(error, 'ยืนยันการอ่านใน Firestore ไม่สำเร็จ คะแนนยังไม่ถูกเพิ่ม'))
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const reloadLoans = async () => {
    if (!profile) return
    const [nextLoans, nextLocks] = await Promise.all([
      loadStudentLoans(profile.uid),
      loadBookLoanLocks(),
    ])
    setLoans(nextLoans)
    setBookLoanLocks(nextLocks)
  }

  const requestLoan = async (bookId: string) => {
    if (!profile || !currentTerm) throw new Error('กรุณาสร้างโปรไฟล์นักเรียนก่อนขอยืมหนังสือ')
    requireActiveMember()
    const book = books.find((item) => item.id === bookId)
    if (!book) throw new Error('ไม่พบหนังสือที่ต้องการยืม')
    setSyncing(true)
    setSyncError(null)
    try {
      await requestLoanRemote(book, profile, currentTerm.id)
      await reloadLoans()
    } catch (error) {
      setSyncError(firebaseErrorMessage(error, 'ส่งคำขอยืมหนังสือไม่สำเร็จ'))
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const cancelLoan = async (loanId: string) => {
    const loan = loans.find((item) => item.id === loanId)
    if (!loan) throw new Error('ไม่พบคำขอยืม')
    setSyncing(true)
    setSyncError(null)
    try {
      await cancelLoanRemote(loan)
      await reloadLoans()
    } catch (error) {
      setSyncError(firebaseErrorMessage(error, 'ยกเลิกคำขอยืมไม่สำเร็จ'))
      throw error
    } finally {
      setSyncing(false)
    }
  }

  const resetRound = () => {
    setSkippedBookIds([])
    setSeenBookIds([])
    setSwipeHistory([])
  }

  const resetDevice = () => {
    if (profileUid && currentTerm) removeSwipeSession(profileUid, currentTerm.id)
    localStorage.removeItem(DISCOVERY_KEY)
    clearStudentState()
    setAuthUser(null)
    setSelectedMoods([])
    setSelectedCategories([])
    resetRound()
    void signOutStudentUser().catch((error) => {
      setSyncError(firebaseErrorMessage(error, 'ออกจากระบบไม่สำเร็จ'))
    })
  }

  const value: AppState = {
    books,
    categories,
    settings,
    currentTerm,
    currentTermError,
    readers,
    authUser,
    profile,
    membership,
    readerStats,
    userBooks,
    loans,
    bookLoanLocks,
    selectedMoods,
    selectedCategories,
    seenBookIds,
    swipeHistory,
    loading,
    syncing,
    syncError,
    catalogError,
    catalogSource,
    levelUp,
    signInWithGoogle,
    setSelectedMoods,
    setSelectedCategories,
    saveProfile,
    setBookStatus,
    removeBookFromShelf,
    undoSwipe,
    completeBook,
    requestLoan,
    cancelLoan,
    reloadLoans,
    reloadCatalog,
    retrySync,
    resetDevice,
    resetRound,
    dismissLevelUp: () => setLevelUp(null),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
