import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  defaultStudentAvatarId,
  normalizeStudentAvatarId,
  studentAvatars,
  studentAvatarSrc,
} from '../data/avatars'

const setup = readFileSync(resolve(process.cwd(), 'src/features/onboarding/ProfileSetupPage.tsx'), 'utf8')
const profile = readFileSync(resolve(process.cwd(), 'src/features/profile/ProfilePage.tsx'), 'utf8')
const home = readFileSync(resolve(process.cwd(), 'src/features/home/HomePage.tsx'), 'utf8')
const leaderboard = readFileSync(resolve(process.cwd(), 'src/features/leaderboard/LeaderboardPage.tsx'), 'utf8')
const firebase = readFileSync(resolve(process.cwd(), 'src/services/firebase.ts'), 'utf8')
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')

describe('student profile avatars', () => {
  it('offers ten bundled avatar images and safely falls back for legacy profiles', () => {
    expect(studentAvatars).toHaveLength(10)
    studentAvatars.forEach(({ id }) => {
      expect(existsSync(resolve(process.cwd(), `public${studentAvatarSrc(id)}`))).toBe(true)
    })
    expect(normalizeStudentAvatarId('not-an-avatar')).toBe(defaultStudentAvatarId)
    expect(normalizeStudentAvatarId('avatar-girl-05')).toBe('avatar-girl-05')
  })

  it('lets students select and edit their avatar through the existing profile form', () => {
    expect(setup).toContain('studentAvatars.map')
    expect(setup).toContain('setAvatarId(avatar.id)')
    expect(setup).toContain('avatarId,')
    expect(setup).toContain('กรุณาเลือกอวตารประจำตัวก่อนสมัครสมาชิก')
    expect(setup).toContain('profile?.avatarId ? normalizeStudentAvatarId(profile.avatarId) : null')
    expect(profile).toContain('aria-label="เปลี่ยนอวตาร"')
    expect(profile).toContain("navigate('/setup')")
  })

  it('uses the saved avatar across student identity surfaces', () => {
    expect(profile).toContain('studentAvatarSrc(profile?.avatarId)')
    expect(home).toContain('studentAvatarSrc(profile?.avatarId)')
    expect(leaderboard).toContain('studentAvatarSrc(reader.avatarId)')
    expect(firebase).toContain('avatarId: normalizeStudentAvatarId(profile.avatarId)')
    expect(firebase).toContain('avatarId: normalizeStudentAvatarId(data.avatarId)')
  })

  it('clips compact header avatars inside the existing circular frame', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')
    expect(css).toContain('.avatar { display: grid; place-items: center; width: 40px; height: 40px; overflow: hidden;')
    expect(css).toContain('.avatar img { width: 100%; height: 100%;')
  })

  it('restricts profile and leaderboard avatar values in Firestore rules', () => {
    expect(rules).toContain("request.resource.data.avatarId.matches('^avatar-(boy|girl)-0[1-5]$')")
    expect(rules).toContain("profile.get('avatarId', 'avatar-boy-01')")
    expect(rules).toContain("'avatarId', 'firstName', 'lastName', 'displayName', 'className'")
  })

  it('distinguishes an existing-profile Rules mismatch from duplicate registration', () => {
    expect(firebase).toContain("operation: editingExistingProfile ? 'update-student-profile' : 'register-student-membership'")
    expect(firebase).toContain('แก้ไขโปรไฟล์ไม่สำเร็จ: ระบบ Firestore ยังไม่อนุญาตข้อมูลโปรไฟล์รูปแบบล่าสุด')
    expect(firebase).toContain('ไม่สามารถใช้เลขประจำตัวนักเรียนนี้ได้ อาจมีบัญชีสมาชิกลงทะเบียนเลขนี้ไว้แล้ว')
  })
})
