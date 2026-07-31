import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
const service = readFileSync(resolve(process.cwd(), 'src/services/adminTerms.ts'), 'utf8')

describe('term management security', () => {
  it('lets only Admin delete draft terms and preserves active or closed history', () => {
    const termBlock = rules.slice(rules.indexOf('match /terms/{termId}'), rules.indexOf('function validCurrentTermSetting'))
    expect(termBlock).toContain('allow delete: if isAdmin()')
    expect(termBlock).toContain("resource.data.status == 'draft'")
    expect(service).toContain("termSnapshot.data().status !== 'draft'")
  })

  it('closes the current term and currentTerm setting atomically', () => {
    expect(service).toContain("status: 'closed'")
    expect(service).toContain('transaction.delete(settingsRef)')
    expect(rules).toContain("getAfter(termPath).data.status == 'closed'")
    expect(rules).toContain('currentSettingStopsPointingTo(termId)')
  })

  it('allows reopening a closed term while keeping exactly one active setting', () => {
    expect(rules).toContain("resource.data.status == 'closed'")
    expect(rules).toContain('currentSettingPointsTo(termId)')
    expect(rules).toContain("getAfter(termPath).data.status == 'active'")
    expect(service).toContain("where('status', '==', 'active')")
  })

  it('allows Admin report queries without exposing every shelf to students', () => {
    expect(rules).toContain("allow list: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid)")
    expect(service).toContain("where('termId', '==', term.id)")
  })
})
