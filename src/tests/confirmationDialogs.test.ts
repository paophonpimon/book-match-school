import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const confirmationPages = [
  'src/features/shelf/ShelfPage.tsx',
  'src/features/profile/ProfilePage.tsx',
  'src/features/admin/AdminPage.tsx',
  'src/features/admin/AdminStudentMembers.tsx',
  'src/features/admin/AdminTermManagement.tsx',
]

describe('branded confirmation dialogs', () => {
  it.each(confirmationPages)('%s does not use a native browser popup', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8')

    expect(source).not.toMatch(/window\.(confirm|alert|prompt)/)
    expect(source).toContain('ConfirmationDialog')
  })

  it('keeps destructive confirmations visually distinct and blocks duplicate submissions', () => {
    const dialog = readFileSync(resolve(process.cwd(), 'src/components/ConfirmationDialog.tsx'), 'utf8')

    expect(dialog).toContain("tone?: 'default' | 'danger'")
    expect(dialog).toContain('busy?: boolean')
    expect(dialog).toContain('disabled={busy}')
  })
})
