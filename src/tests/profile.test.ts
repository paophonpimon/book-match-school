import { describe, expect, it } from 'vitest'
import {
  classNameFromGradeLevel,
  containsBlockedProfileLanguage,
  gradeLevelFromClassName,
  hasPermanentStudentId,
  isSafeProfileDisplayName,
  validateStudentProfile,
} from '../utils/profile'

const validProfile = {
  studentId: '123456',
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  gradeLevel: '5/1',
  studentNumber: '14',
  displayName: 'ชาย',
}

describe('student profile fields', () => {
  it('builds and restores the class label used by the leaderboard', () => {
    expect(classNameFromGradeLevel('5/1')).toBe('ม.5/1')
    expect(gradeLevelFromClassName('ม.5/8')).toBe('5/8')
  })

  it('accepts a complete student profile', () => {
    expect(validateStudentProfile(validProfile)).toBeNull()
  })

  it('locks the student ID only after a permanent ID actually exists', () => {
    expect(hasPermanentStudentId(undefined)).toBe(false)
    expect(hasPermanentStudentId('')).toBe(false)
    expect(hasPermanentStudentId('   ')).toBe(false)
    expect(hasPermanentStudentId('123456')).toBe(true)
  })

  it('rejects an invalid grade and student number', () => {
    expect(validateStudentProfile({ ...validProfile, gradeLevel: '5' })).toContain('5/1')
    expect(validateStudentProfile({ ...validProfile, gradeLevel: '7/1' })).toContain('5/1')
    expect(validateStudentProfile({ ...validProfile, gradeLevel: '5/0' })).toContain('5/1')
    expect(validateStudentProfile({ ...validProfile, studentNumber: '0' })).toBe('เลขที่ต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป')
  })

  it('requires a numeric student ID and all names', () => {
    expect(validateStudentProfile({ ...validProfile, studentId: 'AB12' })).toBe('เลขประจำตัวนักเรียนต้องเป็นตัวเลข 3–20 หลัก')
    expect(validateStudentProfile({ ...validProfile, lastName: '' })).toBe('กรุณากรอกข้อมูลนักเรียนให้ครบทุกช่อง')
  })

  it('blocks inappropriate language even when separated by punctuation', () => {
    expect(containsBlockedProfileLanguage('ชื่อสุภาพ')).toBe(false)
    expect(containsBlockedProfileLanguage('ค-ว-ย')).toBe(true)
    expect(containsBlockedProfileLanguage('หี')).toBe(true)
    expect(containsBlockedProfileLanguage('หีบสมบัติ')).toBe(false)
    expect(isSafeProfileDisplayName('มินยอดนักอ่าน')).toBe(true)
    expect(isSafeProfileDisplayName('หี')).toBe(false)
    expect(validateStudentProfile({ ...validProfile, displayName: 'ไอ้เหี้ย' })).toBe('ชื่อและชื่อที่แสดงต้องไม่มีคำไม่เหมาะสม')
    expect(validateStudentProfile({ ...validProfile, displayName: 'หี' })).toBe('ชื่อและชื่อที่แสดงต้องไม่มีคำไม่เหมาะสม')
  })
})
