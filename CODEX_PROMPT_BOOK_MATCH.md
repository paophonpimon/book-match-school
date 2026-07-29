# คำสั่งสำหรับ Codex — สร้างโปรเจกต์ “ปัดหาเล่ม / Book Match”

ให้ทำงานเป็น Senior Full-stack Engineer และ UI/UX Designer สร้างเว็บแอปสำหรับโครงการนวัตกรรมห้องสมุดชื่อ **“ปัดหาเล่ม / Book Match”** ให้พร้อมใช้งานจริงในโรงเรียนและพร้อมนำเสนอประกวด โดยเน้นการใช้งานบน **มือถือและแท็บเล็ตเป็นหลัก**

> ให้อ่านคำสั่งทั้งหมดก่อนเริ่มทำงาน  
> อย่าหยุดแค่การวางแผน ให้ลงมือสร้าง แก้ไฟล์ รัน ทดสอบ และทำให้ build ผ่านจริง  
> ถ้ามี repository เดิม ให้ตรวจสอบโครงสร้างก่อนและปรับต่อโดยไม่ทำลายของเดิม  
> ถ้าโฟลเดอร์ว่าง ให้สร้างโปรเจกต์ใหม่ด้วย Vite + React + TypeScript

---

## 1. เป้าหมายของระบบ

สร้างเว็บช่วยนักเรียนค้นพบหนังสือที่เหมาะกับอารมณ์และความสนใจผ่านการ์ดแบบปัดคล้ายระบบจับคู่

แนวคิดหลัก:

- นักเรียนเลือกอารมณ์หรือสิ่งที่อยากอ่าน
- เลือกหมวดหนังสือ
- ปัดการ์ดหนังสือ
- ปัดขวาหรือกด “ชอบ” เพื่อบันทึก
- ปัดซ้ายหรือกด “ไม่ใช่” เพื่อข้าม
- มีปุ่มย้อนกลับการตัดสินใจล่าสุด
- เมื่อพบหนังสือที่ชอบ ให้ดูรายละเอียดและตำแหน่งชั้นหนังสือ
- นักเรียนเพิ่มหนังสือไว้ก่อน เริ่มอ่าน และยืนยันว่าอ่านจบ
- การอ่านจบต้องมีรีวิวสั้น ๆ
- มีอันดับนักอ่านประจำภาคเรียน
- มี Dashboard สำหรับครูหรือบรรณารักษ์ดูสถิติ

จำนวนผู้ใช้เป้าหมายประมาณ **100–150 คน** ไม่ต้องออกแบบระบบซับซ้อนระดับเชิงพาณิชย์

---

## 2. เทคโนโลยีที่ต้องใช้

ใช้ stack ต่อไปนี้:

- Vite
- React
- TypeScript
- React Router
- Firebase Authentication แบบ Anonymous
- Cloud Firestore
- Firebase Hosting
- Google Sheets เป็นแหล่งข้อมูลหนังสือ
- Google Apps Script เป็น JSON API
- Framer Motion หรือกลไกที่เหมาะสมสำหรับ swipe animation
- Lucide React หรือ icon library ที่น้ำหนักเบา
- Vitest สำหรับ unit tests

เลือกใช้ CSS Modules, Tailwind CSS หรือ CSS ปกติก็ได้ แต่ต้องจัดโครงสร้าง theme และ responsive อย่างเป็นระบบ

หลีกเลี่ยง:

- Next.js
- Cloudflare D1
- Backend ที่ซับซ้อน
- ระบบสมัครด้วยอีเมล
- OTP
- AI recommendation
- AI ตรวจรีวิว
- ระบบยืม–คืน
- ระบบรักษาความปลอดภัยซับซ้อน

---

## 3. ภาพอ้างอิง UI

มีภาพอ้างอิงหน้าตาเว็บแนบมาพร้อมคำสั่งนี้ ให้ใช้เป็นแนวทางด้าน:

- mood และบรรยากาศ
- โทนสี
- การจัดวางหน้าจอ
- การ์ดมุมโค้ง
- flow การใช้งาน
- bottom navigation
- การแสดงหน้าจอมือถือหลายขั้นตอน

