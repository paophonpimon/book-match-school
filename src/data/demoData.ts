import type { Book, Category, Reader, Settings } from '../types'

export const moods = [
  { id: 'thrill', label: 'อยากลุ้น', icon: '🕵️', tone: 'coral', description: 'ตื่นเต้น ชวนติดตาม' },
  { id: 'laugh', label: 'อยากขำ', icon: '😄', tone: 'yellow', description: 'เบาสมอง อารมณ์ดี' },
  { id: 'learn', label: 'อยากได้ความรู้', icon: '🤓', tone: 'green', description: 'เปิดโลกใหม่ให้ตัวเอง' },
  { id: 'short', label: 'อ่านสั้น ๆ', icon: '📖', tone: 'blue', description: 'จบไวในเวลาว่าง' },
  { id: 'inspire', label: 'หาแรงบันดาลใจ', icon: '✨', tone: 'lavender', description: 'เติมพลังให้วันใหม่' },
  { id: 'relax', label: 'อยากผ่อนคลาย', icon: '🌿', tone: 'mint', description: 'ค่อย ๆ อ่าน สบายใจ' },
] as const

export const demoCategories: Category[] = [
  ['fiction', 'นิยาย', '📚'], ['short-story', 'เรื่องสั้น', '📄'], ['mystery', 'สืบสวน', '🔎'],
  ['fantasy', 'แฟนตาซี', '🪄'], ['science', 'วิทยาศาสตร์', '🧪'], ['technology', 'เทคโนโลยี', '💻'],
  ['history', 'ประวัติศาสตร์', '🏛️'], ['biography', 'ชีวประวัติ', '🧑‍🏫'], ['psychology', 'จิตวิทยา', '🧠'],
  ['self-growth', 'พัฒนาตนเอง', '🌱'], ['literature', 'ภาษาและวรรณกรรม', '✒️'], ['knowledge-comic', 'การ์ตูนความรู้', '💬'],
].map(([id, name, icon], index) => ({ id, name, icon, active: true, displayOrder: index + 1 }))

const covers = {
  wonder: 'https://covers.openlibrary.org/b/isbn/9780375869020-L.jpg',
  hobbit: 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg',
  prince: 'https://covers.openlibrary.org/b/isbn/9780156012195-L.jpg',
  hole: 'https://covers.openlibrary.org/b/isbn/9780440414803-L.jpg',
  matilda: 'https://covers.openlibrary.org/b/isbn/9780142410370-L.jpg',
  coraline: 'https://covers.openlibrary.org/b/isbn/9780380807345-L.jpg',
  brief: 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg',
  anne: 'https://covers.openlibrary.org/b/isbn/9780553213133-L.jpg',
}

