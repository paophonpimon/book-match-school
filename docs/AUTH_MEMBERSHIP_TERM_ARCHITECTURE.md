# Authentication, Membership, Terms and Reader Progress

## Authentication flow

`onAuthStateChanged` เป็นแหล่งสถานะบัญชีหลัก นักเรียนต้อง Google Sign-In และใช้ local persistence ไม่มี `signInAnonymously` หรือ Demo fallback

หลัง login:

1. โหลด `settings/currentTerm`
2. โหลด `terms/{termId}` และตรวจ `status == active`
3. โหลด profile, membership, readerStats, current-term state, catalog และ loans
4. ไม่มี profile → `/setup`
5. ไม่มี active term → maintenance message

Admin ใช้ Firebase app instance แยกเหมือนเดิม และ Rules ตรวจ verified email `paopornpimon@gmail.com`

## Membership transaction

การสมัครสร้างพร้อมกัน:

- `studentMembershipUids/{uid}` เป็น UID lock
- `studentMemberships/{studentId}` เป็น student ID lock และ status
- `profiles/{uid}` เป็นข้อมูลนักเรียน
- `progress/{termId_uid}` เป็น current-term progress

Rules ใช้ validation แบบทิศทางเดียว: profile ตรวจ membership, membership ตรวจ UID lock และ UID lock ไม่ย้อนกลับไปตรวจ profile จึงไม่เกิด circular `getAfter()`

## Term switching

Admin อ่าน active terms ก่อนแล้วใช้ `runTransaction`:

- ปิด active term เดิม
- เปิด selected draft term
- เขียน `settings/currentTerm`
- คงเอกสาร progress/userBooks/loans เดิมทั้งหมด

Rules ตรวจ `settings/currentTerm` → selected `terms/{termId}` แบบทิศทางเดียว

## Lifetime read credit

เมื่ออ่านจบครั้งแรก transaction เดิมเขียน:

- `userBooks`: `status=read`, review และ `lifetimeReadCredited=true`
- `progress`: current-term `readCount + 1`
- `bookStats`: `readCount`, rating totals
- `readerStats`: `lifetimeReadCount + 1`, calculated level, `lastCreditedUserBookId`

Rules ของ `readerStats` ตรวจ before/after ของ userBook ที่อ้างถึง การ retry หลัง commit พบ userBook ถูก credit แล้วจึงไม่เพิ่มซ้ำ

## Privacy and suspension

- นักเรียนอ่าน profile, membership, readerStats, userBooks และ loans ของตัวเอง
- progress leaderboard ยังคงอ่านตาม privacy design เดิม
- Admin อ่านสมาชิกและแก้เฉพาะ membership status
- suspended/graduated/transferred อ่านประวัติได้ แต่เขียนกิจกรรมหนังสือใหม่และสร้าง loan request ไม่ได้
- ไม่มี broad `allow write`, Cloud Functions, Admin SDK หรือ custom backend
