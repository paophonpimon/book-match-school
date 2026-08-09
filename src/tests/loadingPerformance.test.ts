import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const app = readFileSync(resolve(process.cwd(), 'src/app/App.tsx'), 'utf8')
const home = readFileSync(resolve(process.cwd(), 'src/features/home/HomePage.tsx'), 'utf8')
const index = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('initial loading performance', () => {
  it('loads non-entry routes on demand', () => {
    expect(app).toContain("const loadAdminPage = () => import('../features/admin/AdminPage')")
    expect(app).toContain("const loadHomePage = () => import('../features/home/HomePage')")
    expect(app).toContain("const HomePage = lazyNamed(loadHomePage, 'HomePage')")
    expect(app).toContain('<Suspense fallback={<LoadingScreen />}>')
  })

  it('prefetches common student routes after first paint without prefetching Admin', () => {
    expect(app).toContain('function StudentRoutePreloader()')
    expect(app).toContain('Promise.allSettled([loadHomePage(), loadMoodPage(), loadDiscoverPage(), loadShelfPage(), loadLeaderboardPage(), loadProfilePage()])')
    expect(app).toContain("connection?.effectiveType?.includes('2g')")
    const preloader = app.split('function StudentRoutePreloader()')[1].split('function ScrollToTop()')[0]
    expect(preloader).not.toContain('loadAdminPage()')
  })

  it('recovers once from stale lazy chunks after a new deployment', () => {
    expect(app).toContain("const CHUNK_RELOAD_KEY = 'book-match:chunk-reload'")
    expect(app).toContain('isChunkLoadError(error)')
    expect(app).toContain('window.location.reload()')
  })

  it('uses a branded animated loading state instead of an empty pale screen', () => {
    const shell = readFileSync(resolve(process.cwd(), 'src/components/AppShell.tsx'), 'utf8')
    const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')
    expect(shell).toContain('กำลังเปิดเล่มที่ใช่')
    expect(shell).toContain('loading-screen__progress')
    expect(shell).toContain('loading-screen__books')
    expect(styles).toContain('@keyframes route-loader-progress')
    expect(styles).toContain('min-height: 100dvh')
  })

  it('uses compact WebP artwork for the critical welcome screen', () => {
    const artwork = resolve(process.cwd(), 'img/logo-book.webp')
    expect(statSync(artwork).size).toBeLessThan(100_000)
  })

  it('prioritizes only the hero artwork and defers secondary home artwork', () => {
    expect(home).toContain('fetchPriority="high"')
    expect(home.match(/loading="lazy"/g)?.length).toBeGreaterThanOrEqual(4)
    expect(home).toContain('decoding="async"')
  })

  it('warms up the Firebase connections used during startup', () => {
    expect(index).toContain('https://firestore.googleapis.com')
    expect(index).toContain('https://identitytoolkit.googleapis.com')
  })

  it('loads Thai fonts without a render-blocking CSS import', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')
    expect(index).toContain('https://fonts.gstatic.com')
    expect(index).toContain('family=Noto+Sans+Thai')
    expect(styles).not.toContain('@import url(')
  })
})
