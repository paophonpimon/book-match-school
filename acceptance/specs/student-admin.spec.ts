import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { expect, test, type Page } from '@playwright/test'
import { ACCEPTANCE_PROJECT_ID, TERM_ID, accounts, bookIds } from '../fixtures'
import { adminTransition, readManifest, signInAdmin, signInStudent, type FixtureManifest } from '../helpers'

let environment: RulesTestEnvironment
let manifest: FixtureManifest
let winningLoanId = ''

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

async function requestBook(page: Page, bookId: string) {
  await page.goto(`/books/${bookId}`)
  await expect(page.getByRole('heading', { name: new RegExp(`E2E ${Number(bookId.slice(-2))}$`) })).toBeVisible()
  await page.getByRole('button', { name: 'ขอยืมหนังสือ' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'ส่งคำขอยืม' }).click()
  await expect(page.getByText('บรรณารักษ์กำลังตรวจสอบคำขอของคุณ')).toBeVisible()
}

test.describe.serial('Book Match browser acceptance', () => {
  test.beforeAll(async () => {
    manifest = await readManifest()
    environment = await initializeTestEnvironment({
      projectId: ACCEPTANCE_PROJECT_ID,
      firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(resolve('firestore.rules'), 'utf8') },
    })
  })
  test.afterAll(async () => environment.cleanup())

  test('new verified student is routed to setup and can edit every first-registration field', async ({ page }) => {
    await signInStudent(page, 'studentNew')
    await expect(page).toHaveURL(/\/setup$/)
    const studentId = page.getByLabel('เลขประจำตัวนักเรียน')
    await expect(studentId).toBeEditable()
    await studentId.fill('123')
    await studentId.press('ControlOrMeta+A')
    await studentId.press('Backspace')
    await studentId.fill(accounts.studentNew.studentId)
    await page.getByLabel('ชื่อ', { exact: true }).fill('ใหม่')
    await page.getByLabel('นามสกุล').fill('ทดสอบ')
    await page.getByLabel('ชั้นมัธยมศึกษา/ห้อง').fill('5/5')
    await page.getByLabel('เลขที่').fill('5')
    await page.getByLabel('ชื่อเล่น/ชื่อที่จะแสดง').fill('E2E นักอ่านใหม่')
    await page.getByRole('button', { name: /ไปเลือกอารมณ์/ }).click()
    await expect(page).toHaveURL(/\/mood$/)
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      expect((await getDoc(doc(db, 'profiles', manifest.users.studentNew.uid))).data()?.studentId).toBe('99005')
      expect((await getDoc(doc(db, 'studentMemberships', '99005'))).data()?.uid).toBe(manifest.users.studentNew.uid)
      expect((await getDoc(doc(db, 'studentMembershipUids', manifest.users.studentNew.uid))).data()?.studentId).toBe('99005')
    })
  })

  for (const viewport of [
    { name: 'Android 360x800', width: 360, height: 800 },
    { name: 'iPhone 390x844', width: 390, height: 844 },
    { name: 'Tablet 768x1024', width: 768, height: 1024 },
    { name: 'Desktop 1440x900', width: 1440, height: 900 },
  ]) {
    test(`swipe deck fits ${viewport.name} without nav overlap`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await signInStudent(page, 'studentA')
      await page.goto('/discover')
      await expect(page.getByTestId('swipe-deck')).toBeVisible()
      await expect(page.getByText('ปัดซ้าย = ไม่ใช่')).toBeVisible()
      await expect(page.getByText('ปัดขวา = ชอบ')).toBeVisible()
      await expect(page.getByText('ปัดขึ้น = เก็บไว้ก่อน')).toBeVisible()
      for (const label of ['ย้อนกลับ', 'ไม่ใช่', 'ชอบ', 'เก็บไว้ก่อน']) {
        await expect(page.getByRole('button', { name: label })).toBeInViewport()
      }
      const deck = await page.getByTestId('swipe-deck').boundingBox()
      const nav = await page.locator('.bottom-nav').boundingBox()
      const overlaps = deck && nav
        ? deck.x < nav.x + nav.width && deck.x + deck.width > nav.x
          && deck.y < nav.y + nav.height && deck.y + deck.height > nav.y
        : true
      expect(overlaps).toBe(false)
      await assertNoHorizontalOverflow(page)
    })
  }

  test('five left swipes keep deck geometry stable and undo restores the preceding book', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signInStudent(page, 'studentA')
    await page.goto('/discover')
    const deck = page.getByTestId('swipe-deck')
    const initialBox = await deck.boundingBox()
    const seen: string[] = []
    for (let index = 0; index < 5; index += 1) {
      const card = deck.locator('.swipe-card:not(.swipe-card--next)')
      const id = await card.getAttribute('data-book-id')
      expect(id).toBeTruthy()
      seen.push(id!)
      await page.getByRole('button', { name: 'ไม่ใช่' }).click()
      await expect(deck.locator(`.swipe-card[data-book-id="${id}"]`)).toHaveCount(0)
      const nextStyle = await deck.locator('.swipe-card:not(.swipe-card--next)').evaluate((node) => getComputedStyle(node).transform)
      expect(nextStyle === 'none' || nextStyle === 'matrix(1, 0, 0, 1, 0, 0)').toBeTruthy()
      const currentBox = await deck.boundingBox()
      expect(Math.abs((currentBox?.width ?? 0) - (initialBox?.width ?? 0))).toBeLessThanOrEqual(1)
      expect(Math.abs((currentBox?.height ?? 0) - (initialBox?.height ?? 0))).toBeLessThanOrEqual(3)
      expect(Math.abs((currentBox?.x ?? 0) - (initialBox?.x ?? 0))).toBeLessThanOrEqual(1)
    }
    expect(new Set(seen).size).toBe(5)
    const beforeUndo = await deck.locator('.swipe-card:not(.swipe-card--next)').getAttribute('data-book-id')
    await page.getByRole('button', { name: 'ย้อนกลับ' }).click()
    await expect(deck.locator(`.swipe-card[data-book-id="${seen.at(-1)}"]`)).toBeVisible()
    expect(await deck.locator('.swipe-card:not(.swipe-card--next)').getAttribute('data-book-id')).not.toBe(beforeUndo)
  })

  test('slow cover remains mounted until load and confirmed errors never show a broken icon', async ({ page }) => {
    await page.route('**/e2e-cover-slow.png', async (route) => {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 10_800))
      await route.fulfill({ path: resolve('public/acceptance-cover.svg'), contentType: 'image/svg+xml' })
    })
    await page.route('**/e2e-cover-error.png', (route) => route.fulfill({ status: 404, body: '' }))
    await signInStudent(page, 'studentB')
    await page.goto(`/books/${bookIds[9]}`)
    const slow = page.locator('.detail-hero .book-cover')
    await expect(slow).toHaveAttribute('aria-busy', 'true')
    await expect(slow.locator('img')).toHaveCount(1)
    await expect(page.getByText('กำลังโหลดภาพปกนานกว่าปกติ')).toBeVisible({ timeout: 10_500 })
    await expect(slow).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
    await page.goto(`/books/${bookIds[8]}`)
    await expect(page.locator('.detail-hero .book-cover--fallback')).toContainText('ไม่มีภาพปก')
    await expect(page.locator('img[src*="e2e-cover-error"]')).toHaveCount(0)
  })

  test('three students can request the same unlocked book, then one lock wins and conflicts stay readable', async ({ page }) => {
    const loanIds = new Map<'studentA' | 'studentB' | 'studentC', string>()
    for (const account of ['studentA', 'studentB', 'studentC'] as const) {
      await signInStudent(page, account)
      await requestBook(page, bookIds[0])
      await page.evaluate(() => window.__BOOK_MATCH_ACCEPTANCE__!.signOutStudent())
      await environment.withSecurityRulesDisabled(async (context) => {
        const snapshot = await getDocs(query(collection(context.firestore(), 'loans'), where('uid', '==', manifest.users[account].uid), where('bookId', '==', bookIds[0])))
        loanIds.set(account, snapshot.docs[0].id)
      })
    }
    await signInAdmin(page)
    await expect(page.getByRole('heading', { name: 'จัดการคลังหนังสือ' })).toBeVisible()
    winningLoanId = loanIds.get('studentA')!
    await adminTransition(page, winningLoanId, 'approve')
    for (const account of ['studentB', 'studentC'] as const) {
      const loanId = loanIds.get(account)!
      const failure = await page.evaluate(async ({ loanId }) => {
        try { await window.__BOOK_MATCH_ACCEPTANCE__!.transitionLoan(loanId, 'approve'); return '' }
        catch (error) { return error instanceof Error ? error.message : String(error) }
      }, { loanId })
      expect(failure).toBeTruthy()
      expect(failure).not.toContain('Missing or insufficient permissions')
    }
    await environment.withSecurityRulesDisabled(async (context) => {
      const lock = await getDoc(doc(context.firestore(), 'bookLoanLocks', bookIds[0]))
      expect(lock.data()?.loanId).toBe(winningLoanId)
    })
  })

  test('approved → borrowed → renewed → returned cleans lock/key and preserves history/audits', async ({ page }) => {
    await signInAdmin(page)
    await adminTransition(page, winningLoanId, 'pickup')
    await adminTransition(page, winningLoanId, 'renew')
    await adminTransition(page, winningLoanId, 'return')
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      expect((await getDoc(doc(db, 'bookLoanLocks', bookIds[0]))).exists()).toBe(false)
      expect((await getDoc(doc(db, 'studentLoanActiveKeys', `${manifest.users.studentA.uid}_${bookIds[0]}`))).exists()).toBe(false)
      expect((await getDoc(doc(db, 'loans', winningLoanId))).data()?.status).toBe('returned')
      const audits = await getDocs(query(collection(db, 'loanAuditLogs'), where('loanId', '==', winningLoanId)))
      expect(audits.size).toBeGreaterThanOrEqual(4)
    })
    await page.evaluate(() => window.__BOOK_MATCH_ACCEPTANCE__!.signOutAdmin())
  })

  test('returned book can be reviewed once and counters remain idempotent after refresh', async ({ page }) => {
    await signInStudent(page, 'studentA')
    await page.goto('/shelf')
    await page.getByRole('tab', { name: /อ่านแล้ว/ }).click()
    const item = page.locator('.shelf-item').filter({ hasText: 'หนังสือทดสอบ E2E 1' })
    await item.getByRole('button', { name: 'เขียนรีวิว' }).click()
    await expect(page).toHaveURL(new RegExp(`/review/${bookIds[0]}$`))
    await page.getByRole('button', { name: '5 ดาว' }).click()
    await page.getByRole('button', { name: /ชอบมาก/ }).click()
    await page.getByRole('button', { name: 'ความรู้' }).click()
    await page.getByLabel('เล่าให้เพื่อนฟังสั้น ๆ').fill('รีวิวทดสอบอัตโนมัติ เนื้อหาดีและนำไปใช้ได้จริงมาก')
    await page.getByRole('button', { name: /ส่งรีวิวและยืนยันการอ่าน/ }).click()
    await expect(page).toHaveURL(/\/leaderboard\?completed=1$/)
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      const uid = manifest.users.studentA.uid
      expect((await getDoc(doc(db, 'userBooks', `${TERM_ID}_${uid}_${bookIds[0]}`))).data()?.status).toBe('read')
      expect((await getDoc(doc(db, 'progress', `${TERM_ID}_${uid}`))).data()?.readCount).toBe(1)
      expect((await getDoc(doc(db, 'readerStats', uid))).data()?.lifetimeReadCount).toBe(1)
      expect((await getDoc(doc(db, 'bookStats', `${TERM_ID}_${bookIds[0]}`))).data()?.ratingCount).toBe(1)
      expect((await getDoc(doc(db, 'bookReviews', `${TERM_ID}_${bookIds[0]}_${uid}`))).exists()).toBe(true)
    })
    await page.reload()
    await page.goto(`/review/${bookIds[0]}`)
    await expect(page.getByText('ยังรีวิวหนังสือเล่มนี้ไม่ได้')).toBeVisible()
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      expect((await getDoc(doc(db, 'progress', `${TERM_ID}_${manifest.users.studentA.uid}`))).data()?.readCount).toBe(1)
      expect((await getDoc(doc(db, 'bookStats', `${TERM_ID}_${bookIds[0]}`))).data()?.ratingCount).toBe(1)
    })
    await requestBook(page, bookIds[0])
  })

  test('student loan cancellation uses the responsive in-app dialog', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signInStudent(page, 'studentA')
    await page.goto('/loans')
    await page.getByRole('button', { name: 'ยกเลิกคำขอ' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /ยกเลิก/ })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'ยืนยันยกเลิก' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'กลับไปก่อน' })).toBeVisible()
    await expect(dialog).toBeInViewport()
    await dialog.getByRole('button', { name: 'กลับไปก่อน' }).click()
    await expect(dialog).toBeHidden()
  })

  test('admin navigation remains usable on desktop and 390px', async ({ page }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport)
      await signInAdmin(page)
      await expect(page.getByText('หนังสือทั้งหมด')).toBeVisible()
      const menu = viewport.width >= 1024 ? page.locator('.admin-sidebar nav') : page.locator('.admin-mobile-nav')
      const names = viewport.width >= 1024
        ? ['รายการหนังสือ', 'ระบบยืม–คืน', 'สมาชิกนักเรียน', 'จัดการภาคเรียน']
        : ['หนังสือ', 'ยืม–คืน', 'สมาชิก', 'ภาคเรียน']
      for (const name of names) {
        const item = viewport.width >= 1024
          ? menu.getByRole('link', { name })
          : menu.getByRole('button', { name })
        await item.click()
        await expect(item).toHaveAttribute('aria-current', 'page')
      }
      await assertNoHorizontalOverflow(page)
      await page.evaluate(() => window.__BOOK_MATCH_ACCEPTANCE__!.signOutAdmin())
    }
  })

  test('admin data layer performs book CRUD, member status, draft term and report through real Rules', async ({ page }) => {
    await signInAdmin(page)
    const result = await page.evaluate((studentId) => window.__BOOK_MATCH_ACCEPTANCE__!.exerciseAdminData(studentId), manifest.users.studentB.studentId)
    expect(result.reportMembers).toBeGreaterThanOrEqual(4)
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      const book = await getDoc(doc(db, 'books', result.bookId))
      expect(book.data()?.title).toBe('TEST Acceptance Admin Book Updated')
      expect(book.data()?.active).toBe(true)
      const audits = await getDocs(query(collection(db, 'bookAuditLogs'), where('bookId', '==', result.bookId)))
      expect(audits.size).toBe(result.auditExpected)
      expect((await getDoc(doc(db, 'studentMemberships', manifest.users.studentB.studentId))).data()?.status).toBe('active')
      expect((await getDoc(doc(db, 'terms', '2999-2'))).exists()).toBe(false)
    })
  })
})