**ห้ามคัดลอกภาพแบบ pixel-by-pixel** ให้สร้างดีไซน์ใหม่ที่มีเอกลักษณ์ แต่ได้อารมณ์ใกล้เคียงกัน

ถ้าทำงานผ่านโฟลเดอร์โปรเจกต์ ให้เก็บภาพอ้างอิงไว้ที่:

```text
docs/book-match-ui-reference.png
```

---

## 4. แนวทางภาพลักษณ์

ชื่อภาษาไทย: **ปัดหาเล่ม**  
ชื่อภาษาอังกฤษ: **Book Match**

โทนภาพรวม:

- อบอุ่น
- เป็นมิตร
- สะอาด
- ทันสมัย
- เหมาะกับโรงเรียน
- น่ารักแต่ไม่เด็กเกินไป
- ดูดีพอสำหรับงานประกวดนวัตกรรม

สีหลัก:

- พื้นหลังครีมอ่อน
- สี coral / salmon / ส้มอมแดงเป็น primary
- สีน้ำตาลเข้มสำหรับตัวอักษร
- สี peach อ่อนสำหรับพื้นการ์ด
- ใช้สีเขียวอ่อน เหลืองอ่อน และฟ้าอ่อนเป็นสีรอง
- หลีกเลี่ยงสีสดรุนแรงและ gradient หนัก

องค์ประกอบ:

- การ์ดมุมโค้ง 18–24px
- เส้นขอบบาง
- เงาเบา
- ปุ่มทรง pill
- ไอคอนแนวหนังสือ ดอกไม้ ดาว ถ้วยรางวัล และอารมณ์
- ลายตกแต่งดอกไม้หรือใบไม้เล็กน้อยตามมุม
- พื้นหลังไม่รก
- รูปปกหนังสือต้องเด่นที่สุดในหน้าปัด

Typography:

- รองรับภาษาไทยสวยและอ่านง่าย
- ใช้ `Noto Sans Thai`, `Prompt`, `Sarabun` หรือ fallback ที่เหมาะสม
- หัวข้อชัด
- เนื้อหาอ่านง่าย
- ไม่ใช้ตัวอักษรเล็กเกินไป

---

## 5. Mobile-first และ Tablet-first

ออกแบบจากมือถือก่อน แล้วขยายสู่แท็บเล็ต

ต้องรองรับอย่างน้อย:

- Mobile 360–430px
- Tablet portrait 768–900px
- Tablet landscape 1024–1366px
- Desktop สำหรับ Dashboard

ข้อกำหนด:

- ปุ่มสัมผัสอย่างน้อย 44px
- มี safe-area สำหรับ iPhone/iPad
- Bottom Navigation ติดด้านล่างบนมือถือ
- บนแท็บเล็ตสามารถขยาย content area และแสดงข้อมูลเพิ่มได้
- ห้ามเพียงขยายหน้ามือถือให้ใหญ่ขึ้นแบบโล่ง ๆ
- หน้าปัดหนังสือบนแท็บเล็ตควรมีการ์ดใหญ่ตรงกลาง และสามารถมีแถบข้อมูลหรือ preview ด้านข้าง
- หน้า Dashboard ต้องเหมาะกับจอคอมพิวเตอร์และโปรเจกเตอร์
- การหมุนจอ portrait/landscape ต้องไม่พัง
- ไม่มี horizontal scroll โดยไม่จำเป็น

---

## 6. User Flow หลัก

Flow หลัก:

1. ตั้งค่าโปรไฟล์
2. เลือกอารมณ์การอ่าน
3. เลือกหมวดหนังสือ
4. ปัดหนังสือ
5. พบหนังสือที่ใช่
6. เพิ่มเข้าชั้นหนังสือของฉัน
7. เริ่มอ่าน
8. ยืนยันว่าอ่านจบ
9. เขียนรีวิวสั้น
10. ถูกนับในอันดับนักอ่าน

บนมือถือให้ใช้ progress indicator แบบกะทัดรัด  
บนแท็บเล็ตหรือ desktop สามารถแสดง step flow ด้านบนได้

---

## 7. หน้าจอฝั่งนักเรียน

### 7.1 Welcome / Onboarding

แสดง:

- โลโก้หรือไอคอนหนังสือ
- ชื่อ “ปัดหาเล่ม”
- คำโปรย “หนังสือที่ใช่ สำหรับอารมณ์ของคุณ”
- ปุ่ม “เริ่มต้น”

