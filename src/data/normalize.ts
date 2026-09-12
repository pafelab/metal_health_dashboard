// Pure normalisation helpers shared by parseSheet2.ts, parseWide.ts and mcatt.ts.
// SPEC 4.1 (month/year), 4.2 (province/zone), 4.3 (age bands), severity.
// No I/O here — safe to run in Node or the browser.

import type { Severity } from '@/types'
import { MONTH_LOOKUP, MONTH_ABBR, AGE_BANDS, PROVINCE_ALIASES, PROVINCE_ZONE } from '@/config'

/** Read a cell from a parsed CSV row by index, trimmed; missing/undefined -> ''. */
export function cell(row: string[], index: number): string {
  const v = row[index]
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Cells commonly treated as "empty" across the sheet: blank, '-', or the literal
 * 'ไม่มีข้อมูล'. Used for the reporting/timeliness check and general "is this cell blank" tests.
 * Kept separate from isTruthyCell (hazard flags / MCATT roles), which also excludes '0'/'false'/'ไม่มี'.
 */
export function isBlankCell(v: string): boolean {
  const t = v.trim()
  return t === '' || t === '-' || t === 'ไม่มีข้อมูล'
}

/**
 * Truthiness test for hazard flag cells (SPEC 3.3) and MCATT role cells (SPEC 3.4).
 * Non-empty and not one of: '-', '0', 'false', 'ไม่มีข้อมูล', 'ไม่มี' (case-insensitive for 'false').
 */
export function isTruthyCell(v: string | undefined | null): boolean {
  if (!v) return false
  const t = v.trim()
  if (t === '') return false
  const low = t.toLowerCase()
  if (t === '-' || t === '0' || low === 'false' || t === 'ไม่มีข้อมูล' || t === 'ไม่มี') return false
  return true
}

/** Parse a month cell: Thai full name, abbreviation, short prefix, or a 1-12 number. SPEC 4.1. */
export function parseMonth(raw: string): number | null {
  const t = raw.trim()
  if (t === '' || t === '-') return null

  // Numeric form: '1'..'12', '01'..'12'.
  if (/^\d{1,2}$/.test(t)) {
    const n = parseInt(t, 10)
    if (n >= 1 && n <= 12) return n
    return null
  }

  // Exact match against the lookup table (full name, abbreviation, short prefix).
  if (MONTH_LOOKUP[t] !== undefined) return MONTH_LOOKUP[t]

  // Substring fallback (longest keys first, so 'กุมภาพันธ์' wins over any shorter alias
  // that happens to be a prefix of it), the way the old site's getMonthNum() worked.
  const keys = Object.keys(MONTH_LOOKUP).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (t.includes(key)) return MONTH_LOOKUP[key]
  }
  return null
}

/** Parse a year cell to a 4-digit Buddhist year. SPEC 4.1. */
export function parseYear(raw: string): number | null {
  const t = raw.trim()
  if (t === '' || t === '-') return null
  const digits = t.replace(/[^\d]/g, '')
  if (digits === '') return null
  let n = parseInt(digits, 10)
  if (Number.isNaN(n)) return null

  if (digits.length <= 2) {
    // 2-digit heuristic, same as the old site: treat as BE 25xx.
    n += 2500
  } else if (n < 2500) {
    // 4-digit Christian year -> Buddhist year.
    n += 543
  }
  return n
}

/** 'ต.ค. 68' style trend label from a resolved month/year, per SPEC 4.1. */
export function monthLabel(month: number | null, year: number | null): string {
  if (month === null || month < 1 || month > 12) return ''
  const abbr = MONTH_ABBR[month - 1]
  if (year === null) return abbr
  const yy = String(year).slice(-2).padStart(2, '0')
  return `${abbr} ${yy}`
}

/** sortKey = year*12 + month, or 0 when either is unknown (unsortable / goes first). SPEC 4.1. */
export function sortKeyOf(month: number | null, year: number | null): number {
  if (month === null || year === null) return 0
  return year * 12 + month
}

/**
 * Resolve a severity cell to the enum. Matched by substring in this order (ดำ, then แดง, then
 * เหลือง) rather than exact equality, so the observed wide-tab typo 'สีีแดง' (doubled สระอี,
 * see docs/BUILD_NOTES.md) still resolves to 'red' — the extra vowel sits before 'แดง', which
 * remains intact as a substring.
 */
export function severityOf(raw: string): Severity {
  const t = raw.trim()
  if (t === '') return 'unknown'
  if (t.includes('ดำ')) return 'black'
  if (t.includes('แดง')) return 'red'
  if (t.includes('เหลือง')) return 'yellow'
  return 'unknown'
}

/** Parse an age cell: an integer, or null for any non-numeric spelling of "not specified"
 *  ('ไม่ระบุ', 'ไม่่ระบุ', 'ไม่รบุ', blank, ...). SPEC 3.2 + BUILD_NOTES "Age not specified". */
