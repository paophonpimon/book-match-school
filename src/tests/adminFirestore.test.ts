import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildBookUniqueKey, planBookIdentityMutation } from '../services/adminAuth'

const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
const adminAuthSource = readFileSync(resolve(process.cwd(), 'src/services/adminAuth.ts'), 'utf8')
const adminStudentsSource = readFileSync(resolve(process.cwd(), 'src/services/adminStudents.ts'), 'utf8')
const adminTermsSource = readFileSync(resolve(process.cwd(), 'src/services/adminTerms.ts'), 'utf8')
const loansSource = readFileSync(resolve(process.cwd(), 'src/services/loans.ts'), 'utf8')

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

  it('keeps the unique key when title and author are unchanged', async () => {
    const previous = { title: 'หนังสือเดิม', author: 'ผู้แต่งเดิม' }
    const result = await planBookIdentityMutation(previous, previous, null)
    expect(result.previousUniqueKey).toBe(result.nextUniqueKey)
    expect(result.rotatesUniqueKey).toBe(false)
  })

  it('rotates the unique key when title or author changes', async () => {
    const result = await planBookIdentityMutation(
      { title: 'หนังสือเดิม', author: 'ผู้แต่งเดิม' },
      { title: 'หนังสือชื่อใหม่', author: 'ผู้แต่งเดิม' },
      null,
    )
    expect(result.previousUniqueKey).not.toBe(result.nextUniqueKey)
    expect(result.rotatesUniqueKey).toBe(true)
  })

  it('uses a stored unique key when a modern document already has one', async () => {
    const storedKey = 'a'.repeat(64)
    const result = await planBookIdentityMutation(
      { title: 'ชื่อเดิม', author: 'ผู้แต่งเดิม' },
      { title: 'ชื่อเดิม', author: 'ผู้แต่งเดิม' },
      storedKey,
    )
    expect(result.previousUniqueKey).toBe(storedKey)
  })
})

describe('Admin Firestore transaction rules', () => {
  it('requires the verified allowlisted Admin email', () => {
    expect(rules).toContain('request.auth.token.email_verified == true')
    expect(rules).toContain("request.auth.token.email == 'paopornpimon@gmail.com'")
    expect(rules).not.toMatch(/match \/books\/\{bookId\}[\s\S]*?allow (create|update): if signedIn\(\);/)
  })

  it('does not require retired fields for a new book', () => {
    const createFields = rules.match(/function validBookCreateFields\(\) \{([\s\S]*?)\n\s{4}\}/)?.[1] ?? ''
    expect(createFields).not.toContain("'estimatedReadingMinutes'")
    expect(createFields).not.toContain("'displayOrder'")
  })

  it('reads missing migration metadata defensively on legacy updates', () => {
    expect(rules).toContain("resource.data.get('createdAt', null)")
    expect(rules).toContain("resource.data.get('createdBy', null)")
    expect(rules).toContain("resource.data.get('bookUniqueKey', null)")
    expect(rules).toContain("get(bookPath).data.get('bookUniqueKey', null)")
  })

  it('keeps book, unique key, and audit log in one transaction', () => {
    expect(adminAuthSource).toContain('transaction.set(bookRef, bookPayload)')
    expect(adminAuthSource).toContain('transaction.set(nextUniqueRef, uniquePayload)')
    expect(adminAuthSource).toContain('transaction.set(auditRef, auditPayload)')
    expect(rules).toContain('validLinkedUnique(bookId)')
    expect(rules).toContain('validLinkedAudit(bookId, false)')
    expect(rules).toContain('afterBook.lastAuditId == auditId')
    expect(rules).toContain('afterUnique.lastAuditId == auditId')
  })

  it('refreshes and verifies the Admin token before mutating', () => {
    expect(adminAuthSource).toContain('user.getIdTokenResult(true)')
    expect(adminAuthSource).toContain('await getVerifiedAdminFirebaseContext()')
  })

  it('uses authoritative server reads for Admin membership, loan and term data', () => {
    expect(adminStudentsSource).toContain('getDocsFromServer')
    expect(adminStudentsSource).toContain('getDocFromServer')
    expect(adminTermsSource).toContain('getDocsFromServer')
    expect(loansSource).toContain('const snapshot = await getDocsFromServer(query(')
    expect(adminAuthSource).not.toContain('persistentLocalCache')
  })

  it('loads every registered student and leaves pagination to the Admin list UI', () => {
    expect(adminStudentsSource).toContain('export async function loadAdminStudentMembers()')
    expect(adminStudentsSource).not.toContain('limit(maxResults)')
  })
})
