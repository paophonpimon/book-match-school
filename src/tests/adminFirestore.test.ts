import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildBookUniqueKey } from '../services/adminAuth'

function expectedKey(title: string, author: string) {
  const normalize = (value: string) => (
    value.normalize('NFKC').trim().toLocaleLowerCase('th-TH').replace(/\s+/g, ' ')
  )
  return createHash('sha256')
    .update(`${normalize(title)}\u0000${normalize(author)}`)
    .digest('hex')
}

describe('Admin Firestore unique keys', () => {
  it('matches the SHA-256 key used by the migration', async () => {
    await expect(buildBookUniqueKey('  Test   BOOK ', ' Author ')).resolves.toBe(
      expectedKey('test book', 'author'),
    )
  })

  it('produces the same key for equivalent normalized title and author', async () => {
    const first = await buildBookUniqueKey('หนังสือ   ดี', 'ผู้แต่ง')
    const second = await buildBookUniqueKey(' หนังสือ ดี ', ' ผู้แต่ง ')
    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })
})
