import { useState, type FormEvent } from 'react'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { classNameFromGradeLevel, gradeLevelFromClassName, hasPermanentStudentId, validateStudentProfile } from '../../utils/profile'

export function ProfileSetupPage() {
  const { authUser, currentTerm, profile, saveProfile } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectedError = typeof location.state === 'object'
    && location.state
    && 'profileError' in location.state
    && typeof location.state.profileError === 'string'
    ? location.state.profileError
    : ''
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [studentId, setStudentId] = useState(profile?.studentId ?? '')
  const [firstName, setFirstName] = useState(profile?.firstName ?? '')
  const [lastName, setLastName] = useState(profile?.lastName ?? '')
  const [gradeLevel, setGradeLevel] = useState(profile?.gradeLevel ?? gradeLevelFromClassName(profile?.className ?? ''))
  const [studentNumber, setStudentNumber] = useState(profile?.studentNumber ?? '')
  const [error, setError] = useState(redirectedError)
  const [saving, setSaving] = useState(false)
  const studentIdLocked = hasPermanentStudentId(profile?.studentId)

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
        <h1>ให้เราเรียกคุณว่าอะไรดี?</h1>
        <p>ข้อมูลนี้ใช้สร้างสมาชิกถาวรและบันทึกอันดับการอ่านของคุณ</p>
        <form onSubmit={submit} noValidate>
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
          <button className="button button--primary button--wide" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'ไปเลือกอารมณ์'} <ArrowRight /></button>
        </form>
        <small>{studentIdLocked
          ? `บัญชีสมาชิกผูกกับ ${authUser.email} และไม่สามารถเปลี่ยนเลขประจำตัวนักเรียนภายหลังได้`
          : `กรอกเลขประจำตัวนักเรียนเพื่อผูกบัญชีเดิมกับ ${authUser.email} อย่างถาวร`}</small>
      </section>
    </main>
  )
}