export const demoBooks: Book[] = [
  ['wonder', 'มหัศจรรย์ของออกัสต์', 'อาร์. เจ. ปาลาซิโอ', 'fiction', ['inspire', 'relax'], 'เรื่องราวอบอุ่นของเด็กชายผู้ชวนทุกคนมองความต่างด้วยหัวใจ', covers.wonder, 'FIC A-12', 'ชั้นนิยายเยาวชน แถว A ช่องที่ 12', true, 96, '#e8896e'],
  ['midnight-library', 'ห้องสมุดเที่ยงคืน', 'แมตต์ เฮก', 'fiction', ['inspire', 'relax'], 'ถ้ามีโอกาสลองใช้ชีวิตอีกแบบ เราจะเลือกอะไร และอะไรคือชีวิตที่มีความหมาย', 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg', 'FIC B-04', 'ชั้นนิยายแปล แถว B ช่องที่ 4', true, 92, '#6f8d86'],
  ['hobbit', 'ฮอบบิท', 'เจ. อาร์. อาร์. โทลคีน', 'fantasy', ['thrill', 'inspire'], 'การผจญภัยครั้งใหญ่ของฮอบบิทตัวเล็ก มังกร และขุมทรัพย์ที่รออยู่', covers.hobbit, 'FAN C-07', 'ชั้นแฟนตาซี แถว C ช่องที่ 7', true, 91, '#b8834c'],
  ['little-prince', 'เจ้าชายน้อย', 'อองตวน เดอ แซ็งเต็กซูเปรี', 'literature', ['short', 'inspire'], 'นิทานปรัชญาที่ชวนมองความรัก มิตรภาพ และสิ่งสำคัญที่มองไม่เห็นด้วยตา', covers.prince, 'LIT A-02', 'ชั้นวรรณกรรมคลาสสิก แถว A ช่องที่ 2', true, 98, '#e4a347'],
  ['holes', 'หลุม', 'หลุยส์ ซาชาร์', 'mystery', ['thrill', 'laugh'], 'เด็กชายโชคร้ายถูกส่งไปขุดหลุมกลางทะเลทราย และพบความลับที่เชื่อมโยงอดีต', covers.hole, 'MYS B-09', 'ชั้นสืบสวนเยาวชน แถว B ช่องที่ 9', false, 84, '#b76c50'],
  ['matilda', 'มาทิลดา', 'โรอัลด์ ดาห์ล', 'fiction', ['laugh', 'inspire'], 'เด็กหญิงรักหนังสือผู้มีพลังพิเศษ รับมือผู้ใหญ่จอมเผด็จการด้วยไหวพริบ', covers.matilda, 'FIC A-06', 'ชั้นนิยายเยาวชน แถว A ช่องที่ 6', false, 89, '#76a99b'],
  ['coraline', 'คอรัลไลน์', 'นีล เกแมน', 'fantasy', ['thrill', 'short'], 'ประตูลึกลับพาเด็กหญิงสู่บ้านอีกหลังที่ดูสมบูรณ์แบบ แต่ซ่อนอันตรายไว้', covers.coraline, 'FAN C-11', 'ชั้นแฟนตาซี แถว C ช่องที่ 11', false, 86, '#526879'],
  ['time-science', 'ประวัติย่อของกาลเวลา', 'สตีเฟน ฮอว์กิง', 'science', ['learn', 'inspire'], 'สำรวจจักรวาล หลุมดำ และคำถามใหญ่เรื่องเวลา ด้วยภาษาที่ชวนคิดตาม', covers.brief, 'SCI D-03', 'ชั้นวิทยาศาสตร์ แถว D ช่องที่ 3', true, 88, '#3f6780'],
  ['anne', 'แอนน์แห่งกรีนเกเบิลส์', 'แอล. เอ็ม. มอนต์โกเมอรี', 'literature', ['relax', 'laugh'], 'เด็กหญิงช่างฝันเปลี่ยนบ้านไร่เงียบสงบให้เต็มไปด้วยสีสันและความผูกพัน', covers.anne, 'LIT A-08', 'ชั้นวรรณกรรมคลาสสิก แถว A ช่องที่ 8', false, 80, '#8b7659'],
  ['mindset', 'พลังแห่งกรอบความคิด', 'แครอล ดเว็ค', 'psychology', ['learn', 'inspire'], 'เข้าใจว่าความคิดแบบเติบโตช่วยให้เราเรียนรู้จากความผิดพลาดได้อย่างไร', 'https://covers.openlibrary.org/b/isbn/9780345472328-L.jpg', 'PSY E-05', 'ชั้นจิตวิทยา แถว E ช่องที่ 5', true, 94, '#b27864'],
  ['atomic-habits', 'เพราะชีวิตดีได้กว่าที่เป็น', 'เจมส์ เคลียร์', 'self-growth', ['learn', 'inspire'], 'เปลี่ยนนิสัยเล็ก ๆ ให้กลายเป็นผลลัพธ์ยิ่งใหญ่ ด้วยวิธีที่ทำตามได้จริง', 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', 'DEV E-01', 'ชั้นพัฒนาตนเอง แถว E ช่องที่ 1', true, 99, '#d9ae70'],
  ['code', 'ถอดรหัสโลกดิจิทัล', 'ชาร์ลส์ เพตโซลด์', 'technology', ['learn'], 'เรื่องเล่าของรหัส วงจร และคอมพิวเตอร์ที่ทำให้เทคโนโลยีใกล้ตัวขึ้น', 'https://covers.openlibrary.org/b/isbn/9780735611313-L.jpg', 'TEC D-08', 'ชั้นเทคโนโลยี แถว D ช่องที่ 8', false, 76, '#527b8e'],
  ['sapiens', 'เซเปียนส์ ฉบับเยาวชน', 'ยูวัล โนอาห์ แฮรารี', 'history', ['learn', 'short'], 'เดินทางผ่านประวัติศาสตร์มนุษย์ด้วยภาพและเรื่องเล่าที่เข้าใจง่าย', 'https://covers.openlibrary.org/b/isbn/9780063212232-L.jpg', 'HIS F-04', 'ชั้นประวัติศาสตร์ แถว F ช่องที่ 4', false, 87, '#d58362'],
  ['curie', 'มารี กูรี ผู้ไม่ยอมแพ้', 'มาเรีย อิซาเบล ซานเชซ', 'biography', ['inspire', 'learn'], 'ชีวประวัตินักวิทยาศาสตร์หญิงผู้เปลี่ยนโลกด้วยความอยากรู้และความพยายาม', 'https://covers.openlibrary.org/b/isbn/9781786032515-L.jpg', 'BIO F-02', 'ชั้นชีวประวัติ แถว F ช่องที่ 2', false, 78, '#82969d'],
  ['science-comic', 'วิทยาศาสตร์ฉบับการ์ตูน', 'ทีมบ้านนักวิทย์', 'knowledge-comic', ['laugh', 'learn', 'short'], 'ทดลองสนุก ตอบคำถามรอบตัว และเข้าใจวิทยาศาสตร์ผ่านภาพการ์ตูน', '', 'COM G-10', 'ชั้นการ์ตูนความรู้ แถว G ช่องที่ 10', false, 82, '#77a887'],
  ['tiny-tales', 'เรื่องเล่าก่อนพักเที่ยง', 'รวมเรื่องสั้นนักเขียนไทย', 'short-story', ['short', 'relax'], 'สิบสองเรื่องสั้น อ่านจบได้ในเวลาพัก และทิ้งคำถามเล็ก ๆ ไว้ในใจ', 'https://covers.openlibrary.org/b/id/10521270-L.jpg', 'STO B-12', 'ชั้นเรื่องสั้น แถว B ช่องที่ 12', false, 72, '#c88f8a'],
].map(([id, title, author, categoryId, moodTags, description, coverUrl, shelfCode, shelfDescription, featured, popularity, accent], index) => ({
  id: String(id), title: String(title), author: String(author), categoryId: String(categoryId), moodTags: moodTags as string[],
  description: String(description), coverUrl: String(coverUrl), shelfCode: String(shelfCode), shelfDescription: String(shelfDescription),
  featured: Boolean(featured), active: true, displayOrder: index + 1, popularity: Number(popularity), accent: String(accent),
}))

export const demoReaders: Reader[] = [
  ['r1', 'พิมพ์', 'ม.5/2', 18, 24, true, '2026-07-08T08:00:00.000Z'],
  ['r2', 'กานต์', 'ม.4/1', 15, 21, true, '2026-07-09T08:00:00.000Z'],
  ['r3', 'มิน', 'ม.6/3', 14, 20, true, '2026-07-10T08:00:00.000Z'],
  ['r4', 'ภูมิ', 'ม.5/1', 13, 18, true, '2026-07-11T08:00:00.000Z'],
  ['r5', 'ใบเฟิร์น', 'ม.4/2', 12, 17, true, '2026-07-12T08:00:00.000Z'],
  ['r6', 'ต้นกล้า', 'ม.5/3', 11, 15, true, '2026-07-13T08:00:00.000Z'],
  ['r7', 'ปันปัน', 'ม.4/3', 10, 14, true, '2026-07-14T08:00:00.000Z'],
  ['r8', 'พลอย', 'ม.6/1', 9, 13, true, '2026-07-15T08:00:00.000Z'],
  ['r9', 'บัญชีทดสอบ', 'ม.4/1', 22, 25, false, '2026-07-01T08:00:00.000Z'],
].map(([uid, displayName, className, readCount, likedCount, eligible, lastReadAt]) => ({ uid: String(uid), displayName: String(displayName), className: String(className), readCount: Number(readCount), likedCount: Number(likedCount), eligible: Boolean(eligible), lastReadAt: String(lastReadAt) }))

export const demoSettings: Settings = {
  schoolName: 'โรงเรียนตัวอย่างวิทยา', projectName: 'ปัดหาเล่ม', termId: '2569-1', termName: 'ภาคเรียนที่ 1 / 2569',
  announcement: 'อ่านวันละนิด แล้วมาแบ่งปันเล่มโปรดกัน', reviewMinChars: 20, leaderboardEnabled: true,
}

