const LOGO_ROOT = '/assets/book-match/logos'

export function StudentBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`student-brand ${compact ? 'student-brand--compact' : ''}`} aria-label="Book Match เล่มที่ใช่">
      <img className="student-brand__wordmark" src={`${LOGO_ROOT}/book-match-wordmark.png`} alt="" aria-hidden="true" />
    </div>
  )
}