### 7.2 Profile Setup

กรอก:

- ชื่อแสดงผล
- ชั้นเรียน
- เลขที่หรือรหัสนักเรียน

ใช้ Firebase Anonymous Auth อยู่เบื้องหลัง  
จดจำผู้ใช้เดิมในอุปกรณ์เดิม

### 7.3 Mood Selection

หัวข้อ:

> วันนี้อยากอ่านแบบไหน?

ตัวเลือกตัวอย่าง:

- อยากลุ้น
- อยากขำ
- อยากได้ความรู้
- อ่านสั้น ๆ
- อยากได้แรงบันดาลใจ
- อยากผ่อนคลาย

ใช้การ์ดอารมณ์ 2 คอลัมน์บนมือถือ และ 3–4 คอลัมน์บนแท็บเล็ต  
ผู้ใช้เลือกได้ 1 อารมณ์ต่อรอบ

### 7.4 Category Selection

หัวข้อ:

> อยากอ่านหมวดไหน?

เลือกได้หลายหมวด เช่น:

- นิยาย
- เรื่องสั้น
- สืบสวน
- แฟนตาซี
- วิทยาศาสตร์
- เทคโนโลยี
- ประวัติศาสตร์
- ชีวประวัติ
- จิตวิทยา
- พัฒนาตนเอง
- ภาษาและวรรณกรรม
- การ์ตูนความรู้

มีตัวเลือก “ไม่จำกัดหมวด”

### 7.5 Discover / Swipe Books

หน้าหลักต้องให้ความรู้สึกเหมือนกำลังเลือกหนังสือทีละเล่ม

แสดง:

- รูปปกขนาดใหญ่
- ชื่อหนังสือ
- ผู้แต่ง
- หมวด
- คำโปรยสั้น
- ลำดับ เช่น 12 / 25
- badge ที่เกี่ยวข้องกับอารมณ์หรือหมวด

ปุ่มด้านล่าง:

- ย้อนการปัด
- ไม่ใช่
- เซอร์ไพรส์
- ชอบ
- เก็บไว้ก่อน

การทำงาน:

- รองรับ drag/swipe จริง
- ปัดซ้าย = ไม่สนใจ
- ปัดขวา = ชอบ
- ปัดขึ้นหรือปุ่ม = เก็บไว้ก่อน
- ปุ่มย้อนกลับคืนค่าการตัดสินใจล่าสุด
- มี animation ลื่นแต่ไม่หนัก
- preload หนังสือถัดไป 2–3 ใบ
- เมื่อ URL ปกเสีย ให้แสดง placeholder ที่สวยงาม
- ต้องใช้งานได้ด้วยปุ่มโดยไม่จำเป็นต้องลาก

### 7.6 Match / Book Detail

เมื่อกดชอบ ให้แสดงหน้าหรือ modal:

- “เจอเล่มที่ใช่แล้ว!”
- รูปปก
- ชื่อหนังสือ
- ผู้แต่ง
- หมวด
- คำอธิบาย
- ตำแหน่งชั้นหนังสือ
- ปุ่ม “พาไปหาเล่มนี้”
- ปุ่ม “ดูรายละเอียด”
- ปุ่ม “เก็บไว้ก่อน”
- ปุ่ม “ปัดต่อไป”

ไม่ต้องใช้แผนที่จริง  
ปุ่ม “พาไปหาเล่มนี้” ให้แสดง shelf code และคำแนะนำตำแหน่ง

### 7.7 My Shelf

Bottom Navigation ชื่อ “หนังสือของฉัน”

แบ่งเป็น 3 แท็บ:

- สนใจ
- กำลังอ่าน
- อ่านแล้ว

แต่ละรายการมี:

- ปก
- ชื่อหนังสือ
- สถานะ
- วันที่อัปเดต
- ปุ่มดำเนินการต่อ

### 7.8 Reading Confirmation

เมื่อนักเรียนกด “อ่านจบแล้ว” ให้เปิดหน้ากรอกรีวิว

ข้อมูล:

