const steps = ['อารมณ์', 'หมวด', 'ปัดหนังสือ', 'เจอเล่มที่ใช่', 'รีวิว', 'อันดับ']

export function ProgressSteps({ active }: { active: number }) {
  return <ol className="progress-steps" aria-label={`ขั้นตอนที่ ${active} จาก ${steps.length}`}>
    {steps.map((step, index) => <li key={step} className={index + 1 <= active ? 'active' : ''}><span>{index + 1}</span><em>{step}</em></li>)}
  </ol>
}
