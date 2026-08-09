import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const app = readFileSync(resolve(process.cwd(), 'src/app/App.tsx'), 'utf8')
const home = readFileSync(resolve(process.cwd(), 'src/features/home/HomePage.tsx'), 'utf8')
const index = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('initial loading performance', () => {
  it('loads non-entry routes on demand', () => {
    expect(app).toContain("lazy(() => import('../features/admin/AdminPage')")
    expect(app).toContain("lazy(() => import('../features/home/HomePage')")
    expect(app).toContain('<Suspense fallback={<LoadingScreen />}>')
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
