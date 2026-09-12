// Parses the wide tab (gid 842224166 / fallback 1523955266) into HazardEvent[] — Section 2,
// SPEC 3.3. Resolved BY INDEX ONLY (headers are inconsistent on this tab). Pure, no I/O.

import type { HazardEvent } from '@/types'
import { HAZARD_TYPES, HAZARD_UNSPECIFIED_LABEL } from '@/config'
import {
  cell,
  parseMonth,
  parseYear,
  monthLabel,
  sortKeyOf,
  severityOf,
  zoneOf,
  normProvince,
  isTruthyCell,
} from './normalize'

const IDX = {
  zone: 32,
  month: 33,
  year: 34,
  province: 35,
  headline: 36,
  link: 37,
  channel: 38,
  severity: 39,
  reporting: 40,
  // Casualty counts (deck slide 22). Both schemas (85-column and the old 84-column fallback) keep
  // these at the same offsets, and their headers carry embedded newlines
  // ('เจ้าหน้าที่\nที่ได้รับผลกระทบบาดเจ็บ ภัยอื่นๆ'), so index resolution stays the right call
  // for this tab. Col 49 in between is อาชีพเจ้าหน้าที่ (text), which is why 48 and 50 are not
  // adjacent. Measured sums on the 2026-09-12 fixture: 16 / 13 / 672 / 151.
  officerInjured: 47,
  officerDead: 48,
  publicInjured: 50,
  publicDead: 51,
} as const

/** A wide-tab row belongs to Section 2 only if col 35 or col 36 is non-empty. SPEC 3.3. */
function isSection2Row(row: string[]): boolean {
  return cell(row, IDX.province) !== '' || cell(row, IDX.headline) !== ''
}

/** Casualty cell → a count. '-', blanks and any non-integer text are 0 (the only non-numeric
 *  value observed in these four columns is '-'). */
function toCount(raw: string): number {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return 0
  const n = parseInt(t, 10)
  return Number.isNaN(n) ? 0 : n
}

function resolveHazards(row: string[]): string[] {
  const hazards = HAZARD_TYPES.filter((h) => isTruthyCell(row[h.colIndex])).map((h) => h.label)
  return hazards.length > 0 ? hazards : [HAZARD_UNSPECIFIED_LABEL]
}

/** Skips rows[0] (header). Only rows passing the Section-2 membership test are returned. */
export function parseWide(rows: string[][]): HazardEvent[] {
  const events: HazardEvent[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    if (!isSection2Row(row)) continue

    const month = parseMonth(cell(row, IDX.month))
    const year = parseYear(cell(row, IDX.year))
    const severityRaw = cell(row, IDX.severity)

    const province = normProvince(cell(row, IDX.province))

    events.push({
      zone: zoneOf(province, cell(row, IDX.zone)),
      month,
      year,
      sortKey: sortKeyOf(month, year),
      monthLabel: monthLabel(month, year),

      province,
      headline: cell(row, IDX.headline),
      link: cell(row, IDX.link),

      severity: severityOf(severityRaw),
      severityRaw,

      reporting: cell(row, IDX.reporting),

      hazards: resolveHazards(row),

      officerInjured: toCount(cell(row, IDX.officerInjured)),
      officerDead: toCount(cell(row, IDX.officerDead)),
      publicInjured: toCount(cell(row, IDX.publicInjured)),
      publicDead: toCount(cell(row, IDX.publicDead)),
    })
  }
  return events
}
