// Applies the filter bar (SPEC 5.2) to both sections at once. Pure — no I/O, no React.

import type { SLEvent, HazardEvent, Filters } from '@/types'
import { HAZARD_TYPES } from '@/config'

/** 'YYYY-MM' (Buddhist year) -> sortKey (year*12 + month), or null if blank/unparseable. */
function monthInputToSortKey(value: string): number | null {
  const t = value.trim()
  if (t === '') return null
  const m = /^(\d{4})-(\d{1,2})$/.exec(t)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return null
  return year * 12 + month
}

function inMonthRange<T extends { sortKey: number }>(rows: T[], fromKey: number | null, toKey: number | null): T[] {
  if (fromKey === null && toKey === null) return rows
  return rows.filter((r) => {
    if (r.sortKey <= 0) return false // unresolved month/year can't be placed in a bounded range
    if (fromKey !== null && r.sortKey < fromKey) return false
    if (toKey !== null && r.sortKey > toKey) return false
    return true
  })
}

function byZoneAndProvince<T extends { zone: number | null; province: string }>(
  rows: T[],
  f: Filters,
): T[] {
  return rows.filter((r) => {
    if (f.zone !== 'all' && r.zone !== f.zone) return false
    if (f.province !== '' && r.province !== f.province) return false
    return true
  })
}

/**
 * ประเภทภัย (SPEC 5.2): 'ทั้งหมด' (key 'all') keeps both sections. 'Social Listening' (key
 * 'social') hides Section 2. 'ภัยอื่นๆ (รวม)' (key 'hazards') or any single hazard key hides
 * Section 1; a single hazard key additionally restricts Section 2 to rows carrying that flag.
 */
export function applyFilters(
  sl: SLEvent[],
  hz: HazardEvent[],
  f: Filters,
): { sl: SLEvent[]; hz: HazardEvent[] } {
  const fromKey = monthInputToSortKey(f.fromMonth)
  const toKey = monthInputToSortKey(f.toMonth)

  let slOut = byZoneAndProvince(inMonthRange(sl, fromKey, toKey), f)
  let hzOut = byZoneAndProvince(inMonthRange(hz, fromKey, toKey), f)

  if (f.hazardType === 'social') {
    hzOut = []
  } else if (f.hazardType !== 'all' && f.hazardType !== '') {
    slOut = []
    if (f.hazardType !== 'hazards') {
      const def = HAZARD_TYPES.find((h) => h.key === f.hazardType)
      if (def) hzOut = hzOut.filter((r) => r.hazards.includes(def.label))
    }
  }

  return { sl: slOut, hz: hzOut }
}
