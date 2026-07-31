# Book Match acceptance test matrix

| Area | Automated coverage | Result |
|---|---|---|
| Auth/Profile/Membership | Verified Emulator accounts, new-user redirect, editable/pasteable student ID, full registration transaction; membership validation/unit regressions | Pass |
| Discovery/Swipe | 360×800, 390×844, 768×1024, 1440×900; action visibility, nav overlap, five sequential decisions, stable transform/deck, Undo, persisted local session | Pass |
| Cover loading | Real load, delayed response >10s, skeleton/slow notice, confirmed 404 retry/fallback, no broken-image icon; component retry/state unit tests | Pass |
| Shelf/Review/Level | Returned loan appears for review, reading→read, public review, refresh/idempotent counters; all status/counter/level/rank utilities covered by unit tests | Pass |
| Loan request | Active member atomic request; missing/suspended/no-term/closed-term/mismatch/hidden/duplicate denial; no pending lock | Pass |
| Loan lifecycle | Approve, pickup, renew, return, lock/key cleanup, history/audits retained, fresh request | Pass |
| Multi-user concurrency | A/B/C pending on one book, one winning lock, B/C conflict without raw permission text, pending retained, re-request after return | Pass |
| Admin books | Real Web SDK + Rules create/update/unique-key rotation/archive/restore and four audits; list/search/filter/pagination unit coverage | Pass |
| Admin members | Real Web SDK + Rules active→suspended→active; search/filter/status and no-delete unit/static coverage | Pass |
| Admin loans | Real transaction lifecycle plus desktop/mobile navigation; dialog/filter/status unit/static coverage | Pass |
| Admin terms/reports | Real draft create/delete and report load; activate/close/report/CSV injection/print behavior covered by unit/static tests | Pass |
| Responsive/UX | Student and Admin desktop/mobile overflow/navigation; loading/error/empty and routing regressions | Pass |
| Production isolation | Demo project ID, local ports only, no real credentials/data; Production bundle marker scan | Pass |

The browser suite emphasizes cross-layer flows. Pure calculations, forbidden transitions, CSV escaping, level thresholds, ordering and schema/static invariants remain in the 182-test Vitest suite to avoid duplicating slower browser cases.
