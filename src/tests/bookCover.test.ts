import { act, createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BookCover } from '../components/BookCover'
import type { Book } from '../types'

const book: Book = {
  id: 'cover-test',
  title: 'หนังสือทดสอบภาพปก',
  author: 'ผู้เขียนทดสอบ',
  categoryId: '000',
  moodTags: [],
  description: 'ใช้ทดสอบสถานะภาพปก',
  coverUrl: 'https://example.com/slow-cover.jpg',
  shelfCode: 'TEST',
  shelfDescription: 'ชั้นทดสอบ',
  featured: false,
  active: true,
  displayOrder: 1,
  popularity: 0,
  accent: '#b96b5e',
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('BookCover', () => {
  it('keeps a slow image mounted and accepts a late load event', () => {
    vi.useFakeTimers()
    const { container } = render(createElement(BookCover, { book, loading: 'eager' }))
    const image = container.querySelector('img')

    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('alt', '')

    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดภาพปกนานกว่าปกติ')
    expect(container.querySelector('img')).toBe(image)
    expect(screen.queryByText('ไม่มีภาพปก')).not.toBeInTheDocument()

    fireEvent.load(image!)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: `ปกหนังสือ ${book.title}` })).toHaveClass('book-cover--loaded')
  })

  it('retries a confirmed error once before showing the final fallback', () => {
    vi.useFakeTimers()
    const { container } = render(createElement(BookCover, { book }))

    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy')
    fireEvent.error(container.querySelector('img')!)
    expect(screen.queryByText('ไม่มีภาพปก')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(600))
    const retryImage = container.querySelector('img')
    expect(retryImage).toBeInTheDocument()
    expect(retryImage).toHaveAttribute('src', book.coverUrl)

    fireEvent.error(retryImage!)
    expect(screen.getByText('ไม่มีภาพปก')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(5_000))
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('clears a stale retry when the component receives a new cover URL', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(createElement(BookCover, { book }))
    fireEvent.error(container.querySelector('img')!)

    const nextBook = { ...book, id: 'new-cover', coverUrl: 'https://example.com/new-cover.jpg' }
    rerender(createElement(BookCover, { book: nextBook }))
    act(() => vi.advanceTimersByTime(1_000))

    expect(container.querySelector('img')).toHaveAttribute('src', nextBook.coverUrl)
    expect(screen.queryByText('ไม่มีภาพปก')).not.toBeInTheDocument()
  })

  it('uses the final fallback immediately for an empty or invalid URL', () => {
    const invalidBook = { ...book, coverUrl: 'not-a-valid-url' }
    const { rerender } = render(createElement(BookCover, { book: invalidBook }))
    expect(screen.getByText('ไม่มีภาพปก')).toBeInTheDocument()

    rerender(createElement(BookCover, { book: { ...book, coverUrl: '' } }))
    expect(screen.getByText('ไม่มีภาพปก')).toBeInTheDocument()
  })
})
