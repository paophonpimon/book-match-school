# Firestore Books Migration Plan

Updated: 2026-07-28

## Verified source state

- Production Apps Script deployment remains unchanged at the existing `/exec` URL.
- The production endpoint returns 106 active books.
- The `Books` sheet contains exactly 106 non-empty book rows.
- Active: 106; hidden: 0.
- Duplicate `id`: 0.
- Duplicate normalized `title + author`: 0.
- First preserved ID: `legacy-000-002`.
- Last preserved ID: `legacy-900-011`.
- Firestore now has 106 `books`, 106 `bookUniqueKeys`, and one verified `migrationRuns` record.
- Existing student collections are `profiles` and `progress`; the migration does not mutate them.

Category counts:

| Category | Count |
| --- | ---: |
| 000 | 9 |
| 100 | 11 |
| 200 | 10 |
| 300 | 10 |
| 400 | 10 |
| 500 | 10 |
| 600 | 10 |
| 700 | 8 |
| 800 | 18 |
| 900 | 10 |

## Backups

- Apps Script source: `apps-script/backups/Code.production-2026-07-28.gs`
- Google Sheets copy: `BookMatch_DataBook_Latest_BACKUP_before_firestore_migration_2026-07-28`
- Backup spreadsheet ID: `15Zld8aAl0XmnkdOhLkRaCJ1_nD5zrMz5tgp3fkpv140`

## Migration phases

1. Keep the student production catalog on Apps Script. ✅
2. Deploy Firestore indexes/rules และรอ indexes เป็น `READY`. ✅
3. Run the migration validator against the unchanged `/exec` endpoint. ✅
4. Import each source row into `books/{source.id}` and create its normalized uniqueness key. ✅
5. Verify count, active count, IDs, category counts, and deterministic checksum. ✅
6. Deploy Firestore Security Rules for direct Admin transactions. ✅
7. Test Admin create/update/archive/restore and verify that the Rules require `bookAuditLogs`. ✅
8. Switch the student catalog to Firestore with `VITE_CATALOG_SOURCE=firestore`.
9. Smoke-test Production and retain the previous Hosting version and Apps Script endpoint as rollback paths.

## Safety gates

- Do not edit or delete the Apps Script Production deployment.
- Do not switch the student catalog until Firestore contains all 106 verified IDs.
- Student writes to `books`, `bookUniqueKeys`, and `bookAuditLogs` are denied.
- Admin mutations use Firebase Web SDK transactions. Rules require the verified Admin email from the signed Firebase token and validate all related documents with `getAfter()`.
- Hidden books remain reserved by the uniqueness key and cannot be duplicated.
- Soft delete only: `active=false`; permanent deletion is not exposed.

## Current status

The current architecture does not use Cloud Functions and does not require Blaze. Rules and local Admin transaction tests have passed. Production Hosting has not been cut over; the existing student site and Apps Script endpoint remain unchanged.
