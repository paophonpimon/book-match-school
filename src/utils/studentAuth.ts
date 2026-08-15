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
  if (password !== normalized) throw new Error('เลขประจำตัวนักเรียนหรือรหัสผ่านไม่ถูกต้อง')
  return normalized
}