- ให้ดาว 1–5
- เลือกความรู้สึกหลังอ่าน
- เขียนรีวิวสั้นอย่างน้อย 20 ตัวอักษร
- ความยาวสูงสุด 300 ตัวอักษร
- เลือกสิ่งที่ชอบ เช่น เนื้อเรื่อง ตัวละคร ความรู้ ภาพประกอบ ภาษา

ปุ่มหลัก:

> ส่งรีวิวและยืนยันการอ่าน

### 7.9 Leaderboard

แสดง:

- Top 3 แบบ podium
- อันดับถัดไปแบบ list
- ชื่อ
- ชั้น
- จำนวนเล่มที่อ่าน
- อันดับของผู้ใช้ปัจจุบัน
- สลับดู “อันดับรวม” และ “อันดับในห้อง”

กติกา:

- หนังสือ 1 เล่มนับ 1 ครั้งต่อคนต่อภาคเรียน
- ต้องมีรีวิวจึงนับ
- การกดชอบหรือเก็บไว้ก่อนไม่นับ
- หากจำนวนเท่ากัน ให้เรียงจากผู้ที่ยืนยันการอ่านก่อน

### 7.10 Profile

แสดง:

- ชื่อและชั้น
- จำนวนหนังสือที่สนใจ
- จำนวนกำลังอ่าน
- จำนวนอ่านจบ
- badge หรือ milestone แบบง่าย
- แก้ไขหมวดที่สนใจ
- ปุ่มออกจากโปรไฟล์บนอุปกรณ์นี้

---

## 8. Bottom Navigation

ใช้ 5 เมนู:

1. หน้าหลัก
2. ค้นหา
3. หนังสือของฉัน
4. อันดับนักอ่าน
5. โปรไฟล์

ข้อกำหนด:

- sticky bottom navigation
- แสดง icon + label
- active state ชัด
- รองรับ safe area
- ไม่บังเนื้อหา
- บนแท็บเล็ตแนวนอนสามารถเปลี่ยนเป็น side navigation ได้ถ้าเหมาะสม

---

## 9. Dashboard บรรณารักษ์

สร้าง route เช่น `/admin`

ใช้ PIN แบบง่ายเพื่อกันการเข้าถึงโดยไม่ได้ตั้งใจ  
ไม่ต้องอ้างว่าเป็นระบบรักษาความปลอดภัยจริง

Dashboard ต้องมี:

### Overview Cards

- ผู้ใช้ทั้งหมด
- หนังสือที่ถูกกดชอบ
- หนังสือที่กำลังอ่าน
- หนังสือที่อ่านจบ
- จำนวนรีวิว
- ค่าเฉลี่ยจำนวนเล่มต่อคน

### Charts

- หนังสือที่ถูกกดชอบมากที่สุด
- หนังสือที่อ่านจบมากที่สุด
- หมวดหนังสือยอดนิยม
- จำนวนการอ่านแยกตามชั้น
- แนวโน้มรายสัปดาห์

### Tables

- อันดับนักอ่าน
- รีวิวล่าสุด
- รายชื่อผู้ใช้
- บัญชีที่ถูกตัดออกจากอันดับ

### Actions

- เปิด/ปิด leaderboard
- ตั้งค่า term ปัจจุบัน
- ตัดผู้ใช้จากอันดับด้วย `eligible = false`
- export CSV
- refresh ข้อมูล

Dashboard ต้อง responsive แต่ desktop/tablet เป็นเป้าหมายหลัก

---

## 10. Google Sheets

สร้าง Google Apps Script API และตัวอย่างชีต

### Sheet: `BOOKS`

คอลัมน์:

```text
book_id
title
author
category_id
mood_tags
description
cover_url
audio_url
shelf_code
shelf_description
featured
active
display_order
```

### Sheet: `CATEGORIES`

```text
category_id
category_name
icon
active
display_order
```

### Sheet: `SETTINGS`

```text
key
value
```

ค่าตัวอย่าง:

```text
school_name
project_name
term_id
term_name
logo_url
announcement
review_min_chars
leaderboard_enabled
admin_pin
```

ข้อกำหนด Apps Script:

- ส่ง JSON ที่มี `books`, `categories`, `settings`
- จัดการ CORS เท่าที่ Apps Script รองรับ
- ignore แถวว่าง
- แปลง TRUE/FALSE ให้ถูกต้อง
- มี error response ที่อ่านง่าย
- ใส่คำแนะนำ deploy ใน README
- ฝั่งเว็บ cache ข้อมูล 10–15 นาที

