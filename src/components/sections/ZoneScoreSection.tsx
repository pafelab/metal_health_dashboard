// Review deck slide 23 — "ด้านล่างสุด เพิ่ม ผลการรายงานข่าว 13 เขตสุขภาพ".
//
// Two blocks, exactly as the slide lays them out:
//   1. เกณฑ์การให้คะแนน — the percent-range → score table.
//   2. สรุปผลรายเขตสุขภาพ — one tile per health zone: percent sent on time, and the score it earns.
//
// DECK CONSTRAINT: no qualitative wording. "ไม่ต้องมีคำว่า ปรับปรุง พอใช้ นะ" — a band is named by
// its range and its score, never by a judgement word. Nothing in this file (or in
// config/timeliness.ts, whose `level` is the numeric score) introduces one; keep it that way.
//
// PAGE-AGNOSTIC BY DESIGN: this section takes the UNFILTERED `sl`/`hz` arrays plus the page's
// applied filters, and scores each zone itself via timelinessByZone(). Reading the page's already
// filtered rows would work on the dashboard and break on the zone tab, where those rows are
// narrowed to a single zone and the other 12 tiles would read 0. Designing that out beats gating
// the section off the zone tab.
//
// NOT the same widget as Section 1's "จำนวนเหตุการณ์รายเขตสุขภาพ" bar chart, which also spans all
// 13 zones: that one counts EVENT VOLUME, this one scores REPORTING COMPLIANCE. Both stay (the
// deck never asked to drop either); the headings and subtitles here say "การรายงาน"/"ส่งตามเกณฑ์"
// so the two cannot be read as the same measure.

import { useMemo } from 'react'
import { ClipboardCheck, LayoutGrid, ListChecks } from 'lucide-react'
import type { SLEvent, HazardEvent, Filters } from '@/types'
import { timelinessByZone } from '@/data'
import type { ZoneTimeliness } from '@/data'
import { TIMELINESS_LEVELS, formatZoneLabel, rangeLabel } from '@/config'
import type { TimelinessTone } from '@/config'
import Card from '@/components/layout/Card'
import DenominatorNote from '@/components/widgets/DenominatorNote'

export interface ZoneScoreSectionProps {
  /** UNFILTERED Section-1 rows — the section applies `applied` itself, per zone. */
  sl: SLEvent[]
  /** UNFILTERED Section-2 rows. */
  hz: HazardEvent[]
  /** The page's applied filters. Month range + ประเภทภัย are honoured; zone/province are not. */
  applied: Filters
  /** Zone the page itself is focused on, if any — that tile gets a marked outline. */
  selectedZone?: number | 'all'
}

/** 'na' is not a TIMELINESS_LEVELS tone: it is the zone-with-no-reporting-rows case. */
type Tone = TimelinessTone | 'na'

/* Tailwind cannot see a class name built at runtime (`bg-score-${tone}-soft` would be purged), so
   every tone resolves through these literal maps. Both the legend row and the zone badge read the
   SAME map, which is what guarantees that a tile badged 0.4 is tinted like the legend's 0.4 row. */
const TONE_CHIP: Record<Tone, string> = {
  good: 'bg-score-good-soft text-score-good',
  fair: 'bg-score-fair-soft text-score-fair',
  poor: 'bg-score-poor-soft text-score-poor',
  na: 'bg-score-na-soft text-score-na',
}

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-score-good',
  fair: 'text-score-fair',
  poor: 'text-score-poor',
  na: 'text-score-na',
}

/** The five finite bands the slide prints ("เกณฑ์ 5 ระดับ"). The sixth, `min = -Infinity`, is the
 *  "< 70.00" catch-all, and a zone CAN be badged with its 0.0 (e.g. at time of writing, with
 *  from=2568-11&to=2568-11, เขตสุขภาพที่ 9 read 50.00%). It is therefore printed as a real table row too — visually set apart (dashed
 *  rule, muted ground, an explicit "นอกเกณฑ์ 5 ระดับ" caption) so the five stay obviously primary,
 *  but never absent: no score shown on a tile is left without a row explaining it. The badge in
 *  that row still uses TONE_CHIP, so a 0.0 tile and the 0.0 row match like every other pair. */
