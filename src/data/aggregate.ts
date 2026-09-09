// Pure aggregators over already-parsed SLEvent[] / HazardEvent[] rows. No echarts types here —
// chart option builders (src/components/charts/*) consume this plain data. SPEC 4.4-4.6, 6.1-6.2.

import type { CategoryCount, SeriesPoint, GenderSplit, SLEvent, HazardEvent, Severity } from '@/types'
import {
  ALL_PROVINCES,
  AGE_BANDS,
  CATEGORY_ORDERS,
  RISK_KEYWORDS,
  SIGN_KEYWORDS,
  HAZARD_TYPES,
  HAZARD_UNSPECIFIED_LABEL,
  THAI_MONTHS,
} from '@/config'
import { collapseWs } from './normalize'

/**
 * Count rows by a category value. Blank and '-' cells are dropped (SPEC 4.5).
 *
 * Without `order`: only categories that actually occur, sorted by count descending.
 * With `order`: every listed category is included (even at count 0, so a fixed-shape chart
 * like the 5-group patient bar or the 6-hazard pie never "loses" a slice), matched against the
 * data whitespace-insensitively (SPEC 3.2's diagnosis column has a double space that a naive
 * literal match can miss depending on how it round-trips — see docs/BUILD_NOTES.md). Category
 * values found in the data but absent from `order` are appended afterwards, sorted by count
 * descending, never dropped (SPEC 4.5).
 */
