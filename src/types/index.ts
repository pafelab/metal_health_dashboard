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

  suicideAgeGroup: string // col 11 ช่วงอายุ
  diagnosis: string // col 12
  patientGroup: string // col 13 (5 groups)
  patientClass: string // col 14 เก่า/ใหม่
  treatmentHistory: string // col 15
  suicide: string // col 16
  suicideMethod: string
  suicideCause: string
  suicideLocation: string

  injured: number
  deaths: number

  assistance: string // col 26
  riskCells: string[] // cols 27-30
  signCells: string[] // cols 31-36
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
