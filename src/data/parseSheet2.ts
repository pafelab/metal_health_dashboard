// Parses the ชีต2 tab (Section 1 — Social Listening) into SLEvent[]. SPEC 3.2.
// Pure: takes already-downloaded CSV rows (string[][]), no network I/O.

import type { SLEvent } from '@/types'
import {
  cell,
  parseMonth,
  parseYear,
  monthLabel,
  sortKeyOf,
  severityOf,
  parseAge,
  ageBandOf,
  zoneOf,
  normProvince,
} from './normalize'

// SPEC 3.2 index fallback, 0-based, matching the table exactly.
const IDX = {
  zone: 0,
  month: 1, // blank header, always resolved by index
  year: 2,
  province: 3,
  headline: 4,
  link: 5,
  channel: 6,
  severity: 7,
  reporting: 8,
  gender: 9,
  age: 10,
  suicideAgeGroup: 11,
  diagnosis: 12,
  patientGroup: 13,
  patientClass: 14,
  treatmentHistory: 15,
  suicide: 16,
  suicideMethod: 17,
  suicideCause: 18,
  suicideLocation: 19,
  affected: 20,
  affectedType: 21,
  injured: 22,
  deaths: 23,
  factReport: 24,
  operator: 25,
  assistance: 26,
  risk27: 27,
  risk28: 28,
  risk29: 29,
  risk30: 30,
  sign31: 31,
  sign32: 32,
  sign33: 33,
  sign34: 34,
  sign35: 35,
  sign36: 36,
} as const

const HEADER_NAMES: Record<keyof Omit<typeof IDX, 'month'>, string> = {
  zone: 'เขตสุขภาพ',
  year: 'ปี',
  province: 'จังหวัด',
  headline: 'เนื้อหา',
  link: 'link',
  channel: 'ช่องทาง Alert',
  severity: 'ระดับความรุนแรง',
  reporting: 'การส่งรายงาน',
  gender: 'เพศ',
  age: 'อายุ',
  suicideAgeGroup: 'ช่วงอายุ',
  diagnosis: 'การวินิจฉัยโรค',
  patientGroup: 'ผู้ป่วยจิตเวช/อื่นๆ',
  patientClass: 'การจำแนกผู้ป่วย',
  treatmentHistory: 'ประวัติการรักษา',
  suicide: 'การฆ่าตัวตาย',
  suicideMethod: 'วิธีการฆ่าคัวตาย',
  suicideCause: 'สาเหตุการฆ่าตัวตาย',
  suicideLocation: 'สถานที่ก่อเหตุ',
  affected: 'มีผู้ได้รับผลกระทบ',
  affectedType: 'ประเภทผู้ได้รับผลกระทบ',
  injured: 'จำนวนผู้ได้บาดเจ็บ',
  deaths: 'จำนวนผู้เสียชีวิต',
  factReport: 'รายงานข้อเท็จจริงด้านจิตเวช',
  operator: 'ผู้ปฏิบัติงาน',
  assistance: 'การช่วยเหลือผู้ก่อเหตุ',
  risk27: 'ขาดยา',
  risk28: 'กลับมาเสพซ้ำ',
  risk29: 'ไม่มาตามนัด',
  risk30: 'อื่น ๆ',
  sign31: 'ไม่หลับไม่นอน',
  sign32: 'เดินไปเดินมา',
  sign33: 'พูดจาคนเดียว',
  sign34: 'หงุดหงิด',
  sign35: 'เที่ยวหวาดระแวง',
  sign36: 'ไม่มีอาการ',
}

/** Build an index resolver from a header row: trimmed header name -> column index, falling
 *  back to the SPEC 3.2 index when the name is not found (or is duplicated ambiguously). */
function buildResolver(headerRow: string[]): Record<keyof typeof IDX, number> {
  const trimmed = headerRow.map((h) => (h ?? '').trim())
  const byName = new Map<string, number>()
  trimmed.forEach((h, i) => {
    if (h !== '' && !byName.has(h)) byName.set(h, i)
  })

  const out = {} as Record<keyof typeof IDX, number>
  ;(Object.keys(IDX) as (keyof typeof IDX)[]).forEach((key) => {
    if (key === 'month') {
      out.month = IDX.month // blank header, always by index
      return
    }
    const headerName = HEADER_NAMES[key]
    out[key] = byName.has(headerName) ? (byName.get(headerName) as number) : IDX[key]
  })
  return out
}

function toNumberOrZero(raw: string): number {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return 0
  const n = parseInt(t, 10)
  return Number.isNaN(n) ? 0 : n
}

/** Suicide location merge, SPEC 4.6: 'ตลาด / ร้านค้า' and 'ตลาดร้านค้า' are the same place. */
function mergeSuicideLocation(raw: string): string {
  if (raw === 'ตลาด / ร้านค้า' || raw === 'ตลาดร้านค้า') return 'ตลาด / ร้านค้า'
  return raw
}

/** Parses rows[0] as header + rows[1..] as data. Blank/all-empty rows are skipped. */
export function parseSheet2(rows: string[][]): SLEvent[] {
  if (rows.length === 0) return []
  const idx = buildResolver(rows[0])

  const events: SLEvent[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c) => (c ?? '').trim() === '')) continue

    const month = parseMonth(cell(row, idx.month))
    const year = parseYear(cell(row, idx.year))
    const ageRaw = cell(row, idx.age)
    const age = parseAge(ageRaw)
    const severityRaw = cell(row, idx.severity)

    const riskCells = [
      cell(row, idx.risk27),
      cell(row, idx.risk28),
      cell(row, idx.risk29),
      cell(row, idx.risk30),
    ]
    const signCells = [
      cell(row, idx.sign31),
      cell(row, idx.sign32),
      cell(row, idx.sign33),
      cell(row, idx.sign34),
      cell(row, idx.sign35),
      cell(row, idx.sign36),
    ]

    const province = normProvince(cell(row, idx.province))

    events.push({
      zone: zoneOf(province, cell(row, idx.zone)),
      month,
      year,
      sortKey: sortKeyOf(month, year),
      monthLabel: monthLabel(month, year),

      province,
      headline: cell(row, idx.headline),
      link: cell(row, idx.link),

      severity: severityOf(severityRaw),
      severityRaw,

      reporting: cell(row, idx.reporting),

      gender: cell(row, idx.gender),
      ageRaw,
      age,
      ageBand: ageBandOf(age),

      suicideAgeGroup: cell(row, idx.suicideAgeGroup),
      diagnosis: cell(row, idx.diagnosis),
      patientGroup: cell(row, idx.patientGroup),
      patientClass: cell(row, idx.patientClass),
      treatmentHistory: cell(row, idx.treatmentHistory),
      suicide: cell(row, idx.suicide),
      suicideMethod: cell(row, idx.suicideMethod),
      suicideCause: cell(row, idx.suicideCause),
      suicideLocation: mergeSuicideLocation(cell(row, idx.suicideLocation)),

      injured: toNumberOrZero(cell(row, idx.injured)),
      deaths: toNumberOrZero(cell(row, idx.deaths)),

      assistance: cell(row, idx.assistance),
      riskCells,
      signCells,
    })
  }
  return events
}
