import type { AcademicTerm } from '../types'

export function planTermActivation(terms: AcademicTerm[], selectedTermId: string) {
  const selected = terms.find((term) => term.id === selectedTermId)
  if (!selected) throw new Error('ไม่พบภาคเรียนที่เลือก')
  if (selected.status === 'closed') throw new Error('ไม่สามารถเปิดใช้ภาคเรียนที่ปิดแล้ว')
  return terms.map((term): AcademicTerm => {
    if (term.id === selectedTermId) return { ...term, status: 'active' }
    if (term.status === 'active') return { ...term, status: 'closed' }
    return term
  })
}
