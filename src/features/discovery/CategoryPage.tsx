import { ArrowRight, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { PageHeader } from '../../components/PageHeader'
import { ProgressSteps } from '../../components/ProgressSteps'

const categoryAssets = '/assets/book-match/categories'
const categoryAssetCodes = new Set(['000', '100', '200', '300', '400', '500', '600', '700', '800', '900'])

function categoryIconSource(categoryId: string) {
  return categoryAssetCodes.has(categoryId) ? `${categoryAssets}/category-${categoryId}.png` : null
}

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
      <button className={`category-any ${any ? 'selected' : ''}`} onClick={() => setSelectedCategories([])}><img className="category-any__icon" src={`${categoryAssets}/category-any.png`} alt="" aria-hidden="true" /><span><strong>ไม่จำกัดหมวด</strong><small>เปิดใจให้ทุกความเป็นไปได้</small></span>{any && <Check />}</button>
      <div className="category-grid">
        {categories.filter((item) => item.active).map((item) => {
          const iconSource = categoryIconSource(item.id)
          return <button key={item.id} className={selectedCategories.includes(item.id) ? 'selected' : ''} onClick={() => toggle(item.id)} aria-pressed={selectedCategories.includes(item.id)}>{iconSource ? <img className="category-icon" src={iconSource} alt="" aria-hidden="true" /> : <span>{item.icon}</span>}<strong>{item.name}</strong>{selectedCategories.includes(item.id) && <i><Check /></i>}</button>
        })}
      </div>
      <button className="button button--primary button--wide sticky-action" onClick={() => {
        resetRound()
        if (profile) void saveProfile({
          avatarId: profile.avatarId,
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
