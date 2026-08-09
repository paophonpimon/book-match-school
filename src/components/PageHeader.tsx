import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StudentBrand } from './StudentBrand'
import { StudentNotificationCenter } from './StudentNotificationCenter'

export function PageHeader({ title, center, back = false, action }: { title?: string; center?: React.ReactNode; back?: boolean; action?: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="page-header">
      <div className="page-header__side">
        {back ? <button className="icon-button" onClick={() => navigate(-1)} aria-label="ย้อนกลับ"><ArrowLeft /></button> : <StudentBrand compact />}
      </div>
      <div className="page-header__center">{center ?? (title && <h1>{title}</h1>)}</div>
      <div className="page-header__side page-header__side--right">
        {action}
        <StudentNotificationCenter />
      </div>
    </header>
  )
}
