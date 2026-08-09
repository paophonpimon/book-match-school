import { Library, LoaderCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useId } from 'react'

interface ConfirmationDialogProps {
  eyebrow?: string
  title: string
  detail: string
  confirmLabel: string
  cancelLabel?: string
  icon?: ReactNode
  tone?: 'default' | 'danger'
  busy?: boolean
  busyLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  eyebrow = 'ยืนยันคำขอยืม',
  title,
  detail,
  confirmLabel,
  cancelLabel = 'ยังไม่ยืม',
  icon,
  tone = 'default',
  busy = false,
  busyLabel = 'กำลังดำเนินการ',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const titleId = useId()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, onCancel])

  return (
    <div className="confirmation-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel()
    }}>
      <section className={`confirmation-dialog confirmation-dialog--${tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="confirmation-dialog__close" type="button" onClick={onCancel} disabled={busy} aria-label="ปิด"><X /></button>
        <span className="confirmation-dialog__icon" aria-hidden="true">{icon ?? <Library />}</span>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <p>{detail}</p>
        <div className="confirmation-dialog__actions">
          <button className="button button--secondary" type="button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className="button button--primary" type="button" onClick={onConfirm} disabled={busy}>{busy && <LoaderCircle className="spin" />} {busy ? busyLabel : confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}
