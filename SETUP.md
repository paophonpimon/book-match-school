# SETUP — Book Match

## 1. Environment

สร้าง `.env.local` และ `.env.production` โดยคง Firebase config จริง:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=book-match-school.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=book-match-school
VITE_FIREBASE_STORAGE_BUCKET=book-match-school.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_CATALOG_SOURCE=firestore
VITE_ADMIN_PIN=2468
```

`VITE_BOOKS_API_URL` ไม่ถูกใช้เมื่อ `VITE_CATALOG_SOURCE=firestore` และห้ามลบ Apps Script `/exec` เดิมระหว่างช่วง rollback

## 2. Firebase Authentication

ใน Firebase Console:

1. Authentication → Sign-in method → เปิด Google provider
2. ปิดการพึ่งพา Anonymous สำหรับ student flow (ไม่จำเป็นต้องลบ provider ก่อนตรวจ Production)
3. Authorized domains ต้องมี:
   - `book-match-school.web.app`
   - `book-match-school.firebaseapp.com`
   - `localhost` สำหรับ local test
4. Admin ยังคงอนุญาตเฉพาะ `paopornpimon@gmail.com` ที่ `email_verified == true`

นักเรียนใหม่ต้องเข้าสู่ระบบ Google ก่อน จากนั้นกรอกโปรไฟล์ ระบบจะสร้าง `studentMembershipUids`, `studentMemberships`, `profiles` และ `progress` ใน transaction เดียวกัน

## 3. ภาคเรียนแรก

หลัง Rules ใหม่ถูก deploy แล้ว:

1. เปิด `/admin`
2. เข้าด้วย `paopornpimon@gmail.com`
3. เลือกเมนู “จัดการภาคเรียน”
4. สร้างรหัสเช่น `2569-1`
5. กด “ตั้งเป็นภาคเรียนปัจจุบัน” และยืนยัน

ระบบจะเขียน `terms/{termId}` และ `settings/currentTerm` นักเรียนจะเห็นหน้าปิดปรับปรุงหากยังไม่มี active term โดยระบบจะไม่สร้าง term สมมติเอง

## 4. Membership statuses

- `active` — ใช้งานและสร้างกิจกรรมใหม่ได้
- `suspended` — เข้าดูประวัติได้ แต่ขอยืม/บันทึกการอ่านใหม่ไม่ได้
- `graduated` — เก็บประวัติไว้ ไม่สร้างกิจกรรมใหม่
- `transferred` — เก็บประวัติไว้ ไม่สร้างกิจกรรมใหม่

Admin เปลี่ยนได้เฉพาะ status ห้ามเปลี่ยน `uid`, `studentId`, email หรือ createdAt

## 5. Reader level และ rank

เลเวลถาวรจาก `readerStats.lifetimeReadCount`:

- Level 1: 0–1
- Level 2: 2–4
- Level 3: 5–8
- Level 4: 9–13
- Level 5: 14–19
- Level 6: 20+

แรงก์ประจำเทอมจาก `progress.readCount`:

- Bronze 0–1, Silver 2–4, Gold 5–7
- Platinum 8–11, Diamond 12–17, Master Reader 18+

`readerStats` เพิ่มพร้อม transaction อ่านจบและ `lifetimeReadCredited` ทำให้ retry/refresh ไม่เพิ่มซ้ำ

## 6. Local verification

บน Windows PowerShell ที่บล็อก `npm.ps1` ให้ใช้ `npm.cmd`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
firebase.cmd deploy --only firestore:rules --dry-run --project book-match-school
```

ไม่มี Firebase Emulator Rules tests เพราะเครื่องนี้ยังไม่มี Java และโปรเจกต์ไม่มี emulator test harness เดิม; ใช้ Rules compiler dry-run โดยไม่ deploy

## 7. Deployment เมื่อได้รับอนุมัติเท่านั้น

```powershell
firebase use book-match-school
firebase deploy --only firestore:rules
npm run build
firebase deploy --only hosting
```

`firestore.indexes.json` ไม่มี index ใหม่จาก phase นี้ จึงไม่ต้อง deploy indexes เว้นแต่ query จริงแจ้ง missing index ภายหลัง
