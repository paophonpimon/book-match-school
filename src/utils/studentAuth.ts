export const studentIdPattern = /^\d{5,6}$/u

export function normalizeStudentId(value: string) {
  return value.trim()
}

export function studentInternalEmail(studentId: string) {
  const normalized = normalizeStudentId(studentId)
  if (!studentIdPattern.test(normalized)) throw new Error('กรุณากรอกเลขประจำตัวนักเรียน 5–6 หลัก')
  return `${normalized}@student.bookmatch.local`
}

export function validateStudentIdCredentials(studentId: string, password: string) {
  const normalized = normalizeStudentId(studentId)
  studentInternalEmail(normalized)
  if (!password) throw new Error('กรุณากรอกรหัสผ่าน')
  return normalized
}

export function studentFirebasePassword(studentId: string, password: string) {
  const normalized = validateStudentIdCredentials(studentId, password)
  return password === normalized ? `${normalized}!Bm` : password
}

const easyPasswords = new Set(['12345678', 'abcdefgh', 'password', 'password123'])

export function validateNewStudentPassword(studentId: string, password: string, confirmation: string) {
  if (password === normalizeStudentId(studentId)) return 'รหัสผ่านใหม่ห้ามเหมือนเลขประจำตัวนักเรียน'
  if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
  if (easyPasswords.has(password.trim().toLowerCase())) return 'รหัสนี้เดาง่ายเกินไป ลองตั้งใหม่อีกนิดนะ'
  if (password !== confirmation) return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'
  return null
}
