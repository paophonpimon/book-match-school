import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'
import { ACCEPTANCE_PASSWORD, accounts } from './fixtures'

export interface FixtureManifest {
  projectId: string
  termId: string
  users: Record<keyof typeof accounts, { uid: string; email: string; studentId: string }>
  books: string[]
}

export async function readManifest(): Promise<FixtureManifest> {
  return JSON.parse(await readFile(resolve('acceptance/fixtures/manifest.json'), 'utf8')) as FixtureManifest
}

export async function signInStudent(page: Page, account: keyof typeof accounts) {
  await page.goto('/welcome')
  await page.waitForFunction(() => Boolean(window.__BOOK_MATCH_ACCEPTANCE__))
  await page.evaluate(async ({ email, password }) => {
    await window.__BOOK_MATCH_ACCEPTANCE__!.signInStudent(email, password)
  }, { email: accounts[account].email, password: ACCEPTANCE_PASSWORD })
  await page.waitForURL(/\/(home|setup)$/)
}

export async function signInAdmin(page: Page) {
  await page.goto('/admin')
  await page.waitForFunction(() => Boolean(window.__BOOK_MATCH_ACCEPTANCE__))
  await page.evaluate(async ({ email, password }) => {
    await window.__BOOK_MATCH_ACCEPTANCE__!.signInAdmin(email, password)
  }, { email: accounts.admin.email, password: ACCEPTANCE_PASSWORD })
}

export async function adminTransition(page: Page, loanId: string, action: 'approve' | 'reject' | 'pickup' | 'renew' | 'return') {
  await page.evaluate(async ({ loanId, action }) => {
    await window.__BOOK_MATCH_ACCEPTANCE__!.transitionLoan(loanId, action)
  }, { loanId, action })
}