---

## 11. Firestore Data Model

### `profiles/{uid}`

```ts
{
  uid: string
  displayName: string
  className: string
  studentNumber: string
  interests: string[]
  createdAt: Timestamp
  lastActiveAt: Timestamp
}
```

### `progress/{termId_uid}`

```ts
{
  uid: string
  termId: string
  displayName: string
  className: string
  readCount: number
  likedCount: number
  eligible: boolean
  lastReadAt: Timestamp | null
  updatedAt: Timestamp
}
```

### `userBooks/{termId_uid_bookId}`

```ts
{
  uid: string
  termId: string
  bookId: string
  status: "liked" | "saved" | "reading" | "read" | "skipped"
  rating: number | null
  review: string | null
  moodAfterReading: string | null
  favoriteAspect: string | null
  likedAt: Timestamp | null
  startedAt: Timestamp | null
  readAt: Timestamp | null
  updatedAt: Timestamp
}
```

### `bookStats/{termId_bookId}`

```ts
{
  termId: string
  bookId: string
  likeCount: number
  saveCount: number
  readingCount: number
  readCount: number
  ratingTotal: number
  ratingCount: number
  updatedAt: Timestamp
}
```

ใช้ Firestore Transaction เมื่อนับการอ่านจบ เพื่อป้องกันการเพิ่มซ้ำจากการกดหลายครั้ง

---

## 12. การจัดอันดับหนังสือสำหรับการปัด

ไม่ต้องใช้ AI

ลำดับแนะนำ:

1. featured books
2. หนังสือที่ตรงกับ mood
3. หนังสือที่ตรงกับหมวดที่เลือก
4. หนังสือยอดนิยม
5. หนังสือหมวดอื่นแบบสุ่ม
6. ตัดหนังสือที่ปิดใช้งานออก
7. หลีกเลี่ยงหนังสือที่ผู้ใช้เคยปัดในรอบนั้น

ต้องใช้ deterministic shuffle ต่อ session เพื่อไม่ให้รายการเด้งไปมาเมื่อ re-render

---

## 13. State และการคงข้อมูล

- Refresh แล้วหน้าไม่พัง
- Anonymous Auth ต้องถูก restore
- Profile ถูกโหลดกลับ
- หนังสือที่ชอบและกำลังอ่านไม่หาย
- การปัดล่าสุดเก็บใน local state/localStorage เพื่อรองรับย้อนกลับ
- ถ้า Firebase ช้า ให้มี loading skeleton
- ถ้า API Google Sheets ล่ม ให้แสดง retry state ที่สุภาพ
- ถ้าข้อมูลหนังสือว่าง ให้แสดง empty state ที่สวยและมีคำแนะนำ

---

## 14. Accessibility และ UX

- contrast อ่านง่าย
- keyboard focus ชัด
- ปุ่มมี aria-label
- รูปมี alt text
- swipe ต้องมีปุ่มสำรอง
- animation เคารพ `prefers-reduced-motion`
- form มี validation ที่ชัด
- error message ใช้ภาษาไทย
- loading state ไม่กระพริบ
- mobile keyboard ไม่บังช่องกรอก
- scroll position ต้องเหมาะสมเมื่อเปลี่ยนหน้า

---

## 15. Security ขั้นต่ำ

ไม่ต้องทำระบบซับซ้อน แต่ต้องไม่ปล่อย Firestore แบบเปิดทั้งหมด

ทำขั้นต่ำ:

- Anonymous Auth
- ผู้ใช้แก้ไข profile ของตัวเอง
- ผู้ใช้แก้ไข userBooks ของตัวเอง
- จำกัดรูปแบบข้อมูลพื้นฐาน
- Dashboard PIN เป็นเพียง UI guard
- ไม่เก็บอีเมล เบอร์โทร หรือข้อมูลละเอียด
- รีวิวจำกัด 300 ตัวอักษร
- หนังสือเล่มเดิมนับอ่านจบได้ครั้งเดียวต่อ term
- ใส่คำเตือนใน README ว่า admin PIN ฝั่ง client ไม่ใช่การรักษาความปลอดภัยจริง

