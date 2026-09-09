// Risk-factor / warning-sign keyword scan. SPEC 4.4.
// The scan runs over the joined text of the ten risk+sign cells (SLEvent.riskCells + .signCells,
// ชีต2 cols 27-36). "ปัจจัย 3 อื่นๆ" (col 30) is not a keyword match — it fires whenever that
// single cell is non-empty and not '-', which is why it carries an empty `keywords` array and a
// `cellIndex` instead (0-based index into riskCells: cols 27,28,29,30 -> indexes 0,1,2,3).

export interface KeywordFactor {
  key: string
  label: string
  /** Substrings to look for in the joined risk/sign text. Empty when `cellIndex` is used instead. */
  keywords: string[]
  /** When set, ignore `keywords` and test riskCells[cellIndex] for non-empty / not '-' instead. */
  cellIndex?: number
}

/** ปัจจัยเสี่ยงหลัก (ชีต2 cols 27-30). Denominator = ผู้ป่วยรายเก่า rows (SPEC 4.4). */
export const RISK_KEYWORDS: KeywordFactor[] = [
  {
    key: 'missed_meds',
    label: 'ขาดยา/ไม่มาตามนัด',
    keywords: ['ขาดยา', 'ขาดการรักษา', 'รักษาไม่ต่อเนื่อง', 'ไม่มาตามนัด'],
  },
  {
    key: 'relapse',
    label: 'กลับมาเสพซ้ำ',
    keywords: ['เสพซ้ำ', 'กลีบมาเสพ'], // 'กลีบมาเสพ' is a typo seen in the real data — kept verbatim
  },
  {
    key: 'other',
    label: 'อื่นๆ',
    keywords: [],
    cellIndex: 3, // riskCells[3] = col 30 (อื่น ๆ)
  },
]

/** สัญญาณเตือน (ชีต2 cols 31-36). Denominator = all filtered events (SPEC 4.4). */
export const SIGN_KEYWORDS: KeywordFactor[] = [
  { key: 'irritable', label: 'หงุดหงิดฉุนเฉียว', keywords: ['หงุดหงิด'] },
  { key: 'paranoid', label: 'เที่ยวหวาดระแวง', keywords: ['ระแวง'] },
  {
    key: 'talking_alone',
    label: 'พูดจาคนเดียว',
    keywords: ['พูดคนเดียว', 'พูดจาคนเดียว', 'พูดตนเดียว', 'หูแวว', 'หลอน'],
  },
  { key: 'sleepless', label: 'ไม่หลับไม่นอน', keywords: ['ไม่หลับ', 'นอนไม่หลับ'] },
  { key: 'wandering', label: 'เดินไปเดินมา', keywords: ['เดินไป'] },
]