export function parseAge(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  if (!/^\d+$/.test(t)) return null
  const n = parseInt(t, 10)
  return Number.isNaN(n) ? null : n
}

/** Resolve an age to its display band label. SPEC 4.3. */
export function ageBandOf(age: number | null): string {
  const band = AGE_BANDS.find((b) => b.test(age))
  return band ? band.label : AGE_BANDS[AGE_BANDS.length - 1].label
}

/** Zone number parsed from the digits in a zone cell ('เขต 8' / 'เขตสุขภาพที่ 8' -> 8). SPEC 4.2. */
export function parseZone(raw: string): number | null {
  const m = raw.match(/\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return Number.isNaN(n) ? null : n
}

/**
 * Resolve an event's zone. SPEC 4.2: "Zone number parsed from digits in the zone cell." The
 * sheet's own เขตสุขภาพ cell is authoritative so the app reproduces the tallies the owner sees
 * in the source sheet and on the old site. The province is used only as a fallback when the
 * zone cell is blank or carries no digits.
 *
 * Known source-data conflict (owner to fix in the sheet, NOT worked around here): ชีต2 data
 * row 402 (CSV line 403) has เขตสุขภาพ = เขต 11 but จังหวัด = ตรัง, a zone-12 province. Per
 * SPEC 4.2 that row counts under zone 11. See verification gate assertion x8c.
 */
export function zoneOf(province: string, zoneCellRaw: string): number | null {
  const fromCell = parseZone(zoneCellRaw)
  if (fromCell !== null) return fromCell
  const fromProvince = PROVINCE_ZONE[province]
  return fromProvince !== undefined ? fromProvince : null
}

/**
 * Normalise a province cell: strip 'จังหวัด'/'จ.' prefixes, collapse whitespace, then apply
 * PROVINCE_ALIASES. SPEC 4.2.
 */
export function normProvince(raw: string): string {
  let t = raw.trim()
  if (t === '' || t === '-') return ''
  t = t.replace(/^จังหวัด/, '').replace(/^จ\.\s*/, '')
  t = t.replace(/\s+/g, ' ').trim()
  // Collapse a doubled Thai combining vowel/tone mark BEFORE the alias lookup, so this typo shape
  // self-heals even for names not explicitly listed in PROVINCE_ALIASES. A substitution typo like
  // 'นตรพนม' (ต for ค) is not a doubled-mark case and still needs its own PROVINCE_ALIASES entry.
  t = collapseDoubledMarks(t)
  return PROVINCE_ALIASES[t] ?? t
}

/**
 * Collapse a run of the same Thai combining vowel/tone mark down to one (data-entry typo class:
 * observed 'ขอนแก่่น' with a repeated mai-ek, 'หญิิง' with a repeated สระอิ, 'ต่ำ่กว่า 18 ปี' with
 * a repeated mai-ek, 'ไม่่มี'). Same combining-mark range stripListNumbering() uses. Extracted
 * from normProvince() so every column with this typo shape can reuse the one implementation.
 */
export function collapseDoubledMarks(s: string): string {
  // Adjacent repeat of the same mark: 'ขอนแก่่น', 'หญิิง', 'ไม่่มี'.
  let t = s.replace(/([ัิ-ฺ็-๎])\1+/g, '$1')
  // Same typo SPLIT BY สระอำ: 'ต่ำ่กว่า 18 ปี' is ต + ่ + ำ + ่ , so the two mai-ek are not
  // adjacent and the rule above cannot see them. Only a mark that already appears BEFORE the ำ is
  // removed after it, so a genuinely mis-ordered (never observed) 'ตำ่' keeps its tone mark
  // instead of losing it.
  t = t.replace(/([่-๋])ำ\1/g, '$1ำ')
  return t
}

/**
 * เพศ cell → 'ชาย' / 'หญิง' / raw. The refreshed sheet has exactly 1 row spelled 'หญิิง'
 * (doubled สระอิ), which would otherwise land in genderSplit()'s `other` bucket.
 */
export function normGender(raw: string): string {
  const t = collapseDoubledMarks(collapseWs(raw))
  if (t === '' || t === '-') return ''
  return t
}

/**
 * ช่วงอายุวัย cell → 'ต่ำกว่า 18 ปี' / '≥ 18 ปี'. Two fixes, both measured on the 2026-09-12
 * fixture: 1 row spells it 'ต่ำ่กว่า 18 ปี' (doubled mai-ek), and the 26 under-18 rows are stored
 * as 'ต่ำกว่า 18' WITHOUT the trailing 'ปี'. The review deck (slide 20) prints 'ปี' on both
 * labels, so the DATA value is normalized here — otherwise the fixed display order in
 * CATEGORY_ORDERS.suicideAgeGroup would never match the under-18 rows.
 */
export function normSuicideAgeGroup(raw: string): string {
  const t = collapseDoubledMarks(collapseWs(raw))
  if (t === '' || t === '-') return ''
  if (t === 'ต่ำกว่า 18') return 'ต่ำกว่า 18 ปี'
  return t
}

/**
 * ประเภทผู้ป่วย (col 14) cell → one of CATEGORY_ORDERS.patientStatus5.
 *
 * Two shapes need repair, both measured on the 2026-09-12 fixture:
 * 1. 163 rows carry LITERAL double-quote characters and an inner space —
 *    `"ไม่ใช่ผู้ป่วยจิตเวช/ ไม่ใช่ผู้ใช้สารเสพติด"` — because the value contains a comma-free but
 *    quote-wrapped string in the source sheet. Quotes are stripped and the space around the '/'
 *    removed, giving `ไม่ใช่ผู้ป่วยจิตเวช/ไม่ใช่ผู้ใช้สารเสพติด`.
 * 2. Exactly ONE row still uses the pre-restructure vocabulary `ผู้ป่วยรายใหม่`. It is aliased to
 *    `ผู้ป่วยจิตเวชรายใหม่` — a JUDGEMENT CALL on a single legacy row, not something the data
 *    states. Its counterpart `ผู้ป่วยรายเก่า` is deliberately NOT aliased: it does not occur in
 *    the current sheet, and on a GID_WIDE_FALLBACK fetch (old 84-column schema) it is the majority
 *    value, where silently retagging hundreds of rows as "จิตเวชรายเก่า" would be a fabrication.
 *    Such rows stay verbatim and countBy() appends them as an extra category (SPEC 4.5).
 */
export function normPatientStatus(raw: string): string {
  let t = collapseWs(raw)
  if (t === '' || t === '-') return ''
  t = t.replace(/^"+/, '').replace(/"+$/, '').trim()
  t = t.replace(/\s*\/\s*/g, '/')
  t = collapseDoubledMarks(t)
  if (t === 'ผู้ป่วยรายใหม่') return 'ผู้ป่วยจิตเวชรายใหม่'
  return t
}

/** Collapse runs of whitespace, for robust category-label comparison (BUILD_NOTES: diagnosis
 *  double space, header trailing spaces, etc.). Does not otherwise alter the string. */
export function collapseWs(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

/**
 * Strip a leading list-numbering token ('1.', '2 ', '5' directly before Thai script) from a
 * name/phone/agency/lineId/lineName cell, per SPEC 3.4. The number must be 1-99 with a leading
 * digit 1-9 (so real phone numbers like '084-...', which start with 0, are never touched) and be
 * followed by '.', whitespace, or directly by a Thai character (observed in the real data as
 * '5นางสาวชนาพร...' with no separator at all). A few stray leading Thai combining marks
 * (observed as 'ุ6. ...') are stripped first so the numbering underneath is still recognised.
 */
export function stripListNumbering(raw: string): string {
  let t = raw
  // Stray leading Thai combining vowel/tone marks (observed as 'ุ6. ...').
  t = t.replace(/^[ัิ-ฺ็-๎]+/, '')
  // '1.' / '2 ' / '5' directly before Thai script (no separator at all, seen in the real data).
  t = t.replace(/^(?:[1-9]\d?)(?:\.\s*|\s+|(?=[฀-๿]))/, '')
  t = t.trim()
  // Numbering-token-only leftover: the whole cell was just the numbering token with nothing
  // after it (e.g. a lone '5', or '4.5' where '4.' is a list marker and '5' is left dangling),
  // so the separator-requiring regex above never matched. Blank it rather than keep a bogus
  // short numeric value. Genuine Line IDs in this sheet are >= 10 digits, so this never collides.
  if (/^[1-9]\d?\.?$/.test(t)) return ''
  return t
}

/** Split a cell that may hold several newline-separated values (SPEC 3.4), trimming each and
 *  dropping blanks. A cell with no newline yields a one-element (or zero-element) array. */
export function splitLines(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

/**
 * Placeholder spellings seen in the source sheet's ลิงก์ column. They are *not* addresses, so
 * rendering them as anchors sends users to a relative route (audit UX-07: an href of '-').
 */
const URL_PLACEHOLDERS = new Set(['-', '—', '–', 'ไม่มี', 'ไม่มีข้อมูล', 'n/a', 'na', 'null', 'undefined'])

/**
 * True only for a usable news-source address: parses as an absolute URL over http/https and has
 * a host. Blank cells, whitespace and the placeholder spellings above are all false. Audit UX-07.
 */
export function isValidHttpUrl(value: string): boolean {
  const t = (value ?? '').trim()
  if (t === '' || URL_PLACEHOLDERS.has(t.toLowerCase())) return false
  try {
    const u = new URL(t)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== ''
  } catch {
    return false
  }
}
