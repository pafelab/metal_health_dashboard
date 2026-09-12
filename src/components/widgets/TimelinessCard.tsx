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
  className?: string
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

export default function TimelinessCard({ result, className = '' }: TimelinessCardProps) {
  const { pass, total, percent, level, color, icon } = result
  const Icon = iconFor(icon)
  const hasData = total > 0 && percent !== null

  return (
    <div className={`max-w-4xl ${className}`}>
      <Card title="เป้าหมายการดำเนินงานในแต่ละพื้นที่ (ทันเวลา)" icon={LucideIcons.Target} accent="neutral" headerTone="brand">
        <div className="flex flex-col gap-4 py-2 sm:flex-row sm:items-center sm:gap-6">
          {/* Status icon + percent */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div
              className="flex h-16 w-16 sm:h-18 sm:w-18 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={38} color={color} strokeWidth={2} />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold leading-none tracking-tight" style={{ color }}>
                {hasData ? `${percent.toFixed(2)}%` : '—'}
              </div>
              <div className="mt-1 text-xs sm:text-sm font-medium text-slate-600">
                ร้อยละของเหตุการณ์ที่ส่งรายงานทันเวลา
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden h-12 w-px bg-slate-200 sm:block mx-1 shrink-0" />

          {/* Score & Event details */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700">
            {hasData ? (
              <>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-medium">คะแนนที่ได้</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-lg sm:text-xl font-bold text-slate-800">ระดับ {level}</span>
                    <span className="text-xs text-slate-500 font-medium">(เกณฑ์ {SCALE_MIN}–{SCALE_MAX})</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-medium">การดำเนินงานทันเวลา</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-lg sm:text-xl font-bold text-slate-800">
                      {pass.toLocaleString('th-TH')}
                      <span className="text-xs sm:text-sm font-normal text-slate-500"> / {total.toLocaleString('th-TH')} เหตุการณ์</span>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm font-medium text-slate-500">ไม่มีข้อมูลการส่งรายงานในขอบเขตนี้</div>
            )}
          </div>
        </div>

        {hasData && (
          <DenominatorNote className="mt-3 text-left">
            คำนวณจากเหตุการณ์ที่มีข้อมูลการส่งรายงาน {total.toLocaleString('th-TH')} เหตุการณ์ (Social Listening + ภัยอื่นๆ ตามฟิลเตอร์ที่ใช้)
            จำนวนนี้จึงต่างจากจำนวนเหตุการณ์ของแต่ละส่วนด้านบนได้ · เกณฑ์แปลงร้อยละเป็นคะแนนระดับ {SCALE_MIN}–
            {SCALE_MAX} อยู่ในหัวข้อ “การประเมินผลการรายงานข่าว (13 เขตสุขภาพ)” ด้านล่าง
          </DenominatorNote>
        )}
      </Card>
    </div>
  )
}
