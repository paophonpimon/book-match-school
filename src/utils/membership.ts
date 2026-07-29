export interface MembershipRegistrationState {
  requestedStudentId: string
  requestedUid: string
  existingMembershipUid?: string
  existingProfileStudentId?: string
  existingUidLockStudentId?: string
}

export function assertMembershipRegistrationAvailable(state: MembershipRegistrationState) {
  if (state.existingProfileStudentId && state.existingProfileStudentId !== state.requestedStudentId) {
    throw new Error('ไม่สามารถเปลี่ยนเลขประจำตัวนักเรียนหลังสมัครสมาชิกแล้ว')
  }
  if (state.existingMembershipUid && state.existingMembershipUid !== state.requestedUid) {
    throw new Error('เลขประจำตัวนักเรียนนี้มีบัญชีสมาชิกอยู่แล้ว กรุณาเข้าสู่ระบบด้วยบัญชีเดิมหรือติดต่อผู้ดูแล')
  }
  if (state.existingUidLockStudentId && state.existingUidLockStudentId !== state.requestedStudentId) {
    throw new Error('บัญชี Google นี้ลงทะเบียนเลขประจำตัวนักเรียนอื่นไว้แล้ว')
  }
}
