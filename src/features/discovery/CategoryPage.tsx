import { ArrowRight, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { ProgressSteps } from '../../components/ProgressSteps'

export function CategoryPage() {
  const { categories, selectedCategories, setSelectedCategories, resetRound, profile, saveProfile } = useApp()
  const navigate = useNavigate()
  const any = selectedCategories.length === 0
  const toggle = (id: string) => setSelectedCategories(selectedCategories.includes(id) ? selectedCategories.filter((value) => value !== id) : [...selectedCategories, id])
  return (
    <div className="page selection-page">
      <PageHeader title="เลือกหมวด" back />
      <ProgressSteps active={2} />
      <section className="selection-heading"><p className="eyebrow">ขั้นที่ 2 จาก 3</p><h1>อยากอ่านหมวดไหน?</h1><p>เลือกได้มากกว่าหนึ่งหมวด หรือให้เราคละให้ก็ได้</p></section>
      <button className={`category-any ${any ? 'selected' : ''}`} onClick={() => setSelectedCategories([])}><span>✨</span><span><strong>ไม่จำกัดหมวด</strong><small>เปิดใจให้ทุกความเป็นไปได้</small></span>{any && <Check />}</button>
      <div className="category-grid">
        {categories.filter((item) => item.active).map((item) => <button key={item.id} className={selectedCategories.includes(item.id) ? 'selected' : ''} onClick={() => toggle(item.id)} aria-pressed={selectedCategories.includes(item.id)}><span>{item.icon}</span><strong>{item.name}</strong>{selectedCategories.includes(item.id) && <i><Check /></i>}</button>)}
      </div>
      <button className="button button--primary button--wide sticky-action" onClick={() => {
        resetRound()
        if (profile) void saveProfile({
          displayName: profile.displayName,
          className: profile.className,
          studentNumber: profile.studentNumber,
          studentId: profile.studentId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          gradeLevel: profile.gradeLevel,
          interests: selectedCategories,
        })
        navigate('/discover')
      }}>เริ่มปัดหนังสือ <ArrowRight /></button>
    </div>
  )
}
