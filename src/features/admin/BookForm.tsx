import { useRef, useState, type FormEvent } from 'react'
import { BookOpen, Check, LoaderCircle, Save, X } from 'lucide-react'
import {
  adminCategoryOptions,
  adminMoodOptions,
  adminTagOptions,
  isDuplicateAdminBook,
  type AdminBook,
  type AdminBookInput,
  validateAdminBook,
} from '../../services/adminBooks'
import { createBookAsAdmin, updateBookAsAdmin } from '../../services/adminAuth'

export const emptyAdminBook: AdminBookInput = {
  title: '',
  author: '',
  categoryCode: '',
  category: '',
  description: '',
  coverUrl: '',
  audioUrl: '',
  isbn: '',
  callNumber: '',
  tags: [],
  moods: [],
  readingLevel: '',
  recommendedGrades: '',
  matchReason: '',
  active: true,
}

function inputFromBook(book?: AdminBook | null): AdminBookInput {
  if (!book) return { ...emptyAdminBook }
  const { id: _id, ...input } = book
  void _id
  return input
}

interface BookFormProps {
  editingBook?: AdminBook | null
  books: AdminBook[]
  onSaved: (bookId: string) => Promise<void>
  onCancel: () => void
}

export function BookForm({ editingBook, books, onSaved, onCancel }: BookFormProps) {
  const [book, setBook] = useState<AdminBookInput>(() => inputFromBook(editingBook))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submitLock = useRef(false)
  const editing = Boolean(editingBook)
  const availableTags = [...new Set([...adminTagOptions, ...book.tags])]

  function update<K extends keyof AdminBookInput>(field: K, value: AdminBookInput[K]) {
    setBook((current) => ({ ...current, [field]: value }))
    setError('')
  }

  function toggleMood(mood: string) {
    setError('')
    setBook((current) => {
      if (current.moods.includes(mood)) {
        return { ...current, moods: current.moods.filter((item) => item !== mood) }
      }
      if (current.moods.length >= 3) {
        setError('เลือกอารมณ์ได้สูงสุด 3 ข้อ')
        return current
      }
      return { ...current, moods: [...current.moods, mood] }
    })
  }

  function toggleTag(tag: string) {
    setError('')
    setBook((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }))
  }

  function selectCategory(categoryCode: string) {
    const selected = adminCategoryOptions.find((option) => option.code === categoryCode)
    setBook((current) => ({
      ...current,
      categoryCode,
      category: selected?.name ?? '',
    }))
    setError('')
  }

  function selectCategoryName(categoryName: string) {
    const selected = adminCategoryOptions.find((option) => option.name === categoryName)
    setBook((current) => ({
      ...current,
      categoryCode: selected?.code ?? '',
      category: categoryName,
    }))
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitLock.current) return
    const payload = book
    const validationError = validateAdminBook(payload)
    if (validationError) {
      setError(validationError)
      return
    }
    if (isDuplicateAdminBook(books, payload, editingBook?.id)) {
      setError('มีหนังสือชื่อและผู้แต่งนี้อยู่แล้ว กรุณาตรวจสอบรายการเดิม')
      return
    }

    submitLock.current = true
    setSubmitting(true)
    setError('')
    try {
      const bookId = editingBook
        ? await updateBookAsAdmin(editingBook.id, payload)
        : await createBookAsAdmin(payload)
      await onSaved(bookId)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'บันทึกหนังสือไม่สำเร็จ กรุณาลองอีกครั้ง')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-book-form-panel" id="book-form">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{editing ? 'แก้ไขข้อมูล' : 'เพิ่มรายการใหม่'}</p>
          <h2>{editing ? editingBook?.title : 'เพิ่มหนังสือเข้า Cloud Firestore'}</h2>
        </div>
        <button className="icon-button" type="button" aria-label="ปิดแบบฟอร์ม" onClick={onCancel}><X /></button>
      </div>

      <div className="admin-form-layout">
        <form onSubmit={submit} noValidate>
          <div className="form-row">
            <label>ชื่อหนังสือ<input value={book.title} onChange={(event) => update('title', event.target.value)} maxLength={180} required /></label>
            <label>ผู้แต่ง<input value={book.author} onChange={(event) => update('author', event.target.value)} maxLength={120} required /></label>
          </div>
          <div className="form-row">
            <label>
              รหัสหมวด
              <select value={book.categoryCode} onChange={(event) => selectCategory(event.target.value)} required>
                <option value="">เลือก…</option>
                {adminCategoryOptions.map(({ code, name }) => <option key={code} value={code}>{code} — {name}</option>)}
              </select>
              <small className="admin-field-help">เลือกหมวดแล้วระบบจะเติมชื่อหมวดให้อัตโนมัติ</small>
            </label>
            <label>
              ชื่อหมวด
              <select value={book.category} onChange={(event) => selectCategoryName(event.target.value)} required>
                <option value="">เลือก…</option>
                {adminCategoryOptions.map(({ code, name }) => <option key={code} value={name}>{name} ({code})</option>)}
              </select>
              <small className="admin-field-help">เลือกชื่อหมวดแล้วระบบจะเติมรหัสหมวดให้อัตโนมัติ</small>
            </label>
          </div>
          <label>คำอธิบาย<textarea value={book.description} onChange={(event) => update('description', event.target.value)} rows={4} maxLength={1200} required /></label>
          <label>
            เหตุผลที่แนะนำ
            <textarea
              value={book.matchReason}
              onChange={(event) => update('matchReason', event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="เช่น อ่านง่าย ได้ความรู้ และเหมาะกับคนที่ชอบเรื่องผจญภัย"
              aria-describedby="match-reason-help"
            />
            <small className="admin-field-help" id="match-reason-help">ข้อความสั้น ๆ ที่บอกนักเรียนว่าทำไมหนังสือเล่มนี้น่าอ่านหรือเหมาะกับใคร</small>
          </label>
          <div className="form-row">
            <label>URL รูปปก<input type="url" value={book.coverUrl} onChange={(event) => update('coverUrl', event.target.value)} placeholder="https://…" /></label>
            <label>URL เสียงอ่าน<input type="url" value={book.audioUrl} onChange={(event) => update('audioUrl', event.target.value)} placeholder="https://…" /></label>
          </div>
          <div className="form-row">
            <label>
              ISBN
              <input
                value={book.isbn}
                onChange={(event) => update('isbn', event.target.value)}
                maxLength={30}
                placeholder="เช่น 9786161234567"
                aria-describedby="isbn-help"
              />
              <small className="admin-field-help" id="isbn-help">รหัสสากลประจำหนังสือ 10 หรือ 13 หลัก ดูได้จากปกหลังหรือหน้าลิขสิทธิ์ ไม่บังคับกรอก</small>
            </label>
            <label>
              เลขเรียกหนังสือ
              <input
                value={book.callNumber}
                onChange={(event) => update('callNumber', event.target.value)}
                maxLength={60}
                placeholder="เช่น 895.913 ก123น"
                aria-describedby="call-number-help"
              />
              <small className="admin-field-help" id="call-number-help">รหัสบนสันหนังสือที่ใช้ค้นหาตำแหน่งบนชั้น เช่น หมวดดิวอี้และอักษรผู้แต่ง ไม่บังคับกรอก</small>
            </label>
          </div>
          <fieldset>
            <legend>แท็ก <small>เลือกได้หลายข้อ</small></legend>
            <div className="admin-tag-grid">
              {availableTags.map((tag) => {
                const selected = book.tags.includes(tag)
                return (
                  <button
                    type="button"
                    key={tag}
                    className={selected ? 'selected' : ''}
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag)}
                  >
                    {selected && <Check />} {tag}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div className="form-row">
            <label>ระดับการอ่าน<input value={book.readingLevel} onChange={(event) => update('readingLevel', event.target.value)} maxLength={80} /></label>
            <label>ชั้นที่แนะนำ<input value={book.recommendedGrades} onChange={(event) => update('recommendedGrades', event.target.value)} maxLength={80} /></label>
          </div>
          <fieldset>
            <legend>อารมณ์ที่เหมาะกับหนังสือ <small>เลือก 1–3 ข้อ</small></legend>
            <div className="admin-mood-grid">
              {adminMoodOptions.map((mood) => {
                const selected = book.moods.includes(mood)
                return <button type="button" key={mood} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => toggleMood(mood)}>{selected && <Check />} {mood}</button>
              })}
            </div>
          </fieldset>
          <label className="admin-active-toggle"><input type="checkbox" checked={book.active} onChange={(event) => update('active', event.target.checked)} /><span><strong>เปิดแสดงหนังสือ</strong><small>หากปิด รายการจะอยู่ในหน้าหนังสือที่ซ่อน</small></span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="button-row">
            <button className="button button--secondary" type="button" onClick={onCancel} disabled={submitting}>ยกเลิก</button>
            <button className="button button--primary" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" /> กำลังบันทึก…</> : <><Save /> {editing ? 'บันทึกการแก้ไข' : 'เพิ่มหนังสือ'}</>}</button>
          </div>
        </form>

        <aside className="admin-book-preview" aria-label="ตัวอย่างการ์ดหนังสือ">
          <p className="eyebrow">ตัวอย่างก่อนบันทึก</p>
          <div className="admin-preview-cover">
            {book.coverUrl
              ? <img src={book.coverUrl} alt="" loading="lazy" />
              : <BookOpen aria-hidden="true" />}
          </div>
          <span>{book.categoryCode || '000'} · {book.category || 'ยังไม่ระบุหมวด'}</span>
          <h3>{book.title || 'ชื่อหนังสือ'}</h3>
          <p>{book.author || 'ชื่อผู้แต่ง'}</p>
          <div className="admin-mood-chips">{book.moods.map((mood) => <small key={mood}>{mood}</small>)}</div>
          <em className={book.active ? 'status-pill' : 'status-pill status-pill--hidden'}>{book.active ? 'เปิดใช้งาน' : 'ซ่อน'}</em>
        </aside>
      </div>
    </section>
  )
}