const FINITE_LEVELS = TIMELINESS_LEVELS.filter((l) => Number.isFinite(l.min))
const CATCH_ALL = TIMELINESS_LEVELS[TIMELINESS_LEVELS.length - 1]

/** Tone for a computed percent. Resolved from the thresholds (not by matching the level string) so
 *  it follows the same rule computeTimeliness() used to pick the level in the first place. */
function toneOf(percent: number | null): Tone {
  if (percent === null) return 'na'
  return (TIMELINESS_LEVELS.find((l) => percent >= l.min) ?? CATCH_ALL).tone
}

interface ZoneTileProps extends ZoneTimeliness {
  selected: boolean
}

function ZoneTile({ zone, result, selected }: ZoneTileProps) {
  const tone = toneOf(result.percent)
  const hasData = result.percent !== null

  return (
    <li
      className={`flex flex-col gap-2 rounded-2xl border bg-white p-4 ${
        selected ? 'border-s2-400 ring-2 ring-s2-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-semibold text-slate-800">{formatZoneLabel(zone)}</p>
        {/* The score badge. Text carries the meaning; the tint only reinforces it. */}
        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${TONE_CHIP[tone]}`}>
          {hasData ? `คะแนน ${result.level}` : 'ไม่มีข้อมูล'}
        </span>
      </div>

      {/* flex-wrap + a nowrap label: Thai has no inter-word spaces, so an inline run lets the
          browser break inside "ส่งตามเกณฑ์" itself on a narrow card (deck slide 20 —
          "ดูการตัดคำให้ด้วย"). Wrapping the label as one atom moves it to its own line instead. */}
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={`text-3xl font-extrabold leading-none ${TONE_TEXT[tone]}`}>
          {/* Two decimals: an 84.99% zone rounded to "85%" would sit next to a 0.3 badge and look
              like a mistake. */}
          {hasData ? `${result.percent!.toFixed(2)}%` : '—'}
        </span>
        {/* The label only makes sense beside a percent: "— ส่งตามเกณฑ์" reads as a measured zero. */}
        {hasData && (
          <span className="whitespace-nowrap align-baseline text-sm font-medium text-slate-600">ส่งตามเกณฑ์</span>
        )}
      </div>

      <p className="text-xs font-medium text-slate-600">
        {hasData
          ? `${result.pass.toLocaleString('th-TH')} จาก ${result.total.toLocaleString('th-TH')} เหตุการณ์`
          : 'ไม่มีเหตุการณ์ที่บันทึกการส่งรายงานในเขตนี้'}
      </p>

      {/* Marker in text, not colour alone, when the page is focused on this zone. */}
      {selected && <p className="text-xs font-bold text-s2-700">· เขตที่กำลังดูอยู่</p>}
    </li>
  )
}

