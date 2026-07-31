# Production smoke-test checklist (not executed in this phase)

Run only after explicit deployment approval:

- Open `https://book-match-school.web.app` on desktop and a 390px mobile viewport.
- Confirm Google Sign-In with an authorized real test account; never use Emulator credentials.
- Confirm Home, Discover, Shelf, Loans, Leaderboard and Profile load without console errors.
- Confirm an active student can request one available test-approved book.
- Confirm Admin can approve → pickup → return that request and the student can review it.
- Confirm the returned book becomes available and counters do not increase after refresh.
- Confirm `/admin` rejects non-admin accounts and mobile navigation/dialogs fit the viewport.
- Confirm no `__BOOK_MATCH_ACCEPTANCE__`, `student-a@test.book-match.invalid` or Emulator host appears in downloaded Production JavaScript.
- Remove/close only the deliberately created Production smoke record after verification.

Do not run this checklist against the 106 real books without the owner's explicit choice of a safe record.
