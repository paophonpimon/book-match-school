import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = readFileSync(resolve(process.cwd(), 'scripts/provision-student-accounts.mjs'), 'utf8')
const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf8')

describe('local-only idempotent student provisioning', () => {
  it('defaults to dry-run and requires explicit apply', () => {
    expect(script).toContain("const APPLY = process.argv.includes('--apply')")
    expect(script).toContain("mode: APPLY ? 'APPLY' : 'DRY_RUN'")
    expect(script).toContain('if (!APPLY) return')
  })

  it('skips the approved duplicate IDs and enforces the 817-record safety gate', () => {
    for (const id of ['06269', '06465', '07092', '07192', '07389']) expect(script).toContain(`'${id}'`)
    expect(script).toContain('candidates.length !== 817')
    expect(script).toContain('skipDuplicates.length !== 10')
  })

  it('skips existing memberships and rejects partial provisioning conflicts', () => {
    expect(script).toContain('if (membership)')
    expect(script).toContain('existing.push(record)')
    expect(script).toContain("reason: 'auth-without-membership'")
    expect(script).toContain("reason: 'directory-without-membership'")
  })

  it('creates no profile or progress and rolls back a new Auth user on failure', () => {
    expect(script).not.toContain("createWrite('profiles'")
    expect(script).not.toContain("createWrite('progress'")
    expect(script).toContain('await auth.deleteUser(user.uid).catch(() => {})')
    expect(script).toContain('after.progress !== baseline.progress')
    expect(script).toContain('after.profiles !== baseline.profiles')
  })

  it('keeps roster data and provision reports out of the public repository', () => {
    expect(gitignore).toContain('*student-roster*.csv')
    expect(gitignore).toContain('*provision-report*.json')
  })
})
