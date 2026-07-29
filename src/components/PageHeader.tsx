import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Brand } from './Brand'

export function PageHeader({ title, back = false, action }: { title?: string; back?: boolean; action?: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="page-header">
      <div className="page-header__side">
        {back ? <button className="icon-button" onClick={() => navigate(-1)} aria-label="ย้อนกลับ"><ArrowLeft /></button> : <Brand compact />}
      </div>
      {title && <h1>{title}</h1>}
      <div className="page-header__side page-header__side--right">{action}</div>
    </header>
  )
}
