# Book Match automated acceptance report

Generated: 1 August 2026 (Asia/Bangkok)

## Result

- Combined automated checks: **199 passed, 0 failed, 0 skipped**
- Vitest regression: **25 files / 182 tests passed**
- Playwright + Firebase Emulator: **2 files / 17 tests passed**
- Firestore Rules acceptance: included in Playwright, **5 rule groups passed**
- Lint: passed
- Typecheck: passed
- Production build: passed
- Production bundle acceptance markers: **0**
- Deployment: **not run**

## Critical flows

- Request loan: passed. An active verified member atomically created `loans`, `studentLoanActiveKeys` and `loanAuditLogs`; no `bookLoanLocks` was created while pending.
- Three-student concurrency: passed. A, B and C could create pending requests before a lock existed. A single approval created exactly one lock. Approval of B/C was rejected with the readable message “หนังสือเล่มนี้ถูกอนุมัติให้คำขออื่นแล้ว”; their requests remained pending for librarian action.
- Locked catalog behavior: the book remains discoverable but is labelled unavailable from the shared lock collection; direct detail disables requesting and does not reveal borrower identity.
- Loan lifecycle: passed for approved → borrowed → renewed → returned. Lock and active key were removed; loan history and at least four audit records remained; the book could be requested again.
- Review: a returned book appeared in the read shelf, could be reviewed once, and created the private read record plus public review. Refresh/revisit did not increase `progress.readCount`, lifetime count or rating count again.
- Swipe/mobile: passed at 360×800, 390×844, 768×1024 and 1440×900. Buttons and hints remained visible, nav did not overlap, five sequential choices preserved deck geometry, current-card transform reset, and Undo restored the preceding book.
- Slow cover: a response delayed beyond ten seconds kept the image mounted and skeleton visible, then displayed the real cover. A confirmed 404 retried finitely and ended in the custom fallback without browser broken-image UI.
- Admin: real Web SDK operations through Rules passed for book create/update/archive/restore + audit, membership suspend/reactivate, draft term create/delete, report read, loan lifecycle and desktop/mobile navigation.

## Security and isolation

- All users, books, terms and transactions were created only in `demo-book-match-acceptance` on Auth `127.0.0.1:9099` and Firestore `127.0.0.1:8080`.
- Fixture identifiers use `E2E`/`TEST`; manifest is at `acceptance/fixtures/manifest.json`.
- No real Google account, Production document, Apps Script, Functions, seed/migration script, Hosting, Rules deployment or index deployment was touched.
- Acceptance auth is installed only when `VITE_ACCEPTANCE_MODE=true`. A normal Production build was scanned and contains no bridge marker, fake student email or test password.

## Performance notes

- Catalog remains one Firestore query plus shared lock/student-state queries; no per-cover Firestore query was introduced.
- Cover loading uses native eager/lazy behavior and retries only confirmed failures.
- The Firebase production chunk is approximately 637 kB (190 kB gzip); consider route-level lazy loading as a later optimization, not a release blocker.
- Expected-denial Rules commits can log the 1,000-expression ceiling; see `DEFECTS.md`.

## Artifacts

- HTML report: `acceptance/artifacts/playwright-report/index.html`
- Playwright JSON: `acceptance/artifacts/playwright-results.json`
- Compact JSON: `acceptance/acceptance-summary.json`
- Matrix: `acceptance/TEST_MATRIX.md`
- Production checklist: `acceptance/PRODUCTION_SMOKE_CHECKLIST.md`
- Fail-only traces/screenshots/videos: `acceptance/artifacts/test-results/` (empty except run metadata after the passing run)

## Commands

```powershell
$env:PATH='C:\Users\jiras\AppData\Local\Temp\book-match-rules-smoke\jre\jdk-21.0.12+8-jre\bin;' + $env:PATH
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
firebase.cmd emulators:exec --only auth,firestore --project demo-book-match-acceptance "npx.cmd playwright test"
```

No deployment should occur until the owner explicitly approves it.
