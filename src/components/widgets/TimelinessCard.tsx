// SPEC 6.4 #1 — เป้าหมายการดำเนินงานในแต่ละพื้นที่ (ทันเวลา).
// Percent to two decimals, level, the lucide face icon + colour from TIMELINESS_LEVELS,
// the '(ดำเนินการทันเวลา {pass} จากรวมทั้งหมด {total} เหตุการณ์)' line, 'ไม่มีข้อมูล' when
// total = 0, plus a small legend table of the six SPEC 6.4 criteria rows.

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '@/components/layout/Card'
import type { TimelinessResult } from '@/types'
import { TIMELINESS_LEVELS } from '@/config'
import type { TimelinessLevelDef } from '@/config'

export interface TimelinessCardProps {
  result: TimelinessResult
}

const ICONS = LucideIcons as unknown as Record<string, LucideIcon>

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? LucideIcons.Meh
}

/** SPEC 6.4 table's percent-range text, derived from TIMELINESS_LEVELS thresholds (data-driven,
 *  not hardcoded) so the legend can never drift from the config the score itself is computed
 *  against. */
function rangeLabel(levels: TimelinessLevelDef[], i: number): string {
  const cur = levels[i]
  if (i === 0) return `≥ ${cur.min.toFixed(2)}`
  if (cur.min === -Infinity) return `< ${levels[i - 1].min.toFixed(2)}`
  return `${cur.min.toFixed(2)} – ${(levels[i - 1].min - 0.01).toFixed(2)}`
}

export default function TimelinessCard({ result }: TimelinessCardProps) {
  const { pass, total, percent, level, color, icon } = result
  const Icon = iconFor(icon)
  const hasData = total > 0 && percent !== null

  return (
    <Card title="เป้าหมายการดำเนินงานในแต่ละพื้นที่ (ทันเวลา)" icon={LucideIcons.Target} accent="neutral">
      <div className="flex flex-col items-center gap-4 py-2 text-center sm:flex-row sm:items-center sm:text-left">
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Icon size={48} color={color} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <div className="text-kpi font-extrabold leading-none" style={{ color }}>
            {hasData ? `${percent.toFixed(2)}%` : 'ไม่มีข้อมูล'}
          </div>
          {hasData && (
            <div className="mt-1 text-cardTitle font-semibold text-slate-600">
              ระดับ {level}
            </div>
          )}
          {hasData && (
            <div className="mt-1 text-body text-slate-500">
              (ดำเนินการทันเวลา {pass} จากรวมทั้งหมด {total} เหตุการณ์)
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[420px] text-tableText">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              <th className="py-2 pr-4 font-medium">ร้อยละ</th>
              <th className="py-2 pr-4 font-medium">ระดับ</th>
              <th className="py-2 pr-4 font-medium">สี</th>
              <th className="py-2 font-medium">สัญลักษณ์</th>
            </tr>
          </thead>
          <tbody>
            {TIMELINESS_LEVELS.map((l, i) => {
              const RowIcon = iconFor(l.icon)
              const active = hasData && l.level === level
              return (
                <tr
                  key={l.level}
                  className={`border-b border-slate-50 last:border-0 ${active ? 'bg-slate-50' : ''}`}
                >
                  <td className="py-2 pr-4 whitespace-nowrap">{rangeLabel(TIMELINESS_LEVELS, i)}</td>
                  <td className="py-2 pr-4">{l.level}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-block h-3 w-3 rounded-full align-middle" style={{ backgroundColor: l.color }} />
                  </td>
                  <td className="py-2">
                    <RowIcon size={18} color={l.color} strokeWidth={1.75} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
