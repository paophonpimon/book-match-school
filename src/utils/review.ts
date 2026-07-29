export function validateReview(review: string, rating: number, minChars = 20) {
  const text = review.trim()
  if (rating < 1 || rating > 5) return 'กรุณาให้ดาวหนังสือ 1–5 ดาว'
  if (text.length < minChars) return `รีวิวต้องมีอย่างน้อย ${minChars} ตัวอักษร`
  if (text.length > 300) return 'รีวิวต้องไม่เกิน 300 ตัวอักษร'
  return null
}