export default function ZoneScoreSection({ sl, hz, applied, selectedZone }: ZoneScoreSectionProps) {
  const breakdown = useMemo(() => timelinessByZone(sl, hz, applied), [sl, hz, applied])
  const { zones, unassigned, nationalTotal } = breakdown

  return (
    <section id="section-zone-score" className="scroll-mt-24 space-y-6">
      <h2 className="flex items-center gap-2 text-sectionTitle font-bold text-slate-800">
        <ClipboardCheck className="text-s2-600" size={26} strokeWidth={2.25} />
        การประเมินผลการรายงานข่าว (13 เขตสุขภาพ)
      </h2>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* ---- 1. เกณฑ์การให้คะแนน ---- */}
        <Card
          title="เกณฑ์การให้คะแนน"
          subtitle="แปลงร้อยละของการส่งรายงานตามเกณฑ์เป็นคะแนน"
          icon={ListChecks}
          headerTone="brand"
        >
          <div className="relative overflow-x-auto">
            <table className="w-full text-tableText">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-4 font-medium">เกณฑ์ (ร้อยละ)</th>
                  <th className="py-2 font-medium">คะแนน</th>
                </tr>
              </thead>
              <tbody>
                {FINITE_LEVELS.map((l, i) => (
                  // Not `last:border-0`: `:last-child` is now the catch-all row below, so the rule
                  // has to be dropped by index instead — otherwise this row's solid border and the
                  // catch-all's dashed one stack into a double rule.
                  <tr
                    key={l.level}
                    className={i === FINITE_LEVELS.length - 1 ? '' : 'border-b border-slate-100'}
                  >
                    {/* rangeLabel is indexed against the FULL descending array, and FINITE_LEVELS
                        is its unbroken head, so index i means the same row in both. */}
                    <td className="py-2 pr-4 whitespace-nowrap font-medium text-slate-700">
                      {rangeLabel(TIMELINESS_LEVELS, i)}
                    </td>
                    <td className="py-2">
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-sm font-bold ${TONE_CHIP[l.tone]}`}>
                        {l.level}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* The "< 70.00" catch-all. Deliberately outside the five tiers the deck asks for —
                    dashed rule, muted ground, its own caption — but present, because a tile really
                    can be badged with its score. */}
                <tr className="border-t-2 border-dashed border-slate-300 bg-slate-50/70">
                  <td className="py-2 pr-4 align-middle">
                    <span className="block whitespace-nowrap font-medium text-slate-500">
                      {rangeLabel(TIMELINESS_LEVELS, TIMELINESS_LEVELS.length - 1)}
                    </span>
                    <span className="block text-xs font-normal text-slate-500">นอกเกณฑ์ 5 ระดับ</span>
                  </td>
                  <td className="py-2 align-middle">
                    <span
                      className={`inline-block rounded-lg px-2.5 py-1 text-sm font-bold ${TONE_CHIP[CATCH_ALL.tone]}`}
                    >
                      {CATCH_ALL.level}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <DenominatorNote className="mt-3">
            เกณฑ์หลักมี 5 ระดับ (คะแนน {FINITE_LEVELS[FINITE_LEVELS.length - 1].level} –{' '}
            {FINITE_LEVELS[0].level}) แถวสุดท้ายเป็นกรณี{' '}
            {rangeLabel(TIMELINESS_LEVELS, TIMELINESS_LEVELS.length - 1)} ซึ่งได้คะแนน {CATCH_ALL.level} ·
            เขตที่ไม่มีเหตุการณ์ซึ่งบันทึกการส่งรายงานจะแสดงเป็น “ไม่มีข้อมูล” และไม่ได้รับคะแนน
          </DenominatorNote>
        </Card>

        {/* ---- 2. สรุปผลรายเขตสุขภาพ ---- */}
        <Card
          title="สรุปผลรายเขตสุขภาพ"
          subtitle="ร้อยละการส่งรายงานตามเกณฑ์ และคะแนนที่ได้ของแต่ละเขตสุขภาพ"
          icon={LayoutGrid}
          headerTone="brand"
        >
          {/* Fixed เขตสุขภาพที่ 1 → 13 order — deliberately NOT sorted by score, so a zone stays in
              the same place between filter changes and 'ไม่มีข้อมูล' zones keep their natural slot
              instead of needing a rule about where an absent score ranks. */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {zones.map((z) => (
              <ZoneTile
                key={z.zone}
                zone={z.zone}
                result={z.result}
                selected={selectedZone !== undefined && selectedZone !== 'all' && selectedZone === z.zone}
              />
            ))}
          </ul>

          <DenominatorNote className="mt-4">
            คิดจากเหตุการณ์ที่บันทึกการส่งรายงาน (Social Listening + ภัยอื่นๆ) ตามช่วงเวลาและประเภทภัยที่เลือกไว้
            รวมทั้งประเทศ {nationalTotal.toLocaleString('th-TH')} เหตุการณ์ — คะแนนของแต่ละเขตคิดจากทั้งเขต
            แม้จะเลือกจังหวัดไว้ก็ตาม
            {unassigned > 0 &&
              ` · มี ${unassigned.toLocaleString('th-TH')} เหตุการณ์ที่ระบุจังหวัดไม่ได้ จึงไม่ถูกนับอยู่ในเขตใด ทำให้ผลรวมของ 13 เขตน้อยกว่ายอดทั้งประเทศ`}
          </DenominatorNote>
        </Card>
      </div>
    </section>
  )
}
