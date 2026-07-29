export interface StudentProfileFields {
  studentId: string
  firstName: string
  lastName: string
  gradeLevel: string
  studentNumber: string
  displayName: string
}

const blockedProfileTerms = [
  'ควย',
  'เหี้ย',
  'เชี่ย',
  'สัส',
  'สัด',
  'เย็ด',
  'แตด',
  'กะหรี่',
  'กระหรี่',
  'อีดอก',
  'แม่ง',
  'พ่อง',
  'ชาติหมา',
  'มึง',
  'fuck',
  'shit',
  'bitch',
] as const

const blockedExactProfileTerms = ['หี', 'หำ', 'กู'] as const

function normalizeLanguageCheck(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('th-TH')
    .replace(/[^\p{L}\p{M}\p{N}]/gu, '')
}

export function containsBlockedProfileLanguage(...values: string[]) {
  return values.some((value) => {
    const normalized = normalizeLanguageCheck(value)
    const tokens = value
      .normalize('NFKC')
      .toLocaleLowerCase('th-TH')
      .split(/[^\p{L}\p{M}\p{N}]+/u)
      .map(normalizeLanguageCheck)
      .filter(Boolean)
    return blockedProfileTerms.some((term) => normalized.includes(normalizeLanguageCheck(term)))
      || blockedExactProfileTerms.some((term) => (
        normalized === normalizeLanguageCheck(term)
        || tokens.includes(normalizeLanguageCheck(term))
      ))
  })
}

export function isSafeProfileDisplayName(value: string) {
  const trimmed = value.trim()
  return trimmed.length >= 2
    && trimmed.length <= 40
    && !containsBlockedProfileLanguage(trimmed)
}

export function gradeLevelFromClassName(className: string) {
  return className.match(/[1-6](?:\/[1-9][0-9]?)?/)?.[0] ?? ''
}

export function classNameFromGradeLevel(gradeLevel: string) {
  return `ม.${gradeLevel.trim()}`
}

export function validateStudentProfile(values: StudentProfileFields) {
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim()]),
  ) as unknown as StudentProfileFields

  if (!normalized.studentId || !normalized.firstName || !normalized.lastName
    || !normalized.gradeLevel || !normalized.studentNumber || !normalized.displayName) {
    return 'กรุณากรอกข้อมูลนักเรียนให้ครบทุกช่อง'
  }
  if (!/^\d{3,20}$/.test(normalized.studentId)) {
    return 'เลขประจำตัวนักเรียนต้องเป็นตัวเลข 3–20 หลัก'
  }
  if (!/^[1-6]\/[1-9][0-9]?$/.test(normalized.gradeLevel)) {
    return 'ชั้นมัธยมศึกษาต้องเป็นรูปแบบชั้น/ห้อง เช่น 5/1'
  }
  if (!/^\d{1,3}$/.test(normalized.studentNumber) || Number(normalized.studentNumber) < 1) {
    return 'เลขที่ต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป'
  }
  if (normalized.firstName.length > 60 || normalized.lastName.length > 60) {
    return 'ชื่อและนามสกุลต้องไม่เกิน 60 ตัวอักษร'
  }
  if (normalized.displayName.length < 2 || normalized.displayName.length > 40) {
    return 'ชื่อเล่น/ชื่อที่จะแสดงต้องมี 2–40 ตัวอักษร'
  }
  if (containsBlockedProfileLanguage(
    normalized.firstName,
    normalized.lastName,
    normalized.displayName,
  )) {
    return 'ชื่อและชื่อที่แสดงต้องไม่มีคำไม่เหมาะสม'
  }
  return null
}
