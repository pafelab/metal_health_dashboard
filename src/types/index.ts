// Frozen public contract — see SPEC.md and docs/BUILD_NOTES.md.
// Do not rename any exported symbol here without updating every consumer.

/** Severity of an event as shown on KPI cards / table badges. */
export type Severity = 'black' | 'red' | 'yellow' | 'unknown'

/** All chart shapes the switcher (SPEC 7) can render a widget as. */
export type ChartType =
  | 'bar'
  | 'hbar'
  | 'line'
  | 'area'
  | 'step'
  | 'pie'
  | 'donut'
  | 'rose'
  | 'treemap'
  | 'funnel'
  /** Stacked bar — SPEC 6.1 widget 11 (ช่วงวัย x เพศ) switches to this. */
  | 'stacked'
  /** Table view — SPEC 6.1 widget 9 defaults to this; only GroupImpactTable renders it. */
  | 'table'

/** One category → count pair, used by every bar/pie/treemap/funnel widget. */
export interface CategoryCount {
  name: string
  value: number
}

/** One point on a time-series (monthly trend etc.). */
export interface SeriesPoint {
  label: string // e.g. 'ต.ค. 68'
  value: number
  sortKey: number // year*12 + month, for chronological sort
}

/** ชาย / หญิง / อื่นๆ counts used by gender widgets. */
export interface GenderSplit {
  male: number
  female: number
  other: number
  total: number
}

/** One ชีต2 row (Section 1 — Social Listening). SPEC 3.2. */
export interface SLEvent {
  zone: number | null
  month: number | null
  year: number | null
  sortKey: number
  monthLabel: string // 'ต.ค. 68'

  province: string
  headline: string
  link: string

  severity: Severity
  severityRaw: string

  reporting: string // การส่งรายงาน raw text

  gender: string
  ageRaw: string
  age: number | null
  ageBand: string

  suicideAgeGroup: string // col 11 ช่วงอายุ — normalized to 'ต่ำกว่า 18 ปี' / '≥ 18 ปี'
  diagnosis: string // col 12 การประเมินกลุ่มผู้ป่วย — raw, 7 groups (see CATEGORY_ORDERS.patientGroup7)
  patientGroup: string // col 13 (5 groups)
  /** col 14 RAW. Kept byte-compatible with the pre-2026-09-12 schema (ผู้ป่วยรายเก่า/ใหม่) for the
   *  widgets and scripts that still read it; use `patientStatus` for the new 5-way status. */
  patientClass: string
  /** col 14 NORMALIZED — the 5-way ประเภทผู้ป่วย status (CATEGORY_ORDERS.patientStatus5):
   *  quotes/inner spaces stripped and the single legacy row aliased. SPEC refresh 2026-09-12. */
  patientStatus: string
  treatmentHistory: string // col 15
  suicide: string // col 16
  suicideMethod: string
  suicideCause: string
  suicideLocation: string

  injured: number
  deaths: number

  assistance: string // col 26

  /** Raw text of the 4 risk-factor columns, one per RISK_KEYWORDS entry, in that order.
   *  Current schema: cols 74-77 (single-value flag columns). Old schema: cols 27-30 free text. */
  riskCells: string[]
  /** Raw text of the 5 warning-sign columns (one per SIGN_KEYWORDS entry, in that order) plus the
   *  "no psychiatric symptom" column last — 6 cells. Current schema: cols 78-82 + 83. */
  signCells: string[]

  /** One per RISK_KEYWORDS entry, in that order — cols 74-77 read as FLAGS (cell non-empty). */
  riskFlags: boolean[]
  /** One per SIGN_KEYWORDS entry, in that order — cols 78-82 read as FLAGS (cell non-empty).
   *  NOTE: SIGN_KEYWORDS order is NOT column order; the resolver maps each factor to its own
   *  column by header name, so signFlags[i] always belongs to SIGN_KEYWORDS[i]. */
  signFlags: boolean[]
  /** col 84 `5สัญญาณเตือน` — the sheet's OWN มี/ไม่มี answer, kept as a cross-check against
   *  signFlags (they disagree on a handful of rows). '' when the column is absent. */
  fiveSignsAnswer: string
}

/** One wide-tab Section 2 (ภัยอื่นๆ) row. SPEC 3.3. */
export interface HazardEvent {
  zone: number | null
  month: number | null
  year: number | null
  sortKey: number
  monthLabel: string

  province: string
  headline: string
  link: string

  severity: Severity
  severityRaw: string

  reporting: string // col 40

  hazards: string[] // resolved hazard-type labels, >=1 (fallback 'ภัยอื่นๆ (ไม่ระบุ)')

  /** เจ้าหน้าที่ที่ได้รับผลกระทบบาดเจ็บ — col 47. '-' / blank parse as 0. */
  officerInjured: number
  /** เจ้าหน้าที่ได้รับผลกระทบเสียชีวิต — col 48. */
  officerDead: number
  /** ประชาชนที่ได้รับผลกระทบบาดเจ็บ — col 50. */
  publicInjured: number
  /** ประชาชนที่ได้รับผลกระทบเสียชีวิต — col 51. */
  publicDead: number
}

/** One MCATT / SMI-V directory person. SPEC 3.4. */
export interface McattPerson {
  zone: number
  name: string
  phone: string
  agency: string
  lineId: string
  lineName: string
  mcatt: boolean
  smiv: boolean
}

/** Current filter selection (SPEC 5.2). */
export interface Filters {
  fromMonth: string // 'YYYY-MM' in BUDDHIST year, or '' for none
  toMonth: string
  zone: number | 'all'
  province: string // '' = all
  hazardType: string // HazardTypeKey
}

/** Result of the timeliness score computation (SPEC 6.4). */
export interface TimelinessResult {
  pass: number
  total: number
  percent: number | null
  level: string
  color: string
  icon: string
}
