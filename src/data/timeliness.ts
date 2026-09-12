// Timeliness score (SPEC 6.4). Pure function over any rows carrying a `reporting` field —
// used for both SLEvent (col 8) and HazardEvent (col 40) rows, combined.

import type { TimelinessResult, SLEvent, HazardEvent, Filters } from '@/types'
import { TIMELINESS_LEVELS, ZONE_NUMBERS } from '@/config'
import { isBlankCell } from './normalize'
import { applyFilters } from './filter'

const NO_DATA_LEVEL = { level: 'ไม่มีข้อมูล', color: '#94A3B8', icon: 'Meh' }

/**
 * total = rows whose reporting cell is non-blank and not 'ไม่มีข้อมูล'.
 * pass  = of those, rows whose reporting text contains 'ตามเกณฑ์' and does NOT contain 'ไม่'
 *         (so 'ไม่ตามเกณฑ์' is correctly excluded).
 * percent rounded to 2 decimals; null when total = 0.
 */
export function computeTimeliness(rows: { reporting: string }[]): TimelinessResult {
  let total = 0
  let pass = 0

  for (const row of rows) {
    const t = (row.reporting ?? '').trim()
    if (isBlankCell(t)) continue
    total++
    if (t.includes('ตามเกณฑ์') && !t.includes('ไม่')) pass++
  }

  if (total === 0) {
    return { pass: 0, total: 0, percent: null, ...NO_DATA_LEVEL }
  }

  const percent = Math.round((pass / total) * 10000) / 100
  const levelDef = TIMELINESS_LEVELS.find((l) => percent >= l.min) ?? TIMELINESS_LEVELS[TIMELINESS_LEVELS.length - 1]

  return {
    pass,
    total,
    percent,
    level: levelDef.level,
    color: levelDef.color,
    icon: levelDef.icon,
  }
}

/** One row of the 13-zone reporting scorecard (review deck slide 23). */
export interface ZoneTimeliness {
  zone: number
  result: TimelinessResult
}

/** What `timelinessByZone()` returns: the 13 zone rows plus the rows they cannot account for. */
export interface ZoneTimelinessBreakdown {
  /** Always 13 entries, in ZONE_NUMBERS order. A zone with no reporting rows still gets a row. */
  zones: ZoneTimeliness[]
  /**
   * Reporting rows inside the same period/hazard scope whose `zone` is null (no province, or a
   * province that resolves to no zone). See the "rows with no zone" note below — these are counted
   * so the UI can say out loud that the 13 zone totals sum to LESS than the national total,
   * instead of quietly losing them the way `zoneCounts()` does.
   */
  unassigned: number
  /** Reporting rows in the whole (unzoned) scope — `sum of zone totals + unassigned`. */
  nationalTotal: number
}

/**
 * Timeliness scored SEPARATELY for each of the 13 health zones, for the scorecard the review deck
 * puts at the bottom of the dashboard (slide 23: "เพิ่ม ผลการรายงานข่าว 13 เขตสุขภาพ").
 *
 * Two questions no existing code answered, decided here:
 *
 * 1. WHICH ROWS COUNT. The current month range and ประเภทภัย filter are HONOURED, so the scorecard
 *    agrees with the rest of the page (a March-only view scores March). Only `zone` and `province`
 *    are overridden — zone because each row IS a zone, province because a zone's score must cover
 *    the whole zone even while one province is drilled into. This also makes the section
 *    page-agnostic: it is handed the UNFILTERED arrays, so on the zone tab (where the page's own
 *    rows are narrowed to one zone) the other 12 zones still score correctly instead of reading 0.
 *
 * 2. ROWS WHOSE `zone` IS NULL. They belong to no zone, so they cannot be scored in any of the 13
 *    rows and are EXCLUDED from all of them — we do not invent a 14th bucket and we do not fold
 *    them into a zone. Unlike `zoneCounts()`, which drops them silently, their count is returned as
 *    `unassigned` so the card can footnote the gap between the 13 rows and the national figure.
 *
 * The row set fed to each zone is `[...sl, ...hz]`, exactly as ZonePage's own TimelinessCard does,
 * so a zone tile and the card above it show the same number for the same zone.
 */
export function timelinessByZone(sl: SLEvent[], hz: HazardEvent[], f: Filters): ZoneTimelinessBreakdown {
  const zones: ZoneTimeliness[] = ZONE_NUMBERS.map((zone) => {
    const scoped = applyFilters(sl, hz, { ...f, zone, province: '' })
    return { zone, result: computeTimeliness([...scoped.sl, ...scoped.hz]) }
  })

  const national = applyFilters(sl, hz, { ...f, zone: 'all', province: '' })
  const nationalRows = [...national.sl, ...national.hz]
  const nationalTotal = nationalRows.filter((r) => !isBlankCell((r.reporting ?? '').trim())).length
  const unassigned = nationalRows.filter(
    (r) => r.zone === null && !isBlankCell((r.reporting ?? '').trim()),
  ).length

  return { zones, unassigned, nationalTotal }
}
