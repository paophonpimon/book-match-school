import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filterCatalogToBooksWithCovers, loadCatalog, normalizeBooksApiResponse, splitSemicolonList } from '../services/catalog'

const apiPayload = {
  ok: true,
  books: [
    {
      id: 'later',
      title: 'เล่มหลัง',
      author: 'ผู้เขียน',
      categoryCode: '100',
      category: 'ปรัชญา',
      description: 'รายละเอียด',
      coverUrl: '',
      audioUrl: '',
      isbn: '123',
      callNumber: '100 ก1',
      tags: 'ปรัชญา; ความรู้',
      moods: 'อยากได้ความรู้; อยากผ่อนคลาย',
      readingLevel: 'ปานกลาง',
      recommendedGrades: 'ม.1-ม.6',
      estimatedReadingMinutes: '25',
      matchReason: 'เหมาะกับคนชอบเรียนรู้',
      active: true,
      displayOrder: 20,
    },
    {
      id: 'first',
      title: 'เล่มแรก',
      author: 'ผู้เขียน',
      categoryCode: '000',
      category: 'ความรู้ทั่วไป',
      active: true,
      displayOrder: 1,
    },
    {
      id: 'inactive',
      title: 'ไม่แสดง',
      active: false,
      displayOrder: 0,
    },
  ],
}

describe('Google Sheets catalog', () => {
  beforeEach(() => localStorage.clear())

  it('splits semicolon values, filters inactive books, and sorts displayOrder', () => {
    const catalog = normalizeBooksApiResponse(apiPayload)
    expect(catalog.books.map((book) => book.id)).toEqual(['first', 'later'])
    expect(catalog.books[1].tags).toEqual(['ปรัชญา', 'ความรู้'])
    expect(catalog.books[1].moods).toEqual(['อยากได้ความรู้', 'อยากผ่อนคลาย'])
    expect(catalog.books[1].moodTags).toEqual(['learn', 'relax'])
    expect(catalog.books[1].callNumber).toBe('100 ก1')
    expect(catalog.categories.map((category) => category.id)).toEqual(['000', '100'])
  })

  it('supports arrays and semicolon text in the same parser', () => {
    expect(splitSemicolonList(['หนึ่ง; สอง', 'สาม'])).toEqual(['หนึ่ง', 'สอง', 'สาม'])
  })

  it('keeps valid remote cover URLs regardless of host and removes only missing covers', () => {
    const catalog = normalizeBooksApiResponse({
      ok: true,
      books: [
        { id: 'good', title: 'ปกใช้งานได้', categoryCode: '000', category: 'ทั่วไป', coverUrl: 'https://storage.naiin.com/cover.jpg', active: true },
        { id: 'dead', title: 'ปกต้นทางเสีย', categoryCode: '100', category: 'ปรัชญา', coverUrl: 'https://www.2ebook.com/cover.jpg', active: true },
        { id: 'missing', title: 'ไม่มีปก', categoryCode: '200', category: 'ศาสนา', coverUrl: '', active: true },
      ],
    })
    const filtered = filterCatalogToBooksWithCovers(catalog)
    expect(filtered.books.map((book) => book.id)).toEqual(['good', 'dead'])
    expect(filtered.categories.map((category) => category.id)).toEqual(['000', '100'])
  })

  it('does not silently use demo books when the API is unavailable', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch
    const result = await loadCatalog({ apiUrl: 'https://example.test/catalog', fetcher, force: true })
    expect(result.source).toBe('error')
    expect(result.data.books).toEqual([])
    expect(result.error).toContain('ไม่มีข้อมูลจริงที่บันทึกไว้')
  })

  it('uses a previously successful real catalog with a visible warning when refresh fails', async () => {
    const successFetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(apiPayload), { status: 200 })) as unknown as typeof fetch
    await loadCatalog({ apiUrl: 'https://example.test/catalog', fetcher: successFetcher, force: true })
    const failedFetcher = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch
    const result = await loadCatalog({ apiUrl: 'https://example.test/catalog', fetcher: failedFetcher, force: true })
    expect(result.source).toBe('cache')
    expect(result.data.books).toHaveLength(2)
    expect(result.error).toContain('กำลังแสดงข้อมูลที่โหลดสำเร็จครั้งก่อน')
  })
})
