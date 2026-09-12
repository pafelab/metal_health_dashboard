// ปัจจัยเสี่ยง / สัญญาณเตือน factor definitions. SPEC 4.4 + review deck แก้งับ.pdf slides 13-14.
//
// SCHEMA REFRESH 2026-09-12 (docs/BUILD_NOTES.md "SHEET SCHEMA REFRESHED"): the sheet owner turned
// these into clean single-value FLAG columns — cols 74-77 (risk) and 78-82 (signs). A factor is
// present iff its own cell is non-empty and not '-'; there is nothing left to keyword-scan.
// `headers` is therefore the primary resolution path and `keywords` is only the FALLBACK for the
// pre-refresh 84-column schema (GID_WIDE_FALLBACK) and the legacy narrow ชีต2 tab, where the same
// information sat in free text at cols 27-36.
//
// The keyword strings are matched against the RAW DATA, so a typo that exists in the data
// ('กลีบมาเสพ') must stay spelled the way the data spells it — `label` is display-only and is
// deliberately NOT kept in sync with `keywords`.

export interface KeywordFactor {
  key: string
  /** Display label (Thai, deck wording). Never used for matching. */
  label: string
  /**
   * Header names of the column(s) that carry this factor, most-current first. Several names may
   * match at once: the pre-refresh schema split "ขาดยา/ไม่มาตามนัด" across TWO columns, and both
   * are OR-ed into this one factor. Resolved by src/data/parseSheet2.ts.
   */
  headers: string[]
  /** Current-schema column index, used only when no header name matches. */
  index: number
  /** Fallback substrings, scanned over the joined risk/sign free text when no column resolves. */
  keywords: string[]
  /**
   * Legacy marker from the free-text era: "this factor is a bare flag cell, not a keyword match"
   * (0-based index into riskCells). Superseded by `headers`/`index` — flag semantics now apply to
   * every factor — but kept so nothing that reads the config breaks.
   */
  cellIndex?: number
}

/**
 * ปัจจัยเสี่ยง (cols 74-77), in the deck's slide-13 order.
 * Denominator = rows whose ประเภทผู้ป่วย is one of the four psychiatric/substance statuses —
 * see riskFactors() in src/data/aggregate.ts.
 */
export const RISK_KEYWORDS: KeywordFactor[] = [
  {
    key: 'missed_meds',
    label: 'ขาดยา/ไม่มาตามนัด',
    // 'ขาดยา' and 'ไม่มาตามนัด' were two separate columns before the refresh; both feed this one.
    headers: ['ขาดยา/ไม่มาตามนัด', 'ขาดยา', 'ไม่มาตามนัด'],
    index: 74,
    keywords: ['ขาดยา', 'ขาดการรักษา', 'รักษาไม่ต่อเนื่อง', 'ไม่มาตามนัด'],
  },
  {
    key: 'relapse',
    label: 'กลับมาใช้สารเสพติดซ้ำ',
    headers: ['กลับมาใช้สารเสพติดซ้ำ', 'กลับมาเสพซ้ำ'],
    index: 75,
    keywords: ['เสพซ้ำ', 'กลีบมาเสพ'], // 'กลีบมาเสพ' is a typo seen in the real data — kept verbatim
  },
  {
    key: 'substance_co_use',
    label: 'การใช้สารเสพติดร่วมด้วย',
    // The deck's NEW 4th factor — it has NO equivalent column in the pre-refresh schema, so on a
    // fallback fetch it stays 0 (the resolver warns) rather than borrowing a neighbouring column.
    headers: ['มีการใช้สารเสพติดร่วมด้วย'],
    index: 76,
    keywords: [],
  },
  {
    key: 'other',
    label: 'อื่นๆ',
    headers: ['อื่น ๆ'],
    index: 77,
    keywords: [],
    cellIndex: 3,
  },
]

/**
 * สัญญาณเตือน (cols 78-82). Denominator = ALL filtered events (deck slide 14:
 * "จะหารจำนวนข่าวทั้งหมด เพราะทุกคนสามารถเป็น 5 สัญญาณได้").
 *
 * This array's order is the DISPLAY order and is deliberately NOT the column order (78-82 run
 * ไม่หลับไม่นอน / เดินไปเดินมา / พูดจาคนเดียว / หงุดหงิดฉุนเฉียว / เที่ยวหวาดระแวง). Each factor
 * carries its own `headers`/`index`, so SLEvent.signFlags[i] always belongs to SIGN_KEYWORDS[i].
 */
export const SIGN_KEYWORDS: KeywordFactor[] = [
  {
    key: 'irritable',
    label: 'หงุดหงิดฉุนเฉียว',
    headers: ['หงุดหงิดฉุนเฉียว', 'หงุดหงิด'],
    index: 81,
    keywords: ['หงุดหงิด'],
  },
  {
    key: 'paranoid',
    label: 'เที่ยวหวาดระแวง',
    headers: ['เที่ยวหวาดระแวง'],
    index: 82,
    keywords: ['ระแวง'],
  },
  {
    key: 'talking_alone',
    label: 'พูดจาคนเดียว',
    headers: ['พูดจาคนเดียว'],
    index: 80,
    keywords: ['พูดคนเดียว', 'พูดจาคนเดียว', 'พูดตนเดียว', 'หูแวว', 'หลอน'],
  },
  {
    key: 'sleepless',
    label: 'ไม่หลับไม่นอน',
    headers: ['ไม่หลับไม่นอน'],
    index: 78,
    keywords: ['ไม่หลับ', 'นอนไม่หลับ'],
  },
  {
    key: 'wandering',
    label: 'เดินไปเดินมา',
    headers: ['เดินไปเดินมา'],
    index: 79,
    keywords: ['เดินไป'],
  },
]
