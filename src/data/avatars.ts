export const studentAvatars = [
  { id: 'avatar-boy-01', label: 'อวตารแบบที่ 1' },
  { id: 'avatar-boy-02', label: 'อวตารแบบที่ 2' },
  { id: 'avatar-boy-03', label: 'อวตารแบบที่ 3' },
  { id: 'avatar-boy-04', label: 'อวตารแบบที่ 4' },
  { id: 'avatar-boy-05', label: 'อวตารแบบที่ 5' },
  { id: 'avatar-girl-01', label: 'อวตารแบบที่ 6' },
  { id: 'avatar-girl-02', label: 'อวตารแบบที่ 7' },
  { id: 'avatar-girl-03', label: 'อวตารแบบที่ 8' },
  { id: 'avatar-girl-04', label: 'อวตารแบบที่ 9' },
  { id: 'avatar-girl-05', label: 'อวตารแบบที่ 10' },
] as const

export type StudentAvatarId = (typeof studentAvatars)[number]['id']

export const defaultStudentAvatarId: StudentAvatarId = 'avatar-boy-01'

const avatarIds = new Set<string>(studentAvatars.map((avatar) => avatar.id))

export function normalizeStudentAvatarId(value: unknown): StudentAvatarId {
  return typeof value === 'string' && avatarIds.has(value)
    ? value as StudentAvatarId
    : defaultStudentAvatarId
}

export function studentAvatarSrc(value: unknown) {
  return `/assets/book-match/avatars/${normalizeStudentAvatarId(value)}.png`
}
