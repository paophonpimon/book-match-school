import { describe, expect, it } from 'vitest'
import { normalizeStudentId, studentInternalEmail, validateStudentIdCredentials } from '../utils/studentAuth'

describe('Student ID authentication mapping', () => {
  it('preserves leading zeroes in the internal email mapping', () => {
    expect(normalizeStudentId(' 07143 ')).toBe('07143')
    expect(studentInternalEmail('07143')).toBe('07143@student.bookmatch.local')
    expect(studentInternalEmail('007183')).toBe('007183@student.bookmatch.local')
  })

  it('accepts the visible password only when it exactly matches studentId', () => {
    expect(validateStudentIdCredentials('07143', '07143')).toBe('07143')
    expect(() => validateStudentIdCredentials('07143', '7143')).toThrow('เลขประจำตัวนักเรียนหรือรหัสผ่านไม่ถูกต้อง')
  })

  it('rejects malformed IDs without coercing them to numbers', () => {
    expect(() => studentInternalEmail('7143')).toThrow('5–6 หลัก')
    expect(() => studentInternalEmail('07A43')).toThrow('5–6 หลัก')
  })
})
