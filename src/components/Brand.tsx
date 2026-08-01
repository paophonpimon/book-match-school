import { BookHeart } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Book Match เล่มที่ใช่">
      <span className="brand__mark"><BookHeart size={compact ? 24 : 32} strokeWidth={1.8} /></span>
      <span><strong>เล่มที่ใช่</strong>{!compact && <small>BOOK MATCH</small>}</span>
    </div>
  )
}
