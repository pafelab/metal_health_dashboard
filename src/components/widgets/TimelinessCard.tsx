// SPEC 6.4 #1 — เป้าหมายการดำเนินงานในแต่ละพื้นที่ (ทันเวลา).
// Percent to two decimals, level, the lucide face icon + colour from TIMELINESS_LEVELS,
// the '(ดำเนินการทันเวลา {pass} จากรวมทั้งหมด {total} เหตุการณ์)' line, and 'ไม่มีข้อมูล' when
// total = 0.
//
// UX-11: 'ระดับ 0.5' is a score on the SPEC 6.4 scale, not a percentage, and its denominator is
// only the events that carry reporting data (Social Listening + ภัยอื่นๆ combined) — which is why
// it can quote more events than a single section above it. Both facts are stated on the card, and
// the scale bounds are derived from TIMELINESS_LEVELS so they cannot drift from the config.
//
// WAVE 2 — the card used to end with its own six-row table of the SPEC 6.4 criteria. Review deck
// slide 23 adds a "เกณฑ์การให้คะแนน" legend of the SAME table to ZoneScoreSection, which now sits
// directly below this card on the zone tab; two copies of one legend, a screen apart, is noise. The
// legend therefore lives in ZoneScoreSection only, and `rangeLabel` moved to config/timeliness.ts
// (next to the descending-order invariant it depends on) so both could have shared it. Losing the
// table also takes ~300px off the card — the UX-09 placement reason below is unaffected.

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '@/components/layout/Card'
import DenominatorNote from '@/components/widgets/DenominatorNote'
import type { TimelinessResult } from '@/types'
import { TIMELINESS_LEVELS } from '@/config'

export interface TimelinessCardProps {
  result: TimelinessResult
}

const ICONS = LucideIcons as unknown as Record<string, LucideIcon>

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? LucideIcons.Meh
}

/** Bounds of the score scale, taken from the config rows (highest threshold first). Both are
 *  printed as numbers in the Thai sentences below, so TIMELINESS_LEVELS' `level` must stay the
 *  numeric score string. */
const SCALE_MIN = TIMELINESS_LEVELS[TIMELINESS_LEVELS.length - 1].level
const SCALE_MAX = TIMELINESS_LEVELS[0].level

export default function TimelinessCard({ result }: TimelinessCardProps) {
  const { pass, total, percent, level, color, icon } = result
  const Icon = iconFor(icon)
  const hasData = total > 0 && percent !== null

  return (
    <Card title="เป้าหมายการดำเนินงานในแต่ละพื้นที่ (ทันเวลา)" icon={LucideIcons.Target} accent="neutral" headerTone="brand">
      <div className="flex flex-col items-center gap-4 py-2 text-center sm:flex-row sm:items-center sm:text-left">
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Icon size={48} color={color} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <div className="text-kpi font-extrabold leading-none" style={{ color }}>
            {hasData ? `${percent.toFixed(2)}%` : '—'}
          </div>
          <div className="mt-1 text-body text-slate-600">ร้อยละของเหตุการณ์ที่ส่งรายงานทันเวลา</div>
          {hasData ? (
            <>
              <div className="mt-2 text-cardTitle font-semibold text-slate-600">
                ระดับ {level}
                <span className="ml-2 align-middle text-sm font-medium text-slate-600">
                  (คะแนนระดับ {SCALE_MIN}–{SCALE_MAX} ไม่ใช่ร้อยละ)
                </span>
              </div>
              <div className="mt-1 text-body text-slate-600">
                (ดำเนินการทันเวลา {pass} จากรวมทั้งหมด {total} เหตุการณ์)
              </div>
            </>
          ) : (
            <div className="mt-2 text-body font-semibold text-slate-600">ไม่มีข้อมูลการส่งรายงานในขอบเขตนี้</div>
          )}
        </div>
      </div>

      {hasData && (
        <DenominatorNote className="mt-3 text-left">
          คำนวณจากเหตุการณ์ที่มีข้อมูลการส่งรายงาน {total} เหตุการณ์ (Social Listening + ภัยอื่นๆ ตามฟิลเตอร์ที่ใช้)
          จำนวนนี้จึงต่างจากจำนวนเหตุการณ์ของแต่ละส่วนด้านบนได้ · เกณฑ์แปลงร้อยละเป็นคะแนนระดับ {SCALE_MIN}–
          {SCALE_MAX} อยู่ในหัวข้อ “การประเมินผลการรายงานข่าว (13 เขตสุขภาพ)” ด้านล่าง
        </DenominatorNote>
      )}
    </Card>
  )
}
