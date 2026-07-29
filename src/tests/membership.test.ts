import { describe, expect, it } from 'vitest'
import { assertMembershipRegistrationAvailable } from '../utils/membership'

describe('permanent student membership', () => {
  it('accepts an unused student ID for a new Google UID', () => {
    expect(() => assertMembershipRegistrationAvailable({
      requestedStudentId: '123456',
      requestedUid: 'uid-1',
    })).not.toThrow()
  })

  it('rejects a student ID owned by another UID', () => {
    expect(() => assertMembershipRegistrationAvailable({
      requestedStudentId: '123456',
      requestedUid: 'uid-2',
      existingMembershipUid: 'uid-1',
    })).toThrow('มีบัญชีสมาชิกอยู่แล้ว')
  })

  it('prevents one UID from registering a second student ID', () => {
    expect(() => assertMembershipRegistrationAvailable({
      requestedStudentId: '654321',
      requestedUid: 'uid-1',
      existingUidLockStudentId: '123456',
    })).toThrow('ลงทะเบียนเลขประจำตัวนักเรียนอื่น')
  })

  it('keeps the student ID immutable on profile edits', () => {
    expect(() => assertMembershipRegistrationAvailable({
      requestedStudentId: '654321',
      requestedUid: 'uid-1',
      existingProfileStudentId: '123456',
    })).toThrow('ไม่สามารถเปลี่ยนเลขประจำตัว')
  })
})
