import { useState, type FormEvent } from 'react'
import { ArrowRight, BadgeCheck, Check, Eye, EyeOff, LockKeyhole, LogOut } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { normalizeStudentAvatarId, studentAvatars, studentAvatarSrc, type StudentAvatarId } from '../../data/avatars'
import { classNameFromGradeLevel, gradeLevelFromClassName, hasPermanentStudentId, validateStudentProfile } from '../../utils/profile'
import { updateCurrentStudentPassword } from '../../services/firebase'
import { validateNewStudentPassword } from '../../utils/studentAuth'

export function ProfileSetupPage() {
  const { authUser, currentTerm, profile, membership, studentDirectory, saveProfile, resetDevice, syncing } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectedError = typeof location.state === 'object'
    && location.state
    && 'profileError' in location.state
    && typeof location.state.profileError === 'string'
    ? location.state.profileError
    : ''
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [avatarId, setAvatarId] = useState<StudentAvatarId | null>(profile?.avatarId ? normalizeStudentAvatarId(profile.avatarId) : null)
  const [studentId, setStudentId] = useState(profile?.studentId ?? studentDirectory?.studentId ?? '')
  const [firstName, setFirstName] = useState(profile?.firstName ?? studentDirectory?.firstName ?? '')
  const [lastName, setLastName] = useState(profile?.lastName ?? studentDirectory?.lastName ?? '')
  const [gradeLevel, setGradeLevel] = useState(profile?.gradeLevel ?? studentDirectory?.gradeLevel ?? gradeLevelFromClassName(profile?.className ?? ''))
  const [studentNumber, setStudentNumber] = useState(profile?.studentNumber ?? studentDirectory?.studentNumber ?? '')
  const [error, setError] = useState(redirectedError)
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const studentIdLocked = hasPermanentStudentId(profile?.studentId)
  const canReturnToProfile = Boolean(profile && membership)
  const importedFirstLogin = Boolean(!profile && studentDirectory)

  if (!authUser || !currentTerm) return <Navigate to="/welcome" replace />

  function leaveSetup() {
    if (canReturnToProfile) {
      navigate(-1)
      return
    }
    resetDevice()
    navigate('/welcome', { replace: true })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!avatarId) {
      setError('กรุณาเลือกอวตารประจำตัวก่อนสมัครสมาชิก')
      return
    }
    const values = { studentId, firstName, lastName, gradeLevel, studentNumber, displayName }
    const validationError = validateStudentProfile(values)
    if (validationError) {
      setError(validationError)
      return
    }
    if (importedFirstLogin) {
      const passwordError = validateNewStudentPassword(studentId, newPassword, confirmPassword)
      if (passwordError) {
        setError(passwordError)
        return
      }
    }
    setError('')
    setSaving(true)
    try {
      if (importedFirstLogin) await updateCurrentStudentPassword(newPassword)
      await saveProfile({
        avatarId,
        studentId: studentId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gradeLevel: gradeLevel.trim(),
        displayName: displayName.trim(),
        className: classNameFromGradeLevel(gradeLevel),
        studentNumber: studentNumber.trim(),
        interests: profile?.interests ?? [],
      })
      navigate(profile ? '/profile' : '/mood')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  if (!profile && !studentDirectory) {
    return (
      <main className="standalone-page">
        <PageHeader title="รู้จักกันนิดหนึ่ง" back backLabel="ยกเลิกและเปลี่ยนบัญชี" onBack={leaveSetup} />
        <section className="form-card profile-setup profile-setup--blocked">
          <span className="feature-icon"><BadgeCheck /></span>
          <p className="eyebrow">บัญชีสมาชิกเดิม</p>
          <h1>บัญชี Google นี้ยังไม่เป็นสมาชิก Book Match</h1>
          <p>การสมัครสมาชิกใหม่ใช้เลขประจำตัวนักเรียน กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วยเลขประจำตัวของคุณ</p>
          <button className="button button--primary button--wide" type="button" onClick={leaveSetup}>
            <LogOut /> กลับไปเข้าสู่ระบบด้วยเลขประจำตัว
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="standalone-page">
      <PageHeader
        title="รู้จักกันนิดหนึ่ง"
        back
        backLabel={canReturnToProfile ? 'ย้อนกลับ' : 'ยกเลิกและเปลี่ยนบัญชี'}
        onBack={leaveSetup}
      />
      <section className="form-card profile-setup">
        <span className="feature-icon"><BadgeCheck /></span>
        <p className="eyebrow">โปรไฟล์นักอ่าน</p>
        <h1>{profile ? 'ปรับโปรไฟล์นักอ่านของคุณ' : 'ให้เราเรียกคุณว่าอะไรดี?'}</h1>
        <p>{profile ? 'เปลี่ยนอวตารหรือข้อมูลที่แสดงได้ทุกเมื่อ' : 'ตรวจสอบข้อมูลทะเบียน แล้วเลือกอวตารและชื่อที่จะแสดง'}</p>
        <form onSubmit={submit} noValidate>
          <fieldset className="avatar-picker">
            <legend>{profile ? 'เลือกอวตารประจำตัว' : 'เลือกอวตารเพื่อเริ่มใช้งาน'}</legend>
            <p>{profile ? 'เลือกแบบที่เป็นคุณ เปลี่ยนใหม่ได้ตลอดจากหน้าโปรไฟล์' : 'เลือกอวตารของคุณก่อนกรอกข้อมูลสมัครสมาชิก เปลี่ยนใหม่ได้ภายหลัง'}</p>
            <div className="avatar-picker__grid">
              {studentAvatars.map((avatar) => {
                const selected = avatar.id === avatarId
                return (
                  <button
                    className={selected ? 'avatar-picker__option selected' : 'avatar-picker__option'}
                    type="button"
                    key={avatar.id}
                    aria-label={avatar.label}
                    aria-pressed={selected}
                    onClick={() => setAvatarId(avatar.id)}
                  >
                    <img src={studentAvatarSrc(avatar.id)} alt="" loading={profile ? 'lazy' : 'eager'} />
                    {selected && <span aria-hidden="true"><Check /></span>}
                  </button>
                )
              })}
            </div>
          </fieldset>
          {importedFirstLogin ? (
            <div className="student-directory-card" aria-label="ข้อมูลทะเบียนนักเรียน">
              <dl>
                <div><dt>ชื่อ-นามสกุล</dt><dd>{firstName} {lastName}</dd></div>
                <div><dt>เลขประจำตัว</dt><dd>{studentId}</dd></div>
                <div><dt>ชั้น/ห้อง</dt><dd>ม.{gradeLevel}</dd></div>
                <div><dt>เลขที่</dt><dd>{studentNumber}</dd></div>
              </dl>
              <p>หากข้อมูลไม่ถูกต้อง กรุณาแจ้งบรรณารักษ์</p>
            </div>
          ) : (
            <>
              <label>เลขประจำตัวนักเรียน<input required autoFocus={!studentIdLocked} disabled={studentIdLocked} inputMode="numeric" autoComplete="off" value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="ระบุเลขประจำตัวนักเรียน" maxLength={20} /></label>
              <div className="form-row">
                <label>ชื่อ<input required autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="ชื่อจริง" maxLength={60} /></label>
                <label>นามสกุล<input required autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="นามสกุล" maxLength={60} /></label>
              </div>
              <div className="form-row">
                <label>ชั้นมัธยมศึกษา/ห้อง<input required autoComplete="off" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="เช่น 5/1" maxLength={4} /></label>
                <label>เลขที่<input required inputMode="numeric" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} placeholder="เช่น 14" maxLength={3} /></label>
              </div>
            </>
          )}
          <label>ชื่อเล่น/ชื่อที่จะแสดง<input required autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="เช่น มินยอดนักอ่าน" maxLength={40} /></label>
          {importedFirstLogin && (
            <fieldset className="first-login-password">
              <legend><LockKeyhole /> ตั้งรหัสผ่านของฉัน</legend>
              <p>ตั้งรหัสที่หนูจำได้ เพื่อใช้เข้า Book Match ครั้งต่อไป</p>
              <label>
                รหัสผ่านใหม่
                <span className="password-input">
                  <input required type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="เช่น Mali2569 หรือ Book1234" />
                  <button type="button" onClick={() => setShowNewPassword((current) => !current)} aria-label={showNewPassword ? 'ซ่อนรหัสผ่านใหม่' : 'แสดงรหัสผ่านใหม่'}>{showNewPassword ? <EyeOff /> : <Eye />}</button>
                </span>
                <small>อย่างน้อย 8 ตัวอักษร ใช้ตัวอักษรและตัวเลขได้</small>
                <small>อย่าใช้เลขประจำตัวนักเรียนเป็นรหัสผ่าน</small>
              </label>
              <label>
                กรอกรหัสผ่านใหม่อีกครั้ง
                <span className="password-input">
                  <input required type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="กรอกรหัสเดิมอีกครั้ง" />
                  <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? 'ซ่อนการยืนยันรหัสผ่าน' : 'แสดงการยืนยันรหัสผ่าน'}>{showConfirmPassword ? <EyeOff /> : <Eye />}</button>
                </span>
                <small>กรอกรหัสเดิมอีกครั้งให้เหมือนกัน</small>
              </label>
              <p className="first-login-password__reminder">ครั้งหน้าจะเข้า Book Match ด้วย เลขประจำตัวนักเรียน + รหัสผ่านที่ตั้งตรงนี้</p>
            </fieldset>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--wide" disabled={saving || syncing}>{saving ? 'กำลังบันทึก…' : profile ? 'บันทึกโปรไฟล์' : 'เริ่มใช้งาน Book Match'} <ArrowRight /></button>
          {!canReturnToProfile && (
            <button className="button button--secondary button--wide profile-setup__change-account" type="button" onClick={leaveSetup} disabled={saving || syncing}>
              <LogOut /> ยกเลิกและเปลี่ยนบัญชี
            </button>
          )}
        </form>
        <small>{importedFirstLogin
          ? 'ข้อมูลทางการมาจากทะเบียนนักเรียนและไม่สามารถแก้ไขจากหน้านี้ได้'
          : studentIdLocked
            ? `บัญชีสมาชิกผูกกับ ${authUser.email} และไม่สามารถเปลี่ยนเลขประจำตัวนักเรียนภายหลังได้`
            : 'กรุณาติดต่อบรรณารักษ์หากข้อมูลสมาชิกไม่ถูกต้อง'}</small>
      </section>
    </main>
  )
}
