# HANDOFF — Book Match

อัปเดต local: 29 กรกฎาคม 2026

## สถานะ

Phase Google Sign-In, permanent membership, academic terms, reader level และ term rank พัฒนาเสร็จใน local แล้ว แต่ยังไม่ได้ deploy Hosting, Firestore Rules หรือ Indexes

Production loan system, catalog 106 เล่มจริง, Apps Script `/exec` และ Apps Script backup ไม่ถูกแก้ไขหรือลบ

## งานที่เสร็จ

- Student flow เปลี่ยนจาก Anonymous เป็น Google Sign-In พร้อม popup cancellation และ redirect fallback
- ผู้มี profile เดิมเข้าแอปต่อ; ผู้ใช้ใหม่ไป profile setup
- สมัครสมาชิกถาวรด้วย transaction และ lock สองทิศทาง `studentMemberships` / `studentMembershipUids`
- เลขประจำตัวนักเรียนเปลี่ยนไม่ได้หลังสมัคร
- Admin มีหน้า “สมาชิกนักเรียน” พร้อมค้นหา/กรอง/limit/status actions
- Admin มีหน้า “จัดการภาคเรียน” พร้อม create และ transaction สลับ active term
- current term โหลดจาก `settings/currentTerm` ครั้งเดียวใน shared AppContext
- `progress`, `userBooks`, `bookStats` ยังคงใช้ document ID แบบ term เดิม
- Loans เก็บ `termId` ตอนส่งคำขอและไม่ถูกปิดเมื่อเปลี่ยนเทอม
- Reader level ถาวรใช้ `readerStats`; transaction อ่านจบป้องกันการนับซ้ำ
- Term rank คำนวณจาก `progress.readCount` ไม่สร้างเอกสาร rank เพิ่ม
- Student profile แสดง email, membership, term, level, lifetime count, progress และ term rank
- Leaderboard แสดง term rank โดยยังเรียงจาก current-term progress แบบเดิม
- Rules ใหม่จำกัด suspended member และเพิ่ม schema/ownership/relationship checks

## Cleanup BOT/TEST

เอกสารทดสอบที่ลบรวมจาก cleanup ต่อเนื่อง:

| Collection | ลบ |
|---|---:|
| profiles | 3 |
| progress | 1 |
| userBooks | 2 |
| loans | 7 |
| studentLoanActiveKeys | 0 |
| bookLoanLocks | 0 |
| loanAuditLogs | 27 |

ตรวจซ้ำแล้วเหลือเอกสารที่ผูกกับ BOT UID ใน collection เหล่านี้ 0 และ BOT book locks 0 หนังสือใน `books` มีจำนวนก่อน/หลังเท่ากัน 107 เอกสาร จึงไม่มี catalog document ถูกแก้

Firebase Authentication test users ที่ต้องลบด้วยตนเองใน Console:

- `8NtP2zzamBO6SoRrFm8jpD6gSSv2`
- `LYD1aFksNHV3AG7qA2C7yjEndCj1`

ไม่มี backend/Admin SDK ถูกเพิ่มเพื่อการลบ Auth users

## ผลตรวจล่าสุด

- Lint: ผ่าน
- Typecheck: ผ่าน
- Tests: 19 files, 124 tests ผ่าน
- Firestore Rules compiler dry-run: ผ่าน
- Build: ให้ดูผลรอบสุดท้ายในรายงานส่งมอบของ task นี้
- Index ใหม่: ไม่มี

## ความเสี่ยง/ข้อจำกัด

- Rules ใหม่ยังไม่อยู่ Production ดังนั้นฟีเจอร์ membership/term/readerStats จะยังใช้งานกับ Production Rules เดิมไม่ได้จนกว่าจะได้รับอนุมัติ deploy
- ต้องเปิด Google provider และตรวจ Authorized domains ก่อน smoke test
- ต้องสร้างและ activate term แรกผ่าน Admin หลัง deploy Rules
- ไม่มี Java/emulator harness เดิม จึงไม่ได้เพิ่ม Firebase Emulator Rules infrastructure ขนาดใหญ่
- รายการสมาชิก Admin จำกัด 100 บัญชีล่าสุด; หากจำนวนมากขึ้นควรเพิ่ม cursor pagination
- liked/saved/reading ยังคงแยกตาม term เพื่อรักษา architecture เดิม ส่วน read history ย้อนหลังยังอยู่ใน `userBooks` ของเทอมเก่า

## คำสั่ง deploy หลังได้รับอนุมัติ

```powershell
firebase use book-match-school
firebase deploy --only firestore:rules
npm run build
firebase deploy --only hosting
```

ไม่ต้อง deploy indexes สำหรับ phase นี้
