import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/features/discovery/CategoryPage.tsx'), 'utf8')
const assetDirectory = resolve(process.cwd(), 'public/assets/book-match/categories')

describe('category artwork', () => {
  it('maps every Dewey category to the supplied local icon', () => {
    for (const code of ['000', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
      expect(existsSync(resolve(assetDirectory, `category-${code}.png`))).toBe(true)
    }

    expect(page).toContain("const categoryAssets = '/assets/book-match/categories'")
    expect(page).toContain('categoryIconSource(item.id)')
  })

  it('uses the supplied unrestricted-category icon and preserves selection behavior', () => {
    expect(existsSync(resolve(assetDirectory, 'category-any.png'))).toBe(true)
    expect(page).toContain('/category-any.png')
    expect(page).toContain('onClick={() => setSelectedCategories([])}')
    expect(page).toContain('onClick={() => toggle(item.id)}')
  })
})
