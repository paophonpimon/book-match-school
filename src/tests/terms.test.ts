import { describe, expect, it } from 'vitest'
import type { AcademicTerm } from '../types'
import { canDeleteTerm, planTermActivation, planTermClosure } from '../utils/terms'

const base = {
  academicYear: 2569,
  semester: 1 as const,
  startDate: '2026-05-01T00:00:00.000Z',
  endDate: '2026-09-30T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'admin',
  updatedBy: 'admin',
}

function term(id: string, status: AcademicTerm['status']): AcademicTerm {
  return { ...base, id, name: id, status }
}

describe('academic term activation', () => {
  it('activates the selected draft and closes the previous active term', () => {
    const result = planTermActivation([term('2569-1', 'active'), term('2569-2', 'draft')], '2569-2')
    expect(result.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: '2569-1', status: 'closed' },
      { id: '2569-2', status: 'active' },
    ])
  })

  it('leaves historical terms untouched', () => {
    const result = planTermActivation([term('2568-2', 'closed'), term('2569-1', 'draft')], '2569-1')
    expect(result[0].status).toBe('closed')
  })

  it('rejects a missing term and allows a closed term to reopen', () => {
    expect(() => planTermActivation([], '2569-1')).toThrow('ไม่พบภาคเรียน')
    expect(planTermActivation([term('2569-1', 'closed')], '2569-1')[0].status).toBe('active')
  })

  it('keeps exactly one active term in a valid input state', () => {
    const result = planTermActivation([term('2569-1', 'active'), term('2569-2', 'draft')], '2569-2')
    expect(result.filter((item) => item.status === 'active')).toHaveLength(1)
  })
})

describe('academic term closure and deletion', () => {
  it('closes only the active term', () => {
    expect(planTermClosure([term('2569-1', 'active')], '2569-1')[0].status).toBe('closed')
    expect(() => planTermClosure([term('2569-1', 'draft')], '2569-1')).toThrow('กำลังใช้งาน')
  })

  it('allows permanent deletion only for a draft', () => {
    expect(canDeleteTerm(term('2569-1', 'draft'))).toBe(true)
    expect(canDeleteTerm(term('2569-1', 'active'))).toBe(false)
    expect(canDeleteTerm(term('2569-1', 'closed'))).toBe(false)
  })
})