export function countBy<T>(rows: T[], pick: (row: T) => string, order?: string[]): CategoryCount[] {
  const rawCounts = new Map<string, number>()
  for (const row of rows) {
    const raw = pick(row)
    const v = raw == null ? '' : String(raw).trim()
    if (v === '' || v === '-') continue
    rawCounts.set(v, (rawCounts.get(v) ?? 0) + 1)
  }

  if (!order || order.length === 0) {
    return Array.from(rawCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  const consumed = new Set<string>()
  const result: CategoryCount[] = order.map((label) => {
    const target = collapseWs(label)
    let value = 0
    rawCounts.forEach((count, raw) => {
      if (collapseWs(raw) === target) {
        value += count
        consumed.add(raw)
      }
    })
    return { name: label, value }
  })

  const extras: CategoryCount[] = []
  rawCounts.forEach((value, raw) => {
    if (!consumed.has(raw)) extras.push({ name: raw, value })
  })
  extras.sort((a, b) => b.value - a.value)

  return [...result, ...extras]
}

/** Top N categories by count descending. Blank/'-' dropped, no fixed order. */
export function topN<T>(rows: T[], pick: (row: T) => string, n: number): CategoryCount[] {
  return countBy(rows, pick).slice(0, n)
}

/**
 * SPEC 6.1 widget 8 — การวินิจฉัยโรค (ชีต2 col 12) restricted to the 3 psychiatric values
 * (SPEC 3.2). This column is the one place SPEC 3.2 and SPEC 4.5 disagree: 4.5's general
 * countBy() contract appends any value outside the fixed order rather than dropping it (12+
 * other widgets depend on that append-extras behaviour), but 3.2 says the 4 non-psychiatric
 * diagnosis values (ไม่พบประวัติ, มีประวัติใช้สารเสพติด, ผู้ป่วย SMI-V,
 * ข้อมูลไม่เพียงพอต่อการตรวจสอบ — these belong to the SEPARATE ผู้ป่วยจิตเวช/อื่นๆ group column,
 * not this diagnosis pie) are "excluded from the pie". Pre-filtering to the allowed set before
 * calling countBy keeps countBy's general contract intact for every other consumer while giving
 * this one widget the SPEC 3.2 shape: 3 slices, total 170 (BUILD_NOTES: 89 + 64 + 17).
 */
export function psychiatricDiagnosisCounts(rows: SLEvent[]): CategoryCount[] {
  const allowed = new Set(CATEGORY_ORDERS.diagnosis.map(collapseWs))
  const filtered = rows.filter((r) => allowed.has(collapseWs(r.diagnosis)))
  return countBy(filtered, (r) => r.diagnosis, CATEGORY_ORDERS.diagnosis)
}

/** Monthly trend, every month present in the data, sorted chronologically. SPEC 4.1. Rows with
 *  an unresolved month/year (sortKey 0) are excluded — they cannot be placed on the timeline. */
export function monthlyTrend(rows: { sortKey: number; monthLabel: string }[]): SeriesPoint[] {
  const byKey = new Map<number, { label: string; value: number }>()
  for (const row of rows) {
    if (row.sortKey <= 0) continue
    const existing = byKey.get(row.sortKey)
    if (existing) existing.value++
    else byKey.set(row.sortKey, { label: row.monthLabel, value: 1 })
  }
  return Array.from(byKey.entries())
    .map(([sortKey, v]) => ({ label: v.label, value: v.value, sortKey }))
    .sort((a, b) => a.sortKey - b.sortKey)
}

/** Counts by province, all 77 provinces in zone order (0-filled) so a density map always has
 *  every feature; any value that didn't normalise to a known province is appended as an extra. */
export function provinceCounts(rows: { province: string }[]): CategoryCount[] {
  return countBy(rows, (r) => r.province, ALL_PROVINCES)
}

/** Counts by zone, all 13 zones in order (0-filled), labelled 'เขต N'. */
export function zoneCounts(rows: { zone: number | null }[]): CategoryCount[] {
  const order = Array.from({ length: 13 }, (_, i) => `เขต ${i + 1}`)
  return countBy(rows, (r) => (r.zone === null ? '' : `เขต ${r.zone}`), order)
}

/** KPI severity counts. `total` is every row regardless of severity (an 'unknown' row still
 *  counts toward ทั้งหมด, it just has no badge colour of its own). */
export function severityCounts(rows: { severity: Severity }[]): {
  black: number
  red: number
  yellow: number
  total: number
} {
  let black = 0
  let red = 0
  let yellow = 0
  for (const row of rows) {
    if (row.severity === 'black') black++
    else if (row.severity === 'red') red++
    else if (row.severity === 'yellow') yellow++
  }
  return { black, red, yellow, total: rows.length }
}

/** Six age bands (SPEC 4.3), each split by gender. `total` is every row in the band regardless
 *  of gender, so the six bands still sum to the full row count even if a future gender value
 *  other than ชาย/หญิง appears. */
export function ageBandByGender(rows: { ageBand: string; gender: string }[]): {
  band: string
  male: number
  female: number
  total: number
}[] {
  return AGE_BANDS.map((band) => {
    let male = 0
    let female = 0
    let total = 0
    for (const row of rows) {
      if (row.ageBand !== band.label) continue
      total++
      const g = collapseWs(row.gender)
      if (g === 'ชาย') male++
      else if (g === 'หญิง') female++
    }
    return { band: band.label, male, female, total }
  })
}

/** Overall gender split. `other` = rows whose gender is neither ชาย nor หญิง (blank included). */
export function genderSplit(rows: { gender: string }[]): GenderSplit {
  let male = 0
  let female = 0
  for (const row of rows) {
    const g = collapseWs(row.gender)
    if (g === 'ชาย') male++
    else if (g === 'หญิง') female++
  }
  const total = rows.length
  return { male, female, other: total - male - female, total }
}

/** Deaths / injuries summed per patient group (SPEC 6.1 widget 9), fixed 5-group order with any
 *  unlisted value appended. */
export function impactByPatientGroup(rows: { patientGroup: string; deaths: number; injured: number }[]): {
  group: string
  deaths: number
  injured: number
}[] {
  const sums = new Map<string, { deaths: number; injured: number }>()
  for (const row of rows) {
    const v = row.patientGroup.trim()
    if (v === '' || v === '-') continue
    const cur = sums.get(v) ?? { deaths: 0, injured: 0 }
    cur.deaths += row.deaths
    cur.injured += row.injured
    sums.set(v, cur)
  }

  const consumed = new Set<string>()
  const result = CATEGORY_ORDERS.patientGroup.map((label) => {
    const target = collapseWs(label)
    let deaths = 0
    let injured = 0
    sums.forEach((val, raw) => {
      if (collapseWs(raw) === target) {
        deaths += val.deaths
        injured += val.injured
        consumed.add(raw)
      }
    })
    return { group: label, deaths, injured }
  })

  const extras: { group: string; deaths: number; injured: number }[] = []
  sums.forEach((val, raw) => {
    if (!consumed.has(raw)) extras.push({ group: raw, deaths: val.deaths, injured: val.injured })
  })

  return [...result, ...extras]
}

/** Join the ten risk+sign cells (SPEC 4.4) into one scan string; blank/'-' cells are ignored. */
function joinRiskSignCells(riskCells: string[], signCells: string[]): string {
  return [...riskCells, ...signCells]
    .map((c) => c.trim())
    .filter((c) => c !== '' && c !== '-')
    .join(' ')
}

/**
 * Risk factors (SPEC 4.4). Scanned over the ผู้ป่วยรายเก่า subset only — the denominator N is
 * defined as that subset ("จาก N ผู้ป่วยรายเก่า · มีปัจจัยเสี่ยง M ราย"), and a risk-factor
 * history is only meaningful for a returning patient, so both the per-factor breakdown and the
 * `affected` count are scoped the same way M stays a true subset of N.
 */
export function riskFactors(rows: SLEvent[]): { items: CategoryCount[]; denominator: number; affected: number } {
  const oldPatientRows = rows.filter((r) => collapseWs(r.patientClass) === collapseWs(CATEGORY_ORDERS.patientClass[0]))
  const denominator = oldPatientRows.length
  const items: CategoryCount[] = RISK_KEYWORDS.map((k) => ({ name: k.label, value: 0 }))
  let affected = 0

  for (const row of oldPatientRows) {
    const text = joinRiskSignCells(row.riskCells, row.signCells)
    let hasAny = false
    RISK_KEYWORDS.forEach((k, i) => {
      let match: boolean
      if (k.cellIndex !== undefined) {
        const c = (row.riskCells[k.cellIndex] ?? '').trim()
        match = c !== '' && c !== '-'
      } else {
        match = k.keywords.some((kw) => text.includes(kw))
      }
      if (match) {
        items[i].value++
        hasAny = true
      }
    })
    if (hasAny) affected++
  }

  return { items, denominator, affected }
}

/** Warning signs (SPEC 4.4). Denominator = all filtered events; scanned over every row. */
export function warningSigns(rows: SLEvent[]): { items: CategoryCount[]; denominator: number; affected: number } {
  const denominator = rows.length
  const items: CategoryCount[] = SIGN_KEYWORDS.map((k) => ({ name: k.label, value: 0 }))
  let affected = 0

  for (const row of rows) {
    const text = joinRiskSignCells(row.riskCells, row.signCells)
    let hasAny = false
    SIGN_KEYWORDS.forEach((k, i) => {
      const match = k.keywords.some((kw) => text.includes(kw))
      if (match) {
        items[i].value++
        hasAny = true
      }
    })
    if (hasAny) affected++
  }

  return { items, denominator, affected }
}

/** Suicide subset (SPEC 4.6): การฆ่าตัวตาย not blank and not '-'. */
export function suicideSubset(rows: SLEvent[]): SLEvent[] {
  return rows.filter((r) => {
    const t = r.suicide.trim()
    return t !== '' && t !== '-'
  })
}

/** Hazard-type pie (SPEC 3.3): counted once per flag a row carries; the 6 flag categories plus
 *  the ภัยอื่นๆ (ไม่ระบุ) fallback are always present (0-filled) so the legend never drops a slice. */
export function hazardTypeCounts(rows: HazardEvent[]): CategoryCount[] {
  const order = [...HAZARD_TYPES.map((h) => h.label), HAZARD_UNSPECIFIED_LABEL]
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const label of row.hazards) counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return order.map((name) => ({ name, value: counts.get(name) ?? 0 }))
}

/**
 * 'ข้อมูลล่าสุดถึง <เดือน ปี>' body text (SPEC 3.5), e.g. 'มิถุนายน 2569'. The newest month in
 * the data that is NOT in the future relative to `now` (BUILD_NOTES: the sheet has data-entry
 * errors that date rows into the future; those must not be reported as "latest"). Self-updating
 * as the sheet grows — never hardcode the resulting string. Returns '' when nothing qualifies.
 */
export function latestDataMonth(rows: SLEvent[], now: Date = new Date()): string {
  const nowYear = now.getFullYear() + 543
  const nowKey = nowYear * 12 + (now.getMonth() + 1)

  let best: { sortKey: number; month: number; year: number } | null = null
  for (const row of rows) {
    if (row.month === null || row.year === null) continue
    if (row.sortKey <= 0 || row.sortKey > nowKey) continue
    if (!best || row.sortKey > best.sortKey) best = { sortKey: row.sortKey, month: row.month, year: row.year }
  }

  if (!best) return ''
  return `${THAI_MONTHS[best.month - 1]} ${best.year}`
}
