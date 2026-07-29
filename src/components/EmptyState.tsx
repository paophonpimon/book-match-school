import { BookOpen } from 'lucide-react'

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-state__icon"><BookOpen /></span><h2>{title}</h2><p>{detail}</p>{action}</div>
}
