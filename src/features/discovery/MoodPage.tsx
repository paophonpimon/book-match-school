import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../app/AppContext'
import { moods } from '../../data/demoData'
import { PageHeader } from '../../components/PageHeader'
import { ProgressSteps } from '../../components/ProgressSteps'

export function MoodPage() {
  const { selectedMoods, setSelectedMoods } = useApp()
  const navigate = useNavigate()
  const toggleMood = (id: string) => setSelectedMoods(selectedMoods.includes(id) ? selectedMoods.filter((mood) => mood !== id) : [...selectedMoods, id])
  return (
    <div className="page selection-page">
      <PageHeader title="ค้นหาเล่ม" />
      <ProgressSteps active={1} />
      <section className="selection-heading"><p className="eyebrow">ขั้นที่ 1 จาก 3</p><h1>วันนี้อยากอ่าน<br />แบบไหน?</h1><p>เลือกได้มากกว่า 1 อารมณ์ตามที่รู้สึกตอนนี้</p></section>
      <div className="mood-grid">
        {moods.map((item) => <button key={item.id} className={`mood-card mood-card--${item.tone} ${selectedMoods.includes(item.id) ? 'selected' : ''}`} onClick={() => toggleMood(item.id)} aria-pressed={selectedMoods.includes(item.id)}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.description}</small></button>)}
      </div>
      <button className="button button--primary button--wide sticky-action" disabled={!selectedMoods.length} onClick={() => navigate('/categories')}>เลือกหมวดหนังสือต่อ{selectedMoods.length > 1 ? ` (${selectedMoods.length})` : ''} <ArrowRight /></button>
    </div>
  )
}
