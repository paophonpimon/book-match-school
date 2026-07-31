import type { AcademicTerm } from '../types'

export function planTermActivation(terms: AcademicTerm[], selectedTermId: string) {
  const selected = terms.find((term) => term.id === selectedTermId)
  if (!selected) throw new Error('ไม่พบภาคเรียนที่เลือก')
  return terms.map((term): AcademicTerm => {
    if (term.id === selectedTermId) return { ...term, status: 'active' }
    if (term.status === 'active') return { ...term, status: 'closed' }
    return term
  })
}

export function canDeleteTerm(term: AcademicTerm) {
  return term.status === 'draft'
}

export function planTermClosure(terms: AcademicTerm[], selectedTermId: string) {
  const selected = terms.find((term) => term.id === selectedTermId)
  if (!selected) throw new Error('ไม่พบภาคเรียนที่เลือก')
  if (selected.status !== 'active') throw new Error('ปิดได้เฉพาะภาคเรียนที่กำลังใช้งาน')
  return terms.map((term): AcademicTerm => (
    term.id === selectedTermId ? { ...term, status: 'closed' } : term
  ))
}
