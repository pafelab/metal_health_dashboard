// Timeliness score (SPEC 6.4). Pure function over any rows carrying a `reporting` field —
// used for both SLEvent (col 8) and HazardEvent (col 40) rows, combined.

import type { TimelinessResult } from '@/types'
import { TIMELINESS_LEVELS } from '@/config'
import { isBlankCell } from './normalize'

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
