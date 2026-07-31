import { Library, X } from 'lucide-react'
import { useEffect, useId } from 'react'

interface ConfirmationDialogProps {
  title: string
  detail: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({ title, detail, confirmLabel, onConfirm, onCancel }: ConfirmationDialogProps) {
  const titleId = useId()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  return (
    <div className="confirmation-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="confirmation-dialog__close" type="button" onClick={onCancel} aria-label="ปิด"><X /></button>
        <span className="confirmation-dialog__icon" aria-hidden="true"><Library /></span>
        <p className="eyebrow">ยืนยันคำขอยืม</p>
        <h2 id={titleId}>{title}</h2>
        <p>{detail}</p>
        <div className="confirmation-dialog__actions">
          <button className="button button--secondary" type="button" onClick={onCancel}>ยังไม่ยืม</button>
          <button className="button button--primary" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}
