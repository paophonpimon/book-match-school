import { describe, expect, it } from 'vitest'
import { validateReview } from '../utils/review'

describe('review validation', () => {
  it('requires a rating and enough useful text', () => {
    expect(validateReview('รีวิวที่มีความยาวเพียงพอสำหรับการทดสอบ', 0)).toContain('ดาว')
    expect(validateReview('สั้น', 5)).toContain('20')
    expect(validateReview('หนังสือเล่มนี้สนุกและทำให้ได้ข้อคิดดีมาก', 5)).toBeNull()
    expect(validateReview('ก'.repeat(301), 5)).toContain('300')
  })
})
