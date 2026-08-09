import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/site.webmanifest'), 'utf8')) as {
  icons: Array<{ src: string; sizes: string; type: string }>
}
const iconPath = resolve(process.cwd(), 'public/assets/book-match/logos/book-match-app-icon.png')

describe('Book Match browser identity', () => {
  it('uses the supplied Book Match icon for browser and Apple home screen icons', () => {
    expect(html).toContain('rel="icon"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('/assets/book-match/logos/book-match-app-icon.png')
    expect(existsSync(iconPath)).toBe(true)
  })

  it('publishes a web app manifest using the same brand icon', () => {
    expect(html).toContain('rel="manifest" href="/site.webmanifest"')
    expect(manifest.icons).toContainEqual({
      src: '/assets/book-match/logos/book-match-app-icon.png',
      sizes: '500x500',
      type: 'image/png',
      purpose: 'any',
    })
  })
})
