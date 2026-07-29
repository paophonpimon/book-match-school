import { BookHeart } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="ปัดหาเล่ม Book Match">
      <span className="brand__mark"><BookHeart size={compact ? 24 : 32} strokeWidth={1.8} /></span>
      <span><strong>ปัดหาเล่ม</strong>{!compact && <small>BOOK MATCH</small>}</span>
    </div>
  )
}
