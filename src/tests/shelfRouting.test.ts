import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/features/shelf/ShelfPage.tsx'), 'utf8')

describe('shelf tab routing', () => {
  it('opens a requested shelf tab from the profile statistics cards', () => {
    expect(page).toContain('useSearchParams')
    expect(page).toContain("search.get('tab')")
    expect(page).toContain('isShelfTab(requestedTab)')
  })

  it('keeps the URL synchronized when changing tabs on the shelf', () => {
    expect(page).toContain("setSearch({ tab: item.id }, { replace: true })")
  })

  it('uses the branded confirmation dialog when removing a saved book', () => {
    expect(page).toContain("import { ConfirmationDialog }")
    expect(page).toContain('<ConfirmationDialog')
    expect(page).toContain('tone="danger"')
    expect(page).toContain('นำออกจากชั้น')
    expect(page).not.toContain('window.confirm')
  })
})