สร้าง `firestore.rules` ที่ใช้งานได้กับ prototype นี้

---

## 16. โครงสร้างโปรเจกต์ที่ต้องการ

ตัวอย่าง:

```text
book-match/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ features/
│  │  ├─ auth/
│  │  ├─ onboarding/
│  │  ├─ discovery/
│  │  ├─ shelf/
│  │  ├─ review/
│  │  ├─ leaderboard/
│  │  └─ admin/
│  ├─ hooks/
│  ├─ services/
│  ├─ types/
│  ├─ utils/
│  ├─ styles/
│  └─ tests/
├─ public/
├─ apps-script/
│  └─ Code.gs
├─ docs/
│  └─ book-match-ui-reference.png
├─ firestore.rules
├─ firebase.json
├─ .env.example
├─ README.md
├─ SETUP.md
└─ HANDOFF.md
```

ไม่จำเป็นต้องตรงทุกโฟลเดอร์ แต่ต้องแยกความรับผิดชอบชัดเจน  
ห้ามเขียนทุกอย่างไว้ใน component เดียว

---

## 17. Environment Variables

สร้าง `.env.example`

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_BOOKS_API_URL=
VITE_ADMIN_PIN=
```

ต้องมี validation หาก env สำคัญหาย

---

## 18. Sample Data และ Demo Mode

ทำ sample data อย่างน้อย:

- 12–20 หนังสือ
- 8–12 หมวด
- mood tags
- shelf codes
- ผู้ใช้ตัวอย่างสำหรับ leaderboard

ถ้ายังไม่มี Firebase config ให้เว็บเปิดใน Demo Mode ได้ เพื่อดู UI และ flow ครบโดยไม่ crash

Demo Mode ต้องระบุชัดว่าเป็นข้อมูลตัวอย่าง  
เมื่อมี Firebase config ให้เปลี่ยนไปใช้ข้อมูลจริงอัตโนมัติ

---

## 19. Testing

เขียน tests สำหรับอย่างน้อย:

- การจัดลำดับหนังสือ
- deterministic shuffle
- validation รีวิว
- หนังสือเล่มเดิมนับได้ครั้งเดียว
- leaderboard sorting
- fallback เมื่อ cover URL เสีย
- state transition liked → reading → read

รัน:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

แก้จนทุกคำสั่งผ่านจริง

---

## 20. Acceptance Criteria

งานถือว่าเสร็จเมื่อ:

- เปิดเว็บได้
- ใช้งานบนมือถือและแท็บเล็ตได้ดี
- UI ใกล้เคียง mood ของภาพอ้างอิง
- มี onboarding
- มี mood selection
- มี category selection
- มี swipe cards
- ปุ่มย้อนกลับใช้งานได้
- มี match/detail
- มีชั้นหนังสือของฉัน
- มี reading confirmation
- มีรีวิวสั้น
- มี leaderboard
- มี profile
- มี admin dashboard
- เชื่อม Google Sheets API ได้
- เชื่อม Firebase ได้
- มี Demo Mode
- refresh แล้วข้อมูลไม่หาย
- lint, typecheck, tests และ build ผ่าน
- มี README และ SETUP ที่คนอื่นทำตามได้

---

## 21. ลำดับการทำงาน

ให้ทำตามลำดับ:

1. ตรวจ repository
2. สรุปโครงสร้างเดิมสั้น ๆ
3. วาง implementation plan
4. สร้าง theme และ responsive layout
5. สร้าง sample data และ Demo Mode
6. สร้าง student flow ครบ
7. สร้าง Firebase services
8. สร้าง Google Apps Script
9. สร้าง Dashboard
10. เขียน Firestore rules
11. เขียน tests
12. รัน lint/typecheck/test/build
13. แก้ข้อผิดพลาดทั้งหมด
14. สรุปไฟล์ที่สร้างและวิธีเปิดใช้งาน

อย่าหยุดเพื่อถามรายละเอียดเล็กน้อย ให้ใช้ข้อกำหนดในเอกสารนี้เป็นค่าตัดสินใจหลัก  
ถ้ามีจุดที่ยังไม่กำหนด ให้เลือกวิธีที่เรียบง่าย ใช้งานจริงได้ และเหมาะกับโครงการประกวดในโรงเรียน
