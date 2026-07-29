import { describe, expect, it } from 'vitest'
import type { AcademicTerm } from '../types'
import { planTermActivation } from '../utils/terms'

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

  it('rejects a missing or closed term', () => {
    expect(() => planTermActivation([], '2569-1')).toThrow('ไม่พบภาคเรียน')
    expect(() => planTermActivation([term('2569-1', 'closed')], '2569-1')).toThrow('ปิดแล้ว')
  })

  it('keeps exactly one active term in a valid input state', () => {
    const result = planTermActivation([term('2569-1', 'active'), term('2569-2', 'draft')], '2569-2')
    expect(result.filter((item) => item.status === 'active')).toHaveLength(1)
  })
})
