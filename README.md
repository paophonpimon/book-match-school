# Book Match: เล่มที่ใช่

ระบบแนะนำหนังสือและยืม–คืนสำหรับห้องสมุดโรงเรียน พัฒนาด้วย Vite, React, TypeScript, Firebase Authentication และ Cloud Firestore

## ความสามารถหลัก

- นักเรียนเข้าสู่ระบบด้วย Google และต้องใช้บัญชีเดิมเพื่อรักษาประวัติ
- สมาชิกถาวรผูก `studentId` กับ Firebase UID แบบหนึ่งต่อหนึ่ง
- ปัดค้นหาหนังสือ, liked / saved / reading / read และรีวิว
- รายการหนังสือจริงจาก `books` ใน Firestore พร้อม cache ของ Firebase Web SDK
- ระบบขอยืม–อนุมัติ–รับหนังสือ–ต่ออายุ–คืน พร้อม lock และ audit log
- อันดับนักอ่านแยกตามภาคเรียน
- ระดับนักอ่านถาวรจากจำนวนหนังสือที่อ่านจบสะสม
- Admin จัดการหนังสือ สมาชิกนักเรียน ภาคเรียน และการยืม–คืน

ระบบนักเรียนไม่ใช้ Anonymous Authentication, Demo Mode, Cloud Functions หรือ custom backend แล้ว Apps Script เดิมยังคงเก็บไว้เป็น rollback และไม่ได้ถูกแก้ไขในงานรอบนี้

## โครงสร้างข้อมูลสำคัญ

- `profiles/{uid}` — โปรไฟล์นักเรียน
- `studentMemberships/{studentId}` — เจ้าของเลขประจำตัวและสถานะสมาชิก
- `studentMembershipUids/{uid}` — lock ป้องกัน UID เดียวสมัครหลายเลขประจำตัว
- `terms/{termId}` — ภาคเรียน
- `settings/currentTerm` — ภาคเรียนปัจจุบัน
- `progress/{termId_uid}` — สถิติและ leaderboard ของเทอม
- `userBooks/{termId_uid_bookId}` — สถานะ/รีวิวของหนังสือในเทอม
- `readerStats/{uid}` — จำนวนอ่านสะสมและเลเวลถาวร
- `bookStats/{termId_bookId}` — สถิติหนังสือในเทอม
- `books/{bookId}` — catalog
- `loans`, `studentLoanActiveKeys`, `bookLoanLocks`, `loanAuditLogs` — ระบบยืม–คืน

รายละเอียด schema และ security boundary อยู่ใน [docs/AUTH_MEMBERSHIP_TERM_ARCHITECTURE.md](docs/AUTH_MEMBERSHIP_TERM_ARCHITECTURE.md)

## เริ่มต้นพัฒนา

```powershell
cd "C:\Users\jiras\Documents\Book Match"
npm install
npm run dev
```

ตรวจคุณภาพ:

```powershell
npm run lint
npm run typecheck
npm test -- --run
npm run build
firebase deploy --only firestore:rules --dry-run --project book-match-school
```

ดูการตั้งค่า Firebase และการสร้างภาคเรียนแรกใน [SETUP.md](SETUP.md)

## สถานะ deployment

โค้ด phase Google Sign-In / Membership / Terms / Reader Level ชุดนี้ยังเป็น local เท่านั้น ยังไม่ได้ deploy Hosting, Rules หรือ Indexes ตามข้อกำหนด
