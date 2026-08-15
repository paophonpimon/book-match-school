import { describe, expect, it } from 'vitest'
import { normalizeStudentId, studentFirebasePassword, studentInternalEmail, validateNewStudentPassword, validateStudentIdCredentials } from '../utils/studentAuth'

describe('Student ID authentication mapping', () => {
  it('preserves leading zeroes in the internal email mapping', () => {
    expect(normalizeStudentId(' 07143 ')).toBe('07143')
    expect(studentInternalEmail('07143')).toBe('07143@student.bookmatch.local')
    expect(studentInternalEmail('007183')).toBe('007183@student.bookmatch.local')
  })

  it('maps the first-login password while passing a changed password through unchanged', () => {
    expect(validateStudentIdCredentials('07143', '07143')).toBe('07143')
    expect(studentFirebasePassword('07143', '07143')).toBe('07143!Bm')
    expect(studentFirebasePassword('07143', 'Mali2569')).toBe('Mali2569')
    expect(() => validateStudentIdCredentials('07143', '')).toThrow('กรุณากรอกรหัสผ่าน')
  })

  it('keeps the new student password rules simple and student friendly', () => {
    expect(validateNewStudentPassword('07143', '07143', '07143')).toBe('รหัสผ่านใหม่ห้ามเหมือนเลขประจำตัวนักเรียน')
    expect(validateNewStudentPassword('07143', 'Book12', 'Book12')).toBe('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    expect(validateNewStudentPassword('07143', 'password123', 'password123')).toBe('รหัสนี้เดาง่ายเกินไป ลองตั้งใหม่อีกนิดนะ')
    expect(validateNewStudentPassword('07143', 'Mali2569', 'Mali2568')).toBe('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
    expect(validateNewStudentPassword('07143', 'Mali2569', 'Mali2569')).toBeNull()
  })

  it('rejects malformed IDs without coercing them to numbers', () => {
    expect(() => studentInternalEmail('7143')).toThrow('5–6 หลัก')
    expect(() => studentInternalEmail('07A43')).toThrow('5–6 หลัก')
  })
})
