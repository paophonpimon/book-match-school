import { useState, type FormEvent } from 'react'
import { ArrowRight, BadgeCheck, Check, Link2, LoaderCircle } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { normalizeStudentAvatarId, studentAvatars, studentAvatarSrc, type StudentAvatarId } from '../../data/avatars'
import { classNameFromGradeLevel, gradeLevelFromClassName, hasPermanentStudentId, validateStudentProfile } from '../../utils/profile'

export function ProfileSetupPage() {
  const { authUser, currentTerm, profile, saveProfile, signInWithGoogle, syncing } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectedError = typeof location.state === 'object'
    && location.state
    && 'profileError' in location.state
    && typeof location.state.profileError === 'string'
    ? location.state.profileError
    : ''
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [avatarId, setAvatarId] = useState<StudentAvatarId>(normalizeStudentAvatarId(profile?.avatarId))
  const [studentId, setStudentId] = useState(profile?.studentId ?? '')
  const [firstName, setFirstName] = useState(profile?.firstName ?? '')
  const [lastName, setLastName] = useState(profile?.lastName ?? '')
  const [gradeLevel, setGradeLevel] = useState(profile?.gradeLevel ?? gradeLevelFromClassName(profile?.className ?? ''))
  const [studentNumber, setStudentNumber] = useState(profile?.studentNumber ?? '')
  const [error, setError] = useState(redirectedError)
  const [saving, setSaving] = useState(false)
  const studentIdLocked = hasPermanentStudentId(profile?.studentId)
  const needsGoogleLink = authUser?.isAnonymous === true || !authUser?.email

  if (!authUser || !currentTerm) return <Navigate to="/welcome" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    const values = { studentId, firstName, lastName, gradeLevel, studentNumber, displayName }
    const validationError = validateStudentProfile(values)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setSaving(true)
    try {
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

  return (
    <main className="standalone-page">
      <PageHeader title="รู้จักกันนิดหนึ่ง" back />
      <section className="form-card profile-setup">
        <span className="feature-icon"><BadgeCheck /></span>
        <p className="eyebrow">โปรไฟล์นักอ่าน</p>
        <h1>{profile ? 'ปรับโปรไฟล์นักอ่านของคุณ' : 'ให้เราเรียกคุณว่าอะไรดี?'}</h1>
        <p>{profile ? 'เปลี่ยนอวตารหรือข้อมูลที่แสดงได้ทุกเมื่อ' : 'ข้อมูลนี้ใช้สร้างสมาชิกถาวรและบันทึกอันดับการอ่านของคุณ'}</p>
        {needsGoogleLink && (
          <div className="profile-google-link" role="status">
            <strong>เชื่อมบัญชี Google ก่อนบันทึก</strong>
            <p>ระบบพบบัญชีชั่วคราวจากเวอร์ชันเดิม เชื่อม Google เพื่อรักษาโปรไฟล์และประวัติเดิมไว้กับ UID นี้</p>
            <button className="button button--secondary button--wide" type="button" onClick={() => void signInWithGoogle()} disabled={syncing}>
              {syncing ? <><LoaderCircle className="spin" /> กำลังเชื่อมบัญชี…</> : <><Link2 /> เชื่อมบัญชี Google</>}
            </button>
          </div>
        )}
        <form onSubmit={submit} noValidate>
          <fieldset className="avatar-picker">
            <legend>เลือกอวตารประจำตัว</legend>
            <p>เลือกแบบที่เป็นคุณ เปลี่ยนใหม่ได้ตลอดจากหน้าโปรไฟล์</p>
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
                    <img src={studentAvatarSrc(avatar.id)} alt="" loading="lazy" />
                    {selected && <span aria-hidden="true"><Check /></span>}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <label>เลขประจำตัวนักเรียน<input required autoFocus={!studentIdLocked} disabled={studentIdLocked} inputMode="numeric" autoComplete="off" value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="ระบุเลขประจำตัวนักเรียน" maxLength={20} /></label>
          <div className="form-row">
            <label>ชื่อ<input required autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="ชื่อจริง" maxLength={60} /></label>
            <label>นามสกุล<input required autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="นามสกุล" maxLength={60} /></label>
          </div>
          <div className="form-row">
            <label>ชั้นมัธยมศึกษา/ห้อง<input required autoComplete="off" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="เช่น 5/1" maxLength={4} /></label>
            <label>เลขที่<input required inputMode="numeric" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} placeholder="เช่น 14" maxLength={3} /></label>
          </div>
          <label>ชื่อเล่น/ชื่อที่จะแสดง<input required autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="เช่น มินยอดนักอ่าน" maxLength={40} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--wide" disabled={saving || syncing || needsGoogleLink}>{saving ? 'กำลังบันทึก…' : needsGoogleLink ? 'เชื่อมบัญชี Google ก่อน' : profile ? 'บันทึกโปรไฟล์' : 'ไปเลือกอารมณ์'} <ArrowRight /></button>
        </form>
        <small>{studentIdLocked
          ? `บัญชีสมาชิกผูกกับ ${authUser.email} และไม่สามารถเปลี่ยนเลขประจำตัวนักเรียนภายหลังได้`
          : authUser.email
            ? `กรอกเลขประจำตัวนักเรียนเพื่อผูกบัญชีเดิมกับ ${authUser.email} อย่างถาวร`
            : 'กรอกเลขประจำตัวได้ทันที และเชื่อม Google ก่อนกดบันทึก'}</small>
      </section>
    </main>
  )
}
